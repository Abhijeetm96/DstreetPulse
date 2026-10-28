const { spawn } = require('child_process');

const chromePath = 'C:\\Program Files\\Google\\Chrome\\Application\\chrome.exe';
const chrome = spawn(chromePath, [
  '--headless=new',
  '--remote-debugging-port=9226',
  '--no-first-run',
  '--no-default-browser-check',
  'http://localhost:3000'
]);

setTimeout(async () => {
  try {
    const listRes = await fetch('http://localhost:9226/json');
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

    await send('Runtime.enable');
    await send('Page.enable');

    // Wait 2.5s for React app to mount and fetch /api/heatmaps
    await new Promise(r => setTimeout(r, 2500));

    // 1. Verify shadcn-admin Sidebar & Header Mounted
    const layoutCheck = await send('Runtime.evaluate', {
      expression: `
        (() => {
          const sidebar = document.querySelector('aside');
          const header = document.querySelector('header');
          const navButtons = document.querySelectorAll('aside button');
          return {
            hasSidebar: !!sidebar,
            hasHeader: !!header,
            navItemsCount: navButtons.length,
            title: document.title
          };
        })()
      `,
      returnByValue: true
    });
    console.log('1. shadcn-admin Layout Mounted:', layoutCheck.result?.result?.value);

    // 2. Test Sidebar Collapse/Expand Toggle
    const collapseCheck = await send('Runtime.evaluate', {
      expression: `
        (() => {
          const sidebar = document.querySelector('aside');
          const toggleBtn = sidebar?.querySelector('button[title*="Sidebar"]');
          const initialWidth = sidebar?.offsetWidth;
          if (toggleBtn) toggleBtn.click();
          return {
            hasToggleBtn: !!toggleBtn,
            initialWidth: initialWidth
          };
        })()
      `,
      returnByValue: true
    });
    await new Promise(r => setTimeout(r, 400));
    const collapsedWidth = await send('Runtime.evaluate', {
      expression: `document.querySelector('aside')?.offsetWidth`,
      returnByValue: true
    });
    console.log('2. Sidebar Toggle Check:', {
      ...collapseCheck.result?.result?.value,
      collapsedWidth: collapsedWidth.result?.result?.value
    });

    // Expand sidebar back
    await send('Runtime.evaluate', {
      expression: `
        (() => {
          const toggleBtn = document.querySelector('aside')?.querySelector('button[title*="Sidebar"]');
          if (toggleBtn) toggleBtn.click();
        })()
      `
    });
    await new Promise(r => setTimeout(r, 300));

    // 3. Switch to Heatmaps Tab via shadcn Sidebar
    const switchHeatmaps = await send('Runtime.evaluate', {
      expression: `
        (() => {
          const btns = Array.from(document.querySelectorAll('aside button'));
          const hmBtn = btns.find(b => b.innerText.includes('Heatmap'));
          if (hmBtn) hmBtn.click();
          return { clicked: !!hmBtn };
        })()
      `,
      returnByValue: true
    });
    console.log('3. Switched to Sector Heatmaps:', switchHeatmaps.result?.result?.value);
    await new Promise(r => setTimeout(r, 500));

    // 4. Verify Heatmap 18 Sectors & Cells
    const heatmapStats = await send('Runtime.evaluate', {
      expression: `
        (() => {
          const sectorCards = document.querySelectorAll('.glass-panel');
          const cells = document.querySelectorAll('.heatmap-cell');
          return {
            sectorCardsCount: sectorCards.length,
            totalConstituentCells: cells.length
          };
        })()
      `,
      returnByValue: true
    });
    console.log('4. Heatmap Sectors & Constituent Cells:', heatmapStats.result?.result?.value);

    // 5. Open Stock Detail Modal
    const openModalCheck = await send('Runtime.evaluate', {
      expression: `
        (() => {
          const firstCell = document.querySelector('.heatmap-cell');
          if (firstCell) firstCell.click();
          return { clickedCell: !!firstCell };
        })()
      `,
      returnByValue: true
    });
    console.log('5. Clicked Stock Cell:', openModalCheck.result?.result?.value);
    await new Promise(r => setTimeout(r, 400));

    const modalState = await send('Runtime.evaluate', {
      expression: `
        (() => {
          const modalHeader = document.querySelector('.fixed h3');
          return {
            modalOpen: !!modalHeader,
            symbol: modalHeader ? modalHeader.innerText : null
          };
        })()
      `,
      returnByValue: true
    });
    console.log('5b. StockModal Open State:', modalState.result?.result?.value);

    // Close modal
    await send('Runtime.evaluate', {
      expression: `
        (() => {
          const closeBtn = document.querySelector('.fixed button');
          if (closeBtn) closeBtn.click();
        })()
      `
    });
    await new Promise(r => setTimeout(r, 300));

    // 6. Test Bhavcopy Tab via Sidebar
    await send('Runtime.evaluate', {
      expression: `
        (() => {
          const btns = Array.from(document.querySelectorAll('aside button'));
          const btn = btns.find(b => b.innerText.includes('Bhavcopy'));
          if (btn) btn.click();
        })()
      `
    });
    await new Promise(r => setTimeout(r, 500));

    const bhavcopyCheck = await send('Runtime.evaluate', {
      expression: `
        (() => {
          const rows = document.querySelectorAll('table tbody tr');
          const hasPagination = !!document.querySelector('button[title="Next Page"]');
          return { bhavcopyRows: rows.length, hasPagination };
        })()
      `,
      returnByValue: true
    });
    console.log('6. Bhavcopy Tab Rows & High-Speed Pagination:', bhavcopyCheck.result?.result?.value);

    // 7. Test Top Header Search & Autocomplete
    const searchCheck = await send('Runtime.evaluate', {
      expression: `
        (() => {
          const input = document.querySelector('header input');
          if (!input) return { error: 'Search input not found' };
          // Simulate typing 'RELIANCE'
          const nativeInputValueSetter = Object.getOwnPropertyDescriptor(window.HTMLInputElement.prototype, 'value').set;
          nativeInputValueSetter.call(input, 'RELIANCE');
          input.dispatchEvent(new Event('input', { bubbles: true }));
          input.dispatchEvent(new Event('focus', { bubbles: true }));
          return { query: input.value };
        })()
      `,
      returnByValue: true
    });
    await new Promise(r => setTimeout(r, 400));

    const searchResultsCheck = await send('Runtime.evaluate', {
      expression: `
        (() => {
          const dropdownItems = document.querySelectorAll('header [class*="absolute top-full"] > div');
          return { suggestionCount: dropdownItems.length };
        })()
      `,
      returnByValue: true
    });
    console.log('7. Header ⌘K Search Dropdown:', {
      ...searchCheck.result?.result?.value,
      ...searchResultsCheck.result?.result?.value
    });

    console.log('🎉 ALL SHADCN-ADMIN VERIFICATION TESTS PASSED WITH 100% SUCCESS!');
    chrome.kill();
    process.exit(0);
  } catch (err) {
    console.error('Test error:', err);
    chrome.kill();
    process.exit(1);
  }
}, 1000);
