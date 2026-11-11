import { test, describe } from 'node:test';
import assert from 'node:assert/strict';
import { Backtester } from '../src/backtester.js';

describe('Backtester', () => {
  const config = {
    scanner: {
      trend: { fast_ma_period: 10, slow_ma_period: 20 },
      breakout: { primary_lookback_days: 10, secondary_lookback_days: 20 },
      volume: { volume_ma_period: 10, min_surge_multiplier: 1.1 },
      relative_strength: { rs_period_days: 10, min_rs_outperformance_pct: 0.0 },
      liquidity: { min_daily_turnover_inr: 100000, max_bid_ask_spread_pct: 1.0, min_price_inr: 10 },
      invalidation: { structure_lookback_bars: 5, atr_period: 5, atr_multiplier: 2.0 }
    },
    risk: {
      max_planned_risk_per_trade_pct: 0.01,
      max_aggregate_open_risk_pct: 0.05,
      max_simultaneous_positions: 3,
      min_reward_to_risk_ratio: 2.0,
      default_trading_equity: 100000
    },
    charges_and_taxes: {
      brokerage_pct: 0.0005,
      brokerage_flat_cap_inr: 20.0,
      stt_buy_pct: 0.001,
      stt_sell_pct: 0.001,
      exchange_turnover_pct: 0.0000297,
      sebi_turnover_pct: 0.000001,
      stamp_duty_buy_pct: 0.00015,
      dp_charges_sell_inr: 15.93,
      gst_rate_pct: 0.18,
      estimated_slippage_pct: 0.001
    }
  };

  const backtester = new Backtester(config);

  function createTrendingSeries(bars = 100) {
    const candles = [];
    let price = 100;
    for (let i = 0; i < bars; i++) {
      // Create oscillation with positive drift
      const cycle = Math.sin(i / 5) * 5;
      price = 100 + (i * 1.5) + cycle;
      candles.push({
        timestamp: `2026-01-${String((i % 28) + 1).padStart(2, '0')}T00:00:00`,
        open: price - 1,
        high: price + 2,
        low: price - 2,
        close: price,
        volume: 200000 + (i % 7 === 0 ? 500000 : 0) // Periodic volume spikes
      });
    }
    return candles;
  }

  test('runs bar-by-bar backtest with realistic costs and benchmark comparison', () => {
    const stockCandles = createTrendingSeries(100);
    const benchmarkCandles = createTrendingSeries(100);

    const report = backtester.runSingleSymbolBacktest({
      symbol: 'TEST_STOCK',
      candles: stockCandles,
      benchmarkCandles,
      startBar: 25
    });

    assert.equal(report.symbol, 'TEST_STOCK');
    assert.ok(report.tradeCount >= 0);
    assert.ok(typeof report.netPnlInr === 'number');
    assert.ok(typeof report.winRatePct === 'number');
    assert.ok(typeof report.maxDrawdownInr === 'number');
    assert.ok(report.disclaimers.length >= 3);
  });
});

