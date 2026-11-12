import { test, describe } from 'node:test';
import assert from 'node:assert/strict';
import { RiskManager } from '../src/risk_manager.js';

describe('RiskManager', () => {
  const rm = new RiskManager({
    risk: {
      max_planned_risk_per_trade_pct: 0.005, // 0.5%
      max_aggregate_open_risk_pct: 0.02,     // 2.0%
      max_simultaneous_positions: 5,
      max_capital_allocation_per_trade_pct: 0.20, // 20%
      min_reward_to_risk_ratio: 2.0,
      no_averaging_down: true,
      default_trading_equity: 100000.0 // ₹1 Lakh
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
  });

  test('calculates accurate round-trip statutory delivery charges and taxes', () => {
    // 10 shares of ₹1000 stock = ₹10,000 buy turnover, ₹11,000 sell turnover
    const charges = rm.calculateRoundTripCharges(1000, 1100, 10);
    assert.ok(charges.totalCharges > 0);
    assert.equal(charges.breakdown.stt, 10 + 11); // 0.1% of 10000 + 0.1% of 11000 = 21
    assert.equal(charges.breakdown.dpCharges, 15.93);
    assert.ok(charges.breakdown.brokerage <= 40); // 20 cap each side
  });

  test('sizes position strictly according to 0.5% risk budget', () => {
    // Equity: ₹1,00,000 -> 0.5% risk budget = ₹500
    // Entry: ₹100, StopLoss: ₹90 -> Risk per share ≈ ₹10
    // Quantity should be floor(500 / 10.2) ≈ 49 shares
    const res = rm.evaluateTradeSizing({
      symbol: 'TEST',
      entryPrice: 100,
      stopLoss: 90,
      targetPrice: 125, // R:R = 2.5x
      tradingEquity: 100000
    });

    assert.equal(res.approved, true);
    assert.ok(res.quantity > 0 && res.quantity <= 50);
    assert.ok(res.plannedRiskInr <= 500 * 1.05); // Within 5% tolerance of ₹500
  });

  test('rejects trade when R:R ratio is below 2.0x threshold', () => {
    const res = rm.evaluateTradeSizing({
      symbol: 'LOW_RR',
      entryPrice: 100,
      stopLoss: 95, // Risk = 5
      targetPrice: 105, // Reward = 5 -> R:R = 1.0x (< 2.0x)
      tradingEquity: 100000
    });

    assert.equal(res.approved, false);
    assert.ok(res.rejections.some(r => r.includes('Reward-to-Risk Failure')));
  });

  test('enforces strict prohibition of averaging down', () => {
    // User already holds 'IEX' at avg price ₹252.76
    const portfolioHoldings = [
      { trading_symbol: 'IEX', average_price: 252.76, quantity: 78 }
    ];

    const res = rm.evaluateTradeSizing({
      symbol: 'IEX',
      entryPrice: 150.0, // Lower price -> Averaging down!
      stopLoss: 140.0,
      targetPrice: 180.0,
      tradingEquity: 100000,
      portfolioHoldings
    });

    assert.equal(res.approved, false);
    assert.ok(res.rejections.some(r => r.includes('Averaging Down Guard')));
  });

  test('rejects trade when max 5 simultaneous positions are already active', () => {
    const activePositions = [
      { symbol: 'STK1', status: 'ACTIVE', plannedRiskInr: 300 },
      { symbol: 'STK2', status: 'ACTIVE', plannedRiskInr: 300 },
      { symbol: 'STK3', status: 'ACTIVE', plannedRiskInr: 300 },
      { symbol: 'STK4', status: 'ACTIVE', plannedRiskInr: 300 },
      { symbol: 'STK5', status: 'ACTIVE', plannedRiskInr: 300 }
    ];

    const res = rm.evaluateTradeSizing({
      symbol: 'STK6',
      entryPrice: 100,
      stopLoss: 90,
      targetPrice: 125,
      tradingEquity: 100000,
      existingPositions: activePositions
    });

    assert.equal(res.approved, false);
    assert.ok(res.rejections.some(r => r.includes('Portfolio Position Limit')));
  });

  test('rejects trade when aggregate open risk ceiling (2%) would be breached', () => {
    // Equity: ₹1,00,000 -> 2% aggregate ceiling = ₹2,000
    // Existing active risk: ₹1,800
    // New planned risk: ₹500 -> Total = ₹2,300 > ₹2,000!
    const activePositions = [
      { symbol: 'STK1', status: 'ACTIVE', plannedRiskInr: 900 },
      { symbol: 'STK2', status: 'ACTIVE', plannedRiskInr: 900 }
    ];

    const res = rm.evaluateTradeSizing({
      symbol: 'STK3',
      entryPrice: 100,
      stopLoss: 90,
      targetPrice: 125,
      tradingEquity: 100000,
      existingPositions: activePositions
    });

    assert.equal(res.approved, false);
    assert.ok(res.rejections.some(r => r.includes('Aggregate Risk Ceiling')));
  });
});

