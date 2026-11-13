import test from 'node:test';
import assert from 'node:assert/strict';
import { runTimeMachineSimulation } from '../src/time_machine_engine.js';
import { planExit } from '../src/exit_planner.js';
import { executePreFlightRiskGate } from '../src/institutional_risk_gate.js';

test('Time Machine Simulation: executes 10,000 replays with consistent statistical outcomes', () => {
  const result = runTimeMachineSimulation({
    symbol: 'ATHERENERG',
    entry: 1650.00,
    stop: 1635.00,
    target: 1675.00,
    barsLeft: 60,
    replays: 10000,
    seed: 19
  });

  assert.equal(result.symbol, 'ATHERENERG');
  assert.equal(result.replays, 10000);
  assert.ok(result.odds.pTarget > 0.1 && result.odds.pTarget < 0.9);
  assert.ok(result.odds.pStop > 0.1 && result.odds.pStop < 0.9);
  assert.ok(result.odds.pTarget + result.odds.pStop + result.odds.pNeither >= 0.99);
  assert.ok(result.verdict.headline.length > 0);
  assert.ok(result.bands.length > 0);
  assert.ok(result.samplePaths.length > 0);
});

test('Exit Planner: computes bracket stops and targets with accurate statutory deductions', () => {
  const plan = planExit({
    symbol: 'RELIANCE',
    entry: 1220.00, // Breakout above 1215 OR high
    orHigh: 1215.00,
    orLow: 1185.00,
    stopRule: 'or-mid', // Midpoint is 1200
    targetMultiple: 2.0
  });

  assert.equal(plan.stop, 1200.00);
  assert.equal(plan.riskPerShare, 20.00);
  assert.equal(plan.target, 1260.00); // 1220 + 2 * 20
});

test('Exit Planner: rejects stop at or above entry', () => {
  assert.throws(() => {
    planExit({
      symbol: 'TCS',
      entry: 3800.00,
      orHigh: 3900.00,
      orLow: 3850.00,
      stopRule: 'or-mid' // midpoint is 3875 >= entry 3800
    });
  }, /cannot be at or above entry/);
});

test('Exit Planner: correctly computes 2R and 3R brackets and statutory friction', () => {
  const plan = planExit({
    symbol: 'TCS',
    entry: 3800.00,
    orHigh: 3790.00,
    orLow: 3710.00,
    stopRule: 'or-mid', // midpoint 3750, risk 50
    targetMultiple: 2.0
  });

  assert.equal(plan.stop, 3750.00);
  assert.equal(plan.riskPerShare, 50.00);
  assert.equal(plan.targets['2R'], 3900.00);
  assert.equal(plan.targets['3R'], 3950.00);
  assert.ok(plan.sampleSizing.shares > 0);
  assert.ok(plan.sampleSizing.netProfit > 1500); // Gross 2000 minus statutory taxes
  assert.ok(plan.sampleSizing.effectiveRR > 1.5);
});

test('Institutional Risk Gate: passes compliant trade', () => {
  const result = executePreFlightRiskGate({
    symbol: 'BEL',
    side: 'BUY',
    entryPrice: 284.50,
    stopLoss: 274.50, // 10 risk/share
    targetPrice: 304.50, // 20 reward/share (2.0 R:R)
    shares: 100, // 1,000 risk
    portfolioCash: 200000,
    activePositions: []
  });

  assert.equal(result.verdict, 'PASS');
  assert.equal(result.passed, true);
  assert.equal(result.failureReasons.length, 0);
});

test('Institutional Risk Gate: blocks order when risk exceeds ₹1,000 budget', () => {
  const result = executePreFlightRiskGate({
    symbol: 'BEL',
    side: 'BUY',
    entryPrice: 284.50,
    stopLoss: 264.50, // 20 risk/share
    targetPrice: 324.50,
    shares: 100, // 2,000 risk -> breaches limit
    portfolioCash: 200000,
    activePositions: []
  });

  assert.equal(result.verdict, 'BLOCK');
  assert.equal(result.passed, false);
  assert.ok(result.failureReasons.some(r => r.includes('Max Loss Per Trade Budget')));
});

test('Institutional Risk Gate: blocks averaging down on losing position', () => {
  const result = executePreFlightRiskGate({
    symbol: 'IEX',
    side: 'BUY',
    entryPrice: 102.00,
    stopLoss: 97.00,
    targetPrice: 114.00,
    shares: 100,
    portfolioCash: 200000,
    activePositions: [{ symbol: 'IEX', unrealizedPnl: -11700 }]
  });

  assert.equal(result.verdict, 'BLOCK');
  assert.ok(result.failureReasons.some(r => r.includes('Prohibition of Averaging Down')));
});
