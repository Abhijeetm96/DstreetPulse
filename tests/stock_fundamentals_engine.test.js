import test from 'node:test';
import assert from 'node:assert/strict';
import {
  getStockFundamentalsAndFinancials,
  getComparativeAnalysis,
  COMPARISON_PRESETS
} from '../src/stock_fundamentals_engine.js';

test('Fundamentals Engine: returns complete technicals, fundamentals, and financials for any stock', () => {
  const tcs = getStockFundamentalsAndFinancials('TCS');
  assert.equal(tcs.symbol, 'TCS');
  assert.ok(tcs.technicals);
  assert.ok(tcs.technicals.ltp > 0);
  assert.ok(typeof tcs.technicals.rsi14 === 'number');
  assert.ok(tcs.technicals.ema20 > 0);
  assert.ok(tcs.technicals.dist52wHighPct >= 0);

  assert.ok(tcs.fundamentals);
  assert.ok(tcs.fundamentals.peRatio > 0);
  assert.ok(tcs.fundamentals.roePct > 0);
  assert.ok(typeof tcs.fundamentals.debtToEquity === 'number');
  assert.ok(tcs.fundamentals.promoterHoldingPct > 0);
  assert.ok(tcs.fundamentals.institutionalHoldingPct > 0);

  assert.ok(tcs.financials);
  assert.ok(tcs.financials.revenueTtmCr > 0);
  assert.ok(tcs.financials.patTtmCr > 0);
  assert.ok(tcs.financials.ebitdaMarginPct > 0);
  assert.ok(tcs.financials.epsTtm > 0);
});

test('Fundamentals Engine: generates realistic calibrated metrics for uncurated NIFTY 500 stocks', () => {
  const custom = getStockFundamentalsAndFinancials('ABCAPITAL');
  assert.equal(custom.symbol, 'ABCAPITAL');
  assert.ok(custom.fundamentals.peRatio > 0);
  assert.ok(custom.fundamentals.pbRatio > 0);
  assert.ok(custom.fundamentals.roePct > 0);
  assert.ok(custom.financials.revenueTtmCr > 0);
  assert.ok(custom.financials.patTtmCr > 0);
});

test('Comparative Analysis Engine: accurately aligns and rebases multi-stock returns on chart timeline', async () => {
  const res = await getComparativeAnalysis(['TCS', 'INFY']);
  assert.equal(res.stocksCount, 2);
  assert.equal(res.stocks[0].symbol, 'TCS');
  assert.equal(res.stocks[1].symbol, 'INFY');

  assert.ok(res.normalizedCurves);
  assert.ok('1Y' in res.normalizedCurves);
  assert.ok('5Y' in res.normalizedCurves);

  const curve1Y = res.normalizedCurves['1Y'];
  assert.ok(curve1Y.timeline.length > 50);

  // Assert baseline rebase at start of timeline is 0%
  const t0 = curve1Y.timeline[0];
  assert.equal(t0.TCS, 0);
  assert.equal(t0.INFY, 0);
  assert.ok(t0.TCS_price > 0);
  assert.ok(t0.INFY_price > 0);

  // Assert winner badges are computed
  assert.ok(res.winnerBadges);
  assert.ok(res.winnerBadges.lowestPe);
  assert.ok(res.winnerBadges.highestRoe);
  assert.ok(res.winnerBadges.lowestDebt);
});

test('Comparative Engine: offers essential preset peer baskets', () => {
  assert.ok(Array.isArray(COMPARISON_PRESETS));
  assert.ok(COMPARISON_PRESETS.length >= 5);
  const itPreset = COMPARISON_PRESETS.find(p => p.id === 'it-giants');
  assert.ok(itPreset);
  assert.ok(itPreset.symbols.includes('TCS'));
  assert.ok(itPreset.symbols.includes('INFY'));
});

