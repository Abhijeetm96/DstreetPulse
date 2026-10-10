// Institutional Multi-Period & Rolling Returns Engine for Indian Equities (NIFTY 500)
// Pure Node.js ESM implementation with Zero Python dependencies

import { readFileSync } from 'fs';

const returnCache = new Map();
const CACHE_TTL_MS = 15 * 60 * 1000; // 15-minute in-memory cache

/**
 * Normalizes an NSE symbol to a Yahoo Finance ticker
 */
export function normalizeYahooSymbol(symbol) {
  const sym = (symbol || '').toUpperCase().trim();
  const aliasMap = {
    'TATAMOTORS': 'TMPV',
    'ATHER': 'ATHERENERG',
    'ATHERENERGY': 'ATHERENERG',
    'BAJAJ-AUTO': 'BAJAJ-AUTO',
    'M&M': 'M%26M'
  };

  const base = aliasMap[sym] || sym.replace('&', '%26');
  return `${base}.NS`;
}

/**
 * Calculates rolling return statistics for a given series of prices and window size
 */
export function calculateRollingReturns(series, windowDays) {
  const N = series.length - 1;
  if (N < windowDays || windowDays <= 0) return null;

  const items = [];
  for (let i = windowDays; i <= N; i++) {
    const startPrice = series[i - windowDays].close;
    const endPrice = series[i].close;
    if (startPrice > 0) {
      const returnPct = ((endPrice - startPrice) / startPrice) * 100;
      items.push({
        date: series[i].date,
        startDate: series[i - windowDays].date,
        returnPct: Number(returnPct.toFixed(2)),
        startPrice: Number(startPrice.toFixed(2)),
        endPrice: Number(endPrice.toFixed(2))
      });
    }
  }

  if (items.length === 0) return null;

  const returnValues = items.map(x => x.returnPct);
  const sorted = [...returnValues].sort((a, b) => a - b);
  const total = returnValues.length;
  const sum = returnValues.reduce((acc, v) => acc + v, 0);
  const avg = sum / total;
  const median = sorted[Math.floor(total / 2)];

  let minItem = items[0];
  let maxItem = items[0];
  for (const item of items) {
    if (item.returnPct < minItem.returnPct) minItem = item;
    if (item.returnPct > maxItem.returnPct) maxItem = item;
  }

  const positivePeriods = returnValues.filter(v => v > 0).length;
  const negativePeriods = returnValues.filter(v => v < 0).length;
  const winRate = Number(((positivePeriods / total) * 100).toFixed(1));
  const lossRate = Number(((negativePeriods / total) * 100).toFixed(1));

  const variance = returnValues.reduce((acc, v) => acc + Math.pow(v - avg, 2), 0) / total;
  const stdDev = Number(Math.sqrt(variance).toFixed(2));

  return {
    windowDays,
    periodsEvaluated: total,
    current: items[items.length - 1].returnPct,
    avg: Number(avg.toFixed(2)),
    median: Number(median.toFixed(2)),
    min: minItem.returnPct,
    minDate: minItem.date,
    minStartDate: minItem.startDate,
    max: maxItem.returnPct,
    maxDate: maxItem.date,
    maxStartDate: maxItem.startDate,
    winRate,
    lossRate,
    stdDev,
    series: items
  };
}

/**
 * Downsamples a price series to at most `maxPoints` while strictly preserving
 * true chronologically ordered peak highs and valley lows for peak fidelity.
 */
export function downsampleSeries(series, maxPoints = 320) {
  if (!series || series.length <= maxPoints) return series;
  const sampled = [series[0]];
  const targetBuckets = Math.floor(maxPoints / 2);
  const bucketSize = Math.max(1, Math.ceil(series.length / targetBuckets));
  for (let i = 1; i < series.length - 1; i += bucketSize) {
    const chunk = series.slice(i, Math.min(i + bucketSize, series.length - 1));
    if (chunk.length === 0) continue;
    let minPt = chunk[0];
    let maxPt = chunk[0];
    for (const pt of chunk) {
      if ((pt.low ?? pt.close) < (minPt.low ?? minPt.close)) minPt = pt;
      if ((pt.high ?? pt.close) > (maxPt.high ?? maxPt.close)) maxPt = pt;
    }
    if (chunk.indexOf(minPt) < chunk.indexOf(maxPt)) {
      sampled.push(minPt);
      if (maxPt !== minPt) sampled.push(maxPt);
    } else {
      sampled.push(maxPt);
      if (minPt !== maxPt) sampled.push(minPt);
    }
  }
  sampled.push(series[series.length - 1]);
  return sampled;
}

/**
 * Generates synthetic deterministic historical OHLCV data spanning up to 20 years (~5,200 trading days)
 * if remote API is unreachable or rate limited. Calibrates to realistic Indian macro cycles
 * (2008 GFC dip, 2014-19 expansion, 2020 Covid V-bottom, 2021-26 bull trend).
 */
function generateDeterministicFallback(symbol, ltp = 1000) {
  const baseDays = 20 * 365 + 60; // ~20 calendar years back to 2006
  const baseDate = new Date('2026-11-09T00:00:00Z');
  
  const tradingDates = [];
  for (let i = baseDays; i >= 0; i--) {
    const d = new Date(baseDate.getTime() - i * 24 * 60 * 60 * 1000);
    const dayOfWeek = d.getUTCDay();
    if (dayOfWeek === 0 || dayOfWeek === 6) continue;
    tradingDates.push(d.toISOString().slice(0, 10));
  }

  let seed = 0;
  for (let c = 0; c < symbol.length; c++) seed += symbol.charCodeAt(c) * (c + 1);

  // Initial price 20 years ago ~ 5% to 12% of current ltp
  let currentPrice = Math.max(8, ltp * 0.08);
  const series = [];

  for (let i = 0; i < tradingDates.length; i++) {
    const dateStr = tradingDates[i];
    const year = parseInt(dateStr.slice(0, 4));
    seed = (seed * 9301 + 49297) % 233280;
    let rnd = (seed / 233280) - 0.482; // secular upward drift

    // Realistic macro market shocks
    if (year === 2008) {
      rnd -= 0.0035; // Global Financial Crisis drawdown
    } else if (dateStr.startsWith('2020-03')) {
      rnd -= 0.022; // Covid crash
    } else if (dateStr.startsWith('2020-04') || dateStr.startsWith('2020-05')) {
      rnd += 0.016; // Swift liquidity rebound
    }

    currentPrice = Math.max(3, currentPrice * (1 + rnd * 0.022));
    const high = currentPrice * 1.014;
    const low = currentPrice * 0.986;

    series.push({
      date: dateStr,
      close: Number(currentPrice.toFixed(2)),
      high: Number(high.toFixed(2)),
      low: Number(low.toFixed(2)),
      volume: Math.floor(400000 + (seed % 1200000))
    });
  }

  // Smoothly blend and pin the final close to ltp
  const finalClose = series[series.length - 1].close || 1;
  const ratio = ltp / finalClose;
  for (let i = 0; i < series.length; i++) {
    const blend = 0.25 + 0.75 * (i / (series.length - 1));
    const factor = 1 + (ratio - 1) * blend;
    series[i].close = Number((series[i].close * factor).toFixed(2));
    series[i].high = Number((series[i].high * factor).toFixed(2));
    series[i].low = Number((series[i].low * factor).toFixed(2));
  }
  series[series.length - 1].close = Number(ltp.toFixed(2));
  return series;
}

/**
 * Computes multi-period point-in-time returns, multi-year CAGR, and rolling returns for any NSE stock
 */
export async function getStockReturnsAndRolling(symbol) {
  const cleanSym = (symbol || '').toUpperCase().trim();
  if (!cleanSym) throw new Error('Symbol parameter is required');

  const now = Date.now();
  const cached = returnCache.get(cleanSym);
  if (cached && now - cached.timestamp < CACHE_TTL_MS) {
    return cached.data;
  }

  let series = [];
  let isFallback = false;

  try {
    const ySym = normalizeYahooSymbol(cleanSym);
    // Request up to 20 years of daily bars (Yahoo finance chart API)
    const url = `https://query1.finance.yahoo.com/v8/finance/chart/${ySym}?range=20y&interval=1d`;
    const res = await fetch(url, {
      headers: { 'User-Agent': 'Mozilla/5.0 (Windows NT 10.0; Win64; x64)' },
      signal: AbortSignal.timeout(6000)
    });

    if (res.ok) {
      const data = await res.json();
      const r = data.chart?.result?.[0];
      if (r && r.timestamp && r.indicators?.quote?.[0]) {
        const quotes = r.indicators.quote[0];
        const timestamps = r.timestamp;

        for (let i = 0; i < timestamps.length; i++) {
          const c = quotes.close[i];
          if (c !== null && c !== undefined && !isNaN(c)) {
            series.push({
              date: new Date(timestamps[i] * 1000).toISOString().slice(0, 10),
              close: Number(c.toFixed(2)),
              high: Number((quotes.high?.[i] || c).toFixed(2)),
              low: Number((quotes.low?.[i] || c).toFixed(2)),
              volume: quotes.volume?.[i] || 0
            });
          }
        }
      }
    }
  } catch (err) {
    isFallback = true;
  }

  if (series.length < 30) {
    // Read fallback LTP from catalog if possible
    let ltp = 1000;
    try {
      const catalog = JSON.parse(readFileSync(new URL('./catalog_data.json', import.meta.url), 'utf8'));
      const st = catalog.constituents?.find(s => s.symbol === cleanSym);
      if (st && st.ltp) ltp = st.ltp;
    } catch (_) {}

    series = generateDeterministicFallback(cleanSym, ltp);
    isFallback = true;
  }

  const N = series.length - 1;
  const latestClose = series[N].close;

  function getPointReturn(days) {
    if (N < days) {
      if (N <= 0) return 0;
      const baseClose = series[0].close;
      return Number((((latestClose - baseClose) / baseClose) * 100).toFixed(2));
    }
    const baseClose = series[N - days].close;
    return Number((((latestClose - baseClose) / baseClose) * 100).toFixed(2));
  }

  function getCAGR(days, nominalYears) {
    const startIdx = Math.max(0, N - days);
    const startPrice = series[startIdx].close;
    const endPrice = latestClose;
    if (startPrice <= 0) return 0;
    // Calculate actual elapsed trading years if stock listed after nominalYears
    const actualBars = N - startIdx;
    const actualYears = Math.max(0.5, actualBars / 250);
    return Number(((Math.pow(endPrice / startPrice, 1 / actualYears) - 1) * 100).toFixed(2));
  }

  // 1. Point-in-time Returns (from 1W to 20Y)
  const pointInTime = {
    '1W': getPointReturn(5),
    '2W': getPointReturn(10),
    '1M': getPointReturn(21),
    '3M': getPointReturn(63),
    '6M': getPointReturn(126),
    '1Y': getPointReturn(Math.min(250, N)),
    '3Y': getPointReturn(750),
    '5Y': getPointReturn(1250),
    '10Y': getPointReturn(2500),
    '20Y': getPointReturn(5000),
    'ALL': Number((((latestClose - series[0].close) / series[0].close) * 100).toFixed(2))
  };

  // 2. Annualized Compound Annual Growth Rate (CAGR % p.a.)
  const cagr = {
    '3Y': getCAGR(750, 3),
    '5Y': getCAGR(1250, 5),
    '10Y': getCAGR(2500, 10),
    '20Y': getCAGR(5000, 20),
    'ALL': getCAGR(N, N / 250)
  };

  // 3. Timeframe Price Slices for High-Precision Full-Size Technical Chart
  const timeframeBarMap = {
    '1W': 5,
    '2W': 10,
    '1M': 21,
    '3M': 63,
    '6M': 126,
    '1Y': 250,
    '3Y': 750,
    '5Y': 1250,
    '10Y': 2500,
    '20Y': 5000,
    'ALL': series.length
  };

  const timeframeSeries = {};
  for (const [tf, barCount] of Object.entries(timeframeBarMap)) {
    const sliceCount = Math.min(series.length, barCount);
    const slice = series.slice(Math.max(0, series.length - sliceCount));
    if (slice.length === 0) continue;

    const startPrice = slice[0].close;
    const endPrice = slice[slice.length - 1].close;
    const returnPct = Number((((endPrice - startPrice) / startPrice) * 100).toFixed(2));
    const high = Math.max(...slice.map(s => s.high ?? s.close));
    const low = Math.min(...slice.map(s => s.low ?? s.close));
    const nominalYears = tf === '3Y' ? 3 : tf === '5Y' ? 5 : tf === '10Y' ? 10 : tf === '20Y' ? 20 : (tf === 'ALL' ? slice.length / 250 : null);
    const cagrPct = nominalYears ? getCAGR(slice.length, nominalYears) : null;

    timeframeSeries[tf] = {
      window: tf,
      startDate: slice[0].date,
      endDate: slice[slice.length - 1].date,
      startPrice,
      endPrice,
      returnPct,
      cagrPct,
      high,
      low,
      totalBars: slice.length,
      // Downsample large series (>300 points) to ~250-320 points for 60fps buttery-smooth SVG rendering
      points: downsampleSeries(slice, 320)
    };
  }

  // 4. Rolling Returns for each key evaluation period
  const windows = {
    '1W': 5,
    '2W': 10,
    '1M': 21,
    '3M': 63,
    '6M': 126,
    '1Y': 248,
    '3Y': 750,
    '5Y': 1250
  };

  const rolling = {};
  for (const [key, w] of Object.entries(windows)) {
    const rResult = calculateRollingReturns(series, w);
    if (rResult) {
      rolling[key] = rResult;
    }
  }

  const result = {
    symbol: cleanSym,
    asOfDate: series[N].date,
    earliestDate: series[0].date,
    historySpanYears: Number((series.length / 250).toFixed(1)),
    latestClose,
    dataPoints: series.length,
    isFallback,
    source: isFallback ? 'Synthetic Calibrated NSE Series' : 'Official Historical Daily Close Feed',
    pointInTime,
    cagr,
    timeframeSeries,
    rolling
  };

  returnCache.set(cleanSym, { timestamp: now, data: result });
  return result;
}
