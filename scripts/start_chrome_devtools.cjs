const { spawn } = require('child_process');
const fs = require('fs');
const path = require('path');

const chromePath = 'C:\\Program Files\\Google\\Chrome\\Application\\chrome.exe';
const profileDir = 'C:\\Users\\abhij\\.gemini\\chrome-devtools-profile';
if (!fs.existsSync(profileDir)) fs.mkdirSync(profileDir, { recursive: true });

console.log('>>> Starting Chrome with DevTools on port 9222...');
const chrome = spawn(chromePath, [
  '--remote-debugging-port=9222',
  `--user-data-dir=${profileDir}`,
  '--no-first-run',
  '--no-default-browser-check',
  '--remote-allow-origins=*',
  '--window-size=1536,800',
  'http://localhost:3000'
]);

chrome.on('error', (err) => {
  console.error('Chrome spawn error:', err);
});

chrome.on('exit', (code, signal) => {
  console.log(`Chrome exited with code ${code}, signal ${signal}`);
  process.exit(code || 0);
});

async function setupPortFile() {
  for (let i = 0; i < 30; i++) {
    await new Promise(r => setTimeout(r, 500));
    try {
      const res = await fetch('http://127.0.0.1:9222/json/version');
      if (res.ok) {
        const data = await res.json();
        console.log('Chrome is ready. Version:', data.Browser);
        const wsUrl = data.webSocketDebuggerUrl;
        const wsPath = wsUrl.replace(/^ws:\/\/[^/]+/, '');

        const targetFile = 'C:\\Users\\abhij\\AppData\\Local\\Google\\Chrome\\User Data\\DevToolsActivePort';
        fs.writeFileSync(targetFile, `9222\n${wsPath}\n`);
        console.log(`>>> Written DevToolsActivePort to ${targetFile}:`);
        console.log(fs.readFileSync(targetFile, 'utf8'));
        console.log('>>> Chrome DevTools is now actively listening and ready for subagent connection!');
        return;
      }
    } catch (e) {
      // waiting for port
    }
  }
  console.error('Failed to connect to Chrome on port 9222 within 15s');
}

setupPortFile();
