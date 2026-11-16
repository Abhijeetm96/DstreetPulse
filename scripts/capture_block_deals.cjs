const { spawn } = require('child_process');
const { writeFileSync } = require('fs');
const { resolve } = require('path');

const CHROME_PATH = 'C:\\Program Files\\Google\\Chrome\\Application\\chrome.exe';
const DEBUG_PORT = 9345;
const TARGET_URL = 'http://localhost:3000';
const ARTIFACT_DIR = './reports';

async function capture() {
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
    for (let i = 0; i < 20; i++) {
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
    const send = (m, p = {}) => new Promise((resolve, reject) => {
      const curId = id++;
      const handler = (e) => {
        const d = JSON.parse(e.data);
        if (d.id === curId) {
          ws.removeEventListener('message', handler);
          if (d.error) reject(d.error);
          else resolve(d.result);
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
        const { resolve, reject } = pagePending.get(data.id);
        pagePending.delete(data.id);
        if (data.error) reject(data.error);
        else resolve(data.result);
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
    await sendPage('Page.navigate', { url: TARGET_URL });
    await new Promise(r => setTimeout(r, 2500));

    // Switch to Block & Bulk Deals tab
    await sendPage('Runtime.evaluate', {
      expression: `(() => {
        const btns = Array.from(document.querySelectorAll('button'));
        const dealBtn = btns.find(b => b.textContent.includes('Block') || b.textContent.includes('Smart Money'));
        if (dealBtn) dealBtn.click();
      })()`
    });
    await new Promise(r => setTimeout(r, 1500));

    const screenshot = await sendPage('Page.captureScreenshot', { format: 'png' });
    const localPath = resolve(process.cwd(), 'block_deals_1536x695.png');
    writeFileSync(localPath, Buffer.from(screenshot.data, 'base64'));
    const artifactPath = resolve(ARTIFACT_DIR, 'block_deals_1536x695.png');
    writeFileSync(artifactPath, Buffer.from(screenshot.data, 'base64'));

    console.log('>>> Block Deals screenshot successfully captured at:', artifactPath);
    chrome.kill();
  } catch (err) {
    console.error('Capture error:', err);
    chrome.kill();
  }
}

capture();

