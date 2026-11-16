import fs from 'fs';
import path from 'path';
import { Backtester } from '../src/backtester.js';

const brainDir = './reports';
const stepsDir = path.join(brainDir, '.system_generated', 'steps');

function loadJson(stepNum) {
  const filePath = path.join(stepsDir, String(stepNum), 'output.txt');
  if (!fs.existsSync(filePath)) {
    throw new Error(`File not found: ${filePath}`);
  }
  const raw = fs.readFileSync(filePath, 'utf-8');
  return JSON.parse(raw);
}

// 1. Load NIFTY 50 Benchmark
const n50Json = loadJson(4194);
const benchmarkCandles = (n50Json.data || []).map(b => ({
  timestamp: `${b.date}T00:00:00`,
  open: b.open,
  high: b.high,
  low: b.low,
  close: b.close,
  volume: b.volume
})).sort((a, b) => a.timestamp.localeCompare(b.timestamp));

console.log(`Loaded NIFTY 50: ${benchmarkCandles.length} daily bars (${benchmarkCandles[0].timestamp.slice(0, 10)} to ${benchmarkCandles[benchmarkCandles.length - 1].timestamp.slice(0, 10)})`);

// 2. Define Stocks & Step Mappings across major NSE market sectors
const stockConfigs = [
  { symbol: 'RELIANCE', steps: [4188, 4210, 4222, 4232], sector: 'Energy & Oil' },
  { symbol: 'TCS', steps: [4200, 4214, 4224, 4234], sector: 'IT Services' },
  { symbol: 'INFY', steps: [4202, 4216, 4226, 4236], sector: 'IT Services' },
  { symbol: 'ICICIBANK', steps: [4204, 4218, 4228, 4238], sector: 'Private Banking' },
  { symbol: 'BHARTIARTL', steps: [4206, 4220, 4230, 4240], sector: 'Telecom' },
  { symbol: 'TATASTEEL', steps: [4250, 4252, 4254, 4256], sector: 'Metals & Mining' },
  { symbol: 'SUNPHARMA', steps: [4258, 4260, 4262, 4264], sector: 'Pharma & Healthcare' },
  { symbol: 'ITC', steps: [4266, 4268, 4270, 4272], sector: 'FMCG' },
  { symbol: 'SBIN', steps: [4274, 4276, 4278, 4280], sector: 'Public Sector Banking' }
];

const backtester = new Backtester({
  risk: { default_trading_equity: 100000.0, risk_per_trade_pct: 0.005 },
  charges_and_taxes: { estimated_slippage_pct: 0.001 },
  scanner: {
    trend: { fast_ma_period: 20, slow_ma_period: 50 },
    breakout: { primary_lookback_days: 20, secondary_lookback_days: 50 },
    volume: { volume_ma_period: 20, min_surge_multiplier: 1.15 },
    relative_strength: { rs_period_days: 20, min_rs_outperformance_pct: 0.0 },
    liquidity: { min_daily_turnover_inr: 50000000, max_bid_ask_spread_pct: 0.5, min_price_inr: 10 },
    invalidation: { structure_lookback_bars: 10, atr_period: 14, atr_multiplier: 2.0 }
  }
});

const results = [];

for (const stock of stockConfigs) {
  const barMap = new Map();
  for (const step of stock.steps) {
    try {
      const chunk = loadJson(step);
      if (chunk.data) {
        for (const item of chunk.data) {
          if (!barMap.has(item.date)) {
            barMap.set(item.date, {
              timestamp: `${item.date}T00:00:00`,
              open: item.open,
              high: item.high,
              low: item.low,
              close: item.close,
              volume: item.volume
            });
          }
        }
      }
    } catch (e) {
      console.warn(`Warning loading step ${step} for ${stock.symbol}: ${e.message}`);
    }
  }

  const candles = Array.from(barMap.values()).sort((a, b) => a.timestamp.localeCompare(b.timestamp));
  console.log(`Loaded ${stock.symbol}: ${candles.length} bars (${candles[0].timestamp.slice(0, 10)} to ${candles[candles.length - 1].timestamp.slice(0, 10)})`);

  // Run backtest with 50-bar warmup
  const report = backtester.runSingleSymbolBacktest({
    symbol: stock.symbol,
    candles,
    benchmarkCandles,
    startBar: 40
  });

  report.sector = stock.sector;
  results.push(report);
}

// Write combined JSON result for detailed reporting
fs.writeFileSync(path.join(brainDir, 'backtest_bhavcopy_raw.json'), JSON.stringify({
  benchmark: {
    name: 'NIFTY 50',
    candlesCount: benchmarkCandles.length,
    startDate: benchmarkCandles[0].timestamp.slice(0, 10),
    endDate: benchmarkCandles[benchmarkCandles.length - 1].timestamp.slice(0, 10),
    startClose: benchmarkCandles[0].close,
    endClose: benchmarkCandles[benchmarkCandles.length - 1].close,
    returnPct: Number((((benchmarkCandles[benchmarkCandles.length - 1].close - benchmarkCandles[0].close) / benchmarkCandles[0].close) * 100).toFixed(2))
  },
  results
}, null, 2));

console.log('Backtest run successfully completed. Raw results written.');
