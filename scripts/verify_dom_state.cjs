const { spawn } = require('child_process');

const chromePath = 'C:\\Program Files\\Google\\Chrome\\Application\\chrome.exe';
const chrome = spawn(chromePath, [
  '--headless=new',
  '--remote-debugging-port=9222',
  '--no-first-run',
  '--no-default-browser-check',
  'http://localhost:3000'
]);

setTimeout(async () => {
  try {
    const listRes = await fetch('http://localhost:9222/json');
    const targets = await listRes.json();
    const target = targets.find(t => t.url.includes('localhost:3000'));
    
    if (target && target.webSocketDebuggerUrl) {
      const ws = new WebSocket(target.webSocketDebuggerUrl);
      
      ws.addEventListener('open', () => {
        ws.send(JSON.stringify({ id: 1, method: 'Console.enable' }));
        ws.send(JSON.stringify({ id: 2, method: 'Runtime.enable' }));
        ws.send(JSON.stringify({ id: 3, method: 'Page.navigate', params: { url: 'http://localhost:3000' } }));
      });
      
      ws.addEventListener('message', async (event) => {
        const msg = JSON.parse(event.data);
        if (msg.method === 'Runtime.exceptionThrown') {
          console.error('[BROWSER EXCEPTION]', msg.params.exceptionDetails.text, msg.params.exceptionDetails.exception?.description);
        }
      });
      
      // Wait for page and async fetch to complete, then inspect DOM
      setTimeout(() => {
        const evalReq = {
          id: 10,
          method: 'Runtime.evaluate',
          params: {
            expression: `({
              activeTab: document.getElementById('content-pipeline')?.classList.contains('hidden') ? 'hidden' : 'visible',
              scanPattern: document.getElementById('pipeScanPattern')?.innerText,
              scanScore: document.getElementById('pipeScanScore')?.innerText,
              rvol: document.getElementById('pipeRvol')?.innerText,
              entryStatus: document.getElementById('pipeEntryStatus')?.innerText,
              entryPrice: document.getElementById('pipeEntryPrice')?.innerText,
              stopLoss: document.getElementById('pipeStopLoss')?.innerText,
              targetPrice: document.getElementById('pipeTargetPrice')?.innerText,
              probTarget: document.getElementById('pipeProbTarget')?.innerText,
              tmVerdict: document.getElementById('pipeTmVerdict')?.innerText,
              shares: document.getElementById('pipeShares')?.innerText,
              riskVerdict: document.getElementById('pipeRiskVerdict')?.innerText,
              ticketSymbol: document.getElementById('ticketSymbol')?.innerText,
              ticketPrice: document.getElementById('ticketPrice')?.innerText
            })`,
            returnByValue: true
          }
        };
        
        ws.send(JSON.stringify(evalReq));
        
        const originalMsg = ws.onmessage;
        ws.addEventListener('message', (ev) => {
          const m = JSON.parse(ev.data);
          if (m.id === 10) {
            console.log('--- DOM STATE REPORT ---');
            console.log(JSON.stringify(m.result.result.value, null, 2));
            ws.close();
            chrome.kill();
            process.exit(0);
          }
        });
      }, 3500);

    } else {
      console.log('No matching target found');
      chrome.kill();
      process.exit(0);
    }
  } catch (err) {
    console.error('Test error:', err);
    chrome.kill();
    process.exit(1);
  }
}, 2000);

