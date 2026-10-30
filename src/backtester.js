/**
 * Backtesting Engine for Swing Trading Strategies
 * 
 * Strict execution rules:
 * - Bar-by-bar iteration preventing look-ahead bias
 * - Signal computed on Close of bar T
 * - Entry executed on Open of bar T+1 (with slippage)
 * - Exits triggered on intraday Low <= StopLoss or High >= Target
 * - Realistic transaction costs, statutory levies, and slippage modeled
 * - Benchmarked against NIFTY 50 Buy & Hold
 */

import { StockScanner } from './scanner.js';
import { RiskManager } from './risk_manager.js';
import { DataValidator } from './data_validator.js';

export class Backtester {
  /**
   * @param {Object} config - System configuration
   */
  constructor(config = {}) {
    this.config = config;
    this.validator = new DataValidator(config);
    this.scanner = new StockScanner(config, this.validator);
    this.riskManager = new RiskManager(config);
    this.initialCapital = config.risk?.default_trading_equity ?? 100000.0;
  }

  /**
   * Run backtest on a single symbol's historical daily candles
   * 
   * @param {Object} params
   * @param {string} params.symbol
   * @param {Array<Object>} params.candles - Full historical daily OHLCV series
   * @param {Array<Object>} params.benchmarkCandles - NIFTY 50 daily OHLCV series
   * @param {number} params.startBar - Index to start backtest (after warm-up period)
   * @returns {Object} Backtest performance report
   */
  runSingleSymbolBacktest({
    symbol,
    candles,
    benchmarkCandles = [],
    startBar = 50
  }) {
    if (!candles || candles.length < startBar + 10) {
      return {
        symbol,
        error: `Insufficient bars for backtesting (requires > ${startBar + 10}, got ${candles?.length})`
      };
    }

    let equity = this.initialCapital;
    let peakEquity = equity;
    let maxDrawdownInr = 0;
    let maxDrawdownPct = 0;

    const completedTrades = [];
    let activePosition = null;

    // Bar-by-bar simulation
    for (let t = startBar; t < candles.length - 1; t++) {
      const currentBar = candles[t];
      const nextBar = candles[t + 1];

      // 1. Manage Active Position (Check for exits on Bar t)
      if (activePosition) {
        let exitPrice = null;
        let exitReason = null;

        // Check if Stop Loss hit
        if (currentBar.low <= activePosition.stopLoss) {
          // If open gapped below stop, fill at open, otherwise fill at stop price
          exitPrice = Math.min(currentBar.open, activePosition.stopLoss);
          exitReason = 'STOP_LOSS_HIT';
        }
        // Check if Target 1 hit
        else if (currentBar.high >= activePosition.target1) {
          exitPrice = Math.max(currentBar.open, activePosition.target1);
          exitReason = 'TARGET_REACHED';
        }
        // Max holding period exit (e.g. 20 trading days ≈ 1 month)
        else if (t - activePosition.entryBarIndex >= 20) {
          exitPrice = currentBar.close;
          exitReason = 'TIME_STOP_EXPIRED';
        }

        if (exitPrice !== null) {
          const grossPnl = (exitPrice - activePosition.entryPrice) * activePosition.quantity;
          const costs = this.riskManager.calculateRoundTripCharges(
            activePosition.entryPrice,
            exitPrice,
            activePosition.quantity
          );
          const netPnl = grossPnl - costs.totalCharges;
          equity += netPnl;

          if (equity > peakEquity) peakEquity = equity;
          const ddInr = peakEquity - equity;
          const ddPct = (ddInr / peakEquity) * 100;
          if (ddInr > maxDrawdownInr) maxDrawdownInr = ddInr;
          if (ddPct > maxDrawdownPct) maxDrawdownPct = ddPct;

          completedTrades.push({
            symbol,
            entryDate: activePosition.entryDate,
            exitDate: currentBar.timestamp,
            entryPrice: activePosition.entryPrice,
            exitPrice,
            quantity: activePosition.quantity,
            grossPnl: Number(grossPnl.toFixed(2)),
            charges: costs.totalCharges,
            netPnl: Number(netPnl.toFixed(2)),
            holdingDays: t - activePosition.entryBarIndex,
            exitReason,
            equityAfterTrade: Number(equity.toFixed(2))
          });

          activePosition = null;
        }
      }

      // 2. Evaluate Entry Signals (Only if flat)
      if (!activePosition) {
        // Feed only candles up to bar t (strictly zero future data)
        const historicalSlice = candles.slice(0, t + 1);
        const benchmarkSlice = benchmarkCandles.slice(0, t + 1);

        const scan = this.scanner.evaluateCandidate({
          symbol,
          stockCandles: historicalSlice,
          benchmarkCandles: benchmarkSlice
        });

        const isSignal = (scan.status === 'RESEARCH CANDIDATE' || 
          (scan.qualityScore >= 72 && (scan.layer === 'LAYER_2' || scan.layer === 'LAYER_3') && scan.trapRisk !== 'HIGH (TRAP / REJECTION)')) && 
          scan.stopLoss !== null;

        if (isSignal) {
          // Calculate sizing on next bar open
          const plannedEntry = nextBar.open;
          const sizing = this.riskManager.evaluateTradeSizing({
            symbol,
            entryPrice: plannedEntry,
            stopLoss: scan.stopLoss,
            targetPrice: scan.target1,
            tradingEquity: equity
          });

          if (sizing.approved && sizing.quantity > 0) {
            // Apply entry slippage
            const slippagePct = this.config.charges_and_taxes?.estimated_slippage_pct ?? 0.001;
            const actualEntryPrice = plannedEntry * (1 + slippagePct);

            activePosition = {
              symbol,
              entryDate: nextBar.timestamp,
              entryBarIndex: t + 1,
              entryPrice: Number(actualEntryPrice.toFixed(2)),
              stopLoss: scan.stopLoss,
              target1: scan.target1,
              quantity: sizing.quantity,
              plannedRisk: sizing.plannedRiskInr
            };
          }
        }
      }
    }

    // Benchmark comparison (Buy & Hold from startBar to end)
    let benchmarkReturnPct = 0;
    if (benchmarkCandles.length > startBar) {
      const bStart = benchmarkCandles[startBar].close;
      const bEnd = benchmarkCandles[benchmarkCandles.length - 1].close;
      benchmarkReturnPct = Number((((bEnd - bStart) / bStart) * 100).toFixed(2));
    }

    // Compute metrics
    const wins = completedTrades.filter(t => t.netPnl > 0);
    const losses = completedTrades.filter(t => t.netPnl <= 0);
    const winRatePct = completedTrades.length > 0 ? (wins.length / completedTrades.length) * 100 : 0;

    const totalWinPnl = wins.reduce((s, t) => s + t.netPnl, 0);
    const totalLossPnl = Math.abs(losses.reduce((s, t) => s + t.netPnl, 0));
    const profitFactor = totalLossPnl > 0 ? totalWinPnl / totalLossPnl : (totalWinPnl > 0 ? Infinity : 0);

    const netStrategyPnlInr = equity - this.initialCapital;
    const strategyReturnPct = (netStrategyPnlInr / this.initialCapital) * 100;

    const avgWin = wins.length > 0 ? totalWinPnl / wins.length : 0;
    const avgLoss = losses.length > 0 ? totalLossPnl / losses.length : 0;
    const pWin = completedTrades.length > 0 ? wins.length / completedTrades.length : 0;
    const pLoss = completedTrades.length > 0 ? losses.length / completedTrades.length : 0;
    const expectancyInr = (pWin * avgWin) - (pLoss * avgLoss);

    return {
      symbol,
      period: `${candles[startBar].timestamp.split('T')[0]} to ${candles[candles.length - 1].timestamp.split('T')[0]}`,
      initialCapital: this.initialCapital,
      finalEquity: Number(equity.toFixed(2)),
      netPnlInr: Number(netStrategyPnlInr.toFixed(2)),
      strategyReturnPct: Number(strategyReturnPct.toFixed(2)),
      benchmarkReturnPct,
      tradeCount: completedTrades.length,
      winCount: wins.length,
      lossCount: losses.length,
      winRatePct: Number(winRatePct.toFixed(2)),
      profitFactor: Number(profitFactor.toFixed(2)),
      expectancyInr: Number(expectancyInr.toFixed(2)),
      maxDrawdownInr: Number(maxDrawdownInr.toFixed(2)),
      maxDrawdownPct: Number(maxDrawdownPct.toFixed(2)),
      trades: completedTrades,
      disclaimers: [
        'Survivorship bias: Historical results assume the stock was continuously tradeable.',
        'Corporate actions: Historical price adjustments (splits, bonuses) may alter past levels.',
        'Past performance does not guarantee future results.'
      ]
    };
  }
}

