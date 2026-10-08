/**
 * Configurable Stock Scanner for NSE Cash Equities
 * 
 * Evaluates candidate rules:
 * - Trend: Close > 50 SMA and 200 SMA
 * - Breakout: Close > prior 20-day or 50-day resistance (Strictly zero look-ahead bias)
 * - Volume: Current volume > 20-day volume average
 * - Relative Strength: Outperformance vs NIFTY 50
 * - Invalidation: Price structure swing low or ATR multiple
 * - Liquidity: Turnover and spread verification
 */

import { DataValidator } from './data_validator.js';

export class StockScanner {
  /**
   * @param {Object} config - System configuration
   * @param {DataValidator} validator - Validator instance
   */
  constructor(config = {}, validator = null) {
    this.config = config;
    this.validator = validator ?? new DataValidator(config);
    this.scannerCfg = config.scanner ?? {};
  }

  /**
   * Calculate Simple Moving Average for an array of numbers
   * @param {Array<number>} values 
   * @param {number} period 
   * @returns {number|null}
   */
  calculateSMA(values, period) {
    if (!values || values.length < period) return null;
    const slice = values.slice(values.length - period);
    const sum = slice.reduce((acc, v) => acc + v, 0);
    return sum / period;
  }

  /**
   * Calculate Average True Range (ATR)
   * @param {Array<Object>} candles - Array of OHLCV bars
   * @param {number} period 
   * @returns {number|null}
   */
  calculateATR(candles, period = 14) {
    if (!candles || candles.length < period + 1) return null;
    const trueRanges = [];
    for (let i = 1; i < candles.length; i++) {
      const current = candles[i];
      const prev = candles[i - 1];
      const tr = Math.max(
        current.high - current.low,
        Math.abs(current.high - prev.close),
        Math.abs(current.low - prev.close)
      );
      trueRanges.push(tr);
    }
    const recentTR = trueRanges.slice(trueRanges.length - period);
    const sum = recentTR.reduce((acc, tr) => acc + tr, 0);
    return sum / period;
  }

  /**
   * Detect structural swing low over a lookback window
   * @param {Array<Object>} candles 
   * @param {number} lookback 
   * @returns {number|null}
   */
  findSwingLow(candles, lookback = 10) {
    if (!candles || candles.length < lookback) return null;
    // Exclude the most recent bar when calculating prior support
    const window = candles.slice(candles.length - lookback - 1, candles.length - 1);
    let minLow = Infinity;
    for (const bar of window) {
      if (bar.low < minLow) minLow = bar.low;
    }
    return minLow === Infinity ? null : minLow;
  }

  /**
   * Calculate Exponential Moving Average (EMA)
   * @param {Array<number>} values 
   * @param {number} period 
   * @returns {number|null}
   */
  calculateEMA(values, period) {
    if (!values || values.length < period) return null;
    const k = 2 / (period + 1);
    let ema = values.slice(0, period).reduce((a, b) => a + b, 0) / period;
    for (let i = period; i < values.length; i++) {
      ema = values[i] * k + ema * (1 - k);
    }
    return Number(ema.toFixed(2));
  }

  /**
   * Calculate Relative Strength Index (RSI 14)
   * @param {Array<number>} closes 
   * @param {number} period 
   * @returns {number|null}
   */
  calculateRSI(closes, period = 14) {
    if (!closes || closes.length < period + 1) return null;
    let gains = 0, losses = 0;
    for (let i = 1; i <= period; i++) {
      const diff = closes[i] - closes[i - 1];
      if (diff >= 0) gains += diff;
      else losses += Math.abs(diff);
    }
    let avgGain = gains / period;
    let avgLoss = losses / period;
    for (let i = period + 1; i < closes.length; i++) {
      const diff = closes[i] - closes[i - 1];
      avgGain = (avgGain * (period - 1) + (diff > 0 ? diff : 0)) / period;
      avgLoss = (avgLoss * (period - 1) + (diff < 0 ? Math.abs(diff) : 0)) / period;
    }
    if (avgLoss === 0) return 100;
    const rs = avgGain / avgLoss;
    return Number((100 - (100 / (1 + rs))).toFixed(2));
  }

  /**
   * Calculate Bollinger Bands & Bandwidth for Volatility Contraction
   * @param {Array<number>} closes 
   * @param {number} period 
   * @param {number} multiplier 
   * @returns {{ upper: number, middle: number, lower: number, bandwidth: number }|null}
   */
  calculateBollingerBands(closes, period = 20, multiplier = 2) {
    if (!closes || closes.length < period) return null;
    const sma = this.calculateSMA(closes, period);
    const slice = closes.slice(closes.length - period);
    const variance = slice.reduce((acc, v) => acc + Math.pow(v - sma, 2), 0) / period;
    const stdDev = Math.sqrt(variance);
    const upper = sma + (multiplier * stdDev);
    const lower = sma - (multiplier * stdDev);
    const bandwidth = sma > 0 ? ((upper - lower) / sma) * 100 : 0;
    return {
      upper: Number(upper.toFixed(2)),
      middle: Number(sma.toFixed(2)),
      lower: Number(lower.toFixed(2)),
      bandwidth: Number(bandwidth.toFixed(2))
    };
  }

  /**
   * Check for NR7 (Narrowest Range in 7 sessions - Volatility Squeeze)
   * @param {Array<Object>} candles 
   * @returns {boolean}
   */
  checkNR7(candles) {
    if (!candles || candles.length < 7) return false;
    const currentRange = candles[candles.length - 1].high - candles[candles.length - 1].low;
    for (let i = candles.length - 7; i < candles.length - 1; i++) {
      if ((candles[i].high - candles[i].low) <= currentRange) return false;
    }
    return true;
  }

  /**
   * Check for NR4 (Narrowest Range in 4 sessions)
   * @param {Array<Object>} candles 
   * @returns {boolean}
   */
  checkNR4(candles) {
    if (!candles || candles.length < 4) return false;
    const currentRange = candles[candles.length - 1].high - candles[candles.length - 1].low;
    for (let i = candles.length - 4; i < candles.length - 1; i++) {
      if ((candles[i].high - candles[i].low) <= currentRange) return false;
    }
    return true;
  }

  /**
   * Calculate Chaikin Money Flow (CMF 20)
   * @param {Array<Object>} candles 
   * @param {number} period 
   * @returns {number|null}
   */
  calculateCMF(candles, period = 20) {
    if (!candles || candles.length < period) return null;
    const slice = candles.slice(candles.length - period);
    let mfvSum = 0, volSum = 0;
    for (const c of slice) {
      const range = c.high - c.low;
      if (range > 0) {
        const mfm = ((c.close - c.low) - (c.high - c.close)) / range;
        mfvSum += mfm * c.volume;
      }
      volSum += c.volume;
    }
    return volSum > 0 ? Number((mfvSum / volSum).toFixed(3)) : 0;
  }

  /**
   * Calculate Average Directional Index (ADX) & Directional Indicators (+DI, -DI)
   * @param {Array<Object>} candles 
   * @param {number} period 
   * @returns {{ adx: number, plusDI: number, minusDI: number }}
   */
  calculateADX(candles, period = 14) {
    if (!candles || candles.length < period + 2) {
      return { adx: 22, plusDI: 24, minusDI: 18 };
    }
    let trSum = 0, plusDMSum = 0, minusDMSum = 0;
    const slice = candles.slice(candles.length - period - 1);
    for (let i = 1; i < slice.length; i++) {
      const curr = slice[i], prev = slice[i - 1];
      const tr = Math.max(curr.high - curr.low, Math.abs(curr.high - prev.close), Math.abs(curr.low - prev.close));
      const upMove = curr.high - prev.high;
      const downMove = prev.low - curr.low;
      const plusDM = upMove > downMove && upMove > 0 ? upMove : 0;
      const minusDM = downMove > upMove && downMove > 0 ? downMove : 0;
      trSum += tr;
      plusDMSum += plusDM;
      minusDMSum += minusDM;
    }
    const plusDI = trSum > 0 ? (plusDMSum / trSum) * 100 : 25;
    const minusDI = trSum > 0 ? (minusDMSum / trSum) * 100 : 20;
    const diDiff = Math.abs(plusDI - minusDI);
    const diSum = plusDI + minusDI;
    const dx = diSum > 0 ? (diDiff / diSum) * 100 : 20;
    return {
      adx: Number(dx.toFixed(1)),
      plusDI: Number(plusDI.toFixed(1)),
      minusDI: Number(minusDI.toFixed(1))
    };
  }

  /**
   * Detect Higher Lows (Ascending Structural Floor)
   * @param {Array<Object>} candles 
   * @param {number} lookback 
   * @returns {{ count: number, passes: boolean }}
   */
  detectHigherLows(candles, lookback = 20) {
    if (!candles || candles.length < 6) return { count: 0, passes: false };
    const slice = candles.slice(Math.max(0, candles.length - lookback));
    let hlCount = 0;
    for (let i = 2; i < slice.length; i++) {
      if (slice[i].low >= slice[i - 1].low && slice[i - 1].low >= slice[i - 2].low) {
        hlCount++;
      }
    }
    return { count: hlCount, passes: hlCount >= 1 };
  }

  /**
   * Calculate prior resistance level strictly from historical bars (zero look-ahead)
   * @param {Array<Object>} candles - Cleaned historical daily bars
   * @param {number} lookback - e.g. 20 or 50 bars
   * @returns {{ resistance: number|null, resistanceDate: string|null }}
   */
  findPriorResistance(candles, lookback = 20) {
    // Current bar being evaluated is at candles.length - 1.
    // Resistance must be computed strictly from bars BEFORE the current bar: candles[... - 2]
    if (!candles || candles.length < lookback + 1) {
      return { resistance: null, resistanceDate: null };
    }

    const priorBars = candles.slice(candles.length - 1 - lookback, candles.length - 1);
    let maxHigh = -Infinity;
    let maxDate = null;

    for (const bar of priorBars) {
      if (bar.high > maxHigh) {
        maxHigh = bar.high;
        maxDate = bar.timestamp;
      }
    }

    return {
      resistance: maxHigh === -Infinity ? null : maxHigh,
      resistanceDate: maxDate
    };
  }

  /**
   * Calculate Consolidation Base Metrics (High, Low, Depth %, VCP Contraction Waves)
   * @param {Array<Object>} candles 
   * @param {number} lookback 
   * @returns {{ baseHigh: number, baseLow: number, baseDepth: number, baseDepthPct: number, isVCPContracting: boolean, w1RangePct: number, w2RangePct: number }}
   */
  calculateBaseMetrics(candles, lookback = 20) {
    if (!candles || candles.length < 6) {
      return { baseHigh: null, baseLow: null, baseDepth: null, baseDepthPct: null, isVCPContracting: false, w1RangePct: null, w2RangePct: null };
    }
    const priorBars = candles.slice(Math.max(0, candles.length - 1 - lookback), candles.length - 1);
    if (priorBars.length === 0) {
      return { baseHigh: null, baseLow: null, baseDepth: null, baseDepthPct: null, isVCPContracting: false, w1RangePct: null, w2RangePct: null };
    }

    let baseHigh = -Infinity;
    let baseLow = Infinity;
    for (const b of priorBars) {
      if (b.high > baseHigh) baseHigh = b.high;
      if (b.low < baseLow) baseLow = b.low;
    }
    const baseDepth = Math.max(0.01, baseHigh - baseLow);
    const baseDepthPct = baseHigh > 0 ? Number(((baseDepth / baseHigh) * 100).toFixed(2)) : 0;

    // Detect VCP contraction waves by splitting prior bars into two sequential stages
    const half = Math.floor(priorBars.length / 2);
    const wave1 = priorBars.slice(0, half);
    const wave2 = priorBars.slice(half);
    const w1Range = wave1.length ? Math.max(...wave1.map(b => b.high)) - Math.min(...wave1.map(b => b.low)) : baseDepth;
    const w2Range = wave2.length ? Math.max(...wave2.map(b => b.high)) - Math.min(...wave2.map(b => b.low)) : baseDepth;
    const isVCPContracting = wave1.length > 0 && wave2.length > 0 && w2Range < (w1Range * 0.78);

    return {
      baseHigh: Number(baseHigh.toFixed(2)),
      baseLow: Number(baseLow.toFixed(2)),
      baseDepth: Number(baseDepth.toFixed(2)),
      baseDepthPct,
      isVCPContracting,
      w1RangePct: wave1.length ? Number(((w1Range / baseHigh) * 100).toFixed(2)) : baseDepthPct,
      w2RangePct: wave2.length ? Number(((w2Range / baseHigh) * 100).toFixed(2)) : baseDepthPct
    };
  }

  /**
   * Forecast Future Breakout Move % and Success Probability
   * 
   * Models the expected expansion magnitude using consolidation base depth and ATR expansion multiples,
   * coupled with a multi-factor probabilistic win rate.
   * 
   * @param {Object} params
   * @param {number} params.entryPrice
   * @param {number} params.stopLoss
   * @param {number} params.atr
   * @param {Object} params.baseMetrics
   * @param {number} params.qualityScore
   * @param {string} params.trapRisk
   * @param {number} params.bcl
   * @param {number} params.upperWickPct
   * @param {number} params.rsVsNifty
   * @param {number} params.rsVsSector
   * @returns {Object} Quantitative forecast with probability and expected target cones
   */
  forecastBreakoutMove({
    entryPrice,
    stopLoss,
    atr,
    baseMetrics,
    qualityScore,
    trapRisk,
    bcl,
    upperWickPct,
    rsVsNifty = 0,
    rsVsSector = 0
  }) {
    const validATR = atr || (entryPrice * 0.025);
    const riskPerShare = Math.max(0.05, entryPrice - (stopLoss || (entryPrice * 0.97)));
    const riskPct = Number(((riskPerShare / entryPrice) * 100).toFixed(2));

    // Base Measured Move
    const measuredMovePoints = baseMetrics?.baseDepth || (validATR * 3.5);
    const measuredMovePct = Number(((measuredMovePoints / entryPrice) * 100).toFixed(2));

    // Volatility Expansion Cones
    // Conservative: 2R / 2.2x ATR
    const conservativeMovePct = Number((Math.max(riskPct * 2.0, (2.2 * validATR / entryPrice) * 100)).toFixed(1));
    // Expected: blend of Measured Base Extension (80%) and 3.5x ATR (20%)
    const expectedMovePct = Number((Math.max(conservativeMovePct * 1.25, (measuredMovePct * 0.82 + (3.5 * validATR / entryPrice) * 100 * 0.18))).toFixed(1));
    // Maximum Expansion: full measured move or 5.2x ATR
    const maxExpansionPct = Number((Math.max(expectedMovePct * 1.35, (5.2 * validATR / entryPrice) * 100)).toFixed(1));

    // Target Price Levels
    const conservativeTargetPrice = Number((entryPrice * (1 + conservativeMovePct / 100)).toFixed(2));
    const expectedTargetPrice = Number((entryPrice * (1 + expectedMovePct / 100)).toFixed(2));
    const maxTargetPrice = Number((entryPrice * (1 + maxExpansionPct / 100)).toFixed(2));

    // 2. Probabilistic Win Rate & Breakout Success Probability
    // Starts with base probability mapped from qualityScore (0-100)
    let prob = Math.round(35 + (qualityScore * 0.52)); // 50 score -> 61%, 85 score -> 79%, 95 score -> 84%

    // Bonus for VCP Contraction
    if (baseMetrics?.isVCPContracting) prob += 5;

    // Bonus for strong Relative Strength
    if (rsVsNifty >= 2.0) prob += 4;
    if (rsVsSector >= 1.5) prob += 3;

    // Bonus for Bullish Close (BCL > 85%) and minimal upper wick
    if (bcl >= 85 && upperWickPct <= 10) prob += 4;

    // Penalties
    if (trapRisk === 'HIGH (TRAP / REJECTION)') prob -= 30;
    else if (trapRisk === 'MODERATE') prob -= 8;
    if (upperWickPct > 25) prob -= 10;

    // Clamp between 15% and 92% (in financial markets, no breakout is 100% or 0%)
    const breakoutProbabilityPct = Math.max(15, Math.min(92, Math.round(prob)));

    // 3. Expected Time Horizon (in Trading Sessions)
    let expectedHorizonSessions = '5–12 sessions';
    let triggerHorizonSessions = '1–3 sessions';
    if (baseMetrics?.isVCPContracting && bcl >= 80) {
      triggerHorizonSessions = '1–2 sessions';
      expectedHorizonSessions = '4–8 sessions';
    } else if (qualityScore < 70) {
      triggerHorizonSessions = '5–10 sessions';
      expectedHorizonSessions = '10–20 sessions';
    }

    // 4. Forecast Rating
    let forecastRating = 'NEUTRAL';
    if (breakoutProbabilityPct >= 78) forecastRating = 'HIGH CONVICTION EXPANSION';
    else if (breakoutProbabilityPct >= 65) forecastRating = 'FAVORABLE BREAKOUT';
    else if (breakoutProbabilityPct >= 50) forecastRating = 'MODERATE / DEVELOPING';
    else forecastRating = 'LOW PROBABILITY / TRAP RISK';

    return {
      breakoutProbabilityPct,
      forecastRating,
      expectedMovePct,
      conservativeMovePct,
      maxExpansionPct,
      riskPct,
      rewardToRiskRatio: Number((expectedMovePct / Math.max(0.1, riskPct)).toFixed(1)),
      targetPrices: {
        conservative: conservativeTargetPrice,
        expected: expectedTargetPrice,
        maxExpansion: maxTargetPrice
      },
      baseDepthPct: baseMetrics?.baseDepthPct || null,
      isVCPContracting: baseMetrics?.isVCPContracting || false,
      timeHorizon: {
        trigger: triggerHorizonSessions,
        target: expectedHorizonSessions
      }
    };
  }

  /**
   * Scan a single stock against all swing trading candidate rules
   * 
   * @param {Object} params
   * @param {string} params.symbol
   * @param {Array<Object>} params.stockCandles - Daily OHLCV bars
   * @param {Array<Object>} params.benchmarkCandles - Nifty 50 daily OHLCV bars
   * @param {Object} params.marketStatus - Status from resolve_market_time_and_calendar
   * @param {Object} params.liveQuote - Optional live quote with bid/ask depth
   * @returns {Object} Scan results and candidate card
   */
  evaluateCandidate({
    symbol,
    stockCandles = [],
    benchmarkCandles = [],
    marketStatus = null,
    liveQuote = null
  }) {
    const warnings = [];
    const evidence = [];
    const rulePasses = {};

    // 1. Data Validation & Hygiene (Strip incomplete bars)
    const validation = this.validator.validateCandleSeries(stockCandles, marketStatus);
    if (!validation.valid || validation.cleanedCandles.length < 50) {
      return {
        symbol,
        status: 'REJECT',
        reason: `Insufficient validated historical data (need >= 50 bars, got ${validation.cleanedCandles.length}). ${validation.warnings.join('; ')}`,
        rulePasses: {},
        evidence: [],
        warnings: validation.warnings
      };
    }

    warnings.push(...validation.warnings);
    const candles = validation.cleanedCandles;
    const currentBar = candles[candles.length - 1];
    const closes = candles.map(c => c.close);
    const volumes = candles.map(c => c.volume);

    // 2. Liquidity & Spread check
    const currentPrice = liveQuote?.ltp ?? currentBar.close;
    const currentVolume = liveQuote?.volume ?? currentBar.volume;
    const liquidityCheck = this.validator.validateLiquidity({
      ltp: currentPrice,
      volume: currentVolume,
      bid: liveQuote?.buyBook?.[1]?.price ?? null,
      ask: liveQuote?.sellBook?.[1]?.price ?? null
    });

    rulePasses.liquidity = liquidityCheck.passes;
    if (!liquidityCheck.passes) {
      warnings.push(...liquidityCheck.reasons);
    } else {
      evidence.push(`Liquidity verified: Daily turnover ₹${(liquidityCheck.turnoverInr / 10000000).toFixed(2)} Cr exceeds min threshold.`);
    }

    // 3. Trend Rule: Close above 50 SMA and 200 SMA
    const fastMaPeriod = this.scannerCfg.trend?.fast_ma_period ?? 50;
    const slowMaPeriod = this.scannerCfg.trend?.slow_ma_period ?? 200;

    const sma50 = this.calculateSMA(closes, fastMaPeriod);
    const sma200 = this.calculateSMA(closes, slowMaPeriod); // May be null if < 200 bars

    const closeAbove50 = sma50 !== null && currentBar.close > sma50;
    const closeAbove200 = sma200 === null || currentBar.close > sma200;
    const maAlignment = sma200 === null || (sma50 !== null && sma50 > sma200);

    rulePasses.trend = closeAbove50 && closeAbove200;
    if (rulePasses.trend) {
      evidence.push(`Trend Bullish: Close ₹${currentBar.close} is above 50-day SMA (₹${sma50?.toFixed(2)})${sma200 ? ` and 200-day SMA (₹${sma200?.toFixed(2)})` : ''}.`);
    } else {
      evidence.push(`Trend Weak: Close ₹${currentBar.close} is below required moving averages.`);
    }

    // 4. Breakout Rule: Close above prior 20-day or 50-day resistance (zero look-ahead)
    const primaryLookback = this.scannerCfg.breakout?.primary_lookback_days ?? 20;
    const secondaryLookback = this.scannerCfg.breakout?.secondary_lookback_days ?? 50;

    const res20 = this.findPriorResistance(candles, primaryLookback);
    const res50 = this.findPriorResistance(candles, secondaryLookback);

    const breakout20 = res20.resistance !== null && currentBar.close > res20.resistance;
    const breakout50 = res50.resistance !== null && currentBar.close > res50.resistance;

    rulePasses.breakout = breakout20 || breakout50;
    const activeResistance = breakout50 ? res50.resistance : res20.resistance;
    const activeLookback = breakout50 ? 50 : 20;

    if (rulePasses.breakout) {
      evidence.push(`Breakout Confirmed: Close ₹${currentBar.close} broke above prior ${activeLookback}-day resistance of ₹${activeResistance?.toFixed(2)}.`);
    } else {
      evidence.push(`No Breakout: Close ₹${currentBar.close} is below 20-day resistance (₹${res20.resistance?.toFixed(2)}).`);
    }

    // 5. Volume Rule: Volume above 20-day average
    const volMaPeriod = this.scannerCfg.volume?.volume_ma_period ?? 20;
    const minSurge = this.scannerCfg.volume?.min_surge_multiplier ?? 1.2;
    // Calculate volume SMA over prior 20 days (excluding today)
    const priorVolumes = volumes.slice(0, volumes.length - 1);
    const volSMA = this.calculateSMA(priorVolumes, volMaPeriod);

    const volumeSurge = volSMA !== null && currentBar.volume >= (volSMA * minSurge);
    rulePasses.volume = volumeSurge;

    if (volumeSurge) {
      const surgeRatio = (currentBar.volume / volSMA).toFixed(2);
      evidence.push(`Volume Surge: Volume (${currentBar.volume.toLocaleString('en-IN')}) is ${surgeRatio}x of the 20-day average (${Math.round(volSMA).toLocaleString('en-IN')}).`);
    } else {
      evidence.push(`Volume Subdued: Volume (${currentBar.volume.toLocaleString('en-IN')}) did not meet ${minSurge}x surge threshold.`);
    }

    // 6. Relative Strength vs NIFTY 50
    let relativeStrength = null;
    let rsPass = false;
    const rsPeriod = this.scannerCfg.relative_strength?.rs_period_days ?? 20;

    if (benchmarkCandles.length >= rsPeriod + 1 && candles.length >= rsPeriod + 1) {
      const stockStartClose = candles[candles.length - 1 - rsPeriod].close;
      const stockEndClose = candles[candles.length - 1].close;
      const stockReturnPct = ((stockEndClose - stockStartClose) / stockStartClose) * 100;

      const benchStartClose = benchmarkCandles[benchmarkCandles.length - 1 - rsPeriod].close;
      const benchEndClose = benchmarkCandles[benchmarkCandles.length - 1].close;
      const benchReturnPct = ((benchEndClose - benchStartClose) / benchStartClose) * 100;

      relativeStrength = stockReturnPct - benchReturnPct;
      rsPass = relativeStrength > (this.scannerCfg.relative_strength?.min_rs_outperformance_pct ?? 0.0);
      rulePasses.relativeStrength = rsPass;

      if (rsPass) {
        evidence.push(`Relative Strength Positive: Stock returned ${stockReturnPct.toFixed(2)}% vs Nifty 50 ${benchReturnPct.toFixed(2)}% (+${relativeStrength.toFixed(2)}% alpha over ${rsPeriod} days).`);
      } else {
        evidence.push(`Relative Strength Weak: Stock underperformed benchmark by ${Math.abs(relativeStrength).toFixed(2)}%.`);
      }
    } else {
      warnings.push('Insufficient benchmark candles to compute Relative Strength accurately.');
      rulePasses.relativeStrength = false;
    }

    // 7. Structural Invalidation Level & Stop-Loss
    const atr = this.calculateATR(candles, this.scannerCfg.invalidation?.atr_period ?? 14);
    const swingLow = this.findSwingLow(candles, this.scannerCfg.invalidation?.structure_lookback_bars ?? 10);
    const atrMultiplier = this.scannerCfg.invalidation?.atr_multiplier ?? 2.0;

    let stopLoss = null;
    let stopLossRationale = '';

    if (swingLow !== null && swingLow < currentBar.close) {
      stopLoss = Number(swingLow.toFixed(2));
      stopLossRationale = `Structural Prior Swing Low (Past ${this.scannerCfg.invalidation?.structure_lookback_bars ?? 10} bars)`;
    } else if (atr !== null) {
      stopLoss = Number((currentBar.close - (atr * atrMultiplier)).toFixed(2));
      stopLossRationale = `Volatility Buffer: ${atrMultiplier}x ATR(14) below entry`;
    }

    // Targets: Scenario 1 (2R), Scenario 2 (3R)
    let target1 = null;
    let target2 = null;
    let rewardToRisk = null;

    if (stopLoss !== null && stopLoss < currentBar.close) {
      const riskPerShare = currentBar.close - stopLoss;
      target1 = Number((currentBar.close + (riskPerShare * 2.0)).toFixed(2)); // 2R
      target2 = Number((currentBar.close + (riskPerShare * 3.0)).toFixed(2)); // 3R
      rewardToRisk = 2.0;
    }

    // 8. Institutional 3-Layer Architecture & 30-Parameter Indicators
    const ema20 = this.calculateEMA(closes, 20);
    const ema50 = this.calculateEMA(closes, 50);
    const rsi14 = this.calculateRSI(closes, 14) ?? 56;
    const bb = this.calculateBollingerBands(closes, 20, 2);
    const isNR7 = this.checkNR7(candles);
    const isNR4 = this.checkNR4(candles);
    const cmf20 = this.calculateCMF(candles, 20) ?? 0.05;
    const adxData = this.calculateADX(candles, 14);
    const higherLows = this.detectHigherLows(candles, 20);

    // Candle Range & Anti-Trap Metrics
    const candleRange = Math.max(0.01, currentBar.high - currentBar.low);
    const bcl = Number((Math.min(100, Math.max(0, ((currentBar.close - currentBar.low) / candleRange) * 100))).toFixed(1));
    const upperWickPct = Number((Math.min(100, Math.max(0, ((currentBar.high - currentBar.close) / candleRange) * 100))).toFixed(1));
    const rangeTightnessPct = Number(((candleRange / currentBar.close) * 100).toFixed(2));
    const distToResPct = res20.resistance ? Number((((res20.resistance - currentBar.close) / res20.resistance) * 100).toFixed(2)) : 0;

    // Trap Risk Filter
    let trapRisk = 'LOW';
    if (upperWickPct > 35 || bcl < 65) {
      trapRisk = 'HIGH (TRAP / REJECTION)';
      warnings.push(`Breakout Warning: Upper wick rejection of ${upperWickPct}% indicates strong selling into the high.`);
    } else if (upperWickPct > 20 || bcl < 80) {
      trapRisk = 'MODERATE';
    }

    // 6-Category Weighted Scoring Architecture (100 Total Points)
    // Category 1: Relative Strength (20 Pts)
    let rsScore = 0;
    if (relativeStrength !== null) {
      if (relativeStrength >= 2.5) rsScore += 10;
      else if (relativeStrength >= 1.0) rsScore += 7;
      else if (relativeStrength > 0) rsScore += 4;
    } else if (rulePasses.relativeStrength) {
      rsScore += 10;
    }
    if (currentBar.close > currentBar.open) rsScore += 6;
    if (rulePasses.relativeStrength) rsScore += 4;
    rsScore = Math.min(20, rsScore);

    // Category 2: Volatility Contraction (20 Pts)
    let vcScore = 0;
    if (rangeTightnessPct <= 2.5) vcScore += 8;
    else if (rangeTightnessPct <= 4.0) vcScore += 6;
    else if (rangeTightnessPct <= 6.0) vcScore += 3;
    if (bb && bb.bandwidth <= 10.0) vcScore += 6;
    else if (bb && bb.bandwidth <= 15.0) vcScore += 4;
    else vcScore += 2;
    if (isNR7 || isNR4) vcScore += 6;
    else if (upperWickPct <= 15) vcScore += 4;
    vcScore = Math.min(20, vcScore);

    // Category 3: Price Structure & Proximity (20 Pts)
    let psScore = 0;
    if (rulePasses.breakout || Math.abs(distToResPct) <= 1.0) psScore += 8;
    else if (distToResPct > 0 && distToResPct <= 3.0) psScore += 6;
    else if (distToResPct > 0 && distToResPct <= 5.0) psScore += 4;
    else psScore += 2;
    if (higherLows.passes) psScore += 6;
    else psScore += 2;
    if (bcl >= 85) psScore += 6;
    else if (bcl >= 75) psScore += 4;
    else psScore += 2;
    psScore = Math.min(20, psScore);

    // Category 4: Volume & Accumulation (15 Pts)
    let volScore = 0;
    if (rulePasses.volume) volScore += 6;
    else if (currentBar.volume < (volSMA ?? currentBar.volume)) volScore += 4; // Volume drying up in base
    if (cmf20 >= 0) volScore += 5;
    else volScore += 2;
    if (liquidityCheck.passes) volScore += 4;
    volScore = Math.min(15, volScore);

    // Category 5: Trend Strength (15 Pts)
    let trendScore = 0;
    if (rulePasses.trend) trendScore += 6;
    else if (ema20 && currentBar.close > ema20) trendScore += 4;
    if (ema20 && ema50 && ema20 > ema50) trendScore += 5;
    else trendScore += 2;
    if (adxData.adx >= 18 && adxData.plusDI > adxData.minusDI) trendScore += 4;
    else trendScore += 2;
    trendScore = Math.min(15, trendScore);

    // Category 6: Momentum (10 Pts)
    let momScore = 0;
    if (rsi14 >= 52 && rsi14 <= 68) momScore += 6; // Sweet spot
    else if (rsi14 > 68 && rsi14 <= 75) momScore += 4;
    else if (rsi14 >= 48) momScore += 3;
    if (bcl >= 75) momScore += 4;
    else if (bcl >= 60) momScore += 2;
    momScore = Math.min(10, momScore);

    // Raw Quality Score
    let qualityScore = rsScore + vcScore + psScore + volScore + trendScore + momScore;

    // Anti-Trap Penalty
    if (trapRisk === 'HIGH (TRAP / REJECTION)') {
      qualityScore = Math.max(10, qualityScore - 35);
    }

    // 3-Layer Timing Architecture
    let layer = 'LAYER_1';
    let layerName = 'Layer 1: Early Accumulation (5–15 sessions before breakout)';
    if (rulePasses.breakout && bcl >= 85 && rulePasses.volume && trapRisk !== 'HIGH (TRAP / REJECTION)') {
      layer = 'LAYER_3';
      layerName = 'Layer 3: Breakout Confirmation (Execution Day)';
    } else if (distToResPct <= 2.0 && rangeTightnessPct <= 3.5 && bcl >= 75) {
      layer = 'LAYER_2';
      layerName = 'Layer 2: Pre-Breakout Coil (1–5 sessions before breakout)';
    } else {
      layer = 'LAYER_1';
      layerName = 'Layer 1: Early Accumulation (5–15 sessions before breakout)';
    }

    // Conviction Tiers
    let classification = 'Ignore';
    let grade = 'C';
    if (qualityScore >= 85) {
      classification = 'Exceptional setup';
      grade = 'A+';
    } else if (qualityScore >= 75) {
      classification = 'Strong candidate';
      grade = 'A';
    } else if (qualityScore >= 65) {
      classification = 'Developing setup';
      grade = 'B';
    } else if (qualityScore >= 50) {
      classification = 'Weak candidate';
      grade = 'C';
    } else {
      classification = 'Ignore';
      grade = 'REJECT';
    }

    // 9. Overall Classification Status
    const passCount = Object.values(rulePasses).filter(Boolean).length;
    let status = 'REJECT';

    if (!rulePasses.liquidity) {
      status = 'REJECT';
    } else if (rulePasses.trend && rulePasses.breakout && rulePasses.volume && rulePasses.relativeStrength) {
      status = 'RESEARCH CANDIDATE';
    } else if (rulePasses.trend && (rulePasses.breakout || rulePasses.volume)) {
      status = 'WATCHLIST';
    } else {
      status = 'REJECT';
    }

    // 10. Quantitative Breakout Forecast & Probabilistic Expansion Cones
    const baseMetrics = this.calculateBaseMetrics(candles, 20);
    const forecast = this.forecastBreakoutMove({
      entryPrice: currentBar.close,
      stopLoss,
      atr,
      baseMetrics,
      qualityScore,
      trapRisk,
      bcl,
      upperWickPct,
      rsVsNifty: relativeStrength || 0,
      rsVsSector: 0
    });

    return {
      symbol,
      status,
      timestamp: currentBar.timestamp,
      dataInterval: '1D (Daily)',
      setupType: rulePasses.breakout ? 'Multi-Week Resistance Breakout with Volume' : 'Trend Continuation Pullback',
      entryPrice: currentBar.close,
      stopLoss,
      stopLossRationale,
      target1,
      target2,
      rewardToRisk,
      qualityScore,
      grade,
      classification,
      layer,
      layerName,
      forecast,
      baseMetrics,
      scoresBreakdown: {
        relativeStrength: rsScore,
        volatilityContraction: vcScore,
        priceStructure: psScore,
        volumeAccumulation: volScore,
        trendStrength: trendScore,
        momentum: momScore
      },
      trapRisk,
      barCloseLocation: bcl,
      upperWickPct,
      rangeTightnessPct,
      indicators: {
        rsi14,
        ema20,
        ema50,
        cmf20,
        adx: adxData.adx,
        plusDI: adxData.plusDI,
        minusDI: adxData.minusDI,
        isNR7,
        isNR4,
        bbWidth: bb?.bandwidth ?? null,
        higherLowsCount: higherLows.count
      },
      rulePasses,
      evidence,
      metrics: {
        sma50: sma50 ? Number(sma50.toFixed(2)) : null,
        sma200: sma200 ? Number(sma200.toFixed(2)) : null,
        resistance20: res20.resistance ? Number(res20.resistance.toFixed(2)) : null,
        volumeSMA: volSMA ? Math.round(volSMA) : null,
        currentVolume: currentBar.volume,
        relativeStrengthPct: relativeStrength ? Number(relativeStrength.toFixed(2)) : null,
        atr14: atr ? Number(atr.toFixed(2)) : null,
        qualityScore,
        grade,
        classification,
        layer,
        trapRisk,
        barCloseLocation: bcl,
        breakoutProbabilityPct: forecast.breakoutProbabilityPct,
        expectedMovePct: forecast.expectedMovePct,
        forecastRating: forecast.forecastRating
      },
      warnings
    };
  }
}

