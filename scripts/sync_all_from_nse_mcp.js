import { readFileSync, writeFileSync } from 'fs';
import { resolve } from 'path';
import { callNseMcpRemote } from '../src/nse_mcp_client.js';

const CM_MARKET_URL = 'https://mcp.nseindia.in/cmmkt/mcp';
const BHAVCOPY_URL = 'https://mcp.nseindia.in/bhavcopy/cm/mcp';

async function syncAll() {
  console.log('>>> Starting complete sync directly from official NSE MCP servers...');
  const catalogPath = resolve(process.cwd(), 'src/catalog_data.json');
  const catalog = JSON.parse(readFileSync(catalogPath, 'utf8'));

  // 1. Fetch live indices
  console.log('>>> Fetching 139 live indices from cm-market...');
  const indicesRes = await callNseMcpRemote(CM_MARKET_URL, 'cm_get_live_indices');
  const allIndices = [
    ...(indicesRes?.indices?.derivatives || []),
    ...(indicesRes?.indices?.broad || []),
    ...(indicesRes?.indices?.sectoral || []),
    ...(indicesRes?.indices?.strategy || []),
    ...(indicesRes?.indices?.thematic || []),
    ...(indicesRes?.indices?.fixed_income || [])
  ];
  console.log(`>>> Received ${allIndices.length} total index quotes.`);

  const idxMap = new Map();
  allIndices.forEach(idx => {
    idxMap.set(idx.indexName.toUpperCase().replace(/\s+/g, ' '), idx);
  });

  catalog.indices = (catalog.indices || []).map(ci => {
    const key = ci.name.toUpperCase().replace(/\s+/g, ' ');
    const found = idxMap.get(key);
    if (found) {
      return {
        ...ci,
        ltp: found.last,
        change: found.change,
        change_perc: found.percChange,
        open: found.open,
        high: found.high,
        low: found.low,
        prev_close: found.previousClose,
        previous_close: found.previousClose,
        last_updated: found.timeVal || indicesRes.nseTimestamp || '20-Nov-2026 15:01'
      };
    }
    return ci;
  });

  // 2. Fetch bulk quotes for all 499 symbols from bhavcopy in batches of 50
  console.log('>>> Fetching bulk quotes from official NSE Bhavcopy for 499 constituents...');
  const symbols = catalog.constituents.map(c => c.symbol);
  const quotesMap = new Map();

  for (let i = 0; i < symbols.length; i += 50) {
    const chunk = symbols.slice(i, i + 50);
    console.log(`>>> Fetching chunk ${Math.floor(i / 50) + 1} of ${Math.ceil(symbols.length / 50)} (${chunk.length} symbols)...`);
    try {
      const res = await callNseMcpRemote(BHAVCOPY_URL, 'get_bulk_quote', { symbols: chunk }, 15000);
      if (res && Array.isArray(res.quotes)) {
        res.quotes.forEach(q => {
          quotesMap.set(q.symbol, q);
        });
      }
    } catch (err) {
      console.warn(`Chunk ${i} error:`, err.message);
    }
  }

  console.log(`>>> Received official quotes for ${quotesMap.size} symbols.`);

  // 3. For high-profile stocks or active symbols, fetch live CM stock quotes
  const prioritySymbols = ['KALYANKJIL', 'RELIANCE', 'TCS', 'INFY', 'HDFCBANK', 'ICICIBANK', 'BHARTIARTL', 'SBIN', 'ITC', 'TATAMOTORS'];
  const cmLiveQuotes = new Map();
  console.log('>>> Fetching real-time CM stock quotes for priority movers...');
  for (const sym of prioritySymbols) {
    try {
      const q = await callNseMcpRemote(CM_MARKET_URL, 'cm_get_stock_quote', { symbol: sym }, 8000);
      if (q && q.stock) {
        cmLiveQuotes.set(sym, q.stock);
      }
    } catch (_) {}
  }

  // 4. Update constituents
  let updatedCount = 0;
  catalog.constituents = catalog.constituents.map(stk => {
    const bq = quotesMap.get(stk.symbol);
    const cm = cmLiveQuotes.get(stk.symbol);

    if (cm) {
      updatedCount++;
      const ltp = cm.lastTradedPrice || stk.ltp;
      const prevClose = cm.preClosePrice || stk.prev_close || ltp;
      const chg = cm.perChange !== undefined ? cm.perChange : Number((((ltp - prevClose) / prevClose) * 100).toFixed(2));
      return {
        ...stk,
        ltp,
        close: ltp,
        open: cm.openPrice || stk.open,
        high: cm.highPrice || stk.high,
        low: cm.lowPrice || stk.low,
        prev_close: prevClose,
        change_perc: chg,
        volume: cm.volume || stk.volume,
        high_52w: cm.fiftyTwoWeekHigh || stk.high_52w,
        low_52w: cm.fiftyTwoWeekLow || stk.low_52w
      };
    } else if (bq) {
      updatedCount++;
      const ltp = bq.close || stk.ltp;
      const prevClose = bq.prev_close || stk.prev_close || ltp;
      const chg = bq.pct_change !== undefined ? bq.pct_change : Number((((ltp - prevClose) / prevClose) * 100).toFixed(2));
      return {
        ...stk,
        ltp,
        close: ltp,
        open: bq.open || stk.open,
        high: bq.high || stk.high,
        low: bq.low || stk.low,
        prev_close: prevClose,
        change_perc: chg,
        volume: bq.volume || stk.volume
      };
    }
    return stk;
  });

  catalog.timestamp = new Date().toISOString();
  catalog.trade_date = '20-Nov-2026';
  catalog.source = 'Official NSE India Capital Market (CM) & Bhavcopy MCP Node';

  writeFileSync(catalogPath, JSON.stringify(catalog, null, 2), 'utf8');
  console.log(`>>> Successfully updated ${updatedCount} constituents and ${catalog.indices.length} indices in ${catalogPath}!`);
}

syncAll().catch(err => {
  console.error('Sync failed:', err);
  process.exit(1);
});
