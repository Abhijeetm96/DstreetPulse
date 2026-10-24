const fs = require('fs');

let html = fs.readFileSync('public/index.html', 'utf8');

// 1. Clean up stale 110KB heatmapData fallback
const oldHeatmapRegex = /let heatmapData = \{[\s\S]*?constituents: \[[\s\S]*?\]\s*\};/;
if (oldHeatmapRegex.test(html)) {
  html = html.replace(oldHeatmapRegex, `let heatmapData = {
      timestamp: new Date().toISOString(),
      indices: [],
      constituents: []
    };`);
  console.log('Cleaned up stale embedded heatmapData');
} else {
  console.warn('Could not match oldHeatmapRegex');
}

// 2. Fix search ranking and mojibake in renderHeatmaps
html = html.replace(/Show All \$\{filteredStocks\.length\} Stocks[^\n]*/g, "Show All ${filteredStocks.length} Stocks (Currently showing top ${limitThreshold})`);");
html = html.replace(/Collapse to Top \$\{limitThreshold\} Stocks[^\n]*/g, "Collapse to Top ${limitThreshold} Stocks`);");

// 3. Search ranking
const oldFilterBlock = `        let matchesSearch = true;
        if (searchStk) {
          const tokens = searchStk.split(/\\s+/).filter(Boolean);
          const haystack = \`\${stk.symbol} \${stk.name} \${stk.industry || ''} \${stk.sector || ''}\`.toLowerCase();
          matchesSearch = tokens.every(tok => haystack.includes(tok));
        }
        return matchesSector && matchesSearch;`;

const newFilterBlock = `        let matchesSearch = true;
        let score = 0;
        if (searchStk) {
          const tokens = searchStk.split(/\\s+/).filter(Boolean);
          const sym = (stk.symbol || '').toLowerCase();
          const name = (stk.name || '').toLowerCase();
          const ind = (stk.industry || '').toLowerCase();
          const sec = (stk.sector || '').toLowerCase();
          const haystack = \`\${sym} \${name} \${ind} \${sec}\`;
          matchesSearch = tokens.every(tok => haystack.includes(tok));
          if (matchesSearch) {
            if (sym === searchStk) score += 1000;
            else if (sym.startsWith(searchStk)) score += 500;
            else if (name.startsWith(searchStk)) score += 300;
            else if (sym.includes(searchStk)) score += 100;
            else score += 10;
          }
        }
        stk._searchScore = score;
        return matchesSector && matchesSearch;`;

if (html.includes(oldFilterBlock)) {
  html = html.replace(oldFilterBlock, newFilterBlock);
  html = html.replace(
    "document.getElementById('constituentCountBadge').innerText",
    "if (searchStk) { filteredStocks.sort((a, b) => (b._searchScore || 0) - (a._searchScore || 0)); }\n      document.getElementById('constituentCountBadge').innerText"
  );
  console.log('Search ranking injected');
} else {
  console.warn('oldFilterBlock not found');
}

// 4. Modal Price Labels: Crystal Clear Separation of Real-Time LTP vs SMA Indicator
html = html.replace(
  '<span class="text-[10px] text-[var(--text-muted)] uppercase tracking-wider block font-semibold">Last Traded Price</span>',
  '<span class="text-[10px] text-emerald-400 uppercase tracking-wider block font-bold">Live Market Price (LTP)</span>'
);

html = html.replace(
  '<span class="text-[10px] text-[var(--text-muted)] block uppercase">50-Day Moving Avg</span>',
  '<span class="text-[10px] text-[var(--text-muted)] block uppercase font-medium">50-Day SMA (Indicator)</span>'
);

html = html.replace(
  '<span class="text-[10px] text-emerald-400 block mt-0.5">Above Trend (+3.8%)</span>',
  '<span class="text-[9px] text-slate-400 block mt-0.5">Trend Benchmark (Not LTP)</span>'
);

fs.writeFileSync('public/index.html', html, 'utf8');
console.log('Updated public/index.html! File length:', html.length);

