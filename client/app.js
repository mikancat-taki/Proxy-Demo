const urlBar = document.getElementById('url-bar');
const goBtn = document.getElementById('go-btn');
const webview = document.getElementById('webview');

const runBtn = document.getElementById('run-btn');
const codeArea = document.getElementById('code-area');
const langSelect = document.getElementById('lang-select');
const output = document.getElementById('output');

// URLバー
goBtn.addEventListener('click', () => {
  const val = urlBar.value;
  if(val.startsWith('http')) {
    const encoded = btoa(val);
    webview.src = `/proxy/${encoded}`;
  } else {
    window.location.href = `/search?q=${encodeURIComponent(val)}`;
  }
});

// コード実行
runBtn.addEventListener('click', async () => {
  const code = codeArea.value;
  const lang = langSelect.value;
  const res = await fetch('/run', {
    method: 'POST',
    headers: {'Content-Type': 'application/json'},
    body: JSON.stringify({lang, code})
  });
  const data = await res.json();
  output.textContent = data.output || data.error;
});

// WebSocket
const ws = new WebSocket(`ws://${location.host}/ws`);
ws.onmessage = (msg) => console.log('WS:', msg.data);
ws.onopen = () => console.log('WebSocket connected');
