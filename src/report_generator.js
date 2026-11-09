/**
 * Trade Research & Daily Portfolio Report Generator
 * 
 * Generates formatted Markdown reports:
 * 1. Trade Research Report (Phase 3)
 * 2. Daily Market & Portfolio Audit Report (Phase 7 / Deliverable 7)
 */

export class ReportGenerator {
  /**
   * Format individual Trade Research Candidate Card
   * @param {Object} candidate - Output from StockScanner.evaluateCandidate
   * @param {Object} sizing - Output from RiskManager.evaluateTradeSizing
   * @returns {string} Markdown section
   */
  static formatCandidateReport(candidate, sizing = null) {
    const isCandidate = candidate.status === 'RESEARCH CANDIDATE';
    const statusBadge = isCandidate ? '🟢 RESEARCH CANDIDATE' : (candidate.status === 'WATCHLIST' ? '🟡 WATCHLIST' : '🔴 REJECT');

    let md = `### ${candidate.symbol} (${statusBadge})\n\n`;
    md += `* **Exchange:** NSE | **Segment:** Cash Equity (CNC Delivery)\n`;
    md += `* **Data Timestamp:** \`${candidate.timestamp}\` | **Interval:** ${candidate.dataInterval}\n`;
    md += `* **Setup Type:** ${candidate.setupType}\n`;
    md += `* **Entry Trigger:** Close above resistance (₹${candidate.metrics?.resistance20 ?? 'N/A'})\n\n`;

    md += `#### Setup Evidence & Indicators\n`;
    for (const item of candidate.evidence) {
      md += `- ${item}\n`;
    }
    if (candidate.warnings && candidate.warnings.length > 0) {
      md += `\n> [!WARNING] **Data Quality & Risk Warnings**\n`;
      for (const w of candidate.warnings) {
        md += `> - ${w}\n`;
      }
    }

    md += `\n#### Proposed Structure & Scenarios\n`;
    md += `| Parameter | Proposed Value | Notes & Rationale |\n`;
    md += `| :--- | :--- | :--- |\n`;
    md += `| **Entry Reference** | ₹${candidate.entryPrice} | Confirmed Bar Close |\n`;
    md += `| **Stop-Loss** | ₹${candidate.stopLoss ?? 'N/A'} | ${candidate.stopLossRationale} |\n`;
    md += `| **Target 1 (2R)** | ₹${candidate.target1 ?? 'N/A'} | Scenario 1: Initial Take-Profit Zone |\n`;
    md += `| **Target 2 (3R)** | ₹${candidate.target2 ?? 'N/A'} | Scenario 2: Extended Momentum Extension |\n`;
    md += `| **Planned R:R** | ${candidate.rewardToRisk ? `${candidate.rewardToRisk}x` : 'N/A'} | Required Min: 2.0x |\n`;

    if (sizing && sizing.approved) {
      md += `\n#### Capital Allocation & Planned Risk (0.5% Rule)\n`;
      md += `- **Calculated Quantity:** \`${sizing.quantity}\` shares\n`;
      md += `- **Capital Required:** ₹${sizing.tradeCapitalInr?.toLocaleString('en-IN')}\n`;
      md += `- **Planned Worst-Case Rupee Risk:** ₹${sizing.plannedRiskInr?.toLocaleString('en-IN')} (Risk Budget: ₹${sizing.riskBudgetInr?.toLocaleString('en-IN')})\n`;
      md += `- **Estimated Round-Trip Charges & Taxes:** ₹${sizing.estimatedCostsAndSlippage} (STT: ₹${sizing.costBreakdown?.stt}, Brokerage: ₹${sizing.costBreakdown?.brokerage}, Stamp Duty: ₹${sizing.costBreakdown?.stampDuty}, GST: ₹${sizing.costBreakdown?.gst}, Slippage: ₹${sizing.costBreakdown?.slippage})\n`;
    } else if (sizing && !sizing.approved) {
      md += `\n> [!CAUTION] **Risk Manager Gate Rejection**\n`;
      for (const r of sizing.rejections) {
        md += `> - ${r}\n`;
      }
    }

    md += `\n#### Trade Thesis\n`;
    md += `- **Bullish Case:** Stock is in an established upward trend above both 50 and 200 SMA, demonstrating volume accumulation on the breakout with positive alpha vs NIFTY 50.\n`;
    md += `- **Bearish Case:** Resistance rejection or broader market pullback breaching the invalidation level at ₹${candidate.stopLoss}.\n`;
    md += `- **Invalidation Condition:** A daily close below ₹${candidate.stopLoss} immediately invalidates the trade setup.\n\n`;
    md += `> [!IMPORTANT]\n`;
    md += `> **Disclaimer:** This analysis is an algorithmic research evaluation and is **NOT an instruction or solicitation to buy or sell securities**. All swing trading carries risk of financial loss.\n\n`;
    md += `---\n`;

    return md;
  }

  /**
   * Generate Full Daily Market & Portfolio Report
   */
  static generateDailyReport({
    marketStatus,
    marginDetails,
    holdings,
    candidates = [],
    journalAnalytics = null
  }) {
    const istTime = marketStatus?.current_datetime ?? new Date().toLocaleString('en-IN', { timeZone: 'Asia/Kolkata' });
    const marketState = marketStatus?.current_time_market_status?.equity_non_fno ?? 'closed';

    let md = `# Indian Equity Swing Trading Intelligence System\n`;
    md += `### Daily Market & Portfolio Report\n\n`;
    md += `> **Report Generated (IST):** \`${istTime}\`  \n`;
    md += `> **Equity Cash Market Status:** **${marketState.toUpperCase()}**  \n`;
    md += `> **Execution Mode:** Paper Trading & Research Only (Live Live Orders Prohibited)\n\n`;

    md += `## 1. Capital Preservation & Account Status\n\n`;
    const clearCash = marginDetails?.clear_cash ?? 0;
    const cncMargin = marginDetails?.equity_margin_details?.cnc_balance_available ?? clearCash;
    const totalInvested = holdings?.total_invested_value ?? 'N/A';
    const totalCurrent = holdings?.total_current_value ?? 'N/A';
    const totalPnl = holdings?.total_p&l ?? 'N/A';
    const totalPnlPct = holdings?.total_p&l_percent ?? 'N/A';

    md += `| Account Metric | Live Account Value | Risk Policy Constraint |\n`;
    md += `| :--- | :--- | :--- |\n`;
    md += `| **Clear Cash Balance** | ₹${Number(clearCash).toLocaleString('en-IN')} | Real-time liquid capital |\n`;
    md += `| **Available CNC Margin** | ₹${Number(cncMargin).toLocaleString('en-IN')} | Delivery trading pool |\n`;
    md += `| **Single Trade Risk Budget (0.5%)** | ₹${(clearCash * 0.005).toFixed(2)} | Hard max risk per trade |\n`;
    md += `| **Max Aggregate Open Risk (2.0%)** | ₹${(clearCash * 0.02).toFixed(2)} | Max portfolio open risk |\n`;
    md += `| **Portfolio Invested Value** | ${totalInvested} | Existing long holdings |\n`;
    md += `| **Portfolio Current Value** | ${totalCurrent} | Current marked-to-market |\n`;
    md += `| **Portfolio Total P&L** | ${totalPnl} (${totalPnlPct}) | Evaluated for averaging-down guard |\n\n`;

    md += `## 2. Research Scanner Findings\n\n`;
    const researchCandidates = candidates.filter(c => c.status === 'RESEARCH CANDIDATE');
    const watchlistCandidates = candidates.filter(c => c.status === 'WATCHLIST');
    const rejectedCandidates = candidates.filter(c => c.status === 'REJECT');

    md += `- **Evaluated Instruments:** ${candidates.length}\n`;
    md += `- **Research Candidates (Passed All Filters):** ${researchCandidates.length}\n`;
    md += `- **Watchlist Setups (Near Breakout / High Momentum):** ${watchlistCandidates.length}\n`;
    md += `- **Rejected (Failed Trend / Volume / Liquidity / R:R):** ${rejectedCandidates.length}\n\n`;

    if (researchCandidates.length > 0) {
      md += `### Top Research Candidates\n\n`;
      for (const c of researchCandidates) {
        md += ReportGenerator.formatCandidateReport(c.candidate, c.sizing);
      }
    } else {
      md += `> [!NOTE]\n`;
      md += `> No stocks satisfied all strict simultaneous criteria today (Trend + Resistance Breakout + Volume Surge + Alpha vs Nifty 50 + Liquidity). Capital preservation prioritises patience.\n\n`;
    }

    if (journalAnalytics) {
      md += `## 3. Trade Journal & System Performance\n\n`;
      md += `| Metric | Value | Target Benchmark |\n`;
      md += `| :--- | :--- | :--- |\n`;
      md += `| **Total Closed Trades** | ${journalAnalytics.tradeCount} | > 30 for statistical significance |\n`;
      md += `| **Win Rate** | ${journalAnalytics.winRatePct}% | Expected 40% - 55% for swing breakouts |\n`;
      md += `| **Profit Factor** | ${journalAnalytics.profitFactor}x | > 1.5x |\n`;
      md += `| **Expectancy Per Trade** | ₹${journalAnalytics.expectancyInr} | Positive after all fees & slippage |\n`;
      md += `| **Max Recorded Drawdown** | ₹${journalAnalytics.maxDrawdownInr} | < 5% of trading equity |\n`;
      md += `| **Average Holding Period** | ${journalAnalytics.avgHoldingDays} days | Swing horizon (3 to 20 days) |\n\n`;
    }

    return md;
  }
}

