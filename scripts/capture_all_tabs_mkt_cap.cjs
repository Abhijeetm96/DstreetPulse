const { spawn } = require('child_process');
const { writeFileSync } = require('fs');
const { resolve } = require('path');

const CHROME_PATH = 'C:\\Program Files\\Google\\Chrome\\Application\\chrome.exe';
const DEBUG_PORT = 9370;
const TARGET_URL = 'http://localhost:3000';
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

    if (!wsUrl) throw new Error('Failed to connect to Chrome debugging port');

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

    console.log('Navigating to', TARGET_URL);
    await sendPage('Page.navigate', { url: TARGET_URL });
    await new Promise(r => setTimeout(r, 3500));

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

    async function switchTab(tabNum) {
      await evaluate(`window.dispatchEvent(new KeyboardEvent('keydown', { key: '${tabNum}' }))`);
      await new Promise(r => setTimeout(r, 1200));
    }

    async function clickCap(capName) {
      return await evaluate(`(() => {
        const btns = Array.from(document.querySelectorAll('button'));
        const btn = btns.find(b => b.innerText.includes('${capName}'));
        if (btn) {
          btn.click();
          return 'Clicked ' + '${capName}';
        }
        return '${capName} not found';
      })()`);
    }

    // Tab 8: Gainers & Losers (Top Movers)
    console.log('Testing Tab 8 (Gainers & Losers)...');
    await switchTab(8);
    console.log(await clickCap('LARGE'));
    await new Promise(r => setTimeout(r, 1000));
    await captureScreenshot('mkt_cap_gainers_large_1536x695.png');

    // Tab 7: CM Bhavcopy
    console.log('Testing Tab 7 (CM Bhavcopy)...');
    await switchTab(7);
    console.log(await clickCap('PENNY'));
    await new Promise(r => setTimeout(r, 1000));
    await captureScreenshot('mkt_cap_bhavcopy_penny_1536x695.png');

    // Tab 9: Most Active Securities
    console.log('Testing Tab 9 (Most Active)...');
    await switchTab(9);
    console.log(await clickCap('MID'));
    await new Promise(r => setTimeout(r, 1000));
    await captureScreenshot('mkt_cap_mostactive_mid_1536x695.png');

    // Tab 3: Block & Bulk Deals
    console.log('Testing Tab 3 (Block Deals)...');
    await switchTab(3);
    console.log(await clickCap('LARGE'));
    await new Promise(r => setTimeout(r, 1000));
    await captureScreenshot('mkt_cap_blockdeals_large_1536x695.png');

    // Tab 2: Swing Radar
    console.log('Testing Tab 2 (Swing Radar)...');
    await switchTab(2);
    console.log(await clickCap('MID'));
    await new Promise(r => setTimeout(r, 1000));
    await captureScreenshot('mkt_cap_swing_mid_1536x695.png');

    pageWs.close();
    ws.close();
    console.log('All verification screenshots captured successfully!');
  } finally {
    chrome.kill('SIGTERM');
  }
}

run().catch(console.error);

