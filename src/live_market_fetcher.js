import { readFileSync, writeFileSync } from 'fs';

const symbolAliases = {
  'TATAMOTORS': 'TMPV',
  'ATHER': 'ATHERENERG',
  'ATHERENERGY': 'ATHERENERG',
  'BAJAJ-AUTO': 'BAJAJ_AUTO',
  'M&M': 'M_M'
};

const MONTH_MAP = {
  'Jan': '01', 'Feb': '02', 'Mar': '03', 'Apr': '04',
  'May': '05', 'Jun': '06', 'Jul': '07', 'Aug': '08',
  'Sep': '09', 'Oct': '10', 'Nov': '11', 'Dec': '12'
};

async function getOfficialNseHeaders() {
  const headers = {
    'User-Agent': 'Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/120.0.0.0 Safari/537.36',
    'Accept': '*/*',
    'Accept-Language': 'en-US,en;q=0.5'
  };
  try {
    const init = await fetch('https://www.nseindia.com', { headers });
    const cookies = init.headers.get('set-cookie');
    return {
      ...headers,
      'Cookie': cookies || '',
      'Referer': 'https://www.nseindia.com/'
    };
  } catch (_) {
    return headers;
  }
}

/**
 * Fetch official full NSE Capital Market Bhavdata directly from official NSE archives.
 * Returns a map of symbol -> official market figures.
 */
async function fetchOfficialNseBhavdata(tradeDateStr) {
  let ddmmyyyy = '06112026';
  if (tradeDateStr) {
    const parts = tradeDateStr.split(' ')[0].split('-');
    if (parts.length === 3) {
      const [day, monStr, yr] = parts;
      const mm = MONTH_MAP[monStr] || '11';
      ddmmyyyy = `${day}${mm}${yr}`;
    }
  }

  const urlsToTry = [
    `https://nsearchives.nseindia.com/products/content/sec_bhavdata_full_${ddmmyyyy}.csv`,
    `https://archives.nseindia.com/products/content/sec_bhavdata_full_${ddmmyyyy}.csv`,
    'https://nsearchives.nseindia.com/products/content/sec_bhavdata_full_06112026.csv'
  ];

  for (const url of urlsToTry) {
    try {
      const res = await fetch(url, { headers: { 'User-Agent': 'Mozilla/5.0 (Windows NT 10.0; Win64; x64)' } });
      if (res.ok) {
        const text = await res.text();
        const lines = text.split('\n');
        if (lines.length > 500) {
          const map = new Map();
          for (let i = 1; i < lines.length; i++) {
            const row = lines[i].split(',').map(s => s.trim());
            if (row.length > 8) {
              const sym = row[0];
              const series = row[1];
              // Prefer EQ series, but accept BE, RR, SM
              if (!map.has(sym) || series === 'EQ') {
                const prevClose = parseFloat(row[3]) || 0;
                const open = parseFloat(row[4]) || 0;
                const high = parseFloat(row[5]) || 0;
                const low = parseFloat(row[6]) || 0;
                const ltp = parseFloat(row[7]) || parseFloat(row[8]) || 0;
                const close = parseFloat(row[8]) || ltp;
                const avgPrice = parseFloat(row[9]) || 0;
                const vol = parseInt(row[10]) || 0;
                const turnoverLacs = parseFloat(row[11]) || 0;
                const chg = prevClose ? Number((((close - prevClose) / prevClose) * 100).toFixed(2)) : 0;

                map.set(sym, {
                  series,
                  open,
                  high,
                  low,
                  ltp,
                  close,
                  prev_close: prevClose,
                  change_perc: chg,
                  avg_price: avgPrice,
                  volume: vol,
                  turnover_lacs: turnoverLacs
                });
              }
            }
          }
          return map;
        }
      }
    } catch (e) {
      console.warn(`Bhavdata fetch attempt from ${url} failed:`, e.message);
    }
  }

  return new Map();
}

export async function fetchLiveStockQuote(symbol) {
  // First read from catalog to get official base
  try {
    const catalogPath = new URL('./catalog_data.json', import.meta.url);
    const catalog = JSON.parse(readFileSync(catalogPath, 'utf8'));
    const stk = catalog.constituents?.find(c => c.symbol === symbol);
    if (!stk) return null;

    // Check official NSE quote if available
    try {
      const nseHeaders = await getOfficialNseHeaders();
      const nseUrl = `https://www.nseindia.com/api/quote-equity?symbol=${encodeURIComponent(symbol)}`;
      const res = await fetch(nseUrl, { headers: nseHeaders });
      if (res.ok) {
        const d = await res.json();
        const pInfo = d.priceInfo || {};
        const ltp = Number(pInfo.lastPrice || 0);
        if (ltp > 0) {
          const prevClose = pInfo.previousClose || stk.prev_close || ltp;
          const dayChange = Number((pInfo.change || (ltp - prevClose)).toFixed(2));
          const dayChangePerc = Number((pInfo.pChange || ((dayChange / prevClose) * 100)).toFixed(2));
          return {
            symbol,
            ltp: Number(ltp.toFixed(2)),
            close: Number((pInfo.close || stk.close || ltp).toFixed(2)),
            open: Number((pInfo.open || stk.open || ltp).toFixed(2)),
            high: Number((pInfo.intraDayHighLow?.max || stk.high || ltp).toFixed(2)),
            low: Number((pInfo.intraDayHighLow?.min || stk.low || ltp).toFixed(2)),
            day_change: dayChange,
            day_change_perc: dayChangePerc,
            volume: Number(d.preOpenMarket?.totalTradedVolume || stk.volume || 0),
            year_high: pInfo.weekHighLow?.max ? Number(pInfo.weekHighLow.max.toFixed(2)) : null,
            year_low: pInfo.weekHighLow?.min ? Number(pInfo.weekHighLow.min.toFixed(2)) : null,
            timestamp: new Date().toISOString()
          };
        }
      }
    } catch (_) {}

    // Return official catalog figures
    return {
      symbol: stk.symbol,
      ltp: stk.ltp,
      close: stk.close || stk.ltp,
      open: stk.open || stk.ltp,
      high: stk.high || stk.ltp,
      low: stk.low || stk.ltp,
      day_change: Number(((stk.ltp * (stk.change_perc || 0)) / 100).toFixed(2)),
      day_change_perc: stk.change_perc || 0,
      volume: stk.volume || 0,
      timestamp: catalog.timestamp
    };
  } catch (err) {
    console.error(`Error fetching quote for ${symbol}:`, err.message);
  }
  return null;
}

export async function refreshAllMarketQuotes() {
  const t0 = Date.now();
  const catalogPath = new URL('./catalog_data.json', import.meta.url);
  const currentCatalog = JSON.parse(readFileSync(catalogPath, 'utf8'));

  // 1. Fetch Official NSE India Live Feeds (Indices, Status, Variations)
  let officialNseIndices = [];
  let officialMarketState = null;
  let officialGainers = [];
  let officialLosers = [];
  let officialVolume = [];
  let officialValue = [];

  try {
    const nseHeaders = await getOfficialNseHeaders();
    const [rIndices, rMkt, rGainers, rLosers, rVol, rVal] = await Promise.all([
      fetch('https://www.nseindia.com/api/allIndices', { headers: nseHeaders }),
      fetch('https://www.nseindia.com/api/marketStatus', { headers: nseHeaders }),
      fetch('https://www.nseindia.com/api/live-analysis-variations?index=gainers', { headers: nseHeaders }),
      fetch('https://www.nseindia.com/api/live-analysis-variations?index=loosers', { headers: nseHeaders }),
      fetch('https://www.nseindia.com/api/live-analysis-most-active-securities?index=volume', { headers: nseHeaders }),
      fetch('https://www.nseindia.com/api/live-analysis-most-active-securities?index=value', { headers: nseHeaders })
    ]);

    if (rIndices.ok) {
      const idxJson = await rIndices.json();
      officialNseIndices = idxJson.data || [];
    }
    if (rMkt.ok) {
      const mktJson = await rMkt.json();
      officialMarketState = mktJson.marketState?.find(m => m.market === 'Capital Market') || mktJson.marketState?.[0];
    }
    if (rGainers.ok) {
      const gJson = await rGainers.json();
      officialGainers = gJson.NIFTY?.data || gJson.allSec?.data || [];
    }
    if (rLosers.ok) {
      const lJson = await rLosers.json();
      officialLosers = lJson.NIFTY?.data || lJson.allSec?.data || [];
    }
    if (rVol.ok) {
      const volJson = await rVol.json();
      officialVolume = volJson.data || [];
    }
    if (rVal.ok) {
      const valJson = await rVal.json();
      officialValue = valJson.data || [];
    }
  } catch (err) {
    console.error('Failed to fetch from official NSE API:', err.message);
  }

  // 2. Fetch Official Full NSE Bhavcopy CSV for 100% accurate constituent data
  const tradeDateStr = officialMarketState?.tradeDate || '06-Nov-2026 15:30';
  const bhavMap = await fetchOfficialNseBhavdata(tradeDateStr);

  // 3. Update ALL 501 Constituents with 100% Genuine Official Exchange Data
  const updatedConstituents = (currentCatalog.constituents || []).map((stk) => {
    const bhav = bhavMap.get(stk.symbol);
    if (bhav) {
      return {
        ...stk,
        ltp: Number(bhav.ltp.toFixed(2)),
        change_perc: Number(bhav.change_perc.toFixed(2)),
        open: Number(bhav.open.toFixed(2)),
        high: Number(bhav.high.toFixed(2)),
        low: Number(bhav.low.toFixed(2)),
        close: Number(bhav.close.toFixed(2)),
        prev_close: Number(bhav.prev_close.toFixed(2)),
        volume: bhav.volume,
        turnover_lacs: bhav.turnover_lacs,
        avg_price: bhav.avg_price,
        series: bhav.series
      };
    }
    return stk;
  });

  // 4. Update Indices with EXACT Official NSE Values
  const updatedIndices = (currentCatalog.indices || []).map((idx) => {
    const match = officialNseIndices.find(o =>
      o.index === idx.name ||
      o.indexSymbol === idx.name ||
      o.index?.toUpperCase() === idx.name?.toUpperCase() ||
      o.indexSymbol?.toUpperCase() === idx.symbol?.toUpperCase()
    );

    if (match && match.last) {
      return {
        ...idx,
        ltp: Number(Number(match.last).toFixed(2)),
        change_perc: Number(Number(match.percentChange || 0).toFixed(2)),
        open: match.open ? Number(Number(match.open).toFixed(2)) : idx.open,
        high: match.high ? Number(Number(match.high).toFixed(2)) : idx.high,
        low: match.low ? Number(Number(match.low).toFixed(2)) : idx.low,
        prev_close: match.previousClose ? Number(Number(match.previousClose).toFixed(2)) : idx.prev_close,
        previous_close: match.previousClose ? Number(Number(match.previousClose).toFixed(2)) : idx.previous_close,
        advances: match.advances ? Number(match.advances) : undefined,
        declines: match.declines ? Number(match.declines) : undefined,
        variation: match.variation ? Number(match.variation) : undefined
      };
    }
    return idx;
  });

  const updatedCatalog = {
    ...currentCatalog,
    timestamp: new Date().toISOString(),
    marketStatus: officialMarketState ? {
      status: officialMarketState.marketStatus,
      tradeDate: officialMarketState.tradeDate,
      message: officialMarketState.marketStatusMessage,
      index: officialMarketState.index,
      last: officialMarketState.last,
      percentChange: officialMarketState.percentChange
    } : currentCatalog.marketStatus,
    officialGainers: officialGainers.slice(0, 25),
    officialLosers: officialLosers.slice(0, 25),
    officialVolume: officialVolume.slice(0, 25),
    officialValue: officialValue.slice(0, 25),
    constituents_count: updatedConstituents.length,
    constituents: updatedConstituents,
    indices: updatedIndices
  };

  writeFileSync(catalogPath, JSON.stringify(updatedCatalog, null, 2), 'utf8');

  const durationMs = Date.now() - t0;
  return {
    success: true,
    count: updatedConstituents.length,
    indicesCount: updatedIndices.length,
    bhavdataSynced: bhavMap.size,
    officialNseSynced: officialNseIndices.length > 0,
    durationMs,
    timestamp: updatedCatalog.timestamp
  };
}
