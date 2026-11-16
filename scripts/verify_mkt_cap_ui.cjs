const { spawn } = require('child_process');
const { writeFileSync } = require('fs');
const { resolve } = require('path');

const CHROME_PATH = 'C:\\Program Files\\Google\\Chrome\\Application\\chrome.exe';
const DEBUG_PORT = 9360;
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

    // 1. Live Market: Click "MID" Cap filter
    const clickMidRes = await evaluate(`(() => {
      const btn = Array.from(document.querySelectorAll('button')).find(b => b.innerText.includes('MID'));
      if (btn) {
        btn.click();
        return 'Clicked MID button';
      }
      return 'MID button not found';
    })()`);
    console.log(clickMidRes);
    await new Promise(r => setTimeout(r, 1000));
    await captureScreenshot('mkt_cap_filter_mid_livemarket_1536x695.png');

    // Click "PENNY" Cap filter
    const clickPennyRes = await evaluate(`(() => {
      const btn = Array.from(document.querySelectorAll('button')).find(b => b.innerText.includes('PENNY'));
      if (btn) {
        btn.click();
        return 'Clicked PENNY button';
      }
      return 'PENNY button not found';
    })()`);
    console.log(clickPennyRes);
    await new Promise(r => setTimeout(r, 1000));
    await captureScreenshot('mkt_cap_filter_penny_livemarket_1536x695.png');

    // 2. Switch to "Top Movers" (Gainers & Losers)
    const navMovers = await evaluate(`(() => {
      const link = Array.from(document.querySelectorAll('nav a, button, [role="button"], div')).find(el => el.innerText && el.innerText.includes('Top Movers'));
      if (link) {
        link.click();
        return 'Navigated to Top Movers';
      }
      return 'Top Movers link not found';
    })()`);
    console.log(navMovers);
    await new Promise(r => setTimeout(r, 1500));

    // Click "LARGE" in Top Movers
    await evaluate(`(() => {
      const btn = Array.from(document.querySelectorAll('button')).find(b => b.innerText.includes('LARGE'));
      if (btn) btn.click();
    })()`);
    await new Promise(r => setTimeout(r, 1000));
    await captureScreenshot('mkt_cap_filter_large_gainers_1536x695.png');

    // 3. Switch to "CM Bhavcopy"
    const navBhavcopy = await evaluate(`(() => {
      const link = Array.from(document.querySelectorAll('nav a, button, [role="button"], div')).find(el => el.innerText && el.innerText.includes('CM Bhavcopy'));
      if (link) {
        link.click();
        return 'Navigated to CM Bhavcopy';
      }
      return 'CM Bhavcopy link not found';
    })()`);
    console.log(navBhavcopy);
    await new Promise(r => setTimeout(r, 1500));

    // Click "SMALL" in Bhavcopy
    await evaluate(`(() => {
      const btn = Array.from(document.querySelectorAll('button')).find(b => b.innerText.includes('SMALL'));
      if (btn) btn.click();
    })()`);
    await new Promise(r => setTimeout(r, 1000));
    await captureScreenshot('mkt_cap_filter_small_bhavcopy_1536x695.png');

    // 4. Switch to "Block & Bulk" (Smart Money & Deals)
    const navDeals = await evaluate(`(() => {
      const link = Array.from(document.querySelectorAll('nav a, button, [role="button"], div')).find(el => el.innerText && el.innerText.includes('Block & Bulk'));
      if (link) {
        link.click();
        return 'Navigated to Block & Bulk Deals';
      }
      return 'Block & Bulk Deals link not found';
    })()`);
    console.log(navDeals);
    await new Promise(r => setTimeout(r, 1500));

    // Click "LARGE" in Deals
    await evaluate(`(() => {
      const btn = Array.from(document.querySelectorAll('button')).find(b => b.innerText.includes('LARGE'));
      if (btn) btn.click();
    })()`);
    await new Promise(r => setTimeout(r, 1000));
    await captureScreenshot('mkt_cap_filter_large_deals_1536x695.png');

    pageWs.close();
    ws.close();
    console.log('All screenshots captured successfully!');
  } finally {
    chrome.kill('SIGTERM');
  }
}

run().catch(console.error);
