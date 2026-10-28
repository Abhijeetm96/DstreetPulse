const { spawn } = require('child_process');
const { writeFileSync } = require('fs');
const { resolve } = require('path');

const CHROME_PATH = 'C:\\Program Files\\Google\\Chrome\\Application\\chrome.exe';
const DEBUG_PORT = 9410;
const TARGET_URL = 'http://localhost:3000/#stock/RELIANCE';
const ARTIFACT_DIR = 'C:\\Users\\abhij\\.gemini\\antigravity\\brain\\92ab32d3-0008-484e-b83a-09e26113ed64';

async function run() {
  const chrome = spawn(CHROME_PATH, [
    `--remote-debugging-port=${DEBUG_PORT}`,
    '--headless=new',
    '--window-size=1536,695',
    '--hide-scrollbars',
    '--disable-gpu',
    '--no-sandbox',
    '--remote-allow-origins=*'
  ]);

  try {
    await new Promise(r => setTimeout(r, 1500));
    const v = await fetch(`http://127.0.0.1:${DEBUG_PORT}/json/version`).then(r => r.json());
    const ws = new WebSocket(v.webSocketDebuggerUrl);
    await new Promise(r => ws.onopen = r);

    let id = 1;
    const send = (m, p = {}) => new Promise(res => {
      const cur = id++;
      const h = e => { const d = JSON.parse(e.data); if (d.id === cur) { ws.removeEventListener('message', h); res(d.result); }};
      ws.addEventListener('message', h);
      ws.send(JSON.stringify({ id: cur, method: m, params: p }));
    });

    const { targetId } = await send('Target.createTarget', { url: TARGET_URL });
    const list = await fetch(`http://127.0.0.1:${DEBUG_PORT}/json/list`).then(r => r.json());
    const page = list.find(p => p.id === targetId);
    const pws = new WebSocket(page.webSocketDebuggerUrl);
    await new Promise(r => pws.onopen = r);

    let pid = 1;
    const psend = (m, p = {}) => new Promise((res, rej) => {
      const cur = pid++;
      const h = e => { const d = JSON.parse(e.data); if (d.id === cur) { pws.removeEventListener('message', h); if (d.error) rej(d.error); else res(d.result); }};
      pws.addEventListener('message', h);
      pws.send(JSON.stringify({ id: cur, method: m, params: p }));
    });

    await psend('Page.enable');
    await psend('Runtime.enable');
    await psend('Emulation.setDeviceMetricsOverride', {
      width: 1536,
      height: 695,
      deviceScaleFactor: 1,
      mobile: false
    });

    console.log('Navigating to', TARGET_URL);
    await new Promise(r => setTimeout(r, 3500));

    async function evaluate(exp) {
      const r = await psend('Runtime.evaluate', { expression: exp, returnByValue: true });
      return r.result?.value;
    }

    async function captureScreenshot(filename) {
      const snap = await psend('Page.captureScreenshot', { format: 'png' });
      const fullPath = resolve(ARTIFACT_DIR, filename);
      writeFileSync(fullPath, Buffer.from(snap.data, 'base64'));
      console.log(`Saved screenshot: ${filename}`);
    }

    // 1. Full Page Dedicated Terminal
    console.log('Capturing Dedicated Full Page Terminal...');
    await captureScreenshot('stock_terminal_dedicated_page_1536x695.png');

    // 2. Click "Technical Chart"
    console.log('Switching to Technical Chart...');
    await evaluate(`(() => {
      const btn = Array.from(document.querySelectorAll('button')).find(b => b.textContent.includes('Technical Chart'));
      if (btn) btn.click();
    })()`);
    await new Promise(r => setTimeout(r, 1200));
    await captureScreenshot('stock_terminal_technical_chart_1536x695.png');

    // 3. Switch to Split Dock Mode
    console.log('Switching to Split Dock...');
    await evaluate(`(() => {
      const btn = Array.from(document.querySelectorAll('button')).find(b => b.textContent.includes('Split Dock'));
      if (btn) btn.click();
    })()`);
    await new Promise(r => setTimeout(r, 1200));
    await captureScreenshot('stock_terminal_split_dock_1536x695.png');

    // 4. Switch to Drawer Mode
    console.log('Switching to Drawer...');
    await evaluate(`(() => {
      const btn = Array.from(document.querySelectorAll('button')).find(b => b.textContent.includes('Drawer'));
      if (btn) btn.click();
    })()`);
    await new Promise(r => setTimeout(r, 1200));
    await captureScreenshot('stock_terminal_drawer_1536x695.png');

    // 5. Switch to Mini PiP Mode
    console.log('Switching to Mini PiP...');
    await evaluate(`(() => {
      const btn = Array.from(document.querySelectorAll('button')).find(b => b.textContent.includes('Mini PiP'));
      if (btn) btn.click();
    })()`);
    await new Promise(r => setTimeout(r, 1200));
    await captureScreenshot('stock_terminal_pip_1536x695.png');

    pws.close();
    ws.close();
    console.log('All verification captures completed!');
  } finally {
    chrome.kill();
  }
}

run().catch(console.error);
