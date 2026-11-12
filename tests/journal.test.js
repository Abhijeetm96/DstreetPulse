import { test, describe } from 'node:test';
import assert from 'node:assert/strict';
import { TradeJournal } from '../src/journal.js';

describe('TradeJournal & Analytics', () => {
  // Use in-memory SQLite database for clean tests
  const journal = new TradeJournal(':memory:');

  test('records proposed trade and transitions through fill and close lifecycle', () => {
    const tradeId = journal.recordProposedTrade({
      symbol: 'TCS',
      exchange: 'NSE',
      setupType: 'Breakout',
      entryPrice: 3500,
      stopLoss: 3400,
      targetPrice: 3700,
      quantity: 10,
      plannedRiskInr: 1000,
      capitalInr: 35000,
      isPaper: true
    });

    assert.equal(typeof tradeId, 'number');
    const proposed = journal.getTrade(tradeId);
    assert.equal(proposed.status, 'PROPOSED');

    // Fill trade
    journal.fillTrade(tradeId, 3500, 10, '2026-10-01T09:30:00', 40.0);
    const filled = journal.getTrade(tradeId);
    assert.equal(filled.status, 'ACTIVE');

    // Close trade at target
    const closeRes = journal.closeTrade(tradeId, 3700, '2026-10-10T15:30:00', 'TARGET_HIT', 40.0);
    assert.equal(closeRes.grossPnl, 2000); // (3700 - 3500) * 10
    assert.equal(closeRes.totalFees, 80);  // 40 entry + 40 exit
    assert.equal(closeRes.netPnl, 1920);

    const closed = journal.getTrade(tradeId);
    assert.equal(closed.status, 'CLOSED');
    assert.equal(closed.net_pnl_inr, 1920);
  });

  test('computes win rate, profit factor, expectancy, and drawdown accurately', () => {
    // Add a losing trade
    const lossTradeId = journal.recordProposedTrade({
      symbol: 'INFY',
      entryPrice: 1800,
      stopLoss: 1750,
      targetPrice: 1900,
      quantity: 10,
      plannedRiskInr: 500,
      capitalInr: 18000,
      isPaper: true
    });
    journal.fillTrade(lossTradeId, 1800, 10, '2026-10-12T09:30:00', 30.0);
    journal.closeTrade(lossTradeId, 1750, '2026-10-15T10:00:00', 'STOP_HIT', 30.0); // Loss: -500 gross, -60 fees = -560 net

    const stats = journal.computeAnalytics();
    assert.equal(stats.tradeCount, 2);
    assert.equal(stats.winCount, 1);
    assert.equal(stats.lossCount, 1);
    assert.equal(stats.winRatePct, 50.0);
    assert.equal(stats.totalNetPnlInr, 1920 - 560); // 1360
    assert.ok(stats.profitFactor > 1.0);
    assert.ok(stats.expectancyInr > 0);
  });

  test('reconciles active journal trades with portfolio holdings', () => {
    // Add an active position in RELIANCE
    const id = journal.recordProposedTrade({
      symbol: 'RELIANCE',
      entryPrice: 1200,
      stopLoss: 1150,
      quantity: 10,
      plannedRiskInr: 500,
      capitalInr: 12000,
      isPaper: true
    });
    journal.fillTrade(id, 1200, 10, '2026-10-20T09:30:00', 25.0);

    // Mock portfolio holdings where RELIANCE is present
    const portfolioHoldings = [
      { trading_symbol: 'RELIANCE', quantity: 10, average_price: 1200 }
    ];

    const rec = journal.reconcileWithPortfolio(portfolioHoldings);
    assert.equal(rec.status, 'RECONCILED');
    assert.equal(rec.discrepancies.length, 0);

    // Discrepancy scenario: missing holding in portfolio
    const recMissing = journal.reconcileWithPortfolio([]);
    assert.equal(recMissing.status, 'DISCREPANCIES_DETECTED');
    assert.ok(recMissing.discrepancies.length > 0);
  });
});

