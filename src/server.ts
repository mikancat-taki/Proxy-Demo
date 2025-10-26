// src/server.ts
import express from "express";
import http from "http";
import httpProxy from "http-proxy";
import fetch from "node-fetch";
import { JSDOM } from "jsdom";
import path from "path";
import mime from "mime-types";
import { URL } from "url";

const app = express();
const PORT = Number(process.env.PORT || 8080);

// Basic auth env vars
const PROXY_USER = process.env.PROXY_USER || "";
const PROXY_PASS = process.env.PROXY_PASS || "";
const PROXY_TOKEN = process.env.PROXY_TOKEN || ""; // optional token

// create http server (needed for websocket upgrade)
const server = http.createServer(app);

// http-proxy instance for WS proxying and generic proxies
const proxy = httpProxy.createProxyServer({
  changeOrigin: true,
  secure: true,
  ws: true
});

// helpers
function isHtmlContentType(ct?: string | null) {
  if (!ct) return false;
  return ct.includes("text/html");
}

function isCssContentType(ct?: string | null) {
  if (!ct) return false;
  return ct.includes("text/css");
}

function getTargetUrl(raw?: string): URL | null {
  if (!raw) return null;
  try {
    const u = new URL(raw);
    if (!["http:", "https:", "ws:", "wss:"].includes(u.protocol)) return null;
    return u;
  } catch {
    try {
      // attempt https
      return new URL("https://" + raw);
    } catch {
      return null;
    }
  }
}

// Basic auth middleware (also supports token header)
function authMiddleware(req: express.Request, res: express.Response, next: express.NextFunction) {
  if ((PROXY_USER && PROXY_PASS) || PROXY_TOKEN) {
    // token check first
    if (PROXY_TOKEN) {
      const t = req.get("x-proxy-token");
      if (t && t === PROXY_TOKEN) return next();
    }
    // Basic auth
    const auth = req.get("authorization") || "";
    if (!auth.startsWith("Basic ")) {
      res.setHeader("WWW-Authenticate", 'Basic realm="Interstellar-Lite"');
      res.status(401).send("Authentication required");
      return;
    }
    const base = auth.slice("Basic ".length);
    const decoded = Buffer.from(base, "base64").toString("utf-8");
    const [user, pass] = decoded.split(":");
    if (user === PROXY_USER && pass === PROXY_PASS) {
      return next();
    } else {
      res.setHeader("WWW-Authenticate", 'Basic realm="Interstellar-Lite"');
      res.status(401).send("Invalid credentials");
      return;
    }
  } else {
    // no auth configured
    return next();
  }
}

// serve front-end
app.use(express.static(path.join(process.cwd(), "public")));

// Main HTTP proxy endpoint
app.get("/proxy", authMiddleware, async (req, res) => {
  const raw = (req.query.url as string) || "";
  const target = getTargetUrl(raw);
  if (!target) {
    res.status(400).send("Missing or invalid 'url' query param.");
    return;
  }

  try {
    // forward user-agent & accept
    const upstream = await fetch(target.toString(), {
      headers: {
        "User-Agent": req.get("User-Agent") || "Interstellar-Lite/1.0",
        "Accept": req.get("Accept") || "*/*"
      },
      redirect: "follow"
    });

    // copy status
    res.status(upstream.status);

    // copy headers except hop-by-hop
    upstream.headers.forEach((v, k) => {
      const hop = ["connection","keep-alive","proxy-authenticate","proxy-authorization","te","trailers","transfer-encoding","upgrade"];
      if (!hop.includes(k.toLowerCase())) res.setHeader(k, v);
    });

    const contentType = upstream.headers.get("content-type");

    // HTML handling (rewrite links & inject client patch)
    if (isHtmlContentType(contentType)) {
      const body = await upstream.text();
      const dom = new JSDOM(body, { url: target.toString() });
      const document = dom.window.document;

      // ensure <base> exists pointing to proxied origin (helps relative paths)
      let baseEl = document.querySelector("base");
      if (!baseEl) {
        baseEl = document.createElement("base");
        const head = document.querySelector("head");
        if (head) head.prepend(baseEl);
      }
      baseEl.setAttribute("href", target.origin + "/");

      // rewrite attributes (common)
      function rewriteAttr(selector: string, attr: string) {
        document.querySelectorAll(selector).forEach((el) => {
          const v = (el as Element).getAttribute(attr);
          if (!v) return;
          try {
            const resolved = new URL(v, target).toString();
            (el as Element).setAttribute(attr, `/proxy?url=${encodeURIComponent(resolved)}`);
          } catch (e) { /* ignore */ }
        });
      }

      // rewrite common
      rewriteAttr("a", "href");
      rewriteAttr("link", "href");
      rewriteAttr("img", "src");
      rewriteAttr("script", "src");
      rewriteAttr("iframe", "src");
      rewriteAttr("source", "src");
      rewriteAttr("video", "src");
      rewriteAttr("audio", "src");
      rewriteAttr("form", "action");

      // meta refresh rewrite (<meta http-equiv="refresh" content="5; URL=/...">)
      document.querySelectorAll('meta[http-equiv]').forEach((m) => {
        const he = m.getAttribute("http-equiv")?.toLowerCase();
        if (he === "refresh") {
          const content = m.getAttribute("content") || "";
          // parse "5; url=...".
          const parts = content.split(";");
          if (parts.length > 1) {
            const urlPart = parts.slice(1).join(";").trim();
            const match = urlPart.match(/url=(.*)/i);
            if (match) {
              const rawUrl = match[1].replace(/^['"]|['"]$/g, "");
              try {
                const resolved = new URL(rawUrl, target).toString();
                m.setAttribute("content", `${parts[0]}; url=/proxy?url=${encodeURIComponent(resolved)}`);
              } catch {}
            }
          }
        }
      });

      // inject client-side proxy patch for fetch/XHR/WebSocket
      const patchScript = document.createElement("script");
      patchScript.setAttribute("nonce", "interstellar-patch");
      patchScript.textContent = CLIENT_SIDE_PATCH_SCRIPT(target.origin);
      document.documentElement.prepend(patchScript);

      const out = dom.serialize();
      res.setHeader("content-type", "text/html; charset=utf-8");
      res.send(out);
      return;
    }

    // CSS handling: rewrite url(...) occurrences to pass through /proxy
    if (isCssContentType(contentType)) {
      const cssText = await upstream.text();
      // naive replacement for url(...) that are not data: URLs
      const rewritten = cssText.replace(/url\(([^)]+)\)/gi, (m, g1) => {
        let urlStr = g1.trim().replace(/^['"]|['"]$/g, "");
        if (/^data:/i.test(urlStr)) return `url(${urlStr})`;
        try {
          const resolved = new URL(urlStr, target).toString();
          return `url(/proxy?url=${encodeURIComponent(resolved)})`;
        } catch {
          return `url(${urlStr})`;
        }
      });
      res.setHeader("content-type", "text/css; charset=utf-8");
      res.send(rewritten);
      return;
    }

    // others -> stream bytes
    const buf = Buffer.from(await upstream.arrayBuffer());
    const ct = contentType || mime.lookup(target.pathname) || "application/octet-stream";
    res.setHeader("content-type", ct);
    res.send(buf);
  } catch (err) {
    console.error("proxy error:", err);
    res.status(502).send("Bad Gateway");
  }
});

// WebSocket proxying endpoint
// Clients should connect to ws://yourserver/ws?url=<ws://target> OR the injected client patch rewrites WebSocket to this.
app.get("/ws", authMiddleware, (req, res) => {
  res.status(400).send("This endpoint only supports WebSocket upgrades.");
});

// handle upgrades for /ws?url=...
server.on("upgrade", (req, socket, head) => {
  // parse url path & query
  const parsed = new URL(req.url || "", `http://${req.headers.host}`);
  if (parsed.pathname !== "/ws") {
    socket.destroy();
    return;
  }
  const raw = parsed.searchParams.get("url") || "";
  const target = getTargetUrl(raw);
  if (!target) {
    socket.write("HTTP/1.1 400 Bad Request\r\n\r\n");
    socket.destroy();
    return;
  }

  // authentication: this is a raw upgrade, so implement simple token/basic check via headers
  if ((PROXY_USER && PROXY_PASS) || PROXY_TOKEN) {
    let allowed = false;
    // token header
    const token = req.headers["x-proxy-token"];
    if (PROXY_TOKEN && token === PROXY_TOKEN) allowed = true;
    // Basic auth header
    const auth = (req.headers["authorization"] as string) || "";
    if (!allowed && auth.startsWith("Basic ")) {
      const decoded = Buffer.from(auth.slice(6), "base64").toString("utf-8");
      const [u, p] = decoded.split(":");
      if (u === PROXY_USER && p === PROXY_PASS) allowed = true;
    }
    if (!allowed) {
      socket.write("HTTP/1.1 401 Unauthorized\r\nWWW-Authenticate: Basic realm=\"Interstellar-Lite\"\r\n\r\n");
      socket.destroy();
      return;
    }
  }

  // use http-proxy to proxy WS
  // note: target must be ws:// or wss://; http-proxy will upgrade accordingly
  proxy.ws(req, socket as any, head, { target: target.origin });
});

// Basic health
app.get("/health", (req, res) => res.json({ ok: true, ts: Date.now() }));

// generic error handler
proxy.on("error", (err) => {
  console.error("proxy error:", err);
});

// start server
server.listen(PORT, () => {
  console.log(`Proxy server running on http://localhost:${PORT}`);
});

// ---------- Client-side patch script factory ----------
// Injected into proxied HTML to rewrite fetch/XHR/WebSocket at runtime to go through our /proxy and /ws endpoints.
// Note: this is a best-effort patch; sites with strict CSP or heavy obfuscation might still fail.
function CLIENT_SIDE_PATCH_SCRIPT(origOrigin: string): string {
  // Using template string to produce a compact script
  return `
(function(){
  try {
    const encode = (u)=>'/proxy?url='+encodeURIComponent(new URL(u, location.href).toString());
    // patch fetch
    const _fetch = window.fetch;
    window.fetch = function(input, init){
      try{
        const url = (typeof input === 'string')? input : input instanceof Request ? input.url : '';
        if(url && !url.startsWith('/proxy') && !url.startsWith(location.origin)){
          input = typeof input === 'string' ? encode(url) : new Request(encode(url), init || {});
        }
      }catch(e){}
      return _fetch.call(this, input, init);
    };
    // patch XHR
    const XHR = window.XMLHttpRequest;
    function patchedOpen(method, url){
      try{
        if(url && !url.startsWith('/proxy') && !url.startsWith(location.origin)){
          url = encode(url);
        }
      }catch(e){}
      return XHR.prototype.open.call(this, method, url, ...Array.prototype.slice.call(arguments,3));
    }
    if(window.XMLHttpRequest){
      const origOpen = XHR.prototype.open;
      XHR.prototype.open = function(method, url){
        try{
          if(url && !url.startsWith('/proxy') && !url.startsWith(location.origin)){
            url = encode(url);
          }
        }catch(e){}
        return origOpen.apply(this, [method, url].concat(Array.prototype.slice.call(arguments,2)));
      };
    }
    // patch WebSocket to connect via /ws?url=
    const OrigWS = window.WebSocket;
    window.WebSocket = function(url, protocols){
      try{
        if(typeof url === 'string' && !url.startsWith('/ws') && !url.startsWith(location.origin)){
          const proxied = '/ws?url=' + encodeURIComponent(new URL(url, location.href).toString());
          return new OrigWS.call(this, proxied, protocols);
        }
      }catch(e){}
      return new OrigWS.call(this, url, protocols);
    };
    window.WebSocket.prototype = OrigWS.prototype;
  }catch(e){
    console.error('Client proxy patch error', e);
  }
})();
`;
}
// inside /proxy handler, before fetch
const rangeHeader = req.headers['range'];
const fetchOptions: RequestInit = {
  method: "GET",
  headers: {
    "User-Agent": req.get("User-Agent") || "",
    "Accept": req.get("Accept") || "*/*",
    ...(rangeHeader ? { "Range": rangeHeader as string } : {})
  },
  redirect: "follow"
};
const upstream = await fetch(target.toString(), fetchOptions);

// copy status, headers as before
// if upstream.headers.get("Accept-Ranges") or range was requested
if (rangeHeader && upstream.status === 206) {
  // partial content
  res.setHeader("Accept-Ranges", upstream.headers.get("Accept-Ranges") || "bytes");
  res.setHeader("Content-Range", upstream.headers.get("Content-Range") || "");
  res.status(206);
} else {
  res.status(upstream.status);
}
// then proceed to send buffer or text
import { createApp } from "./app";
import http from "http";

const app = createApp();
const port = process.env.PORT || 8080;
const server = http.createServer(app);

server.listen(port, () => {
  console.log(`🚀 Proxy server running on port ${port}`);
});

export default server;

import { createApp } from './app';

const app = createApp();
const port = process.env.PORT || 3000;

app.listen(port, () => {
  console.log(`Server running at http://localhost:${port}`);
});

import { createServer } from "http";
import app from "./app";

const port = process.env.PORT || 3000;
const server = createServer(app);

server.listen(port, () => {
  console.log(`Proxy server listening on port ${port}`);
});

