const { spawn } = require('child_process');
const { writeFileSync } = require('fs');
const { resolve } = require('path');

const CHROME_PATH = 'C:\\Program Files\\Google\\Chrome\\Application\\chrome.exe';
const DEBUG_PORT = 9380;
const TARGET_URL = 'http://localhost:3000';
const ARTIFACT_DIR = './reports';

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
    let wsUrl = null;
    for (let i = 0; i < 25; i++) {
      await new Promise(r => setTimeout(r, 400));
      try {
        const res = await fetch(`http://127.0.0.1:${DEBUG_PORT}/json/version`);
        if (res.ok) {
          const d = await res.json();
          wsUrl = d.webSocketDebuggerUrl;
          break;
        }
      } catch (_) {}
    }

    const ws = new WebSocket(wsUrl);
    await new Promise(r => ws.onopen = r);

    let id = 1;
    const send = (m, p = {}) => new Promise((res, rej) => {
      const curId = id++;
      const handler = (e) => {
        const d = JSON.parse(e.data);
        if (d.id === curId) {
          ws.removeEventListener('message', handler);
          if (d.error) rej(d.error);
          else res(d.result);
        }
      };
      ws.addEventListener('message', handler);
      ws.send(JSON.stringify({ id: curId, method: m, params: p }));
    });

    const { targetId } = await send('Target.createTarget', { url: TARGET_URL });
    const pageRes = await fetch(`http://127.0.0.1:${DEBUG_PORT}/json/list`);
    const pages = await pageRes.json();
    const pageTarget = pages.find(p => p.id === targetId) || pages[0];

    const pageWs = new WebSocket(pageTarget.webSocketDebuggerUrl);
    await new Promise(r => pageWs.onopen = r);

    let pageMsgId = 1;
    const pagePending = new Map();
    pageWs.onmessage = (event) => {
      const data = JSON.parse(event.data);
      if (data.id && pagePending.has(data.id)) {
        const { resolve: pRes, reject: pRej } = pagePending.get(data.id);
        pagePending.delete(data.id);
        if (data.error) pRej(data.error);
        else pRes(data.result);
      }
    };

    function sendPage(method, params = {}) {
      return new Promise((resolve, reject) => {
        const cur = pageMsgId++;
        pagePending.set(cur, { resolve, reject });
        pageWs.send(JSON.stringify({ id: cur, method, params }));
      });
    }

    await sendPage('Page.enable');
    await sendPage('Runtime.enable');
    await sendPage('Emulation.setDeviceMetricsOverride', {
      width: 1536,
      height: 695,
      deviceScaleFactor: 1,
      mobile: false
    });

    await sendPage('Page.navigate', { url: TARGET_URL });
    await new Promise(r => setTimeout(r, 3000));

    async function evaluate(exp) {
      const r = await sendPage('Runtime.evaluate', { expression: exp, returnByValue: true });
      return r.result?.value;
    }

    async function captureScreenshot(filename) {
      const snap = await sendPage('Page.captureScreenshot', { format: 'png' });
      const fullPath = resolve(ARTIFACT_DIR, filename);
      writeFileSync(fullPath, Buffer.from(snap.data, 'base64'));
      console.log(`Saved screenshot: ${filename}`);
    }

    // Go to Tab 3: Block Deals
    await evaluate(`window.dispatchEvent(new KeyboardEvent('keydown', { key: '3' }))`);
    await new Promise(r => setTimeout(r, 1200));

    // Scroll main container to show deals table
    await evaluate(`document.querySelector('main').scrollBy(0, 480)`);
    await new Promise(r => setTimeout(r, 600));
    await captureScreenshot('mkt_cap_blockdeals_table_rows_1536x695.png');

    // Go to Tab 2: Swing Radar
    await evaluate(`window.dispatchEvent(new KeyboardEvent('keydown', { key: '2' }))`);
    await new Promise(r => setTimeout(r, 1200));

    // Click "SMALL" cap in Swing Radar
    await evaluate(`(() => {
      const btn = Array.from(document.querySelectorAll('button')).find(b => b.innerText.includes('SMALL'));
      if (btn) btn.click();
    })()`);
    await new Promise(r => setTimeout(r, 600));

    // Scroll main container to show radar candidate rows
    await evaluate(`document.querySelector('main').scrollBy(0, 520)`);
    await new Promise(r => setTimeout(r, 600));
    await captureScreenshot('mkt_cap_swing_candidate_rows_1536x695.png');

    pageWs.close();
    ws.close();
  } finally {
    chrome.kill('SIGTERM');
  }
}

run().catch(console.error);
