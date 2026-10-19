const fs = require('fs');

let html = fs.readFileSync('public/index.html', 'utf8');

// 1. Update Refresh LTP button
html = html.replace(
  '<button onclick="fetchHeatmapData()" class="flex items-center gap-1.5 px-3.5 py-2 rounded-xl bg-slate-800 text-slate-300 hover:text-white border border-[var(--border)] text-xs font-medium transition-all">\n            <span></span> Refresh LTP',
  '<button id="refreshLtpBtn" onclick="triggerFullRefresh()" class="flex items-center gap-1.5 px-3.5 py-2 rounded-xl bg-slate-800 text-slate-300 hover:text-white border border-[var(--border)] text-xs font-medium transition-all">\n            <span>↻</span> Refresh LTP'
);

// 2. Add triggerFullRefresh function
const oldFetchHeatmap = `    function fetchHeatmapData() {
      fetch('/api/heatmaps?t=' + Date.now())`;

const newFetchHeatmap = `    async function triggerFullRefresh() {
      const btn = document.getElementById('refreshLtpBtn');
      if (btn) btn.innerText = 'Syncing 501 Scrips...';
      try {
        await fetch('/api/refresh-catalog');
      } catch (_) {}
      await fetchHeatmapData();
      if (btn) btn.innerText = 'Refresh LTP';
    }

    function fetchHeatmapData() {
      fetch('/api/heatmaps?t=' + Date.now())`;

html = html.replace(oldFetchHeatmap, newFetchHeatmap);

// 3. Make openStockModal trigger real-time tick on every click without recursion
html = html.replace(
  'function openStockModal(symbol) {',
  'function openStockModal(symbol, skipLiveFetch = false) {'
);

html = html.replace(
  'openStockModal(currentModalStock.symbol);',
  'openStockModal(currentModalStock.symbol, true);'
);

html = html.replace(
  'const modal = document.getElementById(\'stockDetailModal\');\n      modal.classList.remove(\'hidden\');\n    }',
  'const modal = document.getElementById(\'stockDetailModal\');\n      modal.classList.remove(\'hidden\');\n      if (!skipLiveFetch) refreshLiveModalStock();\n    }'
);

fs.writeFileSync('public/index.html', html, 'utf8');
console.log('Successfully updated public/index.html with live refresh and instantaneous tick sync!');

