/**
 * Risk Management and Position Sizing Engine
 * 
 * Implements strict capital preservation rules:
 * - Trade Risk Cap: 0.5% of trading equity
 * - Portfolio Aggregate Risk Cap: 2.0% of trading equity
 * - Max Concurrent Positions: 5
 * - Position sizing: floor(min(risk_budget / risk_per_share, available_allocation / entry_price))
 * - Accurate Indian Equity Delivery Fee & Tax Calculator (STT, Stamp Duty, SEBI, Exch, DP, GST, Brokerage)
 * - Slippage modeling on entry and stop execution
 * - Strict prohibition of averaging down
 */

export class RiskManager {
  /**
   * @param {Object} config - Complete trading configuration
   */
  constructor(config = {}) {
    this.config = config;
    this.riskCfg = config.risk ?? {};
    this.chargesCfg = config.charges_and_taxes ?? {};

    this.maxRiskPerTradePct = this.riskCfg.max_planned_risk_per_trade_pct ?? 0.005; // 0.5%
    this.maxAggregateOpenRiskPct = this.riskCfg.max_aggregate_open_risk_pct ?? 0.02; // 2.0%
    this.maxPositions = this.riskCfg.max_simultaneous_positions ?? 5;
    this.minRewardToRisk = this.riskCfg.min_reward_to_risk_ratio ?? 2.0;
    this.maxAllocationPct = this.riskCfg.max_capital_allocation_per_trade_pct ?? 0.20; // 20% max per position
    this.noAveragingDown = this.riskCfg.no_averaging_down ?? true;
    this.defaultEquity = this.riskCfg.default_trading_equity ?? 100000.0;
  }

  /**
   * Calculate realistic round-trip costs and statutory taxes for NSE cash equity delivery.
   * Based on standard NSE/SEBI equity delivery guidelines.
   * 
   * @param {number} entryPrice 
   * @param {number} exitPrice 
   * @param {number} quantity 
   * @returns {Object} Comprehensive fee breakdown
   */
  calculateRoundTripCharges(entryPrice, exitPrice, quantity) {
    if (!quantity || quantity <= 0) {
      return { totalCharges: 0, breakdown: {} };
    }

    const buyTurnover = entryPrice * quantity;
    const sellTurnover = exitPrice * quantity;
    const totalTurnover = buyTurnover + sellTurnover;

    // Brokerage (Standard Discount Broker: 0.05% capped at ₹20 per executed order)
    const buyBrokerage = Math.min(buyTurnover * (this.chargesCfg.brokerage_pct ?? 0.0005), this.chargesCfg.brokerage_flat_cap_inr ?? 20.0);
    const sellBrokerage = Math.min(sellTurnover * (this.chargesCfg.brokerage_pct ?? 0.0005), this.chargesCfg.brokerage_flat_cap_inr ?? 20.0);
    const totalBrokerage = buyBrokerage + sellBrokerage;

    // STT (0.1% on both Buy and Sell for Delivery)
    const buySTT = Math.round(buyTurnover * (this.chargesCfg.stt_buy_pct ?? 0.001));
    const sellSTT = Math.round(sellTurnover * (this.chargesCfg.stt_sell_pct ?? 0.001));
    const totalSTT = buySTT + sellSTT;

    // Exchange Transaction Charges (NSE: 0.00297%)
    const exchCharges = totalTurnover * (this.chargesCfg.exchange_turnover_pct ?? 0.0000297);

    // SEBI Turnover Fees (₹10 / Crore = 0.0001%)
    const sebiCharges = totalTurnover * (this.chargesCfg.sebi_turnover_pct ?? 0.000001);

    // Stamp Duty (0.015% on Buy only)
    const stampDuty = Math.round(buyTurnover * (this.chargesCfg.stamp_duty_buy_pct ?? 0.00015));

    // Depository Participant (DP) Charges (Standard: ₹13.50 + 18% GST = ₹15.93 on sell)
    const dpCharges = this.chargesCfg.dp_charges_sell_inr ?? 15.93;

    // GST (18% on Brokerage + Exchange charges + SEBI charges)
    const gstApplicable = totalBrokerage + exchCharges + sebiCharges;
    const gst = gstApplicable * (this.chargesCfg.gst_rate_pct ?? 0.18);

    // Estimated Slippage buffer
    const slippagePct = this.chargesCfg.estimated_slippage_pct ?? 0.001;
    const estimatedSlippage = (buyTurnover + sellTurnover) * slippagePct;

    const totalStatutoryAndBrokerage = totalBrokerage + totalSTT + exchCharges + sebiCharges + stampDuty + dpCharges + gst;
    const totalChargesWithSlippage = totalStatutoryAndBrokerage + estimatedSlippage;

    return {
      buyTurnover,
      sellTurnover,
      totalTurnover,
      totalCharges: Number(totalChargesWithSlippage.toFixed(2)),
      totalStatutoryAndBrokerage: Number(totalStatutoryAndBrokerage.toFixed(2)),
      estimatedSlippage: Number(estimatedSlippage.toFixed(2)),
      breakdown: {
        brokerage: Number(totalBrokerage.toFixed(2)),
        stt: totalSTT,
        exchangeCharges: Number(exchCharges.toFixed(2)),
        sebiCharges: Number(sebiCharges.toFixed(2)),
        stampDuty,
        dpCharges,
        gst: Number(gst.toFixed(2)),
        slippage: Number(estimatedSlippage.toFixed(2))
      }
    };
  }

  /**
   * Sizing calculation adhering to the project formula:
   * floor(min(risk_budget / risk_per_share, available_allocation / entry_price))
   * 
   * @param {Object} params
   * @param {string} params.symbol
   * @param {number} params.entryPrice
   * @param {number} params.stopLoss
   * @param {number} params.targetPrice
   * @param {number} params.tradingEquity - Current available cash / capital
   * @param {Array<Object>} params.existingPositions - Currently active open positions
   * @param {Array<Object>} params.portfolioHoldings - Live holdings from portfolio
   * @returns {Object} Evaluation decision and sizing details
   */
  evaluateTradeSizing({
    symbol,
    entryPrice,
    stopLoss,
    targetPrice,
    tradingEquity = null,
    existingPositions = [],
    portfolioHoldings = []
  }) {
    const equity = tradingEquity && tradingEquity > 0 ? tradingEquity : this.defaultEquity;
    const rejections = [];

    // 1. Structural validity
    if (!entryPrice || entryPrice <= 0) {
      return { approved: false, rejections: ['Invalid entry price'] };
    }
    if (!stopLoss || stopLoss <= 0) {
      return { approved: false, rejections: ['Invalid stop-loss level'] };
    }
    if (stopLoss >= entryPrice) {
      return { approved: false, rejections: [`Stop-loss (₹${stopLoss}) must be strictly below entry price (₹${entryPrice}) for long swing trades.`] };
    }
    if (targetPrice && targetPrice <= entryPrice) {
      return { approved: false, rejections: [`Target price (₹${targetPrice}) must be strictly above entry price (₹${entryPrice}).`] };
    }

    // 2. Averaging down rule enforcement
    if (this.noAveragingDown) {
      const existingHolding = portfolioHoldings.find(h => h.trading_symbol?.toUpperCase() === symbol.toUpperCase());
      if (existingHolding) {
        const avgPrice = existingHolding.average_price ?? 0;
        if (entryPrice < avgPrice) {
          rejections.push(`Averaging Down Guard: Symbol ${symbol} is already held at avg price ₹${avgPrice}. Proposed entry ₹${entryPrice} violates the strict no-averaging-down rule.`);
        }
      }

      const activePos = existingPositions.find(p => p.symbol?.toUpperCase() === symbol.toUpperCase() && p.status === 'ACTIVE');
      if (activePos && entryPrice < activePos.entryPrice) {
        rejections.push(`Averaging Down Guard: Symbol ${symbol} already has an active trade at ₹${activePos.entryPrice}.`);
      }
    }

    // 3. Max simultaneous positions check
    const activeCount = existingPositions.filter(p => p.status === 'ACTIVE').length;
    if (activeCount >= this.maxPositions) {
      rejections.push(`Portfolio Position Limit: Active positions (${activeCount}) reached maximum threshold of ${this.maxPositions}.`);
    }

    // 4. Aggregate open risk ceiling check
    const currentOpenRiskInr = existingPositions
      .filter(p => p.status === 'ACTIVE')
      .reduce((sum, p) => sum + (p.plannedRiskInr ?? 0), 0);
    const maxAggregateRiskInr = equity * this.maxAggregateOpenRiskPct;

    // 5. Single trade risk budget (0.5% default)
    const riskBudgetInr = equity * this.maxRiskPerTradePct;
    if (currentOpenRiskInr + riskBudgetInr > maxAggregateRiskInr) {
      rejections.push(`Aggregate Risk Ceiling: Current open risk (₹${currentOpenRiskInr.toFixed(2)}) + planned risk (₹${riskBudgetInr.toFixed(2)}) exceeds maximum aggregate risk ceiling (₹${maxAggregateRiskInr.toFixed(2)} = ${(this.maxAggregateOpenRiskPct * 100).toFixed(1)}% of equity).`);
    }

    // 6. Reward-to-Risk verification
    const priceRiskPerShare = entryPrice - stopLoss;
    const priceRewardPerShare = targetPrice ? (targetPrice - entryPrice) : (priceRiskPerShare * 2.0);
    const rewardToRiskRatio = priceRewardPerShare / priceRiskPerShare;

    if (rewardToRiskRatio < this.minRewardToRisk - 0.005) {
      rejections.push(`Reward-to-Risk Failure: Calculated R:R is ${rewardToRiskRatio.toFixed(2)}x, which is below the minimum required ${this.minRewardToRisk}x threshold.`);
    }

    // 7. Capital Allocation per position ceiling (e.g. 20% max)
    const maxAllocationInr = equity * this.maxAllocationPct;

    // 8. Dynamic Quantity Sizing Formula:
    // floor(min(risk_budget / risk_per_share, available_allocation / entry_price))
    // Sizing accounts for estimated slippage and fees on risk per share
    const slippageBufferPerShare = entryPrice * (this.chargesCfg.estimated_slippage_pct ?? 0.001) * 2;
    const effectiveRiskPerShare = priceRiskPerShare + slippageBufferPerShare;

    const sharesByRisk = Math.floor(riskBudgetInr / effectiveRiskPerShare);
    const sharesByCapital = Math.floor(maxAllocationInr / entryPrice);
    let quantity = Math.max(0, Math.min(sharesByRisk, sharesByCapital));

    // Refine quantity downwards if fixed fees (DP charge, stamp duty, brokerage) cause total loss to exceed budget
    while (quantity > 0) {
      const costs = this.calculateRoundTripCharges(entryPrice, stopLoss, quantity);
      const totalPotentialLoss = (priceRiskPerShare * quantity) + costs.totalCharges;
      if (totalPotentialLoss <= riskBudgetInr * 1.05) {
        break;
      }
      quantity--;
    }

    if (quantity === 0) {
      rejections.push(`Quantity Sized to Zero: Risk per share (₹${effectiveRiskPerShare.toFixed(2)}) or capital limits result in 0 shares.`);
    }

    // 9. Post-sizing exact cost and risk validation
    const costs = this.calculateRoundTripCharges(entryPrice, stopLoss, quantity);
    const totalPotentialLossInr = (priceRiskPerShare * quantity) + costs.totalCharges;

    if (quantity > 0 && totalPotentialLossInr > riskBudgetInr * 1.05) { // Allow 5% tolerance for rounding
      rejections.push(`Loss Exceeds Budget: Total estimated loss (₹${totalPotentialLossInr.toFixed(2)} including ₹${costs.totalCharges} charges) exceeds risk budget (₹${riskBudgetInr.toFixed(2)}).`);
    }

    const tradeCapitalInr = entryPrice * quantity;
    const approved = rejections.length === 0 && quantity > 0;

    return {
      approved,
      symbol,
      entryPrice,
      stopLoss,
      targetPrice,
      quantity,
      tradeCapitalInr: Number(tradeCapitalInr.toFixed(2)),
      riskBudgetInr: Number(riskBudgetInr.toFixed(2)),
      plannedRiskInr: Number(totalPotentialLossInr.toFixed(2)),
      effectiveRiskPerShare: Number(effectiveRiskPerShare.toFixed(2)),
      rewardToRiskRatio: Number(rewardToRiskRatio.toFixed(2)),
      estimatedCostsAndSlippage: costs.totalCharges,
      costBreakdown: costs.breakdown,
      rejections,
      disclaimer: 'Never assume a stop-loss guarantees the exact exit price in fast-moving market gaps.'
    };
  }
}
