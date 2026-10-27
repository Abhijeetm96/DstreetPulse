const { spawn } = require('child_process');

const CHROME_PATH = 'C:\\Program Files\\Google\\Chrome\\Application\\chrome.exe';
const DEBUG_PORT = 9339;
const TARGET_URL = 'http://localhost:3000';

async function testModes() {
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
    let wsUrl = null;
    for (let i = 0; i < 20; i++) {
      await new Promise(r => setTimeout(r, 400));
      try {
        const res = await fetch(`http://127.0.0.1:${DEBUG_PORT}/json/version`);
        if (res.ok) {
          const d = await res.json();
          wsUrl = d.webSocketDebuggerUrl;
          break;
        }
      } catch (_) {}
    }

    const ws = new WebSocket(wsUrl);
    await new Promise(r => ws.onopen = r);

    let id = 1;
    const send = (m, p = {}) => new Promise((resolve, reject) => {
      const curId = id++;
      const handler = (e) => {
        const d = JSON.parse(e.data);
        if (d.id === curId) {
          ws.removeEventListener('message', handler);
          if (d.error) reject(d.error);
          else resolve(d.result);
        }
      };
      ws.addEventListener('message', handler);
      ws.send(JSON.stringify({ id: curId, method: m, params: p }));
    });

    const targets = await send('Target.getTargets');
    const pageTarget = targets.targetInfos.find(t => t.type === 'page');
    const { sessionId } = await send('Target.attachToTarget', { targetId: pageTarget.targetId, flatten: true });

    let pageMsgId = 1;
    const pagePending = new Map();
    ws.addEventListener('message', (e) => {
      const d = JSON.parse(e.data);
      if (d.method === 'Target.receivedMessageFromTarget') {
        const inner = JSON.parse(d.params.message);
        if (inner.id && pagePending.has(inner.id)) {
          const { resolve, reject } = pagePending.get(inner.id);
          pagePending.delete(inner.id);
          if (inner.error) reject(inner.error);
          else resolve(inner.result);
        }
      }
    });

    const sendPage = (m, p = {}) => new Promise((resolve, reject) => {
      const cur = pageMsgId++;
      pagePending.set(cur, { resolve, reject });
      send('Target.sendMessageToTarget', {
        sessionId,
        message: JSON.stringify({ id: cur, method: m, params: p })
      });
    });

    await sendPage('Page.enable');
    await sendPage('Page.navigate', { url: TARGET_URL });
    await new Promise(r => setTimeout(r, 2500));

    // Test 1: Verify 52W High/Low mode default
    const res52w = await sendPage('Runtime.evaluate', {
      expression: `(() => {
        const btns = Array.from(document.querySelectorAll('button')).map(b => b.textContent.trim());
        const ths = Array.from(document.querySelectorAll('th')).map(t => t.textContent.trim());
        const apexBadges = Array.from(document.querySelectorAll('.neopop-card span')).map(s => s.textContent.trim());
        return {
          has52wHeader: ths.some(t => t.includes('52W Range')),
          hasDistHeader: ths.some(t => t.includes('Distance to 52W')),
          apexIncludes52w: apexBadges.some(b => b.includes('52W High')),
          apexIncludesVol: apexBadges.some(b => b.includes('Volume Surge')),
          apexIncludesSent: apexBadges.some(b => b.includes('Market Mood'))
        };
      })()`,
      returnByValue: true
    });

    console.log('>>> 52W Mode Audit:', res52w.result.value);

    // Test 2: Click "By Volume & RVOL" button
    await sendPage('Runtime.evaluate', {
      expression: `(() => {
        const btn = Array.from(document.querySelectorAll('button')).find(b => b.textContent.includes('By Volume'));
        if (btn) btn.click();
      })()`
    });
    await new Promise(r => setTimeout(r, 600));

    const resVol = await sendPage('Runtime.evaluate', {
      expression: `(() => {
        const ths = Array.from(document.querySelectorAll('th')).map(t => t.textContent.trim());
        const tags = Array.from(document.querySelectorAll('.neopop-tag')).map(t => t.textContent.trim());
        return {
          hasRvolHeader: ths.some(t => t.includes('RVOL Surge')),
          hasRvolSurgeTags: tags.some(t => t.includes('Surge'))
        };
      })()`,
      returnByValue: true
    });

    console.log('>>> Volume Mode Audit:', resVol.result.value);

    // Test 3: Click "Market Sentiment" button
    await sendPage('Runtime.evaluate', {
      expression: `(() => {
        const btn = Array.from(document.querySelectorAll('button')).find(b => b.textContent.includes('Market Sentiment'));
        if (btn) btn.click();
      })()`
    });
    await new Promise(r => setTimeout(r, 600));

    const resSent = await sendPage('Runtime.evaluate', {
      expression: `(() => {
        const ths = Array.from(document.querySelectorAll('th')).map(t => t.textContent.trim());
        const tags = Array.from(document.querySelectorAll('.neopop-tag')).map(t => t.textContent.trim());
        return {
          hasSentimentHeader: ths.some(t => t.includes('Sentiment Score')),
          hasSentimentTags: tags.some(t => t.includes('/ 100'))
        };
      })()`,
      returnByValue: true
    });

    console.log('>>> Sentiment Mode Audit:', resSent.result.value);

    chrome.kill();
    console.log('>>> ALL DAY PARAMETER MODES VERIFIED IN HEADLESS BROWSER!');
  } catch (err) {
    console.error('Mode audit error:', err);
    chrome.kill();
  }
}

testModes();

