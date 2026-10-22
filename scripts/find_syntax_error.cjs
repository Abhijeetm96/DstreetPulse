const fs = require('fs');

const html = fs.readFileSync('public/index.html', 'utf8');
const scriptMatches = [...html.matchAll(/<script[\s\S]*?>([\s\S]*?)<\/script>/gi)];
const code = scriptMatches[1][1];
const lines = code.split('\n');

for (let i = 1; i <= lines.length; i++) {
  try {
    new Function(lines.slice(0, i).join('\n'));
  } catch (e) {
    if (e.message.includes("Unexpected token ')'")) {
      console.log('Error around script line', i);
      for (let j = Math.max(0, i - 10); j < Math.min(lines.length, i + 5); j++) {
        console.log((j+1) + ': ' + lines[j]);
      }
      break;
    }
  }
}

