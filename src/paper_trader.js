/**
 * Safety & Execution Engine (Paper Trading & Order Gatekeeper)
 * 
 * Enforces safety controls:
 * 1. Global Kill Switch: Disables any simulation or order routing instantly.
 * 2. Pre-Execution Quote Refresh: Re-verifies bid/ask and LTP before approval.
 * 3. Position & Account State Audit: Validates clear cash and duplicate order guard.
 * 4. Structured Order Ticket Generation for explicit operator confirmation.
 * 5. Complete Paper Trading lifecycle management with zero financial risk.
 */

import { RiskManager } from './risk_manager.js';
import { TradeJournal } from './journal.js';

export class PaperTrader {
  /**
   * @param {Object} config - System configuration
   * @param {TradeJournal} journal - Journal instance
   */
  constructor(config = {}, journal = null) {
    this.config = config;
    this.journal = journal ?? new TradeJournal();
    this.riskManager = new RiskManager(config);
    this.killSwitchActive = Boolean(config.system?.kill_switch_active);
    this.liveExecutionAllowed = Boolean(config.system?.live_execution_allowed);
  }

  /**
   * Activate global kill switch
   */
  triggerKillSwitch(reason = 'Operator Emergency Halt') {
    this.killSwitchActive = true;
    return {
      status: 'KILL_SWITCH_ENGAGED',
      message: `System execution immediately halted: ${reason}`,
      timestamp: new Date().toISOString()
    };
  }

  /**
   * Deactivate global kill switch
   */
  resetKillSwitch() {
    this.killSwitchActive = false;
    return {
      status: 'KILL_SWITCH_RESET',
      message: 'System execution restored to normal mode.',
      timestamp: new Date().toISOString()
    };
  }

  /**
   * Pre-trade audit and Order Ticket generation
   * 
   * @param {Object} params
   * @param {string} params.symbol
   * @param {number} params.proposedPrice
   * @param {number} params.stopLoss
   * @param {number} params.targetPrice
   * @param {Object} params.liveQuote - Refreshed quote from exchange feed
   * @param {Object} params.accountMargin - Fresh margin from account details
   * @param {Array<Object>} params.portfolioHoldings - Live holdings from portfolio
   * @returns {Object} Structured Order Ticket or Rejection Reason
   */
  prepareOrderTicket({
    symbol,
    proposedPrice,
    stopLoss,
    targetPrice,
    liveQuote,
    accountMargin,
    portfolioHoldings = []
  }) {
    // 1. Kill Switch Check
    if (this.killSwitchActive) {
      return {
        approved: false,
        status: 'HALTED_BY_KILL_SWITCH',
        error: 'Cannot prepare order ticket: Global Kill Switch is currently ENGAGED.'
      };
    }

    // 2. Refresh quote validation
    if (!liveQuote || !liveQuote.ltp) {
      return {
        approved: false,
        status: 'QUOTE_UNAVAILABLE',
        error: `Could not verify fresh market quote for ${symbol}. Order aborted.`
      };
    }

    const currentLtp = liveQuote.ltp;
    // Check for extreme slippage / gap between proposed price and current LTP
    const priceDriftPct = Math.abs((currentLtp - proposedPrice) / proposedPrice) * 100;
    if (priceDriftPct > 1.5) {
      return {
        approved: false,
        status: 'PRICE_DRIFT_EXCEEDED',
        error: `Price drifted by ${priceDriftPct.toFixed(2)}% (Proposed: ₹${proposedPrice}, Current LTP: ₹${currentLtp}). Please re-evaluate setup.`
      };
    }

    // 3. Margin & Account State Check
    const clearCash = accountMargin?.clear_cash ?? accountMargin?.equity_margin_details?.cnc_balance_available ?? 0;
    const existingActivePositions = this.journal.getActivePositions();

    // 4. Position Sizing & Risk Evaluation
    const sizing = this.riskManager.evaluateTradeSizing({
      symbol,
      entryPrice: currentLtp,
      stopLoss,
      targetPrice,
      tradingEquity: clearCash,
      existingPositions: existingActivePositions,
      portfolioHoldings
    });

    if (!sizing.approved) {
      return {
        approved: false,
        status: 'RISK_GATE_REJECTED',
        reasons: sizing.rejections,
        sizing
      };
    }

    // 5. Generate Immutable Order Ticket
    const costs = sizing.costBreakdown;
    const orderTicket = {
      approved: true,
      status: 'AWAITING_EXPLICIT_CONFIRMATION',
      mode: this.liveExecutionAllowed ? 'LIVE_DISPATCH_LOCKED' : 'PAPER_TRADING_SIMULATION',
      ticketId: `TKT-${symbol}-${Date.now()}`,
      orderSummary: {
        symbol,
        exchange: 'NSE',
        segment: 'CASH',
        product: 'CNC',
        side: 'BUY',
        orderType: 'LIMIT',
        limitPrice: currentLtp,
        quantity: sizing.quantity,
        tradeCapitalInr: sizing.tradeCapitalInr,
        stopLossPrice: stopLoss,
        targetPrice1: targetPrice,
        rewardToRiskRatio: sizing.rewardToRiskRatio,
        plannedRiskInr: sizing.plannedRiskInr,
        riskBudgetInr: sizing.riskBudgetInr,
        estimatedFeesAndTaxesInr: sizing.estimatedCostsAndSlippage,
        feeBreakdown: costs
      },
      preTradeChecks: {
        clearCashAvailable: clearCash,
        activePositionsCount: existingActivePositions.length,
        noAveragingDownPassed: true,
        driftCheckPassed: true,
        killSwitchDisabled: true
      },
      operatorPrompt: `To execute paper fill for ${sizing.quantity} shares of ${symbol} at limit ₹${currentLtp}, explicit approval is required.`
    };

    return orderTicket;
  }

  /**
   * Execute paper trade after explicit approval
   * @param {Object} orderTicket 
   * @returns {Object} Execution confirmation
   */
  executePaperTrade(orderTicket) {
    if (this.killSwitchActive) {
      throw new Error('Kill switch engaged! Execution aborted.');
    }
    if (!orderTicket || !orderTicket.approved) {
      throw new Error('Cannot execute unapproved or invalid order ticket.');
    }

    const { symbol, exchange, limitPrice, quantity, stopLossPrice, targetPrice1, plannedRiskInr, tradeCapitalInr, estimatedFeesAndTaxesInr } = orderTicket.orderSummary;

    // Record in journal
    const tradeId = this.journal.recordProposedTrade({
      symbol,
      exchange,
      setupType: 'Paper Swing Long',
      entryTrigger: 'Operator Approved Limit Fill',
      entryPrice: limitPrice,
      stopLoss: stopLossPrice,
      targetPrice: targetPrice1,
      quantity,
      plannedRiskInr,
      capitalInr: tradeCapitalInr,
      isPaper: true,
      notes: `Paper Trade Order Ticket: ${orderTicket.ticketId}`
    });

    this.journal.approveTrade(tradeId, 'Operator approved ticket via Paper Trader');
    this.journal.fillTrade(tradeId, limitPrice, quantity, new Date().toISOString(), estimatedFeesAndTaxesInr);

    return {
      status: 'FILLED_PAPER',
      tradeId,
      ticketId: orderTicket.ticketId,
      symbol,
      quantity,
      fillPrice: limitPrice,
      timestamp: new Date().toISOString()
    };
  }
}

