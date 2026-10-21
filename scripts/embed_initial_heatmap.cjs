const fs = require('fs');

const catalog = JSON.parse(fs.readFileSync('src/catalog_data.json', 'utf8'));
let html = fs.readFileSync('public/index.html', 'utf8');

// 1. Pre-populate indices in heatmapData for instant first paint
const initialHeatmapData = {
  timestamp: catalog.timestamp,
  indices: catalog.indices,
  constituents: catalog.constituents.slice(0, 120) // top 120 pre-populated for instant paint!
};

const oldHeatmapInit = /let heatmapData = \{[\s\S]*?indices: \[\],[\s\S]*?constituents: \[\]\s*\};/;

if (oldHeatmapInit.test(html)) {
  html = html.replace(oldHeatmapInit, `let heatmapData = ${JSON.stringify(initialHeatmapData)};`);
  console.log('Successfully pre-populated heatmapData with indices and top constituents!');
} else {
  console.warn('oldHeatmapInit regex not matched');
}

// 2. Guard renderHeatmaps
if (!html.includes('if (!heatmapData || !heatmapData.indices || !heatmapData.indices.length) return;')) {
  html = html.replace(
    'function renderHeatmaps() {',
    'function renderHeatmaps() {\n      if (!heatmapData || !heatmapData.indices || !heatmapData.indices.length) return;'
  );
  console.log('Added guard to renderHeatmaps');
}

fs.writeFileSync('public/index.html', html, 'utf8');
console.log('public/index.html updated successfully!');

