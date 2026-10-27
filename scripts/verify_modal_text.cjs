const { spawn } = require('child_process');

const CHROME_PATH = 'C:\\Program Files\\Google\\Chrome\\Application\\chrome.exe';
const DEBUG_PORT = 9350;
const TARGET_URL = 'http://localhost:3000';

(async () => {
  const chrome = spawn(CHROME_PATH, [
    `--remote-debugging-port=${DEBUG_PORT}`,
    '--headless=new',
    '--window-size=1536,695',
    '--hide-scrollbars',
    '--no-sandbox'
  ]);
  await new Promise(r => setTimeout(r, 1200));

  const res = await fetch(`http://127.0.0.1:${DEBUG_PORT}/json/version`);
  const d = await res.json();
  const ws = new WebSocket(d.webSocketDebuggerUrl);
  await new Promise(r => ws.onopen = r);

  let id = 1;
  const send = (m, p = {}) => new Promise(resolve => {
    const cur = id++;
    const h = (e) => {
      const data = JSON.parse(e.data);
      if (data.id === cur) { ws.removeEventListener('message', h); resolve(data.result); }
    };
    ws.addEventListener('message', h);
    ws.send(JSON.stringify({ id: cur, method: m, params: p }));
  });

  const { targetId } = await send('Target.createTarget', { url: TARGET_URL });
  const list = await (await fetch(`http://127.0.0.1:${DEBUG_PORT}/json/list`)).json();
  const page = list.find(p => p.id === targetId);
  const pws = new WebSocket(page.webSocketDebuggerUrl);
  await new Promise(r => pws.onopen = r);

  let pid = 1;
  const sp = (method, params = {}) => new Promise(resolve => {
    const cur = pid++;
    const h = (e) => {
      const data = JSON.parse(e.data);
      if (data.id === cur) { pws.removeEventListener('message', h); resolve(data.result); }
    };
    pws.addEventListener('message', h);
    pws.send(JSON.stringify({ id: cur, method, params }));
  });

  await sp('Page.enable');
  await sp('Runtime.enable');
  await new Promise(r => setTimeout(r, 2000));

  // Press key 2 to open Swing Scanner
  await sp('Runtime.evaluate', {
    expression: `window.dispatchEvent(new KeyboardEvent('keydown', { key: '2' }))`
  });
  await new Promise(r => setTimeout(r, 1500));

  // Click first Copilot button
  await sp('Runtime.evaluate', {
    expression: `(() => {
      const btn = Array.from(document.querySelectorAll('button')).find(b => b.innerText.trim() === 'Copilot');
      if (btn) btn.click();
    })()`
  });
  await new Promise(r => setTimeout(r, 1500));

  const textRes = await sp('Runtime.evaluate', {
    expression: `document.body.innerText`,
    returnByValue: true
  });
  const val = textRes.result?.value || '';

  console.log('--- MODAL BODY TEXT SAMPLE (FIRST 1500 CHARACTERS) ---');
  console.log(val.substring(0, 1500));

  const check = {
    hasDiagnostic: val.includes('Diagnostic'),
    has6Point: val.includes('6-Point Pre-Flight'),
    hasMonteCarlo: val.includes('Monte Carlo (10k Sim)'),
    hasConfluence: val.includes('Weekly Macro Tide'),
    hasOrderTickets: val.includes('1-Click Broker Order Ticket'),
    hasZerodha: val.includes('Zerodha Kite Basket'),
    hasNSE: val.includes('NSE Bracket Payload'),
    hasStatutory: val.includes('Indian Statutory Cost Friction')
  };
  console.log('--- CHECK RESULTS ---', JSON.stringify(check, null, 2));

  pws.close();
  ws.close();
  chrome.kill();
})();
