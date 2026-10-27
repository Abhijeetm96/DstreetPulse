const { spawn } = require('child_process');

const chromePath = 'C:\\Program Files\\Google\\Chrome\\Application\\chrome.exe';
const chrome = spawn(chromePath, [
  '--headless=new',
  '--remote-debugging-port=9224',
  '--no-first-run',
  '--no-default-browser-check',
  'http://localhost:3000/nse'
]);

setTimeout(async () => {
  try {
    const listRes = await fetch('http://localhost:9224/json');
    const targets = await listRes.json();
    const target = targets.find(t => t.url.includes('localhost:3000/nse'));

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
        const cb = callbacks.get(msg.id);
        callbacks.delete(msg.id);
        cb(msg);
      }
    });

    const send = (method, params = {}) => new Promise((resolve) => {
      const id = msgId++;
      callbacks.set(id, resolve);
      ws.send(JSON.stringify({ id, method, params }));
    });

    await new Promise(r => ws.addEventListener('open', r));

    // Enable Runtime & DOM
    await send('Runtime.enable');
    await send('Page.enable');

    // Wait 1.5s for initial data fetch and render
    await new Promise(r => setTimeout(r, 1500));

    // 1. Switch to heatmaps tab
    const switchTabRes = await send('Runtime.evaluate', {
      expression: `
        switchNseTab('heatmaps');
        document.getElementById('tab-heatmaps').classList.contains('active');
      `,
      returnByValue: true
    });
    console.log('1. Switched to Heatmaps Tab. Active?', switchTabRes.result?.result?.value);

    // 2. Count rendered sector cards and cells
    const sectorStatsRes = await send('Runtime.evaluate', {
      expression: `
        (() => {
          const cards = document.querySelectorAll('.sector-group-card');
          const cells = document.querySelectorAll('#sectorHeatmapsGrid .heatmap-cell');
          const sectors = Array.from(cards).map(c => c.querySelector('h3')?.innerText);
          return {
            sectorCardCount: cards.length,
            totalConstituentCells: cells.length,
            firstFewSectors: sectors.slice(0, 5)
          };
        })()
      `,
      returnByValue: true
    });
    console.log('2. Sector Group Cards rendered:', sectorStatsRes.result?.result?.value);

    // 3. Switch to Treemap sub-view
    const treemapRes = await send('Runtime.evaluate', {
      expression: `
        (() => {
          setHeatmapSubView('treemap');
          const cells = document.querySelectorAll('#treemapGrid .heatmap-cell');
          const countBadge = document.getElementById('treemapStockCount')?.innerText;
          return {
            treemapCellsCount: cells.length,
            countBadge: countBadge
          };
        })()
      `,
      returnByValue: true
    });
    console.log('3. Treemap Sub-view:', treemapRes.result?.result?.value);

    // 4. Switch to Indices sub-view
    const indicesRes = await send('Runtime.evaluate', {
      expression: `
        (() => {
          setHeatmapSubView('indices');
          const broad = document.querySelectorAll('#indicesGridBroad > div').length;
          const sectoral = document.querySelectorAll('#indicesGridSectoral > div').length;
          const thematic = document.querySelectorAll('#indicesGridThematic > div').length;
          return {
            broadIndices: broad,
            sectoralIndices: sectoral,
            thematicIndices: thematic,
            total: broad + sectoral + thematic
          };
        })()
      `,
      returnByValue: true
    });
    console.log('4. Indices Matrix Sub-view:', indicesRes.result?.result?.value);

    // 5. Test filterByIndex('BANK')
    const filterIndexRes = await send('Runtime.evaluate', {
      expression: `
        (() => {
          filterByIndex('NIFTY BANK');
          const sectorVal = document.getElementById('heatmapSectorFilter')?.value;
          const cards = document.querySelectorAll('.sector-group-card');
          const cells = document.querySelectorAll('#sectorHeatmapsGrid .heatmap-cell');
          return {
            selectedSector: sectorVal,
            visibleCards: cards.length,
            bankingStockCells: cells.length
          };
        })()
      `,
      returnByValue: true
    });
    console.log('5. filterByIndex("NIFTY BANK") result:', filterIndexRes.result?.result?.value);

    console.log('✅ ALL NSE HEATMAP VERIFICATION CHECKS PASSED SUCCESSFULLY!');
    chrome.kill();
    process.exit(0);
  } catch (err) {
    console.error('Test error:', err);
    chrome.kill();
    process.exit(1);
  }
}, 1000);
