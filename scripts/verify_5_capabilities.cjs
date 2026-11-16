const { spawn } = require('child_process');
const { writeFileSync } = require('fs');
const { resolve } = require('path');

const CHROME_PATH = 'C:\\Program Files\\Google\\Chrome\\Application\\chrome.exe';
const DEBUG_PORT = 9348;
const TARGET_URL = 'http://localhost:3000';
const ARTIFACT_DIR = './reports';

async function run() {
  console.log('Launching headless Chrome for 5 Capabilities Verification...');
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

    if (!wsUrl) throw new Error('Could not connect to Chrome debugger');

    const browserWs = new WebSocket(wsUrl);
    await new Promise(r => browserWs.onopen = r);

    let id = 1;
    const sendBrowser = (m, p = {}) => new Promise((resolve, reject) => {
      const curId = id++;
      const handler = (e) => {
        const d = JSON.parse(e.data);
        if (d.id === curId) {
          browserWs.removeEventListener('message', handler);
          if (d.error) reject(d.error);
          else resolve(d.result);
        }
      };
      browserWs.addEventListener('message', handler);
      browserWs.send(JSON.stringify({ id: curId, method: m, params: p }));
    });

    const { targetId } = await sendBrowser('Target.createTarget', { url: TARGET_URL });
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
    await sendPage('Runtime.enable');
    await sendPage('Emulation.setDeviceMetricsOverride', {
      width: 1536,
      height: 695,
      deviceScaleFactor: 1,
      mobile: false
    });

    await new Promise(r => setTimeout(r, 2500));

    // 1. Switch to Tab 2: Swing Scanner (Radar) via key '2'
    console.log('Switching to Swing Scanner tab via keypress 2...');
    await sendPage('Runtime.evaluate', {
      expression: `window.dispatchEvent(new KeyboardEvent('keydown', { key: '2' }))`
    });
    await new Promise(r => setTimeout(r, 1500));

    // 2. Audit Radar Table Columns
    const radarAudit = await sendPage('Runtime.evaluate', {
      expression: `(() => {
        const headers = Array.from(document.querySelectorAll('th')).map(th => th.innerText.trim());
        const rows = document.querySelectorAll('tbody tr').length;
        const bodyText = document.querySelector('tbody')?.innerText || '';

        const hasConfluence = bodyText.includes('W') && (bodyText.includes('3x ALIGNED') || bodyText.includes('PARTIAL'));
        const hasMonteCarlo = bodyText.includes('🎯') && bodyText.includes('EV');
        const hasFootprint = bodyText.includes('VQR');
        const hasTradeDoctor = bodyText.includes('/100');
        const hasCopyBasket = Array.from(document.querySelectorAll('button')).some(b => b.innerText.includes('Copy Basket'));
        const hasQuickFilters = Array.from(document.querySelectorAll('button')).some(b => b.innerText.includes('3x Confluence'));

        return {
          headers,
          rowsCount: rows,
          hasConfluence,
          hasMonteCarlo,
          hasFootprint,
          hasTradeDoctor,
          hasCopyBasket,
          hasQuickFilters
        };
      })()`,
      returnByValue: true
    });

    console.log('Radar Audit Result:', JSON.stringify(radarAudit.result?.value, null, 2));

    // 3. Capture Radar Table Screenshot
    const radarShot = await sendPage('Page.captureScreenshot', { format: 'png' });
    const radarPath = resolve(ARTIFACT_DIR, 'radar_5_capabilities_1536x695.png');
    writeFileSync(radarPath, Buffer.from(radarShot.data, 'base64'));
    console.log(`Saved Radar Screenshot to ${radarPath}`);

    // 4. Click Copilot on the first stock in the table to open Pre-Flight Trade Copilot Modal
    console.log('Clicking Copilot on first stock...');
    await sendPage('Runtime.evaluate', {
      expression: `(() => {
        const btns = Array.from(document.querySelectorAll('button'));
        const copilotBtn = btns.find(b => b.innerText && b.innerText.trim() === 'Copilot');
        if (copilotBtn) { copilotBtn.click(); return true; }
        return false;
      })()`,
      returnByValue: true
    });
    await new Promise(r => setTimeout(r, 1500));

    // 5. Audit Copilot Modal Elements
    const modalAudit = await sendPage('Runtime.evaluate', {
      expression: `(() => {
        const text = document.body.innerText;
        return {
          hasDiagnosticScore: text.includes('Diagnostic') && text.includes('/100'),
          hasChecklist: text.includes('6-Point Pre-Flight Diagnostic Checklist') && text.includes('20-Day EMA Extension'),
          hasMonteCarlo10k: text.includes('Monte Carlo (10k Sim)'),
          hasConfluenceMatrix: text.includes('[W] Weekly Macro Tide') && text.includes('[D] Daily Structure'),
          hasFootprintRadar: text.includes('Institutional Footprint & Liquidity Fakeout Radar'),
          hasOrderGenerator: text.includes('1-Click Broker Order Ticket & Basket Generator'),
          hasZerodhaTab: text.includes('Zerodha Kite Basket JSON'),
          hasNSETab: text.includes('NSE Bracket Payload'),
          hasStatutoryCostTable: text.includes('Indian Statutory Cost Friction')
        };
      })()`,
      returnByValue: true
    });

    console.log('Copilot Modal Audit Result:', JSON.stringify(modalAudit.result?.value, null, 2));

    // 6. Capture Copilot Modal Screenshot
    const modalShot = await sendPage('Page.captureScreenshot', { format: 'png' });
    const modalPath = resolve(ARTIFACT_DIR, 'preflight_copilot_modal_1536x695.png');
    writeFileSync(modalPath, Buffer.from(modalShot.data, 'base64'));
    console.log(`Saved Pre-Flight Copilot Modal Screenshot to ${modalPath}`);

    pageWs.close();
    browserWs.close();
    console.log('Verification completed successfully!');
  } finally {
    chrome.kill();
  }
}

run().catch(console.error);
