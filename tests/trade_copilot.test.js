import { test, describe } from 'node:test';
import assert from 'node:assert';
import { computeStockDiagnostics, calculateStatutoryCharges } from '../src/react/utils/tradeCopilot.js';

describe('Revolutionary Capabilities: Pre-Flight Trade Copilot & Radar Engine', () => {
  const mockSetup = {
    symbol: 'TRENT',
    name: 'Trent Ltd',
    sector: 'Retail',
    ltp: 7200.0,
    open: 7120.0,
    high: 7220.0,
    low: 7100.0,
    prev_close: 7080.0,
    avg_price: 7180.0, // VWAP
    volume: 1200000,
    turnover_lacs: 86400, // ₹864 Cr
    delivery_pct: 62.5,
    change_perc: 1.7,
    distToHighPct: 0.55,
    rsVsSector: 1.2,
    stopLoss: 7020.0,
    target1: 7560.0
  };

  test('Capability 1: Pre-Flight Trade Doctor diagnostic runs 6-point checklist accurately', () => {
    const diag = computeStockDiagnostics(mockSetup, 1000);
    assert.ok(diag.tradeDoctor, 'Trade doctor must be defined');
    assert.strictEqual(diag.tradeDoctor.score, 100, 'All 6 checklist criteria pass for ideal non-ASM setup');
    assert.strictEqual(diag.tradeDoctor.verdict, 'READY_TO_ENTER');
    assert.strictEqual(diag.tradeDoctor.extensionOk, true);
    assert.strictEqual(diag.tradeDoctor.deliveryOk, true);
    assert.strictEqual(diag.tradeDoctor.sectorOk, true);
    assert.strictEqual(diag.tradeDoctor.vwapOk, true);
    assert.strictEqual(diag.tradeDoctor.wickOk, true);
    assert.strictEqual(diag.tradeDoctor.asmOk, true);
    assert.strictEqual(diag.tradeDoctor.checks.length, 6);
  });

  test('Capability 1: Flags ASM (Additional Surveillance Measure) stocks with 100% margin warning', () => {
    const asmSetup = {
      ...mockSetup,
      symbol: 'SUZLON' // Known ST-ASM stock
    };
    const diag = computeStockDiagnostics(asmSetup, 1000);
    assert.strictEqual(diag.asm.isAsm, true, 'SUZLON must be identified as ASM');
    assert.strictEqual(diag.tradeDoctor.asmOk, false, 'ASM check must flag false');
    assert.ok(diag.tradeDoctor.score <= 85, 'ASM stock should have points deducted');
    assert.ok(diag.tradeDoctor.verdictLabel.includes('ASM'), 'Verdict label must mention ASM');
    assert.strictEqual(diag.asm.marginPct, 100);
  });

  test('Capability 1: Flags bull trap / high upper wick rejection and downgrades verdict', () => {
    const trapSetup = {
      ...mockSetup,
      high: 7500.0,
      ltp: 7200.0, // Long upper wick of 300 pts on 400 pt range (75% wick)
      low: 7100.0
    };
    const diag = computeStockDiagnostics(trapSetup, 1000);
    assert.strictEqual(diag.tradeDoctor.wickOk, false, 'Upper wick rejection should fail');
    assert.ok(diag.tradeDoctor.score < 100);
  });

  test('Capability 2: Monte Carlo Probabilistic Odds engine generates consistent replays', () => {
    const diag = computeStockDiagnostics(mockSetup, 1000);
    assert.ok(diag.monteCarlo, 'Monte Carlo odds object must be defined');
    assert.ok(diag.monteCarlo.targetOddsPct >= 50, 'Target odds should be favorable for high conviction');
    assert.ok(diag.monteCarlo.stopOddsPct > 0);
    assert.strictEqual(
      diag.monteCarlo.targetOddsPct + diag.monteCarlo.stopOddsPct + diag.monteCarlo.timeoutOddsPct,
      100,
      'Total odds must sum to 100%'
    );
    assert.ok(diag.monteCarlo.expectedValueR > 0, 'EV in R-multiples must be positive');
  });

  test('Capability 3: Institutional Footprint calculates VQR and detects liquidity sweep', () => {
    const sweepSetup = {
      ...mockSetup,
      low: 7000.0, // Below prev_close 7080 (sweeps retail stops)
      ltp: 7200.0, // Reclaims above VWAP 7180
      turnover_lacs: 25000 // ₹250 Cr turnover
    };
    const diag = computeStockDiagnostics(sweepSetup, 1000);
    assert.ok(diag.footprint, 'Footprint must be defined');
    assert.ok(diag.footprint.vqr > 1.0, 'VQR must be > 1.0 when delivery > 50%');
    assert.strictEqual(diag.footprint.liquiditySweep, true, 'Liquidity sweep reclaim must trigger');
    assert.strictEqual(diag.footprint.orderFlowMagnet, 'HIGH_INSTITUTIONAL');
  });

  test('Capability 4: Triple-Timeframe Confluence Matrix aligns Macro, Swing, and Intraday', () => {
    const diag = computeStockDiagnostics(mockSetup, 1000);
    assert.ok(diag.confluence, 'Confluence must be defined');
    assert.strictEqual(diag.confluence.weekly, 'BULLISH');
    assert.strictEqual(diag.confluence.daily, 'BULLISH');
    assert.strictEqual(diag.confluence.intraday, 'BULLISH');
    assert.strictEqual(diag.confluence.tripleAligned, true, 'Triple confluence must be true when all 3 align');
  });

  test('Capability 5: 1-Click Order Tickets generate Zerodha Basket, NSE Bracket, and Alpaca payloads', () => {
    const diag = computeStockDiagnostics(mockSetup, 1000);
    assert.ok(diag.orderTickets, 'Order tickets must be defined');

    // Zerodha Basket
    const zBasket = diag.orderTickets.zerodhaBasket;
    assert.ok(Array.isArray(zBasket));
    assert.strictEqual(zBasket[0].tradingsymbol, 'TRENT');
    assert.strictEqual(zBasket[0].transaction_type, 'BUY');
    assert.strictEqual(zBasket[0].order_type, 'LIMIT');
    assert.ok(zBasket[0].quantity >= 1);

    // NSE Bracket Payload
    const bracket = diag.orderTickets.bracketPayload || diag.orderTickets.nseBracketPayload;
    assert.strictEqual(bracket.symbol, 'TRENT');
    assert.strictEqual(bracket.orderType, 'BRACKET_2R');
    assert.strictEqual(bracket.entryPrice, 7200.0);
    assert.strictEqual(bracket.stopLossPrice, 7020.0);

    // Alpaca Payload
    const alpaca = diag.orderTickets.alpacaPayload;
    assert.strictEqual(alpaca.symbol, 'TRENT');
    assert.strictEqual(alpaca.order_class, 'bracket');
  });

  test('Capability 5: Computes exact statutory Indian market charges & net take-home profit', () => {
    const stat = calculateStatutoryCharges({
      entryPrice: 1000,
      stopLossPrice: 980,
      targetPrice: 1040,
      quantity: 50
    });

    assert.strictEqual(stat.buyTurnover, 50000);
    assert.strictEqual(stat.sellTurnoverTarget, 52000);
    assert.ok(stat.stt > 0, 'STT must be calculated');
    assert.ok(stat.stampDuty > 0, 'Stamp duty must be calculated');
    assert.ok(stat.gst > 0, 'GST must be calculated');
    assert.ok(stat.totalChargesAtTarget > 0);
    assert.strictEqual(stat.grossProfit, 2000);
    assert.ok(stat.netProfit < stat.grossProfit, 'Net profit must be less than gross profit after statutory deductions');
    assert.ok(stat.netRisk > stat.grossRisk, 'Net risk must exceed gross risk due to friction');
  });
});
