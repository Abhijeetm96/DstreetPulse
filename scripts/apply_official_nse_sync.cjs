const fs = require('fs');
const path = require('path');

const brainDir = 'C:/Users/abhij/.gemini/antigravity/brain/92ab32d3-0008-484e-b83a-09e26113ed64/.system_generated/steps';

function extractJSON(rawText) {
  const start = rawText.indexOf('{');
  const end = rawText.lastIndexOf('}');
  if (start !== -1 && end !== -1 && end > start) {
    return JSON.parse(rawText.slice(start, end + 1));
  }
  return JSON.parse(rawText);
}

// 1. Load Indices from step 11093
const indicesFile = path.join(brainDir, '11093', 'output.txt');
const indicesRaw = extractJSON(fs.readFileSync(indicesFile, 'utf8'));
const allIndices = [
  ...(indicesRaw.indices.derivatives || []),
  ...(indicesRaw.indices.broad || []),
  ...(indicesRaw.indices.sectoral || []),
  ...(indicesRaw.indices.strategy || []),
  ...(indicesRaw.indices.thematic || []),
  ...(indicesRaw.indices.fixed_income || [])
];

const idxMap = new Map();
allIndices.forEach(idx => {
  const normName = idx.indexName.toUpperCase().replace(/\s+/g, ' ').trim();
  idxMap.set(normName, idx);
});

// 2. Load Equity Bhavcopy quotes from extracted_quotes.json
const quotesList = JSON.parse(fs.readFileSync('scripts/extracted_quotes.json', 'utf8'));
const quotesMap = new Map();
quotesList.forEach(q => quotesMap.set(q.symbol, q));
console.log(`Loaded ${quotesMap.size} official Bhavcopy equity quotes.`);
console.log(`Loaded ${quotesMap.size} official Bhavcopy equity quotes.`);

// 3. Update src/catalog_data.json
const catalogPath = path.resolve(__dirname, '../src/catalog_data.json');
const catalog = JSON.parse(fs.readFileSync(catalogPath, 'utf8'));

// Update Indices
let updatedIndices = 0;
catalog.indices = (catalog.indices || []).map(ci => {
  const key = ci.name.toUpperCase().replace(/\s+/g, ' ').trim();
  const found = idxMap.get(key);
  if (found) {
    updatedIndices++;
    return {
      ...ci,
      ltp: found.last,
      anchor_ltp: found.last,
      change: found.change,
      change_perc: found.percChange,
      open: found.open,
      high: found.high,
      low: found.low,
      prev_close: found.previousClose,
      previous_close: found.previousClose,
      last_updated: found.timeVal || indicesRaw.nseTimestamp || '20-Nov-2026 15:11'
    };
  }
  return ci;
});

// Update Equities
let updatedConstituents = 0;
catalog.constituents = (catalog.constituents || []).map(stk => {
  const q = quotesMap.get(stk.symbol);
  if (q) {
    updatedConstituents++;
    const ltp = q.close;
    const prevClose = q.prev_close || stk.prev_close || ltp;
    const chg = q.pct_change !== undefined ? q.pct_change : Number((((ltp - prevClose) / prevClose) * 100).toFixed(2));
    
    return {
      ...stk,
      ltp: ltp,
      anchor_ltp: ltp,
      close: ltp,
      open: q.open || stk.open,
      high: q.high || stk.high,
      low: q.low || stk.low,
      prev_close: prevClose,
      change_perc: chg,
      volume: q.volume || stk.volume
    };
  }
  return stk;
});

// Special update for KALYANKJIL with live CM tick
const kalyan = catalog.constituents.find(s => s.symbol === 'KALYANKJIL');
if (kalyan) {
  // Live CM quote from 15:11 IST
  kalyan.ltp = 637.45;
  kalyan.anchor_ltp = 637.45;
  kalyan.close = 637.45;
  kalyan.open = 648.9;
  kalyan.high = 648.9;
  kalyan.low = 617.0;
  kalyan.prev_close = 661.0;
  kalyan.change_perc = -3.64;
  kalyan.volume = 19693723;
  kalyan.high_52w = 729.35;
  kalyan.low_52w = 327.05;
}

catalog.trade_date = '20-Nov-2026';
catalog.timestamp = new Date().toISOString();
catalog.official_nse_source = 'NSE India CM Market & Bhavcopy MCP Services';

fs.writeFileSync(catalogPath, JSON.stringify(catalog, null, 2), 'utf8');

console.log(`Successfully updated:
- ${updatedIndices} indices (e.g. NIFTY 50: ${catalog.indices.find(i=>i.symbol==='NIFTY')?.ltp})
- ${updatedConstituents} equity constituents (e.g. KALYANKJIL: LTP ${kalyan?.ltp}, PrevClose ${kalyan?.prev_close})
into ${catalogPath}`);
