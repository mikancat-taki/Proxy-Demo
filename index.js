const express = require('express');
const { createProxyMiddleware } = require('http-proxy-middleware');
const cors = require('cors');
const url = require('url');

const app = express();
app.use(cors());
app.use(express.json());
app.use(express.static('public')); // フロントUI

// DuckDuckGo検索
app.get('/search', (req, res) => {
  const q = req.query.q || '';
  res.redirect(`https://duckduckgo.com/?q=${encodeURIComponent(q)}`);
});

// 動的プロキシ
app.use('/proxy', createProxyMiddleware({
  target: 'https://example.com', // デフォルトターゲット
  changeOrigin: true,
  ws: true, // WebSocket対応
  pathRewrite: (path, req) => {
    const parts = path.split('/');
    parts.shift(); // ''
    parts.shift(); // 'proxy'
    const targetUrl = decodeURIComponent(parts.join('/'));
    const parsed = url.parse(targetUrl);
    return parsed.path || '/';
  },
  onProxyReq: (proxyReq, req, res) => {
    proxyReq.setHeader('X-Forwarded-Host', req.headers.host);
  },
  onProxyRes: (proxyRes, req, res) => {
    // 必要に応じてCookie書き換え
  },
}));

// サーバー起動
const port = process.env.PORT || 3000;
app.listen(port, () => {
  console.log(`Proxy server running on port ${port}`);
});
