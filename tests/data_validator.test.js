import { test, describe } from 'node:test';
import assert from 'node:assert/strict';
import { DataValidator } from '../src/data_validator.js';

describe('DataValidator', () => {
  const validator = new DataValidator({
    scanner: {
      liquidity: {
        min_daily_turnover_inr: 50000000, // 5 Cr
        max_bid_ask_spread_pct: 0.35,
        min_price_inr: 20.0,
        max_price_inr: 50000.0
      }
    }
  });

  test('validates sound OHLCV bar correctly', () => {
    const bar = {
      timestamp: '2026-10-27T00:00:00',
      open: 1195.0,
      high: 1202.6,
      low: 1184.0,
      close: 1196.2,
      volume: 13067787
    };
    const result = validator.validateBar(bar);
    assert.equal(result.valid, true);
    assert.equal(result.errors.length, 0);
  });

  test('rejects corrupted bar where High < Low or Low > Open', () => {
    const invalidBar = {
      timestamp: '2026-10-27T00:00:00',
      open: 1195.0,
      high: 1170.0, // High < Low!
      low: 1184.0,
      close: 1196.2,
      volume: 1000
    };
    const result = validator.validateBar(invalidBar);
    assert.equal(result.valid, false);
    assert.ok(result.errors.some(e => e.includes('High')));
  });

  test('prevents look-ahead bias by pruning ongoing intraday bar during market hours', () => {
    const now = new Date();
    const todayIST = new Intl.DateTimeFormat('en-CA', { timeZone: 'Asia/Kolkata' }).format(now);

    const candleSeries = [
      { timestamp: '2026-10-25T00:00:00', open: 100, high: 105, low: 99, close: 104, volume: 500000 },
      { timestamp: '2026-10-26T00:00:00', open: 104, high: 108, low: 103, close: 107, volume: 600000 },
      { timestamp: `${todayIST}T09:30:00`, open: 107, high: 110, low: 106, close: 109, volume: 100000 } // Incomplete
    ];

    const marketStatus = {
      current_time_market_status: { equity_non_fno: 'open' }
    };

    const res = validator.validateCandleSeries(candleSeries, marketStatus);
    assert.equal(res.valid, true);
    assert.equal(res.cleanedCandles.length, 2); // Incomplete bar pruned!
    assert.ok(res.excludedIncompleteBar !== null);
  });

  test('enforces liquidity filter (turnover >= 5 Cr)', () => {
    const pass = validator.validateLiquidity({ ltp: 1000, volume: 100000 }); // Turnover = 10 Cr
    assert.equal(pass.passes, true);

    const fail = validator.validateLiquidity({ ltp: 100, volume: 10000 }); // Turnover = 10 Lakhs (< 5 Cr)
    assert.equal(fail.passes, false);
    assert.ok(fail.reasons.some(r => r.includes('liquidity filter')));
  });

  test('enforces bid-ask spread constraint', () => {
    const tightSpread = validator.validateLiquidity({ ltp: 500, volume: 200000, bid: 499.5, ask: 500.0 });
    assert.equal(tightSpread.passes, true);

    const wideSpread = validator.validateLiquidity({ ltp: 500, volume: 200000, bid: 490.0, ask: 500.0 }); // 2% spread > 0.35%
    assert.equal(wideSpread.passes, false);
    assert.ok(wideSpread.reasons.some(r => r.includes('spread')));
  });
});

