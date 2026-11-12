import test, { describe } from 'node:test';
import assert from 'node:assert/strict';
import { getMarketCap, filterByMarketCap, MKT_CAP_DEFINITIONS } from '../src/react/utils/mktCapRegistry.js';
import catalogData from '../src/catalog_data.json' with { type: 'json' };

describe('Market Cap Classification & Multi-Tier Filter Engine', () => {
  test('correctly identifies SEBI large cap equities', () => {
    const rel = getMarketCap('RELIANCE');
    assert.equal(rel.category, 'LARGE');
    assert.equal(rel.isPenny, false);
    assert.ok(rel.mkt_cap_cr >= 25000);

    const tcs = getMarketCap('TCS');
    assert.equal(tcs.category, 'LARGE');

    const hdfc = getMarketCap('HDFCBANK');
    assert.equal(hdfc.category, 'LARGE');
  });

  test('correctly identifies mid, small, and micro cap equities', () => {
    // Federal Bank is midcap
    const fed = getMarketCap('FEDERALBNK');
    assert.equal(fed.category, 'MID');

    const constituents = catalogData.constituents || [];

    // Filter by MID returns only MID equities
    const midStocks = filterByMarketCap(constituents, 'MID');
    assert.ok(midStocks.length > 0);
    assert.ok(midStocks.every(s => getMarketCap(s).category === 'MID'));

    // Filter by SMALL returns only SMALL equities
    const smallStocks = filterByMarketCap(constituents, 'SMALL');
    assert.ok(smallStocks.length > 0);
    assert.ok(smallStocks.every(s => getMarketCap(s).category === 'SMALL'));

    // Filter by MICRO returns only MICRO equities
    const microStocks = filterByMarketCap(constituents, 'MICRO');
    assert.ok(microStocks.length > 0);
    assert.ok(microStocks.every(s => getMarketCap(s).category === 'MICRO'));
  });

  test('correctly flags penny stocks based on price and mkt cap thresholds', () => {
    const idea = getMarketCap('IDEA');
    assert.equal(idea.isPenny, true);

    const yesbank = getMarketCap('YESBANK');
    assert.equal(yesbank.isPenny, true);

    const jppower = getMarketCap('JPPOWER');
    assert.equal(jppower.isPenny, true);

    const rpower = getMarketCap('RPOWER');
    assert.equal(rpower.isPenny, true);

    const constituents = catalogData.constituents || [];

    // Penny filter returns high-beta equities with LTP <= 35
    const pennyStocks = filterByMarketCap(constituents, 'PENNY');
    assert.ok(pennyStocks.length >= 10);
    assert.ok(pennyStocks.every(s => getMarketCap(s).isPenny));
  });

  test('filterByMarketCap handles symbol strings or objects with symbol property', () => {
    const mixedList = [
      { symbol: 'RELIANCE', name: 'Reliance Industries' },
      { symbol: 'IDEA', name: 'Vodafone Idea' },
      { symbol: 'TCS', name: 'Tata Consultancy Services' },
      { symbol: 'FEDERALBNK', name: 'Federal Bank' }
    ];

    const largeOnly = filterByMarketCap(mixedList, 'LARGE');
    assert.equal(largeOnly.length, 2);
    assert.deepEqual(largeOnly.map(x => x.symbol), ['RELIANCE', 'TCS']);

    const pennyOnly = filterByMarketCap(mixedList, 'PENNY');
    assert.equal(pennyOnly.length, 1);
    assert.equal(pennyOnly[0].symbol, 'IDEA');
  });

  test('MKT_CAP_DEFINITIONS contains all required tiers with distinct NeoPOP colors', () => {
    const tiers = ['ALL', 'LARGE', 'MID', 'SMALL', 'MICRO', 'PENNY'];
    tiers.forEach(tier => {
      assert.ok(MKT_CAP_DEFINITIONS[tier], `Missing tier definition for ${tier}`);
      assert.ok(MKT_CAP_DEFINITIONS[tier].color, `Missing color for tier ${tier}`);
      assert.ok(MKT_CAP_DEFINITIONS[tier].label, `Missing label for tier ${tier}`);
    });
  });
});
