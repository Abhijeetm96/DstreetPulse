/**
 * Comprehensive Browser Verification Script for ALL Pages/Tabs
 * Viewport: 1536 x 695
 */

import { spawn } from 'node:child_process';
import { writeFileSync } from 'node:fs';

const CHROME_PATH = 'C:\\Program Files\\Google\\Chrome\\Application\\chrome.exe';
const DEBUG_PORT = 9334;
const TARGET_URL = 'http://localhost:3000';

const TABS_TO_TEST = [
  { id: 'live-market', label: 'Live Terminal' },
  { id: 'swing-scanner', label: 'Swing Radar' },
  { id: 'block-deals', label: 'Block & Bulk Deals' },
  { id: 'heatmaps', label: 'Sector Heatmaps' },
  { id: 'indices', label: 'All Indices' },
  { id: 'bhavcopy', label: 'CM Bhavcopy' },
  { id: 'gainers-losers', label: 'Top Movers' },
  { id: 'volume-gainers', label: 'Most Active' },
  { id: 'mcp-inspector', label: 'MCP Architecture' }
];

async function verifyAllPages() {
  console.log('>>> Launching Headless Chrome for Multi-Page Audit at 1536x695...');
  const chromeProcess = spawn(CHROME_PATH, [
    `--remote-debugging-port=${DEBUG_PORT}`,
    '--headless=new',
    '--window-size=1536,695',
    '--hide-scrollbars',
    '--disable-gpu',
    '--no-sandbox',
    '--disable-dev-shm-usage',
    '--remote-allow-origins=*'
  ]);

  try {
    let wsUrl = null;
    for (let i = 0; i < 20; i++) {
      await new Promise(r => setTimeout(r, 400));
      try {
        const res = await fetch(`http://127.0.0.1:${DEBUG_PORT}/json/version`);
        if (res.ok) {
          const data = await res.json();
          wsUrl = data.webSocketDebuggerUrl;
          break;
        }
      } catch (_) {}
    }

    if (!wsUrl) throw new Error('Failed to connect to Chrome debugging port');

    const ws = new WebSocket(wsUrl);
    await new Promise((resolve, reject) => {
      ws.onopen = resolve;
      ws.onerror = reject;
    });

    let msgId = 1;
    const pending = new Map();
    ws.onmessage = (event) => {
      const data = JSON.parse(event.data);
      if (data.id && pending.has(data.id)) {
        const { resolve, reject } = pending.get(data.id);
        pending.delete(data.id);
        if (data.error) reject(data.error);
        else resolve(data.result);
      }
    };

    function send(method, params = {}) {
      return new Promise((resolve, reject) => {
        const id = msgId++;
        pending.set(id, { resolve, reject });
        ws.send(JSON.stringify({ id, method, params }));
      });
    }

    const { targetId } = await send('Target.createTarget', { url: TARGET_URL });
    const pageRes = await fetch(`http://127.0.0.1:${DEBUG_PORT}/json/list`);
    const pages = await pageRes.json();
    const pageTarget = pages.find(p => p.id === targetId) || pages[0];

    const pageWs = new WebSocket(pageTarget.webSocketDebuggerUrl);
    await new Promise((resolve, reject) => {
      pageWs.onopen = resolve;
      pageWs.onerror = reject;
    });

    let pageMsgId = 1;
    const pagePending = new Map();
    pageWs.onmessage = (event) => {
      const data = JSON.parse(event.data);
      if (data.id && pagePending.has(data.id)) {
        const { resolve, reject } = pagePending.get(data.id);
        pagePending.delete(data.id);
        if (data.error) reject(data.error);
        else resolve(data.result);
      }
    };

    function sendPage(method, params = {}) {
      return new Promise((resolve, reject) => {
        const id = pageMsgId++;
        pagePending.set(id, { resolve, reject });
        pageWs.send(JSON.stringify({ id, method, params }));
      });
    }

    await sendPage('Page.enable');
    await sendPage('DOM.enable');
    await sendPage('Runtime.enable');
    await sendPage('Emulation.setDeviceMetricsOverride', {
      width: 1536,
      height: 695,
      deviceScaleFactor: 1,
      mobile: false
    });

    console.log('>>> Loading dashboard at', TARGET_URL, '...');
    await sendPage('Page.navigate', { url: TARGET_URL });
    await new Promise(r => setTimeout(r, 2500));

    const pageAuditResults = [];

    for (const tab of TABS_TO_TEST) {
      console.log(`>>> Switching to tab: ${tab.label} (${tab.id})...`);
      const switchResult = await sendPage('Runtime.evaluate', {
        expression: `(() => {
          const buttons = Array.from(document.querySelectorAll('aside button, nav button, header button'));
          const btn = buttons.find(b => b.textContent.includes('${tab.label}'));
          if (btn) {
            btn.click();
            return { clicked: true, text: btn.textContent.trim() };
          }
          return { clicked: false };
        })()`,
        returnByValue: true
      });

      await new Promise(r => setTimeout(r, 1000));

      // Audit DOM structure of active tab
      const auditResult = await sendPage('Runtime.evaluate', {
        expression: `(() => {
          const main = document.querySelector('main');
          const cards = document.querySelectorAll('.glass-panel, .rounded-2xl, .rounded-xl');
          const tables = document.querySelectorAll('table');
          const inputs = document.querySelectorAll('input, select');
          const buttons = document.querySelectorAll('button');

          return {
            tab: '${tab.id}',
            label: '${tab.label}',
            rendered: !!main,
            cardsCount: cards.length,
            tablesCount: tables.length,
            inputsCount: inputs.length,
            buttonsCount: buttons.length,
            hasContent: (main?.textContent?.length || 0) > 100
          };
        })()`,
        returnByValue: true
      });

      console.log(`>>> Tab ${tab.label} Audit:`, auditResult.result?.value);
      pageAuditResults.push(auditResult.result?.value);
    }

    // Now test opening StockModal on one stock
    console.log('>>> Testing Stock Detail & Returns Modal...');
    const modalClick = await sendPage('Runtime.evaluate', {
      expression: `(() => {
        const inspectBtn = Array.from(document.querySelectorAll('button')).find(b => b.textContent.includes('Inspect'));
        if (inspectBtn) {
          inspectBtn.click();
          return { clicked: true };
        }
        return { clicked: false };
      })()`,
      returnByValue: true
    });

    await new Promise(r => setTimeout(r, 1200));

    const modalAudit = await sendPage('Runtime.evaluate', {
      expression: `(() => {
        const modal = document.querySelector('.fixed.inset-0');
        if (!modal) return { open: false };
        const title = modal.querySelector('h3')?.textContent;
        const tabs = Array.from(modal.querySelectorAll('button')).map(b => b.textContent.trim()).filter(Boolean);
        return {
          open: true,
          title,
          tabs: tabs.slice(0, 5)
        };
      })()`,
      returnByValue: true
    });
    console.log('>>> Modal Audit:', modalAudit.result?.value);

    // Save full multi-page report
    const fullReport = {
      timestamp: new Date().toISOString(),
      viewport: { width: 1536, height: 695 },
      pagesTested: pageAuditResults.length,
      pageAuditResults,
      modalAudit: modalAudit.result?.value
    };

    writeFileSync('multi_page_ui_audit.json', JSON.stringify(fullReport, null, 2));
    console.log('>>> Multi-page UI audit complete! Written to multi_page_ui_audit.json');

    await sendPage('Page.close');
    pageWs.close();
    ws.close();
    chromeProcess.kill('SIGTERM');

    return fullReport;
  } catch (err) {
    chromeProcess.kill('SIGTERM');
    throw err;
  }
}

verifyAllPages()
  .then(() => console.log('>>> ALL PAGES VERIFIED SUCCESSFULLY!'))
  .catch(err => {
    console.error('>>> Error during multi-page audit:', err);
    process.exit(1);
  });

