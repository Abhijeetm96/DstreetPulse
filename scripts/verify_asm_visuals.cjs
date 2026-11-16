const { spawn } = require('child_process');
const { writeFileSync } = require('fs');
const { resolve } = require('path');

const CHROME_PATH = 'C:\\Program Files\\Google\\Chrome\\Application\\chrome.exe';
const DEBUG_PORT = 9368;
const TARGET_URL = 'http://localhost:3000';
const ARTIFACT_DIR = './reports';

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
  const send = (m, p = {}) => new Promise(res => {
    const cur = id++;
    const h = (e) => {
      const data = JSON.parse(e.data);
      if (data.id === cur) { ws.removeEventListener('message', h); res(data.result); }
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
  const sp = (method, params = {}) => new Promise(res => {
    const cur = pid++;
    const h = (e) => {
      const data = JSON.parse(e.data);
      if (data.id === cur) { pws.removeEventListener('message', h); res(data.result); }
    };
    pws.addEventListener('message', h);
    pws.send(JSON.stringify({ id: cur, method, params }));
  });

  await sp('Page.enable');
  await sp('Runtime.enable');
  await sp('Emulation.setDeviceMetricsOverride', {
    width: 1536,
    height: 695,
    deviceScaleFactor: 1,
    mobile: false
  });

  for (let i = 0; i < 20; i++) {
    const check = await sp('Runtime.evaluate', {
      expression: `!document.querySelector('.animate-spin') && document.querySelectorAll('button').length > 5`
    });
    if (check?.result?.value) break;
    await new Promise(r => setTimeout(r, 500));
  }

  // Go to Swing Radar
  await sp('Runtime.evaluate', {
    expression: `(() => {
      const btns = Array.from(document.querySelectorAll('button'));
      const target = btns.find(b => b.innerText && b.innerText.includes('Swing Radar'));
      if (target) target.click();
    })()`
  });
  await new Promise(r => setTimeout(r, 1500));

  // Click on ASM filter
  await sp('Runtime.evaluate', {
    expression: `(() => {
      const btns = Array.from(document.querySelectorAll('button'));
      const asmBtn = btns.find(b => b.innerText && b.innerText.includes('ASM'));
      if (asmBtn) asmBtn.click();
    })()`
  });
  await new Promise(r => setTimeout(r, 1000));

  // Click the "COPILOT" button on the first row
  await sp('Runtime.evaluate', {
    expression: `(() => {
      const btns = Array.from(document.querySelectorAll('table tbody tr button'));
      const copilotBtn = btns.find(b => b.innerText && b.innerText.includes('COPILOT'));
      if (copilotBtn) copilotBtn.click();
    })()`
  });
  await new Promise(r => setTimeout(r, 1500));

  // Scroll 6-Point Pre-Flight Diagnostic Checklist into view
  console.log('Scrolling to checklist and order ticket inside modal...');
  await sp('Runtime.evaluate', {
    expression: `(() => {
      const headings = Array.from(document.querySelectorAll('h4'));
      const checklistH4 = headings.find(h => h.innerText && h.innerText.includes('6-Point Pre-Flight Diagnostic Checklist'));
      if (checklistH4) {
        checklistH4.scrollIntoView({ behavior: 'instant', block: 'start' });
        return true;
      }
      return false;
    })()`
  });
  await new Promise(r => setTimeout(r, 1000));

  // Capture modal scrolled view showing 6-point checklist (including ASM check) and 1-Click order ticket
  const modalScrollShot = await sp('Page.captureScreenshot', { format: 'png' });
  const modalScrollPath = resolve(ARTIFACT_DIR, 'preflight_copilot_asm_checks_1536x695.png');
  writeFileSync(modalScrollPath, Buffer.from(modalScrollShot.data, 'base64'));
  console.log(`Saved Pre-Flight Copilot Scrolled Modal to: ${modalScrollPath}`);

  pws.close();
  ws.close();
  chrome.kill();
})();
