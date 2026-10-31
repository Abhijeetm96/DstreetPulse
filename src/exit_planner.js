/**
 * Exit Planner & Bracket Order Strategy Module
 * Adapted from day-trader-skill (Jakeschincariol/day-trader-skill) for Indian Cash Equities
 * 
 * Generates mathematically sound stops and multi-R profit targets before entry.
 */

import { RiskManager } from './risk_manager.js';

const riskManager = new RiskManager();

export function planExit({
  symbol = 'STOCK',
  entry = 1000,
  orHigh = null,
  orLow = null,
  atr = null,
  stopRule = 'or-mid', // 'or-mid', 'or-low', 'atr:1.5', 'pct:2', 'custom'
  customStop = null,
  targetMultiple = 2.0 // 1.0, 1.5, 2.0, 3.0
}) {
  const entryPrice = Number(entry);
  if (entryPrice <= 0) throw new Error('Entry price must be positive');

  let stopPrice = null;
  let ruleDesc = '';

  if (customStop != null && Number(customStop) > 0) {
    stopPrice = Number(Number(customStop).toFixed(2));
    ruleDesc = 'Custom Operator Stop';
  } else if (stopRule === 'or-mid' && orHigh && orLow) {
    stopPrice = Number(((orHigh + orLow) / 2).toFixed(2));
    ruleDesc = 'Opening Range Midpoint';
  } else if (stopRule === 'or-low' && orLow) {
    stopPrice = Number((orLow * 0.998).toFixed(2)); // Just below OR low
    ruleDesc = 'Opening Range Low Buffer';
  } else if (stopRule.startsWith('atr') && atr) {
    const mult = parseFloat(stopRule.split(':')[1]) || 1.5;
    stopPrice = Number((entryPrice - (atr * mult)).toFixed(2));
    ruleDesc = `${mult}x 14-Bar ATR Trailing`;
  } else if (stopRule.startsWith('pct')) {
    const pctVal = parseFloat(stopRule.split(':')[1]) || 2.0;
    stopPrice = Number((entryPrice * (1.0 - (pctVal / 100.0))).toFixed(2));
    ruleDesc = `${pctVal}% Structural Invalidation`;
  } else {
    // Default fallback: 2.0% swing stop
    stopPrice = Number((entryPrice * 0.98).toFixed(2));
    ruleDesc = '2.0% Structural Swing Stop';
  }

  // Mandatory boundary checks from day-trader-skill
  if (stopPrice >= entryPrice) {
    throw new Error(`Stop price (₹${stopPrice}) cannot be at or above entry (₹${entryPrice})`);
  }

  // Mandatory boundary checks from day-trader-skill
  if (stopPrice >= entryPrice) {
    throw new Error(`Stop price (₹${stopPrice}) cannot be at or above entry (₹${entryPrice})`);
  }

  const rawRisk = entryPrice - stopPrice;
  if (rawRisk < entryPrice * 0.0005) {
    throw new Error('Stop is too tight (< 0.05%): cannot survive market bid-ask spread');
  }

  // Calculate bracket targets
  const target1R = Number((entryPrice + rawRisk * 1.0).toFixed(2));
  const target15R = Number((entryPrice + rawRisk * 1.5).toFixed(2));
  const target2R = Number((entryPrice + rawRisk * 2.0).toFixed(2));
  const target3R = Number((entryPrice + rawRisk * 3.0).toFixed(2));

  const chosenTarget = Number((entryPrice + rawRisk * targetMultiple).toFixed(2));

  // Statutory charges at Target vs Stop for sample budget (₹1,000 risk cap)
  const sampleQty = Math.max(1, Math.floor(1000 / rawRisk));
  const costs = riskManager.calculateRoundTripCharges(entryPrice, chosenTarget, sampleQty);
  const totalStatutoryCost = Number((costs.totalCharges || 0).toFixed(2));

  const grossProfit = Number(((chosenTarget - entryPrice) * sampleQty).toFixed(2));
  const netProfit = Number((grossProfit - totalStatutoryCost).toFixed(2));
  const grossLoss = Number(((entryPrice - stopPrice) * sampleQty).toFixed(2));

  return {
    symbol,
    entry: entryPrice,
    stop: stopPrice,
    stopRule,
    ruleDescription: ruleDesc,
    riskPerShare: Number(rawRisk.toFixed(2)),
    riskPct: Number(((rawRisk / entryPrice) * 100).toFixed(2)),
    target: chosenTarget,
    targetMultiple,
    targets: {
      '1R': target1R,
      '1.5R': target15R,
      '2R': target2R,
      '3R': target3R
    },
    sampleSizing: {
      budgetRisk: 1000,
      shares: sampleQty,
      capitalInvested: Number((sampleQty * entryPrice).toFixed(2)),
      grossProfit,
      netProfit,
      statutoryFrictionPct: grossProfit > 0 ? Number(((totalStatutoryCost / grossProfit) * 100).toFixed(2)) : 0,
      effectiveRR: grossLoss > 0 ? Number((netProfit / grossLoss).toFixed(2)) : 0
    }
  };
}
