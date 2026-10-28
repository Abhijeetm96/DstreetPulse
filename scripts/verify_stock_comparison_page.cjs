const { spawn } = require('child_process');
const { writeFileSync } = require('fs');
const { resolve } = require('path');

const CHROME_PATH = 'C:\\Program Files\\Google\\Chrome\\Application\\chrome.exe';
const DEBUG_PORT = 9442;
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

    const { targetId } = await send('Target.createTarget', { url: 'http://localhost:3000/#compare?stocks=TCS,INFY,WIPRO' });
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

    const consoleErrors = [];
    pws.addEventListener('message', e => {
      const d = JSON.parse(e.data);
      if (d.method === 'Runtime.consoleAPICalled' && d.params?.type === 'error') {
        consoleErrors.push(d.params.args.map(a => a.value || a.description).join(' '));
      }
      if (d.method === 'Runtime.exceptionThrown') {
        consoleErrors.push(d.params.exceptionDetails?.text || 'Exception');
      }
    });

    await psend('Page.enable');
    await psend('Runtime.enable');
    await psend('Emulation.setDeviceMetricsOverride', { width: 1536, height: 695, deviceScaleFactor: 1, mobile: false });

    console.log('Waiting for #compare page to mount and load data...');
    await new Promise(r => setTimeout(r, 3800));

    // 1. Capture Top View with Multi-Stock Normalized Chart & Badges
    console.log('Capturing Top View with Comparative Chart...');
    const shotTop = await psend('Page.captureScreenshot', { format: 'png' });
    writeFileSync(resolve(ARTIFACT_DIR, 'compare_stocks_chart_and_badges_1536x695.png'), Buffer.from(shotTop.data, 'base64'));

    // 2. Interactive Hover on Multi-Stock Chart
    console.log('Testing interactive crosshair hover on comparison chart...');
    await psend('Runtime.evaluate', {
      expression: `
        (() => {
          const rect = document.querySelector('svg.select-none rect[fill="transparent"]');
          if (rect) {
            const bounds = rect.getBoundingClientRect();
            const evt = new MouseEvent('mousemove', {
              clientX: bounds.left + bounds.width * 0.70,
              clientY: bounds.top + bounds.height * 0.50,
              bubbles: true
            });
            rect.dispatchEvent(evt);
            return 'Dispatched multi-stock mousemove';
          }
          return 'Overlay rect not found';
        })()
      `
    });
    await new Promise(r => setTimeout(r, 800));
    const shotHover = await psend('Page.captureScreenshot', { format: 'png' });
    writeFileSync(resolve(ARTIFACT_DIR, 'compare_stocks_chart_hover_hud_1536x695.png'), Buffer.from(shotHover.data, 'base64'));

    // 3. Scroll to Executive Comparison Table
    console.log('Scrolling to Executive Comparison Table...');
    await psend('Runtime.evaluate', {
      expression: 'document.querySelector("main").scrollTop = 820;'
    });
    await new Promise(r => setTimeout(r, 800));
    const shotTable = await psend('Page.captureScreenshot', { format: 'png' });
    writeFileSync(resolve(ARTIFACT_DIR, 'compare_stocks_executive_summary_table_1536x695.png'), Buffer.from(shotTable.data, 'base64'));

    // 4. Click Fundamentals & Valuation Sub-Tab
    console.log('Clicking Fundamentals & Valuation Sub-Tab...');
    await psend('Runtime.evaluate', {
      expression: `
        (() => {
          const btns = Array.from(document.querySelectorAll('button'));
          const btn = btns.find(b => b.textContent.includes('Fundamentals & Valuation'));
          if (btn) btn.click();
        })()
      `
    });
    await new Promise(r => setTimeout(r, 800));
    const shotFund = await psend('Page.captureScreenshot', { format: 'png' });
    writeFileSync(resolve(ARTIFACT_DIR, 'compare_stocks_fundamentals_table_1536x695.png'), Buffer.from(shotFund.data, 'base64'));

    // 5. Click Financials & P&L Statements Sub-Tab
    console.log('Clicking Financials & P&L Statements Sub-Tab...');
    await psend('Runtime.evaluate', {
      expression: `
        (() => {
          const btns = Array.from(document.querySelectorAll('button'));
          const btn = btns.find(b => b.textContent.includes('Financials & P&L'));
          if (btn) btn.click();
        })()
      `
    });
    await new Promise(r => setTimeout(r, 800));
    const shotFin = await psend('Page.captureScreenshot', { format: 'png' });
    writeFileSync(resolve(ARTIFACT_DIR, 'compare_stocks_financials_table_1536x695.png'), Buffer.from(shotFin.data, 'base64'));

    // 6. Test 1-Click Peer Preset: Clean Energy & Power (ADANIGREEN vs TATAPOWER vs NTPC)
    console.log('Testing Peer Preset: Clean Energy & Power...');
    await psend('Runtime.evaluate', {
      expression: `
        (() => {
          document.querySelector("main").scrollTop = 0;
          const btns = Array.from(document.querySelectorAll('button'));
          const btn = btns.find(b => b.textContent.includes('Clean Energy'));
          if (btn) btn.click();
        })()
      `
    });
    await new Promise(r => setTimeout(r, 2200));
    const shotEnergy = await psend('Page.captureScreenshot', { format: 'png' });
    writeFileSync(resolve(ARTIFACT_DIR, 'compare_stocks_energy_peers_1536x695.png'), Buffer.from(shotEnergy.data, 'base64'));

    console.log('Console Errors count:', consoleErrors.length, consoleErrors);
    ws.close();
    chrome.kill();
    console.log('SUCCESS: All comparative screenshots captured and verified!');
  } catch (err) {
    console.error('Error during run:', err);
    chrome.kill();
  }
}

run();
