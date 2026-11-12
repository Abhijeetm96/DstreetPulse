import test from 'node:test';
import assert from 'node:assert/strict';
import {
  normalizeYahooSymbol,
  calculateRollingReturns,
  getStockReturnsAndRolling
} from '../src/returns_engine.js';

test('Returns Engine: normalizes NSE symbols correctly for Yahoo Finance feed', () => {
  assert.equal(normalizeYahooSymbol('RELIANCE'), 'RELIANCE.NS');
  assert.equal(normalizeYahooSymbol('M&M'), 'M%26M.NS');
  assert.equal(normalizeYahooSymbol('BAJAJ-AUTO'), 'BAJAJ-AUTO.NS');
  assert.equal(normalizeYahooSymbol('tatamotors'), 'TMPV.NS');
});

test('Returns Engine: calculates rolling returns and statistical metrics accurately', () => {
  // Construct a deterministic test price series of 30 bars
  const series = [];
  const base = 100;
  for (let i = 0; i < 30; i++) {
    series.push({
      date: `2026-10-${String(i + 1).padStart(2, '0')}`,
      close: base + i * 2 // linear increase: 100, 102, 104...
    });
  }

  const res5 = calculateRollingReturns(series, 5);
  assert.ok(res5, 'Rolling 5-day should exist');
  assert.equal(res5.windowDays, 5);
  assert.equal(res5.periodsEvaluated, 25);
  assert.equal(res5.winRate, 100); // all periods had price growth
  assert.ok(res5.avg > 0);
  assert.ok(res5.current > 0);
  assert.equal(res5.series.length, 25);
});

test('Returns Engine: generates complete point-in-time and rolling statistics structure', async () => {
  const result = await getStockReturnsAndRolling('RELIANCE');
  assert.equal(result.symbol, 'RELIANCE');
  assert.ok(result.latestClose > 0);
  assert.ok(result.pointInTime);
  assert.ok('1W' in result.pointInTime);
  assert.ok('2W' in result.pointInTime);
  assert.ok('1M' in result.pointInTime);
  assert.ok('3M' in result.pointInTime);
  assert.ok('6M' in result.pointInTime);
  assert.ok('1Y' in result.pointInTime);
  assert.ok('3Y' in result.pointInTime);
  assert.ok('5Y' in result.pointInTime);
  assert.ok('10Y' in result.pointInTime);
  assert.ok('20Y' in result.pointInTime);

  // Assert CAGR metrics exist for multi-year horizons
  assert.ok(result.cagr);
  assert.ok('5Y' in result.cagr);
  assert.ok('10Y' in result.cagr);
  assert.ok('20Y' in result.cagr);
  assert.ok(typeof result.cagr['5Y'] === 'number');

  // Assert timeframeSeries exists for dedicated full-size technical charts
  assert.ok(result.timeframeSeries);
  assert.ok('5Y' in result.timeframeSeries);
  assert.ok('10Y' in result.timeframeSeries);
  assert.ok('20Y' in result.timeframeSeries);
  assert.ok(result.timeframeSeries['5Y'].points.length > 0);
  assert.ok(result.timeframeSeries['5Y'].points.length <= 325);

  assert.ok(result.rolling);
  assert.ok('1W' in result.rolling);
  assert.ok('2W' in result.rolling);
  assert.ok('1M' in result.rolling);
  assert.ok('3M' in result.rolling);
  assert.ok('6M' in result.rolling);
  assert.ok('1Y' in result.rolling);

  const rolling1M = result.rolling['1M'];
  assert.ok(rolling1M.periodsEvaluated > 50);
  assert.ok(typeof rolling1M.current === 'number');
  assert.ok(typeof rolling1M.avg === 'number');
  assert.ok(typeof rolling1M.median === 'number');
  assert.ok(typeof rolling1M.min === 'number');
  assert.ok(typeof rolling1M.max === 'number');
  assert.ok(typeof rolling1M.winRate === 'number');
  assert.ok(typeof rolling1M.stdDev === 'number');
  assert.ok(Array.isArray(rolling1M.series));
});

