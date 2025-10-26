const express = require('express');
const { createProxyMiddleware } = require('http-proxy-middleware');
const bodyParser = require('body-parser');
const { WebSocketServer } = require('ws');
const { exec } = require('child_process');
const app = express();
const port = process.env.PORT || 3000;

// JSON パース
app.use(bodyParser.json());

// DuckDuckGo検索
app.get('/search', (req, res) => {
  const query = encodeURIComponent(req.query.q || '');
  res.redirect(`https://duckduckgo.com/?q=${query}`);
});

// HTTP/HTTPSプロキシ
app.use('/proxy/:url', (req, res, next) => {
  const targetUrl = Buffer.from(req.params.url, 'base64').toString('utf8');
  createProxyMiddleware({
    target: targetUrl,
    changeOrigin: true,
    ws: true,
    onProxyReq: (proxyReq, req, res) => {
      // 必要ならヘッダー書き換え
    }
  })(req, res, next);
});

// コード実行
app.post('/run', (req, res) => {
  const { lang, code } = req.body;
  if (!lang || !code) return res.status(400).json({ error: 'lang or code missing' });

  let cmd;
  switch(lang.toLowerCase()) {
    case 'python':
      cmd = `python3 -c "${code.replace(/"/g, '\\"')}"`;
      break;
    case 'javascript':
      cmd = `node -e "${code.replace(/"/g, '\\"')}"`;
      break;
    case 'go':
      cmd = `go run - <<EOF
${code}
EOF`;
      break;
    default:
      return res.status(400).json({ error: 'unsupported language' });
  }

  exec(cmd, { timeout: 5000 }, (error, stdout, stderr) => {
    if (error) return res.json({ error: stderr || error.message });
    res.json({ output: stdout });
  });
});

// WebSocket
const server = app.listen(port, () => console.log(`Server running on port ${port}`));
const wss = new WebSocketServer({ server, path: '/ws' });

wss.on('connection', (ws) => {
  ws.on('message', (msg) => {
    // 受信したメッセージをそのまま返す（デモ）
    ws.send(`Server received: ${msg}`);
  });
});

