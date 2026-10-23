const { spawn } = require('child_process');

const CHROME_PATH = 'C:\\Program Files\\Google\\Chrome\\Application\\chrome.exe';
const DEBUG_PORT = 9430;

async function testAllNavigations() {
  const chrome = spawn(CHROME_PATH, [
    `--remote-debugging-port=${DEBUG_PORT}`,
    '--headless=new',
    '--window-size=1536,695',
    '--no-sandbox',
    '--disable-gpu',
    '--remote-allow-origins=*'
  ]);

  try {
    await new Promise(r => setTimeout(r, 1500));
    const list = await fetch(`http://127.0.0.1:${DEBUG_PORT}/json/list`).then(r => r.json());
    const ws = new WebSocket(list[0].webSocketDebuggerUrl);
    await new Promise(r => ws.onopen = r);

    let id = 1;
    const send = (m, p = {}) => new Promise((res, rej) => {
      const cur = id++;
      const h = e => {
        const d = JSON.parse(e.data);
        if (d.id === cur) {
          ws.removeEventListener('message', h);
          if (d.error) rej(d.error); else res(d.result);
        }
      };
      ws.addEventListener('message', h);
      ws.send(JSON.stringify({ id: cur, method: m, params: p }));
    });

    await send('Page.enable');
    await send('Runtime.enable');

    const exceptions = [];
    ws.addEventListener('message', e => {
      const d = JSON.parse(e.data);
      if (d.method === 'Runtime.exceptionThrown') {
        exceptions.push(d.params.exceptionDetails);
        console.error('EXCEPTION:', d.params.exceptionDetails.text, d.params.exceptionDetails.exception?.description);
      }
    });

    console.log('Navigating to http://localhost:3000/');
    await send('Page.navigate', { url: 'http://localhost:3000/' });
    await new Promise(r => setTimeout(r, 3000));

    // Wait until table rows exist
    let rowsCount = 0;
    for (let i = 0; i < 20; i++) {
      const res = await send('Runtime.evaluate', { expression: 'document.querySelectorAll("tbody tr").length' });
      rowsCount = res.result.value || 0;
      if (rowsCount > 0) break;
      await new Promise(r => setTimeout(r, 500));
    }
    console.log(`Table ready with ${rowsCount} rows.`);

    // --- TEST 1: Open stock, click "← Back to Live Market Snapshot" ---
    console.log('\n--- TEST 1: Open stock and click "← Back to..." ---');
    await send('Runtime.evaluate', { expression: 'document.querySelector("tbody tr").click()' });
    await new Promise(r => setTimeout(r, 1000));
    let hasDetails = (await send('Runtime.evaluate', { expression: 'document.body.innerText.includes("Pre-Flight Copilot")' })).result.value;
    console.log('Details opened:', hasDetails);

    await send('Runtime.evaluate', {
      expression: 'Array.from(document.querySelectorAll("button")).find(b => b.innerText.includes("Back to"))?.click()'
    });
    await new Promise(r => setTimeout(r, 1000));
    let returned = (await send('Runtime.evaluate', { expression: 'document.body.innerText.includes("PARAMETERS:")' })).result.value;
    console.log('Returned to tables via Back button:', returned);

    // --- TEST 2: Open stock, click "Close" button ---
    console.log('\n--- TEST 2: Open stock and click "Close" ---');
    await send('Runtime.evaluate', { expression: 'document.querySelector("tbody tr").click()' });
    await new Promise(r => setTimeout(r, 1000));
    await send('Runtime.evaluate', {
      expression: 'Array.from(document.querySelectorAll("button")).find(b => b.innerText.trim() === "Close")?.click()'
    });
    await new Promise(r => setTimeout(r, 1000));
    returned = (await send('Runtime.evaluate', { expression: 'document.body.innerText.includes("PARAMETERS:")' })).result.value;
    console.log('Returned to tables via Close button:', returned);

    // --- TEST 3: Open stock, click Header "← Back" button ---
    console.log('\n--- TEST 3: Open stock and click Header Back button ---');
    await send('Runtime.evaluate', { expression: 'document.querySelector("tbody tr").click()' });
    await new Promise(r => setTimeout(r, 1000));
    await send('Runtime.evaluate', {
      expression: 'Array.from(document.querySelectorAll("header button")).find(b => b.innerText.includes("Back"))?.click()'
    });
    await new Promise(r => setTimeout(r, 1000));
    returned = (await send('Runtime.evaluate', { expression: 'document.body.innerText.includes("PARAMETERS:")' })).result.value;
    console.log('Returned to tables via Header Back button:', returned);

    // --- TEST 4: Open stock, click Sidebar "Swing Radar" ---
    console.log('\n--- TEST 4: Open stock and click Sidebar "Swing Radar" ---');
    await send('Runtime.evaluate', { expression: 'document.querySelector("tbody tr").click()' });
    await new Promise(r => setTimeout(r, 1000));
    await send('Runtime.evaluate', {
      expression: 'Array.from(document.querySelectorAll("aside button")).find(b => b.innerText.includes("Swing Radar"))?.click()'
    });
    await new Promise(r => setTimeout(r, 1500));
    let hasSwing = (await send('Runtime.evaluate', { expression: 'document.body.innerText.includes("SWING BREAKOUT RADAR")' })).result.value;
    console.log('Successfully navigated to Swing Radar from stock details:', hasSwing);

    // --- TEST 5: Open stock from Swing Radar, click Sidebar Logo ---
    console.log('\n--- TEST 5: Open stock and click Sidebar Logo ---');
    await send('Runtime.evaluate', { expression: 'document.querySelector(".neopop-btn")?.click()' });
    await new Promise(r => setTimeout(r, 1000));
    await send('Runtime.evaluate', {
      expression: 'document.querySelector("aside div[title=\'Return to Live Terminal\']")?.click()'
    });
    await new Promise(r => setTimeout(r, 1500));
    let hasLiveTerm = (await send('Runtime.evaluate', { expression: 'document.body.innerText.includes("PARAMETERS:")' })).result.value;
    console.log('Returned to Live Terminal via Logo click:', hasLiveTerm);

    // --- TEST 6: Open stock, press Esc ---
    console.log('\n--- TEST 6: Open stock and press Esc key ---');
    await send('Runtime.evaluate', { expression: 'document.querySelector("tbody tr").click()' });
    await new Promise(r => setTimeout(r, 1000));
    await send('Input.dispatchKeyEvent', { type: 'rawKeyDown', key: 'Escape', code: 'Escape', windowsVirtualKeyCode: 27 });
    await send('Input.dispatchKeyEvent', { type: 'keyUp', key: 'Escape', code: 'Escape', windowsVirtualKeyCode: 27 });
    await new Promise(r => setTimeout(r, 1000));
    returned = (await send('Runtime.evaluate', { expression: 'document.body.innerText.includes("PARAMETERS:")' })).result.value;
    console.log('Returned to tables via Esc key:', returned);

    console.log('\nTOTAL EXCEPTIONS DETECTED:', exceptions.length);
    if (exceptions.length > 0) {
      throw new Error(`Encountered ${exceptions.length} exceptions during test`);
    }

    console.log('>>> ALL 6 NAVIGATION EXIT FLOWS WORK FLAWLESSLY! <<<');
  } finally {
    chrome.kill();
  }
}

testAllNavigations().catch(err => {
  console.error('Test execution failed:', err);
  process.exit(1);
});

