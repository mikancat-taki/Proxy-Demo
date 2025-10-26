const express = require('express');
const { createProxyMiddleware } = require('http-proxy-middleware');
const cors = require('cors');
const url = require('url');

const app = express();
app.use(cors());
app.use(express.json());
app.use(express.static('public')); // フロントUI

// DuckDuckGo 検索
app.get('/search', (req, res) => {
  const q = req.query.q || '';
  res.redirect(`https://duckduckgo.com/?q=${encodeURIComponent(q)}`);
});

// 動的プロキシ
app.use('/proxy', createProxyMiddleware({
  target: 'https://example.com', // デフォルトターゲット
  changeOrigin: true,
  ws: true, // WebSocket 対応
  pathRewrite: (path, req) => {
    // /proxy/<url> を元の URL に変換
    const parts = path.split('/');
    parts.shift(); // '' (最初の /)
    parts.shift(); // 'proxy'
    const targetUrl = decodeURIComponent(parts.join('/'));
    return url.parse(targetUrl).path || '/';
  },
  onProxyReq: (proxyReq, req, res) => {
    // 必要ならヘッダーを書き換え
    proxyReq.setHeader('X-Forwarded-Host', req.headers.host);
  },
  onProxyRes: (proxyRes, req, res) => {
    // Cookie 書き換え等必要ならここで
  },
}));

// サーバー起動
const port = process.env.PORT || 3000;
app.listen(port, () => {
  console.log(`Proxy server running on
