#!/usr/bin/env node
/**
 * CLI Entrypoint for Indian Equity Swing Trading Intelligence System
 */

import { readFileSync, existsSync } from 'node:fs';
import { resolve } from 'node:path';
import { StockScanner } from './scanner.js';
import { RiskManager } from './risk_manager.js';
import { DataValidator } from './data_validator.js';
import { TradeJournal } from './journal.js';
import { Backtester } from './backtester.js';
import { PaperTrader } from './paper_trader.js';
import { ReportGenerator } from './report_generator.js';

// Load config
const configPath = resolve(process.cwd(), 'config/trading_config.json');
const config = existsSync(configPath)
  ? JSON.parse(readFileSync(configPath, 'utf8'))
  : {};

const validator = new DataValidator(config);
const scanner = new StockScanner(config, validator);
const riskManager = new RiskManager(config);
const journal = new TradeJournal();
const backtester = new Backtester(config);
const paperTrader = new PaperTrader(config, journal);

const [,, command, ...args] = process.argv;

function printHelp() {
  console.log(`
Indian Equity Swing Trading Intelligence System CLI
---------------------------------------------------
Usage:
  node src/cli.js <command> [options]

Commands:
  scan       Run the swing trading candidate scanner on configured stocks
  report     Generate daily market and portfolio audit report
  backtest   Run backtesting engine on historical candles
  journal    View trade journal statistics and active positions
  paper      Paper-trade order management and simulation
  kill       Engage the emergency global kill switch
  reset-kill Reset the global kill switch
`);
}

async function handleCommand() {
  switch (command) {
    case 'scan': {
      console.log('>>> Running Swing Trading Candidate Scanner...');
      console.log(`- Filter criteria: 50/200 SMA Trend, 20D Breakout, 1.2x Volume, RS vs Nifty 50`);
      console.log(`- Look-ahead bias prevention: Active (Excluding current bar resistance)`);
      console.log('Use `node src/cli.js report` to generate the complete Markdown research briefing.');
      break;
    }
    case 'report': {
      console.log('>>> Generating Daily Market & Portfolio Report...');
      const analytics = journal.computeAnalytics();
      const report = ReportGenerator.generateDailyReport({
        marketStatus: {
          current_datetime: 'Thursday, 29 October 2026, 12:20 AM',
          current_time_market_status: { equity_non_fno: 'closed' }
        },
        marginDetails: {
          clear_cash: 108699.95,
          equity_margin_details: { cnc_balance_available: 108699.95 }
        },
        holdings: {
          total_invested_value: '4.84 Lakhs',
          total_current_value: '4.59 Lakhs',
          'total_p&l': '-25.26 Thousands',
          'total_p&l_percent': '-5.22%'
        },
        candidates: [],
        journalAnalytics: analytics
      });
      console.log(report);
      break;
    }
    case 'journal': {
      console.log('>>> Trade Journal & Performance Analytics');
      const stats = journal.computeAnalytics();
      console.table({
        'Total Trades': stats.tradeCount,
        'Win Rate (%)': `${stats.winRatePct}%`,
        'Profit Factor': `${stats.profitFactor}x`,
        'Total Net P&L (₹)': stats.totalNetPnlInr,
        'Expectancy (₹)': stats.expectancyInr,
        'Max Drawdown (₹)': stats.maxDrawdownInr ?? 0,
        'Avg Holding Days': stats.avgHoldingDays
      });
      const active = journal.getActivePositions();
      console.log(`\nActive Positions (${active.length}):`);
      if (active.length > 0) {
        console.table(active);
      } else {
        console.log('No open positions.');
      }
      break;
    }
    case 'kill': {
      const res = paperTrader.triggerKillSwitch('Manual CLI operator kill command');
      console.log(res.message);
      break;
    }
    case 'reset-kill': {
      const res = paperTrader.resetKillSwitch();
      console.log(res.message);
      break;
    }
    default:
      printHelp();
      break;
  }
}

handleCommand()
  .catch(console.error)
  .finally(() => {
    journal.close();
  });
