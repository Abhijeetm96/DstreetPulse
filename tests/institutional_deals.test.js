import { describe, it } from 'node:test';
import assert from 'node:assert';
import {
  BLOCK_DEALS_DATA,
  BULK_DEALS_DATA,
  INSIDER_PROMOTER_DATA,
  FII_DII_FLOW_DATA,
  getInstitutionalSummary
} from '../src/institutional_deals.js';

describe('Institutional Smart Money & Deals Module', () => {
  it('validates block deal transactions structure and thresholds', () => {
    assert.ok(BLOCK_DEALS_DATA.length >= 8, 'Should contain at least 8 verified block deals');
    for (const deal of BLOCK_DEALS_DATA) {
      assert.ok(deal.symbol, 'Deal must have a symbol');
      assert.ok(deal.dealValueCr >= 10, 'Block deal value should meet or exceed ₹10 Cr threshold');
      assert.ok(['BUY', 'SELL'].includes(deal.dealType), 'Deal type must be BUY or SELL');
      assert.ok(deal.quantity > 0, 'Quantity must be positive');
      assert.ok(deal.tradePrice > 0, 'Trade price must be positive');
      assert.ok(deal.clientName, 'Client name must be disclosed');
      assert.ok(deal.counterparty, 'Counterparty must be disclosed');
    }
  });

  it('validates bulk deal transactions (>0.5% equity stake)', () => {
    assert.ok(BULK_DEALS_DATA.length >= 6, 'Should contain at least 6 bulk deals');
    for (const deal of BULK_DEALS_DATA) {
      assert.ok(deal.symbol, 'Bulk deal must have a symbol');
      assert.ok(deal.stakePct >= 0.5, 'Bulk deal stake must meet or exceed 0.5% regulatory threshold');
      assert.ok(deal.dealValueCr > 0, 'Deal value must be positive');
      assert.ok(['BUY', 'SELL'].includes(deal.dealType), 'Deal type must be BUY or SELL');
    }
  });

  it('validates SEBI PIT & SAST promoter and insider trading disclosures', () => {
    assert.ok(INSIDER_PROMOTER_DATA.length >= 5, 'Should contain at least 5 insider filings');
    for (const filing of INSIDER_PROMOTER_DATA) {
      assert.ok(filing.symbol, 'Filing must have a symbol');
      assert.ok(filing.personName, 'Must disclose promoter or insider entity');
      assert.ok(filing.designation, 'Must disclose designation');
      assert.ok(filing.preStakePct !== undefined, 'Must disclose pre-transaction stake');
      assert.ok(filing.postStakePct !== undefined, 'Must disclose post-transaction stake');
      assert.ok(filing.signal, 'Must provide an institutional signal verdict');
      assert.ok(filing.regulation, 'Must cite relevant SEBI regulation');
    }
  });

  it('validates provisional FII and DII cash market flow structure', () => {
    assert.ok(FII_DII_FLOW_DATA.fii, 'Must contain FII flow data');
    assert.ok(FII_DII_FLOW_DATA.dii, 'Must contain DII flow data');
    assert.strictEqual(
      FII_DII_FLOW_DATA.netInstitutionalImpactCr,
      FII_DII_FLOW_DATA.fii.netValueCr + FII_DII_FLOW_DATA.dii.netValueCr,
      'Net institutional impact must equal FII net plus DII net'
    );
    assert.ok(FII_DII_FLOW_DATA.historicalTrend30d.length >= 5, 'Should have historical trend data');
  });

  it('computes accurate summary metrics across all institutional segments', () => {
    const summary = getInstitutionalSummary();
    assert.ok(summary.sessionDate, 'Must include session date');
    assert.ok(summary.totalBlockTurnoverCr > 0, 'Total block turnover must be positive');
    assert.strictEqual(summary.blockDealsCount, BLOCK_DEALS_DATA.length);
    assert.strictEqual(summary.bulkDealsCount, BULK_DEALS_DATA.length);
    assert.strictEqual(summary.insiderFilingsCount, INSIDER_PROMOTER_DATA.length);
    assert.strictEqual(summary.fiiNetFlowCr, FII_DII_FLOW_DATA.fii.netValueCr);
    assert.strictEqual(summary.diiNetFlowCr, FII_DII_FLOW_DATA.dii.netValueCr);
  });
});

