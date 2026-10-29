const { spawn } = require('child_process');
const { writeFileSync } = require('fs');
const { resolve } = require('path');

const CHROME_PATH = 'C:\\Program Files\\Google\\Chrome\\Application\\chrome.exe';
const DEBUG_PORT = 9412;
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

    const capturePage = async (url, filename, scrollY = 0) => {
      const { targetId } = await send('Target.createTarget', { url });
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

      console.log('Navigating to', url);
      await new Promise(r => setTimeout(r, 3500));

      if (scrollY > 0) {
        await psend('Runtime.evaluate', {
          expression: `window.scrollTo(0, ${scrollY}); document.querySelector('main')?.scrollTo(0, ${scrollY});`
        });
        await new Promise(r => setTimeout(r, 1000));
      }

      const snap = await psend('Page.captureScreenshot', { format: 'png' });
      writeFileSync(resolve(ARTIFACT_DIR, filename), Buffer.from(snap.data, 'base64'));
      console.log('Saved screenshot:', filename);

      await psend('Page.close');
      pws.close();
    };

    // 1. Stock Terminal Page for ADANIGREEN (showing full page terminal with technical price chart directly visible)
    await capturePage('http://localhost:3000/#stock/ADANIGREEN', 'stock_terminal_adanigreen_with_chart_1536x695.png', 0);

    // 1B. Scrolled down view of ADANIGREEN terminal to see Copilot diagnostics below chart
    await capturePage('http://localhost:3000/#stock/ADANIGREEN', 'stock_terminal_adanigreen_scrolled_copilot_1536x695.png', 320);

    // 2. Live Market Tab with All Parameters (All 5 Individual Tables)
    await capturePage('http://localhost:3000/#market', 'live_market_all_parameters_individual_tables_1536x695.png', 0);

    // 2B. Live Market Scrolled to see lower parameter individual tables
    await capturePage('http://localhost:3000/#market', 'live_market_all_parameters_scrolled_tables_1536x695.png', 650);

    console.log('All visual verifications captured successfully!');
  } finally {
    chrome.kill();
  }
}

run().catch(err => {
  console.error('Error during execution:', err);
  process.exit(1);
});

