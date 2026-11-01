import { spawn } from 'child_process';
import { readFileSync, writeFileSync, existsSync, mkdirSync } from 'fs';
import { resolve } from 'path';

const CM_MARKET_URL = 'https://mcp.nseindia.in/cmmkt/mcp';
const BHAVCOPY_URL = 'https://mcp.nseindia.in/bhavcopy/cm/mcp';

/**
 * Execute a tool call against an MCP Remote server via stdio transport
 * @param {string} serverUrl
 * @param {string} toolName
 * @param {object} toolArgs
 * @param {number} timeoutMs
 * @returns {Promise<any>}
 */
export function callNseMcpRemote(serverUrl, toolName, toolArgs = {}, timeoutMs = 12000) {
  return new Promise((resolvePromise, rejectPromise) => {
    let resolved = false;
    const proc = spawn('cmd.exe', ['/c', 'npx', '-y', 'mcp-remote@0.1.18', serverUrl], {
      windowsHide: true
    });

    const timer = setTimeout(() => {
      if (!resolved) {
        resolved = true;
        try { proc.kill(); } catch (_) {}
        rejectPromise(new Error(`Timeout calling ${toolName} on ${serverUrl}`));
      }
    }, timeoutMs);

    let buffer = '';

    proc.stdout.on('data', (chunk) => {
      buffer += chunk.toString();
      const lines = buffer.split('\n');
      buffer = lines.pop() || ''; // Keep partial line in buffer

      for (const line of lines) {
        if (!line.trim()) continue;
        try {
          const msg = JSON.parse(line.trim());

          // Step 1: Handshake response (id = 1)
          if (msg.id === 1) {
            proc.stdin.write(JSON.stringify({ jsonrpc: '2.0', method: 'notifications/initialized' }) + '\n');
            proc.stdin.write(JSON.stringify({
              jsonrpc: '2.0',
              id: 2,
              method: 'tools/call',
              params: {
                name: toolName,
                arguments: toolArgs
              }
            }) + '\n');
          }
          // Step 2: Tool call response (id = 2)
          else if (msg.id === 2) {
            if (!resolved) {
              resolved = true;
              clearTimeout(timer);
              try { proc.kill(); } catch (_) {}

              if (msg.error) {
                return rejectPromise(new Error(msg.error.message || 'MCP Error'));
              }

              const content = msg.result?.content;
              if (Array.isArray(content) && content[0]?.text) {
                try {
                  const parsed = JSON.parse(content[0].text);
                  return resolvePromise(parsed);
                } catch (_) {
                  return resolvePromise(content[0].text);
                }
              }
              return resolvePromise(msg.result);
            }
          }
        } catch (_) {
          // Non-JSON stdout line, ignore
        }
      }
    });

    proc.on('error', (err) => {
      if (!resolved) {
        resolved = true;
        clearTimeout(timer);
        rejectPromise(err);
      }
    });

    // Send initialize after spawn
    setTimeout(() => {
      try {
        proc.stdin.write(JSON.stringify({
          jsonrpc: '2.0',
          id: 1,
          method: 'initialize',
          params: {
            protocolVersion: '2024-11-05',
            clientInfo: { name: 'antigravity-nse-scraper', version: '1.0' }
          }
        }) + '\n');
      } catch (e) {
        if (!resolved) {
          resolved = true;
          clearTimeout(timer);
          rejectPromise(e);
        }
      }
    }, 1200);
  });
}

/**
 * Scrape Live Indices from NSE CM Market MCP
 */
export async function scrapeLiveIndices() {
  const [derivatives, broad, sectoral] = await Promise.all([
    callNseMcpRemote(CM_MARKET_URL, 'cm_get_live_indices', { group: 'derivatives', nameFilter: '' }).catch(() => null),
    callNseMcpRemote(CM_MARKET_URL, 'cm_get_live_indices', { group: 'broad', nameFilter: '' }).catch(() => null),
    callNseMcpRemote(CM_MARKET_URL, 'cm_get_live_indices', { group: 'sectoral', nameFilter: '' }).catch(() => null)
  ]);

  const allIndices = [];
  if (derivatives?.indices?.derivatives) allIndices.push(...derivatives.indices.derivatives);
  if (broad?.indices?.broad) allIndices.push(...broad.indices.broad);
  if (sectoral?.indices?.sectoral) allIndices.push(...sectoral.indices.sectoral);

  return {
    timestamp: derivatives?.nseTimestamp || broad?.nseTimestamp || new Date().toISOString(),
    updatedAt: new Date().toISOString(),
    count: allIndices.length,
    indices: allIndices
  };
}

/**
 * Scrape Market Movers (Gainers and Losers) from NSE CM Market MCP
 */
export async function scrapeMarketMovers(indexName = 'NIFTY', limit = 20) {
  return await callNseMcpRemote(CM_MARKET_URL, 'nse_get_market_movers', {
    indexName,
    limit
  });
}

/**
 * Scrape Top Stocks by Traded Value (Institutional Turnover) from Bhavcopy MCP
 */
export async function scrapeTopByValue(n = 25, date = '2026-11-12') {
  return await callNseMcpRemote(BHAVCOPY_URL, 'get_top_by_volume', {
    date,
    n,
    sortBy: 'value'
  });
}

/**
 * Scrape Market Breadth (Advances vs Declines) from Bhavcopy MCP
 */
export async function scrapeMarketBreadth(date = '2026-11-12') {
  return await callNseMcpRemote(BHAVCOPY_URL, 'get_market_breadth', { date });
}

/**
 * Scrape Market Mood & India VIX Range from Bhavcopy MCP
 */
export async function scrapeMarketMood(date = 'today') {
  return await callNseMcpRemote(BHAVCOPY_URL, 'get_market_mood', { date });
}

/**
 * Scrape Bulk Quote for Specific Equities
 */
export async function scrapeBulkQuote(symbols = []) {
  if (!symbols.length) return { quotes: [] };
  return await callNseMcpRemote(BHAVCOPY_URL, 'get_bulk_quote', { symbols });
}

/**
 * Master Scrape Operation: Ingest comprehensive fresh dataset from both NSE MCP servers
 */
export async function scrapeAllNseMcpData() {
  console.log('[NSE MCP Scraper] Initiating comprehensive live crawl from mcp.nseindia.in...');

  const startTime = Date.now();
  const [indicesRes, moversRes, topTurnoverRes, breadthRes, moodRes] = await Promise.all([
    scrapeLiveIndices().catch(err => ({ error: err.message })),
    scrapeMarketMovers('NIFTY', 15).catch(err => ({ error: err.message })),
    scrapeTopByValue(20).catch(err => ({ error: err.message })),
    scrapeMarketBreadth().catch(err => ({ error: err.message })),
    scrapeMarketMood('today').catch(err => ({ error: err.message }))
  ]);

  const durationMs = Date.now() - startTime;
  console.log(`[NSE MCP Scraper] Crawl completed in ${durationMs}ms`);

  const payload = {
    source: 'Official National Stock Exchange of India (NSE) MCP Node',
    endpoints: [CM_MARKET_URL, BHAVCOPY_URL],
    scrapedAt: new Date().toISOString(),
    crawlDurationMs: durationMs,
    indices: indicesRes?.indices || [],
    marketMovers: moversRes || {},
    topValueStocks: topTurnoverRes?.stocks || [],
    breadth: breadthRes || {},
    mood: moodRes || {}
  };

  // Persist to data directory
  const dataDir = resolve(process.cwd(), 'data');
  if (!existsSync(dataDir)) mkdirSync(dataDir, { recursive: true });
  writeFileSync(resolve(dataDir, 'nse_scraped_live.json'), JSON.stringify(payload, null, 2), 'utf8');

  // Also update catalog_data.json if valid data was retrieved
  updateCatalogWithScrapedData(payload);

  return payload;
}

/**
 * Update the local catalog_data.json with fresh official figures from NSE MCP
 */
export function updateCatalogWithScrapedData(scrapedData) {
  try {
    const catalogPath = resolve(process.cwd(), 'src/catalog_data.json');
    if (!existsSync(catalogPath)) return;

    const catalog = JSON.parse(readFileSync(catalogPath, 'utf8'));

    // 1. Update Indices
    if (Array.isArray(scrapedData.indices) && scrapedData.indices.length > 0) {
      const idxMap = new Map();
      scrapedData.indices.forEach(idx => {
        idxMap.set(idx.indexName.toUpperCase(), idx);
      });

      catalog.indices = (catalog.indices || []).map(ci => {
        const found = idxMap.get(ci.name?.toUpperCase());
        if (found) {
          return {
            ...ci,
            ltp: found.last,
            change: found.change,
            change_perc: found.percChange,
            open: found.open,
            high: found.high,
            low: found.low,
            previous_close: found.previousClose,
            last_updated: found.timeVal || scrapedData.scrapedAt
          };
        }
        return ci;
      });
    }

    // 2. Update Official Gainers and Losers
    if (scrapedData.marketMovers?.gainers) {
      catalog.officialGainers = scrapedData.marketMovers.gainers;
    }
    if (scrapedData.marketMovers?.losers) {
      catalog.officialLosers = scrapedData.marketMovers.losers;
    }

    // 3. Update Most Active by Volume/Value
    if (Array.isArray(scrapedData.topValueStocks)) {
      catalog.officialVolume = scrapedData.topValueStocks;
    }

    // 4. Update Market Breadth
    if (scrapedData.breadth?.advances !== undefined) {
      catalog.marketBreadth = scrapedData.breadth;
    }

    // 5. Update India VIX & Mood
    if (scrapedData.mood?.india_vix) {
      catalog.indiaVix = scrapedData.mood.india_vix;
    }

    catalog.lastScrapedFromNseMcp = scrapedData.scrapedAt;
    writeFileSync(catalogPath, JSON.stringify(catalog, null, 2), 'utf8');
    console.log('[NSE MCP Scraper] Updated catalog_data.json with official NSE MCP figures.');
  } catch (err) {
    console.error('[NSE MCP Scraper] Failed to update catalog_data.json:', err.message);
  }
}

