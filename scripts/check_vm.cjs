const fs = require('fs');
const vm = require('vm');

const html = fs.readFileSync('public/index.html', 'utf8');
const scriptMatches = [...html.matchAll(/<script[\s\S]*?>([\s\S]*?)<\/script>/gi)];
const code = scriptMatches[1][1];

try {
  new vm.Script(code, { filename: 'script1.js' });
  console.log('No syntax error!');
} catch (e) {
  console.error('Syntax error details:');
  console.error(e.stack);
}

