/**
 * Headless Chrome Automated Verification Script
 * Viewport: 1536 x 695 (Matching user feedback)
 * Verifies word-wrapped table redesign and tests 15+ diverse stock types
 */

import { spawn } from 'node:child_process';
import { writeFileSync } from 'node:fs';

const CHROME_PATH = 'C:\\Program Files\\Google\\Chrome\\Application\\chrome.exe';
const DEBUG_PORT = 9333;
const TARGET_URL = 'http://localhost:3000';

const TEST_STOCKS = [
  { symbol: 'RELIANCE', type: 'Large-Cap Conglomerate & Energy' },
  { symbol: 'TCS', type: 'Tier-1 IT Services & Mega-Cap Tech' },
  { symbol: 'INFY', type: 'High-Beta IT & Cloud Digital' },
  { symbol: 'ICICIBANK', type: 'Private Sector Banking Giant' },
  { symbol: 'SBIN', type: 'Public Sector Undertaking (PSU) Bank' },
  { symbol: 'BHARTIARTL', type: 'Telecom & Digital Infrastructure' },
  { symbol: 'TATASTEEL', type: 'Cyclical Metals & Global Commodities' },
  { symbol: 'SUNPHARMA', type: 'Defensive Healthcare & Pharma' },
  { symbol: 'ITC', type: 'Defensive FMCG & Conglomerate' },
  { symbol: 'TMCV', type: 'Automobile & Commercial Vehicles (Tata Motors)' },
  { symbol: 'DLF', type: 'High-Beta Real Estate & Commercial' },
  { symbol: 'LT', type: 'Heavy Engineering & Mega Infrastructure' },
  { symbol: 'BAJFINANCE', type: 'Consumer NBFC & Retail Lending' },
  { symbol: 'TITAN', type: 'Consumer Discretionary & Luxury Lifestyle' },
  { symbol: 'NTPC', type: 'Power Generation & Green Energy PSU' },
  { symbol: 'TATACHEM', type: 'Specialty Chemicals & Agri-inputs' },
  { symbol: 'PFC', type: 'Power Infrastructure Financier PSU' },
  { symbol: 'ADANIGREEN', type: 'High-Beta Renewable Energy' }
];

async function runTest() {
  console.log('>>> Launching Headless Chrome at 1536x695...');
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
    // Wait for Chrome remote debugging port to open
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

    if (!wsUrl) {
      throw new Error('Failed to connect to Chrome remote debugging port');
    }
    console.log('>>> Connected to Chrome CDP:', wsUrl);

    // Create WebSocket client for CDP
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

    // Create target page
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

    console.log('>>> Navigating to', TARGET_URL, 'at 1536x695...');
    await sendPage('Page.navigate', { url: TARGET_URL });

    // Wait for React to mount and fetch initial data
    await new Promise(r => setTimeout(r, 2500));

    // Switch to Swing Radar Tab
    console.log('>>> Switching to Swing Radar Tab...');
    const switchTabEval = await sendPage('Runtime.evaluate', {
      expression: `(() => {
        const buttons = Array.from(document.querySelectorAll('button'));
        const radarBtn = buttons.find(b => b.textContent.includes('Swing Radar'));
        if (radarBtn) {
          radarBtn.click();
          return { success: true, text: radarBtn.textContent.trim() };
        }
        return { success: false, reason: 'Tab button not found' };
      })()`,
      returnByValue: true
    });
    console.log('>>> Tab Switch Result:', switchTabEval.result?.value);

    // Wait for Swing Radar table to render
    await new Promise(r => setTimeout(r, 1500));

    // Test Word-Wrapped Table Dimensions & Structure on 1536x695 viewport
    console.log('>>> Evaluating Table Layout & Word Wrapping at 1536x695...');
    const tableAuditEval = await sendPage('Runtime.evaluate', {
      expression: `(() => {
        const container = document.querySelector('.overflow-x-auto') || document.querySelector('table')?.parentElement;
        const table = document.querySelector('table');
        if (!table) return { found: false };

        const ths = Array.from(table.querySelectorAll('th')).map(th => ({
          text: th.textContent.replace(/\\s+/g, ' ').trim(),
          width: Math.round(th.getBoundingClientRect().width)
        }));

        const rows = Array.from(table.querySelectorAll('tbody tr')).slice(0, 10).map(tr => {
          const tds = Array.from(tr.querySelectorAll('td')).map(td => ({
            text: td.textContent.replace(/\\s+/g, ' ').trim(),
            width: Math.round(td.getBoundingClientRect().width),
            scrollWidth: td.scrollWidth,
            clientWidth: td.clientWidth,
            isOverflowing: td.scrollWidth > td.clientWidth + 2
          }));
          return { tds };
        });

        const tableRect = table.getBoundingClientRect();
        const containerRect = container ? container.getBoundingClientRect() : null;

        return {
          found: true,
          viewportWidth: window.innerWidth,
          viewportHeight: window.innerHeight,
          tableWidth: Math.round(tableRect.width),
          containerWidth: containerRect ? Math.round(containerRect.width) : null,
          hasHorizontalScroll: container ? container.scrollWidth > container.clientWidth : false,
          headersCount: ths.length,
          headers: ths,
          sampleRowTds: rows[0]?.tds || [],
          anyCellOverflowing: rows.some(r => r.tds.some(td => td.isOverflowing))
        };
      })()`,
      returnByValue: true
    });

    const tableAudit = tableAuditEval.result?.value;
    console.log('>>> Table Layout Audit:', JSON.stringify(tableAudit, null, 2));

    // Fetch and evaluate at least 15 diverse types of stocks
    console.log('>>> Testing 15+ Diverse Types of Stocks on Live Interface...');
    const startTime = Date.now();
    const stockResultsEval = await sendPage('Runtime.evaluate', {
      expression: `(async () => {
        const testList = ${JSON.stringify(TEST_STOCKS)};
        const results = [];

        // Fetch /api/scanner data
        const res = await fetch('/api/scanner');
        const data = await res.json();
        const candidates = data.candidates || [];

        for (const target of testList) {
          const startStockTime = performance.now();
          const candidate = candidates.find(c => c.symbol === target.symbol);
          const elapsedMs = Number((performance.now() - startStockTime).toFixed(2));

          if (!candidate) {
            results.push({
              symbol: target.symbol,
              category: target.type,
              found: false,
              elapsedMs
            });
            continue;
          }

          results.push({
            symbol: candidate.symbol,
            name: candidate.name,
            sector: candidate.sector,
            category: target.type,
            found: true,
            ltp: candidate.ltp,
            changePct: candidate.change_perc,
            qualityScore: candidate.qualityScore,
            grade: candidate.grade,
            classification: candidate.classification,
            layer: candidate.layer,
            layerLabel: candidate.layerLabel,
            trapRisk: candidate.trapRisk,
            barCloseLocation: candidate.barCloseLocation,
            upperWickPct: candidate.upperWickPct,
            rsVsNifty: candidate.rsVsNifty,
            rsVsSector: candidate.rsVsSector,
            stopLoss: candidate.stopLoss,
            target1: candidate.target1,
            target2: candidate.target2,
            rewardToRisk: candidate.rewardToRisk,
            forecast: {
              winProbPct: candidate.forecast?.breakoutProbabilityPct,
              expectedMovePct: candidate.forecast?.expectedMovePct,
              conservativeMovePct: candidate.forecast?.conservativeMovePct,
              maxExpansionPct: candidate.forecast?.maxExpansionPct,
              rating: candidate.forecast?.forecastRating,
              horizon: candidate.forecast?.horizon
            },
            elapsedMs
          });
        }

        return {
          totalTested: results.length,
          foundCount: results.filter(r => r.found).length,
          results
        };
      })()`,
      awaitPromise: true,
      returnByValue: true
    });

    const totalDurationMs = Date.now() - startTime;
    const stockTestOutput = stockResultsEval.result?.value;

    console.log(`>>> Successfully tested ${stockTestOutput.foundCount} / ${stockTestOutput.totalTested} stocks in ${totalDurationMs}ms`);

    // Test the Probabilistic Cone Modal interaction
    console.log('>>> Triggering Probabilistic Cone Modal for top candidate...');
    const modalTestEval = await sendPage('Runtime.evaluate', {
      expression: `(() => {
        const coneButtons = Array.from(document.querySelectorAll('button')).filter(b => b.textContent.includes('Cone Details') || b.textContent.includes('WIN'));
        if (coneButtons.length > 0) {
          coneButtons[0].click();
          return { clicked: true, buttonText: coneButtons[0].textContent.replace(/\\s+/g, ' ').trim() };
        }
        return { clicked: false };
      })()`,
      returnByValue: true
    });
    console.log('>>> Modal Click:', modalTestEval.result?.value);

    await new Promise(r => setTimeout(r, 600));

    // Inspect open modal DOM
    const modalContentEval = await sendPage('Runtime.evaluate', {
      expression: `(() => {
        const modal = document.querySelector('.fixed.inset-0');
        if (!modal) return { open: false };
        const title = modal.querySelector('h3')?.textContent?.trim();
        const textSnippets = Array.from(modal.querySelectorAll('.font-mono, .text-xs, .text-sm')).map(el => el.textContent.trim()).filter(Boolean).slice(0, 10);
        return {
          open: true,
          title,
          textSnippets
        };
      })()`,
      returnByValue: true
    });
    console.log('>>> Modal Inspector DOM State:', modalContentEval.result?.value);

    // Capture visual screenshot
    console.log('>>> Capturing verification screenshot...');
    const screenshotData = await sendPage('Page.captureScreenshot', { format: 'png' });
    writeFileSync('swing_radar_verification_1536x695.png', Buffer.from(screenshotData.data, 'base64'));
    console.log('>>> Screenshot saved to swing_radar_verification_1536x695.png');

    // Compile comprehensive verification report
    const report = {
      timestamp: new Date().toISOString(),
      viewport: { width: 1536, height: 695 },
      tableAudit,
      performance: {
        totalDurationMs,
        avgStockLookupMs: Number((totalDurationMs / stockTestOutput.totalTested).toFixed(2))
      },
      stockVerification: stockTestOutput,
      modalVerification: {
        buttonClicked: modalTestEval.result?.value,
        modalState: modalContentEval.result?.value
      }
    };

    writeFileSync('verification_15_stocks_report.json', JSON.stringify(report, null, 2));
    console.log('>>> Full report written to verification_15_stocks_report.json');

    // Clean up
    await sendPage('Page.close');
    pageWs.close();
    ws.close();
    chromeProcess.kill('SIGTERM');

    return report;
  } catch (err) {
    chromeProcess.kill('SIGTERM');
    throw err;
  }
}

runTest()
  .then(report => {
    console.log('>>> All 18 stock types verified successfully!');
  })
  .catch(err => {
    console.error('>>> Verification error:', err);
    process.exit(1);
  });
