const { spawn } = require('child_process');

const chromePath = 'C:\\Program Files\\Google\\Chrome\\Application\\chrome.exe';
const chrome = spawn(chromePath, [
  '--headless=new',
  '--remote-debugging-port=9223',
  '--no-first-run',
  '--no-default-browser-check',
  'http://localhost:3000'
]);

setTimeout(async () => {
  try {
    const listRes = await fetch('http://localhost:9223/json');
    const targets = await listRes.json();
    const target = targets.find(t => t.url.includes('localhost:3000'));

    if (!target || !target.webSocketDebuggerUrl) {
      console.error('Target not found');
      chrome.kill();
      process.exit(1);
    }

    const ws = new WebSocket(target.webSocketDebuggerUrl);
    let msgId = 1;
    const callbacks = new Map();

    ws.addEventListener('message', (event) => {
      const msg = JSON.parse(event.data);
      if (callbacks.has(msg.id)) {
        callbacks.get(msg.id)(msg.result);
        callbacks.delete(msg.id);
      }
    });

    const send = (method, params = {}) => new Promise((resolve) => {
      const id = msgId++;
      callbacks.set(id, resolve);
      ws.send(JSON.stringify({ id, method, params }));
    });

    await new Promise(r => ws.addEventListener('open', r));
    await send('Runtime.enable');
    await send('Page.enable');

    // Wait 1.5s for initial fetches
    await new Promise(r => setTimeout(r, 1500));

    // Test 1: Check stocks loaded
    const resStocks = await send('Runtime.evaluate', {
      expression: 'allStocks.length',
      returnByValue: true
    });
    console.log('Test 1 - Total stocks loaded in UI state:', resStocks.result?.value);

    // Test 2: Auto-suggest for 'ath'
    const resSuggest = await send('Runtime.evaluate', {
      expression: `(() => {
        const input = document.getElementById('tmSearch');
        input.value = 'ath';
        input.dispatchEvent(new Event('input', { bubbles: true }));
        const dropdown = document.getElementById('tmSuggest');
        const items = Array.from(dropdown.querySelectorAll('.suggest-item'));
        return {
          isOpen: dropdown.classList.contains('open'),
          itemCount: items.length,
          symbols: items.map(i => i.querySelector('.sym')?.textContent)
        };
      })()`,
      returnByValue: true
    });
    console.log('Test 2 - Auto-suggest for "ath":', JSON.stringify(resSuggest.result?.value));

    // Test 3: Select first suggestion and verify auto-fill
    const resSelect = await send('Runtime.evaluate', {
      expression: `(() => {
        const dropdown = document.getElementById('tmSuggest');
        const first = dropdown.querySelector('.suggest-item');
        if (first) first.click();
        return {
          symbol: document.getElementById('tmSelSym')?.textContent,
          entry: document.getElementById('tmEntry')?.value,
          stop: document.getElementById('tmStop')?.value,
          target: document.getElementById('tmTarget')?.value,
          cardVisible: !document.getElementById('tmSelectedStock')?.classList.contains('hidden')
        };
      })()`,
      returnByValue: true
    });
    console.log('Test 3 - Selected stock & fields populated:', JSON.stringify(resSelect.result?.value));

    // Test 4: Run Time Machine
    await send('Runtime.evaluate', {
      expression: 'runTimeMachine()'
    });
    await new Promise(r => setTimeout(r, 2000));

    const resTmResult = await send('Runtime.evaluate', {
      expression: `(() => {
        const content = document.getElementById('tmResultsContent');
        return {
          resultsVisible: !content.classList.contains('hidden'),
          verdict: document.getElementById('tmVerdictBadge')?.textContent,
          avgR: document.getElementById('tmAvgR')?.textContent,
          pTarget: document.getElementById('tmProbTarget')?.textContent,
          pStop: document.getElementById('tmProbStop')?.textContent,
          pNeither: document.getElementById('tmProbNeither')?.textContent,
          winRate: document.getElementById('tmWinRate')?.textContent
        };
      })()`,
      returnByValue: true
    });
    console.log('Test 4 - Time Machine simulation output:', JSON.stringify(resTmResult.result?.value));

    // Test 5: Verify all 5 navigation tabs and their content
    const resTabs = await send('Runtime.evaluate', {
      expression: `(() => {
        const tabs = Array.from(document.querySelectorAll('.nav-tab')).map(t => t.dataset.tab);
        const holdingsRows = document.getElementById('holdingsBody')?.querySelectorAll('tr').length || 0;
        const heatmapCount = document.getElementById('heatmapGrid')?.querySelectorAll('.heatmap-cell').length || 0;
        const candidateCount = document.getElementById('watchlistGrid')?.children.length || 0;
        return { tabs, holdingsRows, heatmapCount, candidateCount };
      })()`,
      returnByValue: true
    });
    console.log('Test 5 - Tabs & UI components rendered:', JSON.stringify(resTabs.result?.value));

    ws.close();
    chrome.kill();
    process.exit(0);
  } catch (err) {
    console.error('Test error:', err);
    chrome.kill();
    process.exit(1);
  }
}, 1500);

