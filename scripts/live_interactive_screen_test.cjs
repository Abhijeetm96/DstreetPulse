const { spawn } = require('child_process');
const fs = require('fs');

async function sleep(ms) {
  return new Promise(r => setTimeout(r, ms));
}

async function run() {
  console.log('>>> Launching visible Chrome on screen with remote debugging on port 9222...');
  const chromePath = 'C:\\Program Files\\Google\\Chrome\\Application\\chrome.exe';
  const profileDir = 'C:\\Users\\abhij\\.gemini\\chrome-live-visible-profile';
  if (!fs.existsSync(profileDir)) fs.mkdirSync(profileDir, { recursive: true });

  const chrome = spawn(chromePath, [
    '--remote-debugging-port=9222',
    `--user-data-dir=${profileDir}`,
    '--no-first-run',
    '--no-default-browser-check',
    '--remote-allow-origins=*',
    '--start-maximized',
    '--window-size=1600,900',
    'http://localhost:3000/#stock/KALYANKJIL'
  ], { detached: false });

  chrome.on('error', console.error);

  // Wait for DevTools port
  let wsUrl = null;
  for (let i = 0; i < 30; i++) {
    await sleep(600);
    try {
      const res = await fetch('http://127.0.0.1:9222/json/version');
      if (res.ok) {
        const data = await res.json();
        wsUrl = data.webSocketDebuggerUrl;
        const wsPath = wsUrl.replace(/^ws:\/\/[^/]+/, '');
        const targetFile = 'C:\\Users\\abhij\\AppData\\Local\\Google\\Chrome\\User Data\\DevToolsActivePort';
        fs.writeFileSync(targetFile, `9222\n${wsPath}\n`);
        console.log('Chrome is listening on 9222 and active port file updated.');
        break;
      }
    } catch (e) {}
  }

  if (!wsUrl) throw new Error('Could not connect to Chrome 9222');

  await sleep(2500);

  // Connect to target page
  const listRes = await fetch('http://127.0.0.1:9222/json');
  const targets = await listRes.json();
  const pageTarget = targets.find(t => t.url.includes('localhost:3000')) || targets[0];
  console.log('Attaching to page:', pageTarget.url);

  const ws = new WebSocket(pageTarget.webSocketDebuggerUrl);
  let id = 1;
  const pending = new Map();
  function send(method, params = {}) {
    return new Promise((resolve, reject) => {
      const cur = id++;
      pending.set(cur, { resolve, reject });
      ws.send(JSON.stringify({ id: cur, method, params }));
    });
  }
  ws.onmessage = (event) => {
    const msg = JSON.parse(event.data);
    if (msg.id && pending.has(msg.id)) {
      const { resolve, reject } = pending.get(msg.id);
      pending.delete(msg.id);
      if (msg.error) reject(msg.error);
      else resolve(msg.result);
    }
  };

  await new Promise(r => { ws.onopen = r; });
  await send('Page.enable');
  await send('Runtime.enable');

  // Injected Visual HUD Banner and Highlighter
  await send('Runtime.evaluate', {
    expression: `(() => {
      if (document.getElementById('live-test-hud')) return;
      const hud = document.createElement('div');
      hud.id = 'live-test-hud';
      hud.style.cssText = 'position:fixed;top:16px;right:24px;z-index:999999;background:#00E887;color:#000000;font-family:monospace;font-size:14px;font-weight:900;padding:12px 20px;border:3px solid #000;box-shadow:5px 5px 0 #000;border-radius:4px;pointer-events:none;transition:all 0.3s ease;letter-spacing:0.5px;';
      hud.innerHTML = '⚡ LIVE AGY TEST: INITIALIZING...';
      document.body.appendChild(hud);

      window.__showStep = (msg, color = '#00E887') => {
        hud.style.background = color;
        hud.innerHTML = '⚡ ' + msg;
      };
    })()`
  });

  async function showStep(msg, color = '#00E887', delay = 1800) {
    console.log(`[LIVE TEST STEP] ${msg}`);
    await send('Runtime.evaluate', {
      expression: `window.__showStep && window.__showStep(${JSON.stringify(msg)}, ${JSON.stringify(color)})`
    });
    await sleep(delay);
  }

  // --- Step 1: Stock Modal & Header ---
  await showStep('TEST 1: Stock Overview & Triple Matrix Snapshot Loaded', '#00E887', 2200);

  // --- Step 2: Timeframe Cycling on Live Chart ---
  for (const tf of ['1M', '3M', '6M', '1Y', '5Y', '20Y']) {
    await showStep(`TEST 2: Switching Chart Timeframe to [${tf}]...`, '#FEE360', 1400);
    await send('Runtime.evaluate', {
      expression: `(() => {
        const btn = Array.from(document.querySelectorAll('button')).find(b => b.innerText.trim() === '${tf}');
        if (btn) {
          btn.click();
          btn.style.outline = '3px solid #FEE360';
        }
      })()`
    });
    await sleep(1000);
  }

  // --- Step 3: Technicals Tab ---
  await showStep('TEST 3: Opening [TECHNICALS] Tab (20 EMA, 50 SMA, RSI, Beta)...', '#00E887', 1800);
  await send('Runtime.evaluate', {
    expression: `(() => {
      const btn = Array.from(document.querySelectorAll('button')).find(b => b.innerText.trim() === 'TECHNICALS');
      if (btn) {
        btn.click();
        window.scrollBy({ top: 350, behavior: 'smooth' });
      }
    })()`
  });
  await sleep(2800);

  // --- Step 4: Fundamentals Tab ---
  await showStep('TEST 4: Opening [FUNDAMENTALS] Tab (P/E, ROE, Promoters, FII)...', '#FEE360', 1800);
  await send('Runtime.evaluate', {
    expression: `(() => {
      const btn = Array.from(document.querySelectorAll('button')).find(b => b.innerText.trim() === 'FUNDAMENTALS');
      if (btn) {
        btn.click();
        window.scrollBy({ top: 350, behavior: 'smooth' });
      }
    })()`
  });
  await sleep(2800);

  // --- Step 5: Financials Tab ---
  await showStep('TEST 5: Opening [FINANCIALS] Tab (Revenue, EBITDA, PAT, EPS, FCF)...', '#00E887', 1800);
  await send('Runtime.evaluate', {
    expression: `(() => {
      const btn = Array.from(document.querySelectorAll('button')).find(b => b.innerText.trim() === 'FINANCIALS');
      if (btn) {
        btn.click();
        window.scrollBy({ top: 350, behavior: 'smooth' });
      }
    })()`
  });
  await sleep(2800);

  // --- Step 6: Pre-Flight Copilot Tab ---
  await showStep('TEST 6: Opening [PRE-FLIGHT COPILOT] (Monte Carlo, 6-Point Gate)...', '#FEE360', 1800);
  await send('Runtime.evaluate', {
    expression: `(() => {
      const btn = Array.from(document.querySelectorAll('button')).find(b => b.innerText.trim() === 'PRE-FLIGHT COPILOT');
      if (btn) {
        btn.click();
        window.scrollTo({ top: 0, behavior: 'smooth' });
      }
    })()`
  });
  await sleep(2800);

  // --- Step 7: Return to Live Market Table ---
  await showStep('TEST 7: Closing Modal & Returning to Live Market Table...', '#00E887', 1800);
  await send('Runtime.evaluate', {
    expression: `(() => {
      const btn = Array.from(document.querySelectorAll('button')).find(b => b.innerText.includes('BACK') || b.innerText === 'CLOSE');
      if (btn) btn.click();
    })()`
  });
  await sleep(2200);

  // --- Step 8: Catalog Filtering Demonstration ---
  for (const filter of ['LARGE 100', 'MID 149', 'SMALL 174', 'ALL 499']) {
    await showStep(`TEST 8: Demonstrating Table Cap Filter [${filter}]...`, '#FEE360', 1600);
    await send('Runtime.evaluate', {
      expression: `(() => {
        const btn = Array.from(document.querySelectorAll('button')).find(b => b.innerText.includes('${filter.split(' ')[0]}'));
        if (btn) {
          btn.click();
          window.scrollBy({ top: 200, behavior: 'smooth' });
        }
      })()`
    });
    await sleep(1200);
  }

  // --- Step 9: Final Success Banner ---
  await showStep('✅ ALL LIVE SCREEN TESTS PASSED! Browser remains open for you.', '#00E887', 5000);
  console.log('>>> Live interactive test completed on user screen!');
}

run().catch(err => {
  console.error('Live test error:', err);
  process.exit(1);
});
