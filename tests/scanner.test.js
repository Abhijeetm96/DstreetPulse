import { test, describe } from 'node:test';
import assert from 'node:assert/strict';
import { StockScanner } from '../src/scanner.js';
import { DataValidator } from '../src/data_validator.js';

describe('StockScanner', () => {
  const config = {
    scanner: {
      trend: { fast_ma_period: 10, slow_ma_period: 20 },
      breakout: { primary_lookback_days: 10, secondary_lookback_days: 20 },
      volume: { volume_ma_period: 10, min_surge_multiplier: 1.2 },
      relative_strength: { rs_period_days: 10, min_rs_outperformance_pct: 0.0 },
      liquidity: { min_daily_turnover_inr: 1000000, max_bid_ask_spread_pct: 0.5, min_price_inr: 10 },
      invalidation: { structure_lookback_bars: 5, atr_period: 5, atr_multiplier: 2.0 }
    }
  };

  const validator = new DataValidator(config);
  const scanner = new StockScanner(config, validator);

  // Generate synthetic candles for deterministic testing
  function generateCandles(count, basePrice, trendSlope = 1.0, volumeSurgeOnLast = false) {
    const candles = [];
    let price = basePrice;
    for (let i = 0; i < count; i++) {
      price += trendSlope;
      const vol = (i === count - 1 && volumeSurgeOnLast) ? 500000 : 100000;
      candles.push({
        timestamp: `2026-09-${String(i + 1).padStart(2, '0')}T00:00:00`,
        open: price - 0.5,
        high: price + 1.0,
        low: price - 1.0,
        close: price,
        volume: vol
      });
    }
    return candles;
  }

  test('correctly detects prior resistance without look-ahead bias', () => {
    const candles = generateCandles(15, 100, 1.0);
    // Prior 10 bars (from bar 4 to bar 13)
    const res = scanner.findPriorResistance(candles, 10);
    assert.ok(res.resistance !== null);
    // Highest high in prior 10 bars must not include bar 14's own high!
    const lastBar = candles[candles.length - 1];
    assert.ok(lastBar.high > res.resistance);
  });

  test('evaluates valid breakout setup as RESEARCH CANDIDATE', () => {
    // Generate 60 bars in steady uptrend with a volume surge on the final bar
    const stockCandles = generateCandles(60, 100, 1.0, true);
    // Make final bar break out sharply
    const lastBar = stockCandles[stockCandles.length - 1];
    lastBar.close = 200;
    lastBar.high = 205;
    lastBar.volume = 1000000;

    // Benchmark flat
    const benchCandles = generateCandles(60, 25000, 0.0);

    const result = scanner.evaluateCandidate({
      symbol: 'BREAKOUT_CO',
      stockCandles,
      benchmarkCandles: benchCandles
    });

    assert.equal(result.status, 'RESEARCH CANDIDATE');
    assert.equal(result.rulePasses.trend, true);
    assert.equal(result.rulePasses.breakout, true);
    assert.equal(result.rulePasses.volume, true);
    assert.equal(result.rulePasses.relativeStrength, true);
    assert.ok(result.stopLoss < result.entryPrice);
    assert.ok(result.target1 > result.entryPrice);
  });

  test('downgrades to WATCHLIST or REJECT when volume surge fails', () => {
    const stockCandles = generateCandles(60, 100, 1.0, false); // No volume surge
    const benchCandles = generateCandles(60, 25000, 0.0);

    const result = scanner.evaluateCandidate({
      symbol: 'LOW_VOL_CO',
      stockCandles,
      benchmarkCandles: benchCandles
    });

    assert.notEqual(result.status, 'RESEARCH CANDIDATE');
  });

  test('accurately calculates Breakout Quality Score and flags bull traps with excessive upper wick', () => {
    // Generate valid base
    const stockCandles = generateCandles(60, 100, 1.0, true);
    // Candle with severe upper wick rejection (High = 220, Close = 165, Low = 158) -> Upper wick = (220-165)/(220-158) = 55/62 = 88.7% rejection!
    const lastBar = stockCandles[stockCandles.length - 1];
    lastBar.high = 220;
    lastBar.close = 165;
    lastBar.volume = 1200000;

    const benchCandles = generateCandles(60, 25000, 0.0);

    const result = scanner.evaluateCandidate({
      symbol: 'TRAP_CO',
      stockCandles,
      benchmarkCandles: benchCandles
    });

    assert.equal(result.trapRisk, 'HIGH (TRAP / REJECTION)');
    assert.ok(result.upperWickPct > 35);
    assert.ok(result.warnings.some(w => w.includes('Upper wick rejection')));
  });

  test('validates 3-Layer Scanner architecture and 6-Category weighted scoring', () => {
    // Generate strong candidate breaking out cleanly
    const stockCandles = generateCandles(60, 100, 1.0, true);
    const lastBar = stockCandles[stockCandles.length - 1];
    lastBar.close = 200;
    lastBar.high = 201; // Tiny upper wick: 1/42 = 2.4%
    lastBar.low = 159;
    lastBar.volume = 1500000;

    const benchCandles = generateCandles(60, 25000, 0.0);

    const result = scanner.evaluateCandidate({
      symbol: 'ELITE_BREAKOUT',
      stockCandles,
      benchmarkCandles: benchCandles
    });

    // Verify 3-layer assignment
    assert.equal(result.layer, 'LAYER_3');
    assert.ok(result.layerName.includes('Layer 3'));

    // Verify 6-category breakdown
    assert.ok(result.scoresBreakdown);
    assert.ok(result.scoresBreakdown.relativeStrength > 0);
    assert.ok(result.scoresBreakdown.volatilityContraction > 0);
    assert.ok(result.scoresBreakdown.priceStructure > 0);
    assert.ok(result.scoresBreakdown.volumeAccumulation > 0);
    assert.ok(result.scoresBreakdown.trendStrength > 0);
    assert.ok(result.scoresBreakdown.momentum > 0);

    // Verify indicators computed
    assert.ok(result.indicators);
    assert.ok(result.indicators.rsi14 > 0);
    assert.ok(result.indicators.adx > 0);

    // Verify high conviction
    assert.ok(result.qualityScore >= 75);
    assert.ok(['Exceptional setup', 'Strong candidate'].includes(result.classification));

    // Verify Breakout Forecast & Probability Engine
    assert.ok(result.forecast);
    assert.ok(result.forecast.breakoutProbabilityPct >= 50 && result.forecast.breakoutProbabilityPct <= 95);
    assert.ok(result.forecast.expectedMovePct > 0);
    assert.ok(result.forecast.conservativeMovePct > 0);
    assert.ok(result.forecast.maxExpansionPct >= result.forecast.expectedMovePct);
    assert.ok(result.forecast.targetPrices.expected > result.entryPrice);
    assert.ok(result.forecast.timeHorizon.target);
  });

  test('forecastBreakoutMove accurately predicts expansion potential and penalizes traps', () => {
    const baseMetrics = {
      baseHigh: 500,
      baseLow: 460,
      baseDepth: 40,
      baseDepthPct: 8.0,
      isVCPContracting: true
    };

    // 1. High-Conviction Clean Setup
    const cleanForecast = scanner.forecastBreakoutMove({
      entryPrice: 500,
      stopLoss: 485,
      atr: 12,
      baseMetrics,
      qualityScore: 88,
      trapRisk: 'LOW',
      bcl: 92,
      upperWickPct: 5,
      rsVsNifty: 2.5,
      rsVsSector: 1.8
    });

    assert.ok(cleanForecast.breakoutProbabilityPct >= 75, `Expected prob >= 75, got ${cleanForecast.breakoutProbabilityPct}`);
    assert.ok(cleanForecast.expectedMovePct >= 7.0, `Expected move >= 7%, got ${cleanForecast.expectedMovePct}`);
    assert.ok(cleanForecast.conservativeMovePct >= 5.0);
    assert.ok(cleanForecast.maxExpansionPct > cleanForecast.expectedMovePct);
    assert.equal(cleanForecast.forecastRating, 'HIGH CONVICTION EXPANSION');

    // 2. High-Risk Trap Setup (Severe Rejection Wick)
    const trapForecast = scanner.forecastBreakoutMove({
      entryPrice: 500,
      stopLoss: 485,
      atr: 12,
      baseMetrics,
      qualityScore: 45,
      trapRisk: 'HIGH (TRAP / REJECTION)',
      bcl: 55,
      upperWickPct: 42,
      rsVsNifty: -1.0,
      rsVsSector: -0.5
    });

    assert.ok(trapForecast.breakoutProbabilityPct < 50, `Expected trap prob < 50, got ${trapForecast.breakoutProbabilityPct}`);
    assert.equal(trapForecast.forecastRating, 'LOW PROBABILITY / TRAP RISK');
  });
});
