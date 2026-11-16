const { spawn } = require('child_process');
const { writeFileSync } = require('fs');
const { resolve } = require('path');

const CHROME_PATH = 'C:\\Program Files\\Google\\Chrome\\Application\\chrome.exe';
const DEBUG_PORT = 9431;
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

    const { targetId } = await send('Target.createTarget', { url: 'http://localhost:3000/#stock/ADANIGREEN' });
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
    await psend('Emulation.setDeviceMetricsOverride', { width: 1536, height: 695, deviceScaleFactor: 1, mobile: false });

    console.log('Waiting for #stock/ADANIGREEN terminal to mount...');
    await new Promise(r => setTimeout(r, 3500));

    // Scroll main container to position chart commanding the viewport
    await psend('Runtime.evaluate', {
      expression: `
        (() => {
          const main = document.querySelector('main');
          if (main) main.scrollTop = 270;
        })()
      `
    });
    await new Promise(r => setTimeout(r, 800));

    // 1. Capture 5Y Scrolled
    await psend('Runtime.evaluate', {
      expression: 'Array.from(document.querySelectorAll("button")).find(b => b.textContent.trim() === "5Y")?.click();'
    });
    await new Promise(r => setTimeout(r, 1200));
    console.log('Capturing 5Y scrolled view...');
    const shot5y = await psend('Page.captureScreenshot', { format: 'png' });
    writeFileSync(resolve(ARTIFACT_DIR, 'stock_chart_5y_scrolled_1536x695.png'), Buffer.from(shot5y.data, 'base64'));

    // 2. Capture 10Y Scrolled
    await psend('Runtime.evaluate', {
      expression: 'Array.from(document.querySelectorAll("button")).find(b => b.textContent.trim() === "10Y")?.click();'
    });
    await new Promise(r => setTimeout(r, 1200));
    console.log('Capturing 10Y scrolled view...');
    const shot10y = await psend('Page.captureScreenshot', { format: 'png' });
    writeFileSync(resolve(ARTIFACT_DIR, 'stock_chart_10y_scrolled_1536x695.png'), Buffer.from(shot10y.data, 'base64'));

    // 3. Capture 20Y Scrolled
    await psend('Runtime.evaluate', {
      expression: 'Array.from(document.querySelectorAll("button")).find(b => b.textContent.trim() === "20Y")?.click();'
    });
    await new Promise(r => setTimeout(r, 1200));
    console.log('Capturing 20Y scrolled view...');
    const shot20y = await psend('Page.captureScreenshot', { format: 'png' });
    writeFileSync(resolve(ARTIFACT_DIR, 'stock_chart_20y_scrolled_1536x695.png'), Buffer.from(shot20y.data, 'base64'));

    // 4. Test Hover on chart and capture crosshair
    console.log('Testing interactive hover on chart...');
    await psend('Runtime.evaluate', {
      expression: `
        (() => {
          const rect = document.querySelector('svg.select-none rect[fill="transparent"]');
          if (rect) {
            const bounds = rect.getBoundingClientRect();
            const evt = new MouseEvent('mousemove', {
              clientX: bounds.left + bounds.width * 0.65,
              clientY: bounds.top + bounds.height * 0.45,
              bubbles: true
            });
            rect.dispatchEvent(evt);
            return 'Dispatched mousemove';
          }
          return 'Overlay rect not found';
        })()
      `
    });
    await new Promise(r => setTimeout(r, 800));
    const shotHover = await psend('Page.captureScreenshot', { format: 'png' });
    writeFileSync(resolve(ARTIFACT_DIR, 'stock_chart_interactive_hover_1536x695.png'), Buffer.from(shotHover.data, 'base64'));

    // 5. Scroll slightly further down to see bottom axis date ticks & volume bars
    await psend('Runtime.evaluate', {
      expression: 'document.querySelector("main").scrollTop = 480;'
    });
    await new Promise(r => setTimeout(r, 800));
    const shotBottom = await psend('Page.captureScreenshot', { format: 'png' });
    writeFileSync(resolve(ARTIFACT_DIR, 'stock_chart_bottom_axis_and_volume_1536x695.png'), Buffer.from(shotBottom.data, 'base64'));

    ws.close();
    chrome.kill();
    console.log('SUCCESS: All scrolled and hover screenshots captured!');
  } catch (err) {
    console.error('Error during run:', err);
    chrome.kill();
  }
}

run();
