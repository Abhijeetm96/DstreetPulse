import { test, describe } from 'node:test';
import assert from 'node:assert/strict';
import { PaperTrader } from '../src/paper_trader.js';
import { TradeJournal } from '../src/journal.js';

describe('PaperTrader & Execution Safety Gate', () => {
  const config = {
    system: { kill_switch_active: false, live_execution_allowed: false },
    risk: {
      max_planned_risk_per_trade_pct: 0.005,
      max_aggregate_open_risk_pct: 0.02,
      max_simultaneous_positions: 5,
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

  test('prepares valid order ticket with complete risk disclosure and fee breakdown', () => {
    const journal = new TradeJournal(':memory:');
    const trader = new PaperTrader(config, journal);

    const ticket = trader.prepareOrderTicket({
      symbol: 'SBIN',
      proposedPrice: 800,
      stopLoss: 780,
      targetPrice: 850,
      liveQuote: { ltp: 800 },
      accountMargin: { clear_cash: 100000 },
      portfolioHoldings: []
    });

    assert.equal(ticket.approved, true);
    assert.equal(ticket.status, 'AWAITING_EXPLICIT_CONFIRMATION');
    assert.equal(ticket.orderSummary.symbol, 'SBIN');
    assert.ok(ticket.orderSummary.quantity > 0);
    assert.ok(ticket.orderSummary.plannedRiskInr <= 500 * 1.05);

    // Execute paper trade
    const execution = trader.executePaperTrade(ticket);
    assert.equal(execution.status, 'FILLED_PAPER');
    assert.equal(execution.symbol, 'SBIN');
    assert.equal(journal.getActivePositions().length, 1);
  });

  test('halts immediately when global kill switch is engaged', () => {
    const journal = new TradeJournal(':memory:');
    const trader = new PaperTrader(config, journal);

    trader.triggerKillSwitch('Operator triggered emergency halt');

    const ticket = trader.prepareOrderTicket({
      symbol: 'RELIANCE',
      proposedPrice: 1200,
      stopLoss: 1150,
      targetPrice: 1350,
      liveQuote: { ltp: 1200 },
      accountMargin: { clear_cash: 100000 }
    });

    assert.equal(ticket.approved, false);
    assert.equal(ticket.status, 'HALTED_BY_KILL_SWITCH');
  });

  test('rejects order ticket if live market price drifts excessively from proposal (>1.5%)', () => {
    const journal = new TradeJournal(':memory:');
    const trader = new PaperTrader(config, journal);

    const ticket = trader.prepareOrderTicket({
      symbol: 'TATASTEEL',
      proposedPrice: 150.0,
      stopLoss: 145.0,
      targetPrice: 165.0,
      liveQuote: { ltp: 155.0 }, // 3.3% drift!
      accountMargin: { clear_cash: 100000 }
    });

    assert.equal(ticket.approved, false);
    assert.equal(ticket.status, 'PRICE_DRIFT_EXCEEDED');
  });
});

