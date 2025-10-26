// src/server.ts
import express from "express";
import fetch, { RequestInit, Response as FetchResponse } from "node-fetch";
import { JSDOM } from "jsdom";
import path from "path";
import mime from "mime-types";
import { URL } from "url";

const app = express();
const PORT = process.env.PORT ? Number(process.env.PORT) : 8080;

app.use(express.static(path.join(process.cwd(), "public")));

// helper: is a content-type HTML?
function isHtmlContentType(ct?: string | null): boolean {
  if (!ct) return false;
  return ct.includes("text/html");
}

// sanitize and validate target URL
function getTargetUrl(raw?: string): URL | null {
  if (!raw) return null;
  try {
    // ensure protocol present
    const url = new URL(raw);
    if (!["http:", "https:"].includes(url.protocol)) return null;
    return url;
  } catch {
    // try add https if missing
    try {
      const url = new URL("https://" + raw);
      return url;
    } catch {
      return null;
    }
  }
}

// main proxy endpoint
app.get("/proxy", async (req, res) => {
  const raw = (req.query.url as string) || "";
  const target = getTargetUrl(raw);
  if (!target) {
    res.status(400).send("Missing or invalid 'url' query parameter.");
    return;
  }

  // build headers to forward user-agent & accept to better mimic browser
  const forwardHeaders: Record<string,string> = {
    "User-Agent": req.get("User-Agent") || "Interstellar-Lite/1.0",
    "Accept": req.get("Accept") || "*/*"
  };

  const fetchOptions: RequestInit = {
    method: "GET",
    headers: forwardHeaders,
    redirect: "follow"
  };

  try {
    const upstream: FetchResponse = await fetch(target.toString(), fetchOptions);

    // copy status code
    res.status(upstream.status);

    // copy headers except hop-by-hop ones
    upstream.headers.forEach((value, key) => {
      // skip hop-by-hop headers
      const hopByHop = [
        "connection","keep-alive","proxy-authenticate","proxy-authorization",
        "te","trailers","transfer-encoding","upgrade"
      ];
      if (!hopByHop.includes(key.toLowerCase())) {
        res.setHeader(key, value);
      }
    });

    const contentType = upstream.headers.get("content-type");

    if (isHtmlContentType(contentType)) {
      const body = await upstream.text();
      // Parse HTML and rewrite resource URLs to point back to /proxy?url=...
      const dom = new JSDOM(body, { url: target.toString() });
      const document = dom.window.document;

      // inject a <base> pointing to the proxied site origin to help relative links
      const baseEl = document.querySelector("base") ?? document.createElement("base");
      baseEl.setAttribute("href", target.origin + "/");
      if (!baseEl.parentElement) {
        const head = document.querySelector("head");
        if (head) head.prepend(baseEl);
      }

      // function to rewrite URLs for attributes that load resources / navigation
      function rewriteAttr(selector: string, attr: string) {
        document.querySelectorAll(selector).forEach((el: Element) => {
          const v = (el as any).getAttribute(attr);
          if (!v) return;
          try {
            const resolved = new URL(v, target).toString();
            (el as any).setAttribute(attr, `/proxy?url=${encodeURIComponent(resolved)}`);
          } catch {
            // ignore
          }
        });
      }

      // rewrite common attributes
      rewriteAttr("a", "href");
      rewriteAttr("link", "href");
      rewriteAttr("img", "src");
      rewriteAttr("script", "src");
      rewriteAttr("iframe", "src");
      rewriteAttr("source", "src");
      rewriteAttr("video", "src");
      rewriteAttr("audio", "src");
      rewriteAttr("form", "action");

      // small convenience: add a header bar to allow returning to our UI (optional)
      const topBar = document.createElement("div");
      topBar.innerHTML = `
        <div style="position:fixed;left:0;right:0;top:0;height:44px;background:rgba(0,0,0,0.6);color:#fff;z-index:9999;display:flex;align-items:center;padding:0 12px;font-family:Arial,Helvetica,sans-serif">
          <a href="/" style="color:#fff;text-decoration:none;margin-right:12px;">← Back</a>
          <div style="font-size:13px;opacity:0.9">Proxied: ${target.hostname}</div>
        </div>
      `;
      const bodyEl = document.querySelector("body");
      if (bodyEl) {
        bodyEl.style.paddingTop = "48px";
        bodyEl.prepend(topBar);
      }

      const out = dom.serialize();
      res.setHeader("content-type", "text/html; charset=utf-8");
      res.send(out);
      return;
    }

    // Non-HTML (images, css, scripts, etc.) -> stream raw bytes
    const buffer = await upstream.arrayBuffer();
    const buf = Buffer.from(buffer);
    // set fallback content-type if upstream didn't provide one
    const ct = contentType || mime.lookup(target.pathname) || "application/octet-stream";
    res.setHeader("content-type", ct);
    res.send(buf);
  } catch (err: any) {
    console.error("Proxy error:", err);
    res.status(502).send("Bad Gateway (fetch failed).");
  }
});

// simple health route
app.get("/health", (req, res) => {
  res.json({ ok: true, timestamp: Date.now() });
});

// start
app.listen(PORT, () => {
  console.log(`Interstellar-lite proxy running at http://localhost:${PORT}`);
});
