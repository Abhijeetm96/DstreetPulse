/**
 * Institutional Pre-Flight Risk Gate
 * Adapted from day-trader-skill (Jakeschincariol/day-trader-skill) for Indian Equities
 * 
 * Intercepts every proposed trade and executes 8 rigorous non-negotiable checks
 * before an order can be staged or sent to execution.
 */

export function executePreFlightRiskGate({
  symbol,
  side = 'BUY',
  entryPrice,
  stopLoss,
  targetPrice,
  shares,
  portfolioCash = 200000,
  activePositions = [],
  stockTurnoverCr = 12.5,
  config = {}
}) {
  const limits = {
    budget: config.trading_capital || 200000,
    maxLossPerTrade: config.risk_budget_per_trade || 1000,
    maxPositionCap: config.max_single_position_allocation || 40000,
    minRewardRisk: config.min_reward_risk_ratio || 2.0,
    maxPositions: config.max_open_positions || 5,
    maxAggregateRisk: config.max_portfolio_open_risk || 4000, // 2% of capital
    minTurnoverCr: config.min_daily_turnover_cr || 5.0,
    requireStop: true
  };

  const checks = [];

  // 1. Format & Direction
  const isFormatValid = symbol && side === 'BUY' && entryPrice > 0 && Number.isInteger(shares) && shares > 0;
  checks.push({
    id: 'format',
    name: 'Order Format & Integrity',
    passed: !!isFormatValid,
    detail: isFormatValid ? `Valid CNC cash delivery buy order (${shares} shares)` : 'Malformed order ticket'
  });

  // 2. Stop-Loss Requirement
  const hasStop = typeof stopLoss === 'number' && stopLoss > 0 && stopLoss < entryPrice;
  checks.push({
    id: 'stop_rule',
    name: 'Mandatory Stop-Loss Placement',
    passed: hasStop,
    detail: hasStop ? `Stop set at ₹${stopLoss.toFixed(2)} (-${((entryPrice - stopLoss)/entryPrice*100).toFixed(2)}%)` : 'Missing or invalid stop price'
  });

  // 3. Max Loss per Trade Budget (₹1,000 / 0.5%)
  const tradeRisk = hasStop ? (entryPrice - stopLoss) * shares : 999999;
  const isLossWithinBudget = tradeRisk <= limits.maxLossPerTrade + 1.0; // ₹1 rounding tolerance
  checks.push({
    id: 'max_loss',
    name: 'Max Loss Per Trade Budget',
    passed: isLossWithinBudget,
    detail: `Risk ₹${tradeRisk.toFixed(2)} vs limit ₹${limits.maxLossPerTrade.toFixed(2)}`
  });

  // 4. Reward to Risk Threshold (≥ 2.0x)
  const tradeReward = targetPrice > entryPrice ? (targetPrice - entryPrice) * shares : 0;
  const rrRatio = tradeRisk > 0 ? tradeReward / tradeRisk : 0;
  const isRRValid = rrRatio >= limits.minRewardRisk - 0.05;
  checks.push({
    id: 'reward_risk',
    name: 'Reward-to-Risk Ratio (Min 2.0:1)',
    passed: isRRValid,
    detail: `Setup delivers ${rrRatio.toFixed(2)}:1 R:R (Target: ₹${targetPrice.toFixed(2)})`
  });

  // 5. Position Allocation Cap (Max ₹40,000 / 20%)
  const totalAllocation = entryPrice * shares;
  const isAllocationWithinLimit = totalAllocation <= limits.maxPositionCap;
  checks.push({
    id: 'position_cap',
    name: 'Position Allocation Ceiling (20%)',
    passed: isAllocationWithinLimit,
    detail: `Allocated ₹${totalAllocation.toFixed(2)} vs max ₹${limits.maxPositionCap.toFixed(2)}`
  });

  // 6. Prohibition of Averaging Down
  const existingPosition = activePositions.find(p => p.symbol === symbol);
  let isAveragingDown = false;
  if (existingPosition && existingPosition.unrealizedPnl < 0) {
    isAveragingDown = true;
  }
  checks.push({
    id: 'anti_averaging',
    name: 'Prohibition of Averaging Down',
    passed: !isAveragingDown,
    detail: isAveragingDown ? `LOCKED: Cannot add to losing position in ${symbol}` : 'No existing losing exposure'
  });

  // 7. Max Concurrent Active Positions (Max 5)
  const currentPositionCount = activePositions.length;
  const hasRoomForPosition = currentPositionCount < limits.maxPositions || !!existingPosition;
  checks.push({
    id: 'max_positions',
    name: 'Active Position Slots (Max 5)',
    passed: hasRoomForPosition,
    detail: `${currentPositionCount} of ${limits.maxPositions} concurrent slots used`
  });

  // 8. Liquidity & Spread Filter (Turnover ≥ ₹5 Cr)
  const isLiquid = (stockTurnoverCr || 10.0) >= limits.minTurnoverCr;
  checks.push({
    id: 'liquidity_filter',
    name: 'Liquidity & Turnover Gate',
    passed: isLiquid,
    detail: `Estimated turnover ₹${stockTurnoverCr || '10+'} Cr (Threshold: ≥ ₹5 Cr)`
  });

  const allPassed = checks.every(c => c.passed);
  const failureReasons = checks.filter(c => !c.passed).map(c => `${c.name}: ${c.detail}`);

  return {
    verdict: allPassed ? 'PASS' : 'BLOCK',
    passed: allPassed,
    score: `${checks.filter(c => c.passed).length}/${checks.length} Passed`,
    checks,
    failureReasons,
    metrics: {
      shares,
      entryPrice,
      stopLoss,
      targetPrice,
      tradeRisk: Number(tradeRisk.toFixed(2)),
      tradeReward: Number(tradeReward.toFixed(2)),
      rrRatio: Number(rrRatio.toFixed(2)),
      totalAllocation: Number(totalAllocation.toFixed(2))
    }
  };
}

