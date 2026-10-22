const fs = require('fs');

let html = fs.readFileSync('public/index.html', 'utf8');

html = html.replace(
  'showAllBtn.innerText = `Show All ${filteredStocks.length} Stocks (Currently showing top ${limitThreshold})`);',
  'showAllBtn.innerText = `Show All ${filteredStocks.length} Stocks (Currently showing top ${limitThreshold})`;'
);

html = html.replace(
  'showAllBtn.innerText = `Collapse to Top ${limitThreshold} Stocks`);',
  'showAllBtn.innerText = `Collapse to Top ${limitThreshold} Stocks`;'
);

fs.writeFileSync('public/index.html', html, 'utf8');
console.log('Fixed syntax error in public/index.html');

