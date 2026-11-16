/**
 * CRED NeoPOP Design System Verification Script
 * Viewport: 1536x695
 */

import { spawn } from 'node:child_process';
import { writeFileSync, copyFileSync } from 'node:fs';
import { resolve } from 'node:path';

const CHROME_PATH = 'C:\\Program Files\\Google\\Chrome\\Application\\chrome.exe';
const DEBUG_PORT = 9335;
const TARGET_URL = 'http://localhost:3000';
const ARTIFACT_DIR = './reports';

async function verifyNeoPOP() {
  console.log('>>> Launching Headless Chrome for CRED NeoPOP Design Audit at 1536x695...');
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
    await sendPage('Emulation.setDeviceMetricsOverride', {
      width: 1536,
      height: 695,
      deviceScaleFactor: 1,
      mobile: false
    });

    await sendPage('Page.navigate', { url: TARGET_URL });
    await new Promise(r => setTimeout(r, 3500));

    // Audit Live Terminal page for NeoPOP tokens and zero gradients
    const audit = await sendPage('Runtime.evaluate', {
      expression: `(() => {
        // 1. Check if .flex-1 > .mx-auto > .space-y-4 > .grid exists (user requested removal)
        const heroGrid = document.querySelector('.flex-1 > .mx-auto > .space-y-4 > .grid');

        // 2. Count gradient occurrences in computed backgrounds
        const allElements = document.querySelectorAll('*');
        let gradientCount = 0;
        for (const el of allElements) {
          const bg = window.getComputedStyle(el).backgroundImage;
          if (bg && bg.includes('gradient')) {
            gradientCount++;
          }
        }

        // 3. Count NeoPOP elements
        const neopopBtns = document.querySelectorAll('.neopop-btn');
        const neopopCards = document.querySelectorAll('.neopop-card, .neopop-card-subtle');
        const neopopTags = document.querySelectorAll('.neopop-tag');

        // 4. Check active palette colors
        const bgColor = window.getComputedStyle(document.body).backgroundColor;

        // 5. Day Parameters check (Volume, Sentiment, 52W High/Low)
        const allText = document.body.innerText.toLowerCase();
        const snippet = document.body.innerText.slice(0, 300);
        const has52w = allText.includes('52w') || allText.includes('52-week');
        const hasVolume = allText.includes('volume') || allText.includes('rvol');
        const hasSentiment = allText.includes('sentiment') || allText.includes('mood');
        const hasTurnover = allText.includes('turnover');

        return {
          heroGridRemoved: !heroGrid,
          gradientCount,
          neopopBtnsCount: neopopBtns.length,
          neopopCardsCount: neopopCards.length,
          neopopTagsCount: neopopTags.length,
          bodyBgColor: bgColor,
          snippet,
          parameters: {
            has52wHighLow: has52w,
            hasVolumeRvol: hasVolume,
            hasMarketSentiment: hasSentiment,
            hasTurnoverDelivery: hasTurnover
          },
          title: document.title
        };
      })()`,
      returnByValue: true
    });

    console.log('>>> NeoPOP Design Audit Result:', audit.result?.value);

    // Capture screenshot of Live Terminal in CRED NeoPOP theme
    const screenshot = await sendPage('Page.captureScreenshot', { format: 'png' });
    const localPath = resolve(process.cwd(), 'neopop_dashboard_1536x695.png');
    writeFileSync(localPath, Buffer.from(screenshot.data, 'base64'));
    console.log(`>>> Screenshot captured locally at: ${localPath}`);

    const artifactPath = resolve(ARTIFACT_DIR, 'neopop_dashboard_1536x695.png');
    copyFileSync(localPath, artifactPath);
    console.log(`>>> Screenshot copied to artifacts at: ${artifactPath}`);

    await sendPage('Page.close');
    pageWs.close();
    ws.close();
    chromeProcess.kill('SIGTERM');

    return audit.result?.value;
  } catch (err) {
    chromeProcess.kill('SIGTERM');
    throw err;
  }
}

verifyNeoPOP()
  .then(() => console.log('>>> NeoPOP Design Verification Complete!'))
  .catch(err => {
    console.error('>>> Error:', err);
    process.exit(1);
  });

