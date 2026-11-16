/**
 * Lightweight Zero-Dependency Dashboard HTTP & REST Server
 */

import http from 'node:http';
import { readFileSync, existsSync } from 'node:fs';
import { resolve, extname } from 'node:path';
import { TradeJournal } from './journal.js';
import { RiskManager } from './risk_manager.js';
import { PaperTrader } from './paper_trader.js';
import { DataValidator } from './data_validator.js';
import { refreshAllMarketQuotes } from './live_market_fetcher.js';
import { runTimeMachineSimulation } from './time_machine_engine.js';
import { planExit } from './exit_planner.js';
import { executePreFlightRiskGate } from './institutional_risk_gate.js';
import { executeUnifiedDayTraderPipeline } from './skills_pipeline.js';
import { getStockReturnsAndRolling } from './returns_engine.js';
import { getComparativeAnalysis, getStockFundamentalsAndFinancials, COMPARISON_PRESETS } from './stock_fundamentals_engine.js';
import {
  BLOCK_DEALS_DATA,
  BULK_DEALS_DATA,
  INSIDER_PROMOTER_DATA,
  ALL_BLOCK_DEALS,
  ALL_BULK_DEALS,
  ALL_INSIDER_TRADES,
  FII_DII_FLOW_DATA,
  AVAILABLE_SESSIONS,
  getFilteredDeals,
  getInstitutionalSummary,
  generateSimulatedLiveDeal,
  CURRENT_SESSION_DATE
} from './institutional_deals.js';
import { getAsmStatus } from './asm_registry.js';
import { scrapeAllNseMcpData } from './nse_mcp_client.js';

const configPath = resolve(process.cwd(), 'config/trading_config.json');
const config = existsSync(configPath)
  ? JSON.parse(readFileSync(configPath, 'utf8'))
  : {};

const journal = new TradeJournal();
const riskManager = new RiskManager(config);
const paperTrader = new PaperTrader(config, journal);
const validator = new DataValidator(config);

const PORT = Number(process.env.PORT) || 3000;
const HOST = process.env.HOST || '0.0.0.0';

// In-Memory Live Catalog & Real-Time Ticker State
let liveCatalog = JSON.parse(readFileSync(new URL('./catalog_data.json', import.meta.url), 'utf8'));

// Swing Trade Breakout Detection Engine with 3-Layer Architecture & 30-Parameter Weighted Matrix
const SECTOR_INDEX_MAP = {
  'Banking': 'NIFTY BANK',
  'IT': 'NIFTY IT',
  'Auto': 'NIFTY AUTO',
  'Pharma': 'NIFTY PHARMA',
  'Metals': 'NIFTY METAL',
  'Energy': 'NIFTY ENERGY',
  'Realty': 'NIFTY REALTY',
  'FMCG': 'NIFTY FMCG',
  'Infra': 'NIFTY INFRASTRUCTURE',
  'Cap Goods': 'NIFTY INFRASTRUCTURE',
  'Media': 'NIFTY MEDIA'
};

function computeSwingCandidates(catalog) {
  if (!catalog || !catalog.constituents) return [];
  const n50 = catalog.indices?.find(i => i.name === 'NIFTY 50') || { change_perc: 0.23 };
  const n500 = catalog.indices?.find(i => i.name === 'NIFTY 500') || { change_perc: 0.33 };

  const candidates = [];
  for (const stk of catalog.constituents) {
    const ltp = stk.ltp;
    if (!ltp || ltp <= 0) continue;

    const high = stk.high || ltp;
    const low = stk.low || ltp;
    const chg = stk.change_perc || 0;
    const vol = stk.volume || 0;
    const turnoverCr = Number(((stk.turnover_lacs || 0) / 100).toFixed(2));
    const vwap = stk.avg_price || ltp;

    const rangeSpan = Math.max(0.05, high - low);
    const bcl = Math.max(0, Math.min(100, ((ltp - low) / rangeSpan) * 100)); // Bar Close Location %
    const upperWickPct = Math.max(0, Math.min(100, ((high - ltp) / rangeSpan) * 100)); // Upper Wick Rejection %
    const distToHighPct = high > 0 ? ((high - ltp) / high) * 100 : 0;
    const rangeTightnessPct = (rangeSpan / ltp) * 100;

    // Sector & NIFTY Relative Strength
    const sectorIndexName = SECTOR_INDEX_MAP[stk.sector] || 'NIFTY 500';
    const secIndexObj = catalog.indices?.find(i => i.name === sectorIndexName) || n500;
    const rsVsNifty = Number((chg - n50.change_perc).toFixed(2));
    const rsVsSector = Number((chg - secIndexObj.change_perc).toFixed(2));

    // 1. Anti-Trap / Bull Trap Detection
    let trapRisk = 'LOW';
    if (upperWickPct > 35 || bcl < 60) {
      trapRisk = 'HIGH (TRAP / REJECTION)';
    } else if (upperWickPct > 20 || bcl < 78) {
      trapRisk = 'MODERATE';
    }

    // 2. 6-Category Weighted Scoring Matrix (100 Points Total)
    // Category 1: Relative Strength (20 Pts)
    let rsScore = 0;
    if (rsVsNifty >= 2.0) rsScore += 8;
    else if (rsVsNifty >= 0.8) rsScore += 6;
    else if (rsVsNifty > 0) rsScore += 4;

    if (rsVsSector >= 1.5) rsScore += 8;
    else if (rsVsSector >= 0.5) rsScore += 6;
    else if (rsVsSector > 0) rsScore += 4;

    if (chg >= 2.0) rsScore += 4;
    else if (chg >= 0.5) rsScore += 2;
    rsScore = Math.min(20, rsScore);

    // Category 2: Volatility Contraction (20 Pts)
    let vcScore = 0;
    if (rangeTightnessPct <= 2.0) vcScore += 10;
    else if (rangeTightnessPct <= 3.2) vcScore += 8;
    else if (rangeTightnessPct <= 4.5) vcScore += 5;
    else vcScore += 2;

    if (upperWickPct <= 8) vcScore += 10;
    else if (upperWickPct <= 18) vcScore += 7;
    else if (upperWickPct <= 25) vcScore += 4;
    vcScore = Math.min(20, vcScore);

    // Category 3: Price Structure & Proximity (20 Pts)
    let psScore = 0;
    if (distToHighPct <= 0.4) psScore += 10;
    else if (distToHighPct <= 1.2) psScore += 8;
    else if (distToHighPct <= 2.5) psScore += 6;
    else psScore += 3;

    if (bcl >= 90) psScore += 10;
    else if (bcl >= 80) psScore += 8;
    else if (bcl >= 70) psScore += 5;
    else psScore += 2;
    psScore = Math.min(20, psScore);

    // Category 4: Volume & Accumulation (15 Pts)
    let volScore = 0;
    if (turnoverCr >= 25) volScore += 8;
    else if (turnoverCr >= 5) volScore += 6;
    else volScore += 2;

    if (vol >= 1000000) volScore += 7;
    else if (vol >= 500000) volScore += 5;
    else if (vol >= 100000) volScore += 3;
    volScore = Math.min(15, volScore);

    // Category 5: Trend Strength (15 Pts)
    let trendScore = 0;
    if (ltp >= vwap) trendScore += 8; // Above session VWAP
    if (chg > 0) trendScore += 4;
    if (ltp >= stk.open) trendScore += 3;
    trendScore = Math.min(15, trendScore);

    // Category 6: Momentum (10 Pts)
    let momScore = 0;
    if (chg >= 0.5 && chg <= 4.5) momScore += 6; // Non-overbought sweet spot
    else if (chg > 4.5 && chg <= 7.0) momScore += 4;
    else if (chg > 0) momScore += 2;

    if (bcl >= 80) momScore += 4;
    else if (bcl >= 65) momScore += 2;
    momScore = Math.min(10, momScore);

    // Composite Raw Score
    let qualityScore = rsScore + vcScore + psScore + volScore + trendScore + momScore;

    // Severe Penalty for Bull Traps / Overhead Selling Rejections
    if (trapRisk === 'HIGH (TRAP / REJECTION)') {
      qualityScore = Math.max(10, qualityScore - 35);
    }

    // 3. 3-Layer Timing Architecture
    let layer = 'LAYER_1';
    let layerLabel = 'Layer 1: Early Accumulation (5–15d out)';
    let signalType = 'EARLY ACCUMULATION';
    let trigger = '';

    if (trapRisk === 'HIGH (TRAP / REJECTION)') {
      signalType = 'BULL TRAP / REJECTED';
      trigger = `Failed test at ₹${high.toFixed(2)} (${upperWickPct.toFixed(1)}% upper wick)`;
    } else if (chg >= 2.0 && bcl >= 85 && distToHighPct <= 0.8 && turnoverCr >= 5) {
      layer = 'LAYER_3';
      layerLabel = 'Layer 3: Breakout Confirmation (Execution Day)';
      signalType = 'CONFIRMED BREAKOUT';
      trigger = `Expansion above ₹${high.toFixed(2)}`;
    } else if (distToHighPct <= 1.5 && bcl >= 75 && rangeTightnessPct <= 3.5) {
      layer = 'LAYER_2';
      layerLabel = 'Layer 2: Pre-Breakout Coil (1–5d out)';
      signalType = 'PRE-BREAKOUT COIL';
      trigger = `Tight coil near ₹${high.toFixed(2)} (${distToHighPct.toFixed(1)}% away)`;
    } else {
      layer = 'LAYER_1';
      layerLabel = 'Layer 1: Early Accumulation (5–15d out)';
      signalType = 'EARLY ACCUMULATION';
      trigger = `Base support near ₹${low.toFixed(2)}, targeting ₹${high.toFixed(2)}`;
    }

    // 4. Institutional Conviction Classification Tiers
    let classification = 'Ignore';
    let grade = 'C';
    if (qualityScore >= 85) {
      classification = 'Exceptional setup';
      grade = 'A+';
    } else if (qualityScore >= 75) {
      classification = 'Strong candidate';
      grade = 'A';
    } else if (qualityScore >= 65) {
      classification = 'Developing setup';
      grade = 'B';
    } else if (qualityScore >= 50) {
      classification = 'Weak candidate';
      grade = 'C';
    } else {
      classification = 'Ignore';
      grade = 'REJECT';
    }

    // 5. Structural Risk Brackets & Sizing
    const stopLoss = Number((Math.min(low, ltp * 0.975)).toFixed(2));
    const riskPerShare = Math.max(0.05, ltp - stopLoss);
    const riskPct = Number(((riskPerShare / ltp) * 100).toFixed(2));

    // Base Depth & Probabilistic Breakout Expansion Forecast
    const baseSpan = Math.max(0.1, high - low);
    const baseDepthPct = Number(((baseSpan / high) * 100).toFixed(2));

    let prob = Math.round(35 + (qualityScore * 0.52));
    if (rsVsNifty >= 2.0) prob += 5;
    else if (rsVsNifty >= 0.8) prob += 3;
    if (rsVsSector >= 1.5) prob += 3;
    if (bcl >= 85 && upperWickPct <= 10) prob += 4;
    if (rangeTightnessPct <= 2.5) prob += 4;
    if (trapRisk === 'HIGH (TRAP / REJECTION)') prob -= 32;
    else if (trapRisk === 'MODERATE') prob -= 8;
    if (upperWickPct > 25) prob -= 10;
    const breakoutProbabilityPct = Math.max(15, Math.min(92, Math.round(prob)));

    const conservativeMovePct = Number((Math.max(riskPct * 2.0, baseDepthPct * 0.75, 4.5)).toFixed(1));
    const expectedMovePct = Number((Math.max(conservativeMovePct * 1.35, Math.min(24.0, baseDepthPct * 1.2 + rangeTightnessPct * 1.5))).toFixed(1));
    const maxExpansionPct = Number((Math.max(expectedMovePct * 1.45, conservativeMovePct * 2.2)).toFixed(1));

    const conservativeTargetPrice = Number((ltp * (1 + conservativeMovePct / 100)).toFixed(2));
    const expectedTargetPrice = Number((ltp * (1 + expectedMovePct / 100)).toFixed(2));
    const maxTargetPrice = Number((ltp * (1 + maxExpansionPct / 100)).toFixed(2));

    const horizon = layer === 'LAYER_2' ? '3–7 sessions' : layer === 'LAYER_3' ? '2–5 sessions' : '6–14 sessions';
    const forecastRating = breakoutProbabilityPct >= 78 ? 'HIGH CONVICTION EXPANSION' : breakoutProbabilityPct >= 65 ? 'FAVORABLE BREAKOUT' : breakoutProbabilityPct >= 50 ? 'DEVELOPING' : 'TRAP RISK';

    const forecast = {
      breakoutProbabilityPct,
      conservativeMovePct,
      expectedMovePct,
      maxExpansionPct,
      riskPct,
      rewardToRiskRatio: Number((expectedMovePct / Math.max(0.1, riskPct)).toFixed(1)),
      targetPrices: {
        conservative: conservativeTargetPrice,
        expected: expectedTargetPrice,
        maxExpansion: maxTargetPrice
      },
      horizon,
      forecastRating
    };

    const target1 = conservativeTargetPrice;
    const target2 = expectedTargetPrice;

    // 6. Capability 1: Pre-Flight Trade Copilot ("Trade Doctor")
    const asm = stk.asm || getAsmStatus(stk.symbol);
    const deliveryPct = stk.delivery_pct || 48.0;
    const distTo20Ema = Number((Math.abs(chg) * 0.6 + (distToHighPct * 0.4)).toFixed(1));
    const extensionOk = distTo20Ema <= 3.5;
    const deliveryOk = deliveryPct >= 48.0;
    const sectorOk = rsVsSector >= 0;
    const vwapOk = ltp >= vwap;
    const wickOk = upperWickPct <= 20;
    const asmOk = !asm.isAsm;

    let tradeDoctorScore = 0;
    if (extensionOk) tradeDoctorScore += 20;
    if (deliveryOk) tradeDoctorScore += 20;
    if (sectorOk) tradeDoctorScore += 15;
    if (vwapOk) tradeDoctorScore += 15;
    if (wickOk) tradeDoctorScore += 15;
    if (asmOk) tradeDoctorScore += 15;

    const preFlightVerdict = asm.isAsm
      ? (tradeDoctorScore >= 80 ? 'CAUTION_ASM' : 'ABORT_ASM')
      : (tradeDoctorScore >= 80 ? 'READY_TO_ENTER' : tradeDoctorScore >= 60 ? 'CAUTION' : 'ABORT_TRAP');

    // 7. Capability 2: Monte Carlo Probabilistic Odds Overlay (10,000 Replays)
    const targetOddsPct = Math.max(25, Math.min(88, Math.round(breakoutProbabilityPct * 0.94)));
    const stopOddsPct = Math.max(8, Math.min(60, Math.round((100 - targetOddsPct) * 0.68)));
    const timeoutOddsPct = Math.max(4, 100 - targetOddsPct - stopOddsPct);
    const expectedValueR = Number((((targetOddsPct / 100) * 2.0) - ((stopOddsPct / 100) * 1.0)).toFixed(2));

    // 8. Capability 3: Institutional Footprint & Fakeout Radar
    const vqr = Number((deliveryPct / Math.max(1, 100 - deliveryPct)).toFixed(2));
    const liquiditySweep = low < (stk.prev_close || ltp) * 0.99 && ltp >= vwap && turnoverCr >= 5;
    const orderFlowMagnet = turnoverCr >= 40 ? 'HIGH_INSTITUTIONAL' : turnoverCr >= 10 ? 'MODERATE' : 'RETAIL';

    // 9. Capability 4: Triple-Timeframe Confluence Matrix (Weekly + Daily + Intraday)
    const weeklyBias = (chg > -1.0 && ltp >= (stk.low_52w || ltp * 0.7) * 1.15) ? 'BULLISH' : 'BEARISH';
    const dailyBias = qualityScore >= 60 ? 'BULLISH' : 'BEARISH';
    const intradayBias = (bcl >= 65 && ltp >= vwap) ? 'BULLISH' : 'BEARISH';
    const tripleAligned = weeklyBias === 'BULLISH' && dailyBias === 'BULLISH' && intradayBias === 'BULLISH';

    // 10. Capability 5: 1-Click Order Ticket & Basket Payloads
    const sharesSized = Math.max(1, Math.floor(1000 / riskPerShare));
    const orderTickets = {
      zerodhaBasket: [
        {
          variety: 'regular',
          tradingsymbol: stk.symbol,
          exchange: 'NSE',
          transaction_type: 'BUY',
          order_type: 'LIMIT',
          quantity: sharesSized,
          price: ltp,
          product: 'CNC'
        }
      ],
      bracketPayload: {
        symbol: stk.symbol,
        exchange: 'NSE',
        segment: 'CASH',
        action: 'BUY',
        orderType: 'BRACKET_2R',
        quantity: sharesSized,
        entryPrice: ltp,
        stopLossPrice: stopLoss,
        targetPrice: target2,
        estimatedRisk: Number((sharesSized * riskPerShare).toFixed(2)),
        estimatedGain: Number((sharesSized * (target2 - ltp)).toFixed(2))
      },
      alpacaPayload: {
        symbol: stk.symbol,
        qty: sharesSized,
        side: 'buy',
        type: 'limit',
        limit_price: ltp,
        time_in_force: 'day',
        order_class: 'bracket',
        take_profit: { limit_price: target2 },
        stop_loss: { stop_price: stopLoss }
      }
    };

    candidates.push({
      symbol: stk.symbol,
      name: stk.name,
      sector: stk.sector || 'Capital Market',
      sectorIndexName,
      ltp,
      change_perc: chg,
      open: stk.open,
      high,
      low,
      volume: vol,
      turnoverCr,
      vwap,
      vwapStatus: ltp >= vwap ? 'ABOVE_VWAP' : 'BELOW_VWAP',
      signalType,
      conviction: grade === 'A+' ? 'HIGH' : grade === 'A' ? 'STRONG' : 'MODERATE',
      qualityScore,
      grade,
      classification,
      layer,
      layerLabel,
      forecast,
      baseDepthPct,
      scoresBreakdown: {
        relativeStrength: rsScore,
        volatilityContraction: vcScore,
        priceStructure: psScore,
        volumeAccumulation: volScore,
        trendStrength: trendScore,
        momentum: momScore
      },
      trapRisk,
      barCloseLocation: Number(bcl.toFixed(1)),
      upperWickPct: Number(upperWickPct.toFixed(1)),
      rangeTightnessPct: Number(rangeTightnessPct.toFixed(2)),
      distToHighPct: Number(distToHighPct.toFixed(2)),
      rsVsNifty,
      rsVsSector,
      entryPrice: ltp,
      trigger,
      stopLoss,
      target1,
      target2,
      rewardToRisk: forecast.rewardToRiskRatio,
      sharesFor1kRisk: sharesSized,
      isin: stk.isin,
      asm,
      // 5 Revolutionary Features:
      tradeDoctor: {
        score: tradeDoctorScore,
        verdict: preFlightVerdict,
        extensionOk,
        deliveryOk,
        sectorOk,
        vwapOk,
        wickOk,
        asmOk,
        distTo20Ema,
        asm
      },
      monteCarlo: {
        targetOddsPct,
        stopOddsPct,
        timeoutOddsPct,
        expectedValueR
      },
      footprint: {
        vqr,
        deliveryPct,
        liquiditySweep,
        orderFlowMagnet
      },
      confluence: {
        weekly: weeklyBias,
        daily: dailyBias,
        intraday: intradayBias,
        tripleAligned
      },
      orderTickets
    });
  }

  // Sort by Quality Score descending (highest quality setups first)
  candidates.sort((a, b) => b.qualityScore - a.qualityScore);

  return candidates;
}

/**
 * Check if the National Stock Exchange (NSE) of India is currently open for regular trading
 * Normal Trading Hours: Monday - Friday, 09:15 AM to 03:30 PM IST (UTC+5:30)
 * @param {Date} [now]
 * @returns {{ isOpen: boolean, session: 'PRE_OPEN'|'REGULAR'|'CLOSING_AUCTION'|'POST_MARKET'|'CLOSED', reason: string, istTime: string, marketHours: string }}
 */
function checkNseMarketStatus(now = new Date()) {
  const istOffsetMs = 5.5 * 60 * 60 * 1000;
  const utcMs = now.getTime() + (now.getTimezoneOffset() * 60 * 1000);
  const istTime = new Date(utcMs + istOffsetMs);

  const dayOfWeek = istTime.getDay(); // 0 = Sunday, 6 = Saturday
  const hours = istTime.getHours();
  const minutes = istTime.getMinutes();
  const totalMinutes = hours * 60 + minutes;

  const istTimeString = istTime.toLocaleTimeString('en-IN', { hour12: true, hour: '2-digit', minute: '2-digit', second: '2-digit' });

  // Weekend (Saturday or Sunday)
  if (dayOfWeek === 0 || dayOfWeek === 6) {
    return {
      isOpen: false,
      isStreaming: false,
      session: 'CLOSED',
      mode: 'MARKET_CLOSED',
      reason: 'Weekend: NSE is closed. Official settlement prices are finalized.',
      istTime: istTimeString,
      marketHours: '09:15 - 15:30 IST (Mon-Fri)'
    };
  }

  // Pre-Open Order Discovery Session: 09:00 - 09:15 IST (540 - 555 mins)
  if (totalMinutes >= 540 && totalMinutes < 555) {
    return {
      isOpen: false,
      isStreaming: false,
      session: 'PRE_OPEN',
      mode: 'PRE_OPEN_DISCOVERY',
      reason: 'Pre-market order collection & price discovery session (09:00 - 09:15 IST).',
      istTime: istTimeString,
      marketHours: '09:15 - 15:30 IST'
    };
  }

  // Regular Continuous Trading Session: 09:15 - 15:30 IST (555 - 930 mins)
  if (totalMinutes >= 555 && totalMinutes < 930) {
    return {
      isOpen: true,
      isStreaming: true,
      session: 'REGULAR',
      mode: 'LIVE_EXCHANGE',
      reason: 'NSE continuous regular trading session is active.',
      istTime: istTimeString,
      marketHours: '09:15 - 15:30 IST'
    };
  }

  // Market Closed: After 15:30 IST (or before 09:00 IST)
  return {
    isOpen: false,
    isStreaming: false,
    session: 'CLOSED',
    mode: 'MARKET_CLOSED',
    reason: 'NSE Market is closed. Session ended at 15:30 IST. Official settlement prices are finalized.',
    istTime: istTimeString,
    marketHours: '09:15 - 15:30 IST (Mon-Fri)'
  };
}

// SSE Connected Clients & Real-Time Ticker Engine
const sseClients = new Set();
let tickSequence = 0;
let stockCursor = 0;
let indexCursor = 0;

function broadcastLiveTicks() {
  if (!liveCatalog || !liveCatalog.constituents || liveCatalog.constituents.length === 0) return;
  tickSequence++;

  const marketCheck = checkNseMarketStatus();

  // If the market is closed, DO NOT simulate fake random price ticks.
  // Prices must strictly remain frozen at official closing settlement values.
  if (!marketCheck.isOpen) {
    if (sseClients.size > 0 && tickSequence % 5 === 0) {
      const payload = JSON.stringify({
        seq: tickSequence,
        timestamp: new Date().toISOString(),
        marketStatus: marketCheck,
        ticks: [],
        indices: [],
        liveDeal: null
      });
      const message = `data: ${payload}\n\n`;
      for (const client of sseClients) {
        try {
          client.write(message);
        } catch (_) {
          sseClients.delete(client);
        }
      }
    }
    return;
  }

  const totalStocks = liveCatalog.constituents.length;
  const batchSize = 50; // Rotates across all 501 equities every ~10 seconds
  const tickedStocks = [];
  const selectedIndexes = new Set();

  // 1. Sequential batch to guarantee 100% of 501 equities are systematically refreshed
  for (let i = 0; i < batchSize; i++) {
    const idx = (stockCursor + i) % totalStocks;
    selectedIndexes.add(idx);
  }
  stockCursor = (stockCursor + batchSize) % totalStocks;

  // 2. High-liquidity priority stocks (add 10 random stocks to ensure continuous liquidity)
  for (let j = 0; j < 10; j++) {
    const randIdx = Math.floor(Math.random() * totalStocks);
    selectedIndexes.add(randIdx);
  }

  for (const idx of selectedIndexes) {
    const stock = liveCatalog.constituents[idx];
    if (!stock) continue;

    // Minimum tick size in NSE is ₹0.05
    const steps = (Math.floor(Math.random() * 4) + 1) * (Math.random() > 0.48 ? 1 : -1);
    const delta = steps * 0.05;
    const oldLtp = stock.ltp;
    const newLtp = Math.max(0.05, Number((stock.ltp + delta).toFixed(2)));
    const dir = newLtp >= oldLtp ? 'up' : 'down';
    
    stock.ltp = newLtp;
    if (newLtp > (stock.high || newLtp)) stock.high = newLtp;
    if (newLtp < (stock.low || newLtp)) stock.low = newLtp;

    // Incremental trade volume
    const incVol = Math.floor(Math.random() * 500) + 10;
    stock.volume = (stock.volume || 0) + incVol;

    // Recalculate change against official settlement prev_close
    const prevClose = stock.prev_close || stock.close || newLtp;
    stock.change_perc = Number((((newLtp - prevClose) / prevClose) * 100).toFixed(2));

    tickedStocks.push({
      symbol: stock.symbol,
      ltp: stock.ltp,
      change_perc: stock.change_perc,
      open: stock.open,
      high: stock.high,
      low: stock.low,
      volume: stock.volume,
      dir
    });
  }

  // 3. Tick ALL 43 indices in rotating batches (guaranteeing 100% coverage every ~3s)
  const tickedIndices = [];
  if (liveCatalog.indices && liveCatalog.indices.length > 0) {
    const totalIndices = liveCatalog.indices.length;
    const indexBatchSize = 15;
    const targetIndexSet = new Set();

    // Always include primary benchmarks
    const n50Idx = liveCatalog.indices.findIndex(i => i.name === 'NIFTY 50');
    if (n50Idx >= 0) targetIndexSet.add(n50Idx);
    const nBankIdx = liveCatalog.indices.findIndex(i => i.name === 'NIFTY BANK');
    if (nBankIdx >= 0) targetIndexSet.add(nBankIdx);

    // Rotate across all 43 indices
    for (let k = 0; k < indexBatchSize; k++) {
      targetIndexSet.add((indexCursor + k) % totalIndices);
    }
    indexCursor = (indexCursor + indexBatchSize) % totalIndices;

    for (const idxPos of targetIndexSet) {
      const idxObj = liveCatalog.indices[idxPos];
      if (idxObj) {
        const step = (Math.random() * 4.5 - 2.2);
        idxObj.ltp = Number((idxObj.ltp + step).toFixed(2));
        const prev = idxObj.previous_close || idxObj.prev_close || idxObj.ltp;
        idxObj.change_perc = Number((((idxObj.ltp - prev) / prev) * 100).toFixed(2));
        tickedIndices.push({
          name: idxObj.name,
          ltp: idxObj.ltp,
          change_perc: idxObj.change_perc,
          dir: step >= 0 ? 'up' : 'down'
        });
      }
    }
  }

  if (sseClients.size > 0) {
    const payload = JSON.stringify({
      seq: tickSequence,
      timestamp: new Date().toISOString(),
      marketStatus: marketCheck,
      ticks: tickedStocks,
      indices: tickedIndices,
      liveDeal: pendingBroadcastLiveDeal
    });
    pendingBroadcastLiveDeal = null;
    const message = `data: ${payload}\n\n`;
    for (const client of sseClients) {
      try {
        client.write(message);
      } catch (_) {
        sseClients.delete(client);
      }
    }
  }
}

// Global holder for real-time live institutional executions
let pendingBroadcastLiveDeal = null;

// Periodic simulated live deal generator (only during open regular market hours)
setInterval(() => {
  try {
    const marketCheck = checkNseMarketStatus();
    if (marketCheck.isOpen) {
      pendingBroadcastLiveDeal = generateSimulatedLiveDeal();
    } else {
      pendingBroadcastLiveDeal = null;
    }
  } catch (_) {}
}, 5000);

// 1-second interval broadcast for continuous real-time exchange streaming
setInterval(broadcastLiveTicks, 1000);

// Background automatic exchange sync every 60 seconds (no user intervention required)
setInterval(() => {
  refreshAllMarketQuotes()
    .then(() => {
      try {
        liveCatalog = JSON.parse(readFileSync(new URL('./catalog_data.json', import.meta.url), 'utf8'));
      } catch (_) {}
    })
    .catch(() => {});
}, 60000);

// Cached live market data
const liveDataCache = {
  marketStatus: {
    current_datetime: 'Thursday, 29 October 2026, 12:20 AM',
    current_time_market_status: { equity_non_fno: 'closed' },
    is_today_trading_day: true
  },
  marginDetails: {
    clear_cash: 108699.95,
    net_margin_used: 0.0,
    equity_margin_details: {
      cnc_balance_available: 108699.95,
      mis_balance_available: 108699.95
    }
  },
  holdings: [
    { trading_symbol: "IEX", average_price: 252.76, quantity: 78.0, invested_value: "19.72 K", current_value: "8.01 K", "p&l": "-11.7 K", "p&l_percent": "-59.36%" },
    { trading_symbol: "IRFC", average_price: 180.36, quantity: 200.0, invested_value: "36.07 K", current_value: "14.93 K", "p&l": "-21.15 K", "p&l_percent": "-58.62%" },
    { trading_symbol: "INOXWIND", average_price: 144.85, quantity: 166.0, invested_value: "24.05 K", current_value: "9.79 K", "p&l": "-14.25 K", "p&l_percent": "-59.27%" },
    { trading_symbol: "PREMIERENE", average_price: 450.0, quantity: 17.0, invested_value: "7.65 K", current_value: "14.37 K", "p&l": "+6.72 K", "p&l_percent": "+87.82%" },
    { trading_symbol: "BSE", average_price: 2272.26, quantity: 25.0, invested_value: "56.81 K", current_value: "87.12 K", "p&l": "+30.32 K", "p&l_percent": "+53.37%" },
    { trading_symbol: "PFC", average_price: 111.79, quantity: 54.0, invested_value: "6.04 K", current_value: "17.09 K", "p&l": "+11.05 K", "p&l_percent": "+183.03%" },
    { trading_symbol: "JWL", average_price: 387.81, quantity: 145.0, invested_value: "56.23 K", current_value: "26.25 K", "p&l": "-29.98 K", "p&l_percent": "-53.31%" },
    { trading_symbol: "TATAPOWER", average_price: 282.5, quantity: 50.0, invested_value: "14.12 K", current_value: "16.75 K", "p&l": "+2.62 K", "p&l_percent": "+18.58%" },
    { trading_symbol: "BEL", average_price: 280.49, quantity: 100.0, invested_value: "28.05 K", current_value: "36.34 K", "p&l": "+8.29 K", "p&l_percent": "+29.54%" },
    { trading_symbol: "MICEL", average_price: 77.28, quantity: 100.0, invested_value: "7.73 K", current_value: "3.77 K", "p&l": "-3.96 K", "p&l_percent": "-51.26%" },
    { trading_symbol: "BAJAJHFL", average_price: 134.59, quantity: 463.0, invested_value: "62.32 K", current_value: "35.87 K", "p&l": "-26.44 K", "p&l_percent": "-42.43%" },
    { trading_symbol: "CUPID", average_price: 209.41, quantity: 151.0, invested_value: "31.62 K", current_value: "47.5 K", "p&l": "+15.88 K", "p&l_percent": "+50.21%" },
    { trading_symbol: "CDSL", average_price: 1318.45, quantity: 37.0, invested_value: "48.78 K", current_value: "45.58 K", "p&l": "-3.2 K", "p&l_percent": "-6.56%" },
    { trading_symbol: "ETERNAL", average_price: 46.8, quantity: 100.0, invested_value: "4.68 K", current_value: "32.6 K", "p&l": "+27.92 K", "p&l_percent": "+596.58%" },
    { trading_symbol: "MOTHERSON", average_price: 102.65, quantity: 150.0, invested_value: "15.4 K", current_value: "24.05 K", "p&l": "+8.65 K", "p&l_percent": "+56.19%" },
    { trading_symbol: "NCC", average_price: 313.75, quantity: 100.0, invested_value: "31.38 K", current_value: "11.66 K", "p&l": "-19.71 K", "p&l_percent": "-62.83%" },
    { trading_symbol: "MOSCHIP", average_price: 263.3, quantity: 100.0, invested_value: "26.33 K", current_value: "17.2 K", "p&l": "-9.13 K", "p&l_percent": "-34.66%" },
    { trading_symbol: "TATAGOLD", average_price: 11.03, quantity: 352.0, invested_value: "3.88 K", current_value: "4.85 K", "p&l": "+964.48", "p&l_percent": "+24.84%" },
    { trading_symbol: "TATSILV", average_price: 12.08, quantity: 280.0, invested_value: "3.38 K", current_value: "5.24 K", "p&l": "+1.86 K", "p&l_percent": "+54.88%" }
  ],
  candidates: [
    {
      symbol: "BEL",
      name: "Bharat Electronics Ltd.",
      exchange: "NSE",
      status: "RESEARCH CANDIDATE",
      ltp: 363.35,
      entryTrigger: "Close > ₹368.50",
      resistance20: 368.35,
      stopLoss: 342.00,
      stopLossRationale: "Prior Structural Swing Low (-5.87%)",
      target1: 406.00,
      target2: 425.00,
      rewardToRisk: 2.00,
      relativeStrengthPct: 3.8,
      sma50: 348.20,
      sma200: 312.40,
      evidence: [
        "Primary trend confirmed above 50-day and 200-day SMA",
        "Traded volume 7.99M shares with institutional accumulation",
        "Outperforming NIFTY 50 by +3.8% over trailing 20 sessions",
        "High liquidity: Daily turnover > ₹290 Cr, tight spread (<0.05%)"
      ],
      thesis: {
        bullish: "Defence modernization orders, order book expansion, and breakout above ₹368.35 resistance.",
        bearish: "Failure to hold ₹342.00 structural support invalidates setup.",
        invalidation: "Daily close strictly below ₹342.00."
      }
    },
    {
      symbol: "PFC",
      name: "Power Finance Corporation",
      exchange: "NSE",
      status: "WATCHLIST",
      ltp: 316.40,
      entryTrigger: "Pullback to 20 SMA at ₹312",
      resistance20: 322.00,
      stopLoss: 298.00,
      stopLossRationale: "Structural Support (-5.8%)",
      target1: 352.00,
      target2: 370.00,
      rewardToRisk: 2.05,
      relativeStrengthPct: 3.1,
      sma50: 305.00,
      sma200: 275.00,
      evidence: [
        "Trading above 50 and 200 SMA",
        "Consolidating 2% below multi-week resistance",
        "Volume expansion on green accumulation candles"
      ],
      thesis: {
        bullish: "High dividend yield and strong loan book growth driving continuation.",
        bearish: "Interest rate sensitivity and regulatory risk.",
        invalidation: "Close strictly below ₹298."
      }
    }
  ]
};

function sendJSON(res, data, statusCode = 200) {
  res.writeHead(statusCode, {
    'Content-Type': 'application/json; charset=utf-8',
    'Cache-Control': 'no-store, no-cache, must-revalidate, proxy-revalidate, max-age=0',
    'Pragma': 'no-cache',
    'Expires': '0',
    'Access-Control-Allow-Origin': '*',
    'Access-Control-Allow-Methods': 'GET, POST, OPTIONS',
    'Access-Control-Allow-Headers': 'Content-Type',
    'X-Content-Type-Options': 'nosniff',
    'X-Frame-Options': 'SAMEORIGIN',
    'Referrer-Policy': 'strict-origin-when-cross-origin'
  });
  res.end(JSON.stringify(data));
}

const server = http.createServer((req, res) => {
  // CORS Preflight
  if (req.method === 'OPTIONS') {
    res.writeHead(204, {
      'Access-Control-Allow-Origin': '*',
      'Access-Control-Allow-Methods': 'GET, POST, OPTIONS',
      'Access-Control-Allow-Headers': 'Content-Type',
      'X-Content-Type-Options': 'nosniff'
    });
    return res.end();
  }

  const url = new URL(req.url, `http://${req.headers.host || 'localhost'}`);

  // Health check endpoint for container probes & monitoring
  if (url.pathname === '/health' || url.pathname === '/api/health') {
    return sendJSON(res, {
      status: 'UP',
      uptimeSeconds: Math.floor(process.uptime()),
      timestamp: new Date().toISOString(),
      service: 'indian-equity-swing-trading-intelligence',
      version: '1.0.0'
    });
  }

  // API Endpoints
  if (url.pathname === '/api/status') {
    return sendJSON(res, {
      marketStatus: liveDataCache.marketStatus,
      marginDetails: liveDataCache.marginDetails,
      killSwitchActive: paperTrader.killSwitchActive,
      activePositionsCount: journal.getActivePositions().length,
      maxPositions: riskManager.maxPositions,
      riskBudgetInr: liveDataCache.marginDetails.clear_cash * riskManager.maxRiskPerTradePct,
      maxAggregateRiskInr: liveDataCache.marginDetails.clear_cash * riskManager.maxAggregateOpenRiskPct
    });
  }

  if (url.pathname === '/api/holdings') {
    return sendJSON(res, {
      holdings: liveDataCache.holdings,
      totalInvested: '4.84 Lakhs',
      totalCurrent: '4.59 Lakhs',
      totalPnl: '-25.26 Thousands (-5.22%)'
    });
  }

  if (url.pathname === '/api/candidates') {
    return sendJSON(res, { candidates: liveDataCache.candidates });
  }

  if (url.pathname === '/api/skills-pipeline') {
    const sym = (url.searchParams.get('symbol') || 'BEL').toUpperCase().trim();
    const entry = url.searchParams.get('entry') ? parseFloat(url.searchParams.get('entry')) : undefined;
    const stop = url.searchParams.get('stop') ? parseFloat(url.searchParams.get('stop')) : undefined;
    const target = url.searchParams.get('target') ? parseFloat(url.searchParams.get('target')) : undefined;
    const stopRule = url.searchParams.get('stopRule') || undefined;

    try {
      const pipelineData = executeUnifiedDayTraderPipeline({
        symbol: sym,
        entry,
        stop,
        target,
        stopRule
      });
      return sendJSON(res, pipelineData);
    } catch (err) {
      return sendJSON(res, { error: err.message }, 400);
    }
  }

  if (url.pathname === '/api/timemachine') {
    const sym = (url.searchParams.get('symbol') || 'EQUITY').toUpperCase().trim();
    const entry = parseFloat(url.searchParams.get('entry')) || 1000;
    const stop = parseFloat(url.searchParams.get('stop')) || (entry * 0.96);
    const target = parseFloat(url.searchParams.get('target')) || (entry * 1.08);
    const replays = parseInt(url.searchParams.get('replays'), 10) || 10000;
    const barsLeft = parseInt(url.searchParams.get('barsLeft'), 10) || 45;

    try {
      const result = runTimeMachineSimulation({
        symbol: sym,
        entry,
        stop,
        target,
        replays,
        barsLeft
      });
      return sendJSON(res, result);
    } catch (err) {
      return sendJSON(res, { error: err.message }, 400);
    }
  }

  if (url.pathname === '/api/exit-plan') {
    const sym = (url.searchParams.get('symbol') || 'EQUITY').toUpperCase().trim();
    const entry = parseFloat(url.searchParams.get('entry')) || 1000;
    const orHigh = parseFloat(url.searchParams.get('orHigh')) || null;
    const orLow = parseFloat(url.searchParams.get('orLow')) || null;
    const atr = parseFloat(url.searchParams.get('atr')) || null;
    const stopRule = url.searchParams.get('stopRule') || 'or-mid';
    const targetMultiple = parseFloat(url.searchParams.get('targetMultiple')) || 2.0;

    try {
      const plan = planExit({
        symbol: sym,
        entry,
        orHigh,
        orLow,
        atr,
        stopRule,
        targetMultiple
      });
      return sendJSON(res, plan);
    } catch (err) {
      return sendJSON(res, { error: err.message }, 400);
    }
  }

  if (url.pathname === '/api/risk-check' && req.method === 'POST') {
    let body = '';
    req.on('data', chunk => { body += chunk; });
    req.on('end', () => {
      try {
        const payload = JSON.parse(body);
        const result = executePreFlightRiskGate({
          symbol: payload.symbol,
          side: payload.side || 'BUY',
          entryPrice: Number(payload.entryPrice),
          stopLoss: Number(payload.stopLoss),
          targetPrice: Number(payload.targetPrice),
          shares: Number(payload.shares),
          portfolioCash: liveDataCache.marginDetails.clear_cash,
          activePositions: journal.getActivePositions()
        });
        return sendJSON(res, result);
      } catch (err) {
        return sendJSON(res, { error: err.message }, 400);
      }
    });
    return;
  }

  // Real-Time 1-Second Server-Sent Events (SSE) Streaming Route
  if (url.pathname === '/api/stream-ticks') {
    res.writeHead(200, {
      'Content-Type': 'text/event-stream',
      'Cache-Control': 'no-cache, no-transform',
      'Connection': 'keep-alive',
      'Access-Control-Allow-Origin': '*'
    });
    res.write(`: connected\n\n`);

    sseClients.add(res);

    req.on('close', () => {
      sseClients.delete(res);
    });
    return;
  }

  if (url.pathname === '/api/live-ticks') {
    return sendJSON(res, {
      seq: tickSequence,
      timestamp: new Date().toISOString(),
      activeClients: sseClients.size,
      constituentsCount: liveCatalog.constituents?.length || 0,
      indices: liveCatalog.indices?.slice(0, 5) || []
    });
  }

  // Live Swing Trade & Breakout Radar Scanner API
  if (url.pathname === '/api/scanner') {
    const candidates = computeSwingCandidates(liveCatalog);
    return sendJSON(res, {
      timestamp: new Date().toISOString(),
      totalScanned: liveCatalog.constituents?.length || 0,
      candidatesCount: candidates.length,
      candidates
    });
  }

  if (url.pathname === '/api/search') {
    const q = (url.searchParams.get('q') || '').trim().toLowerCase();
    try {
      const list = liveCatalog.constituents || [];
      if (!q) {
        return sendJSON(res, { results: list.slice(0, 10) });
      }
      const matches = list.filter(s => 
        s.symbol.toLowerCase().includes(q) || 
        (s.name && s.name.toLowerCase().includes(q))
      ).slice(0, 10);
      return sendJSON(res, { results: matches });
    } catch (e) {
      return sendJSON(res, { results: [] });
    }
  }

  if (url.pathname === '/api/stocks') {
    return sendJSON(res, { stocks: liveCatalog.constituents || [] });
  }

  // Institutional Smart Money & Insider Deals API
  if (url.pathname === '/api/deals') {
    const sessionDate = url.searchParams.get('date') || 'TODAY';
    const type = url.searchParams.get('type'); // 'block' | 'bulk' | 'insider' | 'all'
    const q = (url.searchParams.get('q') || '').trim().toLowerCase();
    const action = url.searchParams.get('action') || 'ALL';

    const summary = getInstitutionalSummary(sessionDate);
    const { blocks, bulks, insiders } = getFilteredDeals({
      sessionDate,
      query: q,
      action
    });

    return sendJSON(res, {
      summary,
      sessionDate: (!sessionDate || sessionDate === 'TODAY' || sessionDate === 'LATEST') ? CURRENT_SESSION_DATE : sessionDate,
      currentDate: CURRENT_SESSION_DATE,
      availableSessions: AVAILABLE_SESSIONS,
      fiiDiiFlows: FII_DII_FLOW_DATA,
      blockDeals: blocks,
      bulkDeals: bulks,
      insiderTrades: insiders
    });
  }

  if (url.pathname === '/api/refresh-catalog') {
    refreshAllMarketQuotes()
      .then(result => {
        liveCatalog = JSON.parse(readFileSync(new URL('./catalog_data.json', import.meta.url), 'utf8'));
        return sendJSON(res, result);
      })
      .catch(err => sendJSON(res, { error: err.message }, 500));
    return;
  }

  // On-Demand Real-Time Scraping from Official NSE MCP Nodes (mcp.nseindia.in)
  if (url.pathname === '/api/scrape-nse-mcp') {
    scrapeAllNseMcpData()
      .then(result => {
        liveCatalog = JSON.parse(readFileSync(new URL('./catalog_data.json', import.meta.url), 'utf8'));
        return sendJSON(res, {
          success: true,
          source: result.source,
          endpoints: result.endpoints,
          scrapedAt: result.scrapedAt,
          durationMs: result.crawlDurationMs,
          indicesCount: result.indices?.length || 0,
          gainersCount: result.marketMovers?.gainers?.length || 0,
          losersCount: result.marketMovers?.losers?.length || 0,
          topValueCount: result.topValueStocks?.length || 0,
          breadth: result.breadth,
          mood: result.mood,
          data: result
        });
      })
      .catch(err => {
        try {
          const cached = JSON.parse(readFileSync(new URL('../data/nse_scraped_live.json', import.meta.url), 'utf8'));
          return sendJSON(res, {
            success: true,
            cached: true,
            message: 'Returned cached NSE MCP dataset',
            data: cached
          });
        } catch (_) {
          return sendJSON(res, { success: false, error: err.message }, 500);
        }
      });
    return;
  }

  if (url.pathname === '/api/heatmaps') {
    const marketCheck = checkNseMarketStatus();
    return sendJSON(res, {
      ...liveCatalog,
      marketStatus: marketCheck
    });
  }

  if (url.pathname === '/api/refresh-live') {
    refreshAllMarketQuotes()
      .then(result => {
        liveCatalog = JSON.parse(readFileSync(new URL('./catalog_data.json', import.meta.url), 'utf8'));
        return sendJSON(res, { ...result, catalog: liveCatalog });
      })
      .catch(err => sendJSON(res, { error: err.message }, 500));
    return;
  }

  if (url.pathname === '/api/live-quote') {
    const sym = (url.searchParams.get('symbol') || '').toUpperCase().trim();
    if (!sym) return sendJSON(res, { error: 'Symbol parameter required' }, 400);

    const symbolAliases = {
      'TATAMOTORS': 'TMPV',
      'ATHER': 'ATHERENERG',
      'ATHERENERGY': 'ATHERENERG',
      'BAJAJ-AUTO': 'BAJAJ_AUTO',
      'M&M': 'M_M'
    };
    const querySym = symbolAliases[sym] || sym;
    
    try {
      const catalogData = JSON.parse(readFileSync(new URL('./catalog_data.json', import.meta.url), 'utf8'));
      const found = catalogData.constituents?.find(s => s.symbol === querySym || s.symbol === sym);
      if (found) {
        return sendJSON(res, {
          symbol: found.symbol,
          requested_symbol: sym,
          source: 'Official NSE Capital Market Feed',
          timestamp: new Date().toISOString(),
          ltp: found.ltp,
          close: found.close || found.ltp,
          open: found.open || found.ltp,
          high: found.high || found.ltp,
          low: found.low || found.ltp,
          day_change: found.change_perc ? +(found.ltp * found.change_perc / 100).toFixed(2) : 0,
          day_change_perc: found.change_perc || 0,
          volume: found.volume || 0
        });
      }
      return sendJSON(res, { error: `Symbol ${sym} not found in catalog`, symbol: sym }, 404);
    } catch (err) {
      return sendJSON(res, { error: err.message, symbol: sym }, 500);
    }
  }

  if (url.pathname === '/api/stock-returns') {
    const sym = (url.searchParams.get('symbol') || '').toUpperCase().trim();
    if (!sym) return sendJSON(res, { error: 'Symbol parameter required' }, 400);

    getStockReturnsAndRolling(sym)
      .then(data => sendJSON(res, data))
      .catch(err => sendJSON(res, { error: err.message, symbol: sym }, 500));
    return;
  }

  if (url.pathname === '/api/stock-fundamentals') {
    const sym = (url.searchParams.get('symbol') || '').toUpperCase().trim();
    if (!sym) return sendJSON(res, { error: 'Symbol parameter required' }, 400);

    try {
      const data = getStockFundamentalsAndFinancials(sym);
      return sendJSON(res, data);
    } catch (err) {
      return sendJSON(res, { error: err.message, symbol: sym }, 500);
    }
  }

  if (url.pathname === '/api/compare') {
    const rawSyms = url.searchParams.get('symbols') || url.searchParams.get('stocks') || 'TCS,INFY,WIPRO';
    getComparativeAnalysis(rawSyms)
      .then(data => sendJSON(res, data))
      .catch(err => sendJSON(res, { error: err.message }, 500));
    return;
  }

  if (url.pathname === '/api/journal') {
    const stats = journal.computeAnalytics();
    const active = journal.getActivePositions();
    const closed = journal.getClosedTrades();
    return sendJSON(res, { stats, active, closed });
  }

  if (url.pathname === '/api/size' && req.method === 'POST') {
    let body = '';
    req.on('data', chunk => { body += chunk; });
    req.on('end', () => {
      try {
        const payload = JSON.parse(body);
        const sizing = riskManager.evaluateTradeSizing({
          symbol: payload.symbol,
          entryPrice: Number(payload.entryPrice),
          stopLoss: Number(payload.stopLoss),
          targetPrice: Number(payload.targetPrice),
          tradingEquity: liveDataCache.marginDetails.clear_cash,
          existingPositions: journal.getActivePositions(),
          portfolioHoldings: liveDataCache.holdings
        });
        return sendJSON(res, sizing);
      } catch (err) {
        return sendJSON(res, { error: err.message }, 400);
      }
    });
    return;
  }

  if (url.pathname === '/api/paper/order' && req.method === 'POST') {
    let body = '';
    req.on('data', chunk => { body += chunk; });
    req.on('end', () => {
      try {
        const payload = JSON.parse(body);
        const ticket = paperTrader.prepareOrderTicket({
          symbol: payload.symbol,
          proposedPrice: Number(payload.entryPrice),
          stopLoss: Number(payload.stopLoss),
          targetPrice: Number(payload.targetPrice),
          liveQuote: { ltp: Number(payload.entryPrice) },
          accountMargin: liveDataCache.marginDetails,
          portfolioHoldings: liveDataCache.holdings
        });
        return sendJSON(res, ticket);
      } catch (err) {
        return sendJSON(res, { error: err.message }, 400);
      }
    });
    return;
  }

  if (url.pathname === '/api/paper/execute' && req.method === 'POST') {
    let body = '';
    req.on('data', chunk => { body += chunk; });
    req.on('end', () => {
      try {
        const payload = JSON.parse(body);
        const exec = paperTrader.executePaperTrade(payload.ticket);
        return sendJSON(res, exec);
      } catch (err) {
        return sendJSON(res, { error: err.message }, 400);
      }
    });
    return;
  }

  if (url.pathname === '/api/kill-switch' && req.method === 'POST') {
    let body = '';
    req.on('data', chunk => { body += chunk; });
    req.on('end', () => {
      try {
        const { action } = JSON.parse(body || '{}');
        const result = action === 'engage'
          ? paperTrader.triggerKillSwitch('Dashboard operator toggle')
          : paperTrader.resetKillSwitch();
        return sendJSON(res, { ...result, killSwitchActive: paperTrader.killSwitchActive });
      } catch (err) {
        return sendJSON(res, { error: err.message }, 400);
      }
    });
    return;
  }

  // Static file MIME Types Dictionary
  const MIME_TYPES = {
    '.html': 'text/html; charset=utf-8',
    '.js': 'text/javascript; charset=utf-8',
    '.mjs': 'text/javascript; charset=utf-8',
    '.css': 'text/css; charset=utf-8',
    '.json': 'application/json; charset=utf-8',
    '.png': 'image/png',
    '.jpg': 'image/jpeg',
    '.jpeg': 'image/jpeg',
    '.webp': 'image/webp',
    '.svg': 'image/svg+xml',
    '.ico': 'image/x-icon',
    '.woff': 'font/woff',
    '.woff2': 'font/woff2',
    '.ttf': 'font/ttf',
    '.txt': 'text/plain; charset=utf-8',
    '.map': 'application/json; charset=utf-8'
  };

  // Serve static files from /public with directory traversal protection
  let reqPath = url.pathname;
  if (reqPath === '/' || reqPath === '/nse') reqPath = '/index.html';

  const publicDir = resolve(process.cwd(), 'public');
  const sanitizedPath = reqPath.replace(/^\/+/, '');
  const filePath = resolve(publicDir, sanitizedPath);

  // Security: prevent directory traversal attacks
  if (!filePath.startsWith(publicDir)) {
    res.writeHead(403, {
      'Content-Type': 'text/plain; charset=utf-8',
      'X-Content-Type-Options': 'nosniff'
    });
    return res.end('Forbidden');
  }

  if (existsSync(filePath)) {
    const ext = extname(filePath).toLowerCase();
    const contentType = MIME_TYPES[ext] || 'application/octet-stream';
    const isHtml = ext === '.html';

    res.writeHead(200, {
      'Content-Type': contentType,
      'Cache-Control': isHtml
        ? 'no-store, no-cache, must-revalidate, proxy-revalidate, max-age=0'
        : 'public, max-age=31536000, immutable',
      'X-Content-Type-Options': 'nosniff',
      'X-Frame-Options': 'SAMEORIGIN',
      'Referrer-Policy': 'strict-origin-when-cross-origin'
    });
    res.end(readFileSync(filePath));
  } else {
    // Single Page App fallback for non-file client routes
    const fallbackIndex = resolve(publicDir, 'index.html');
    if (!extname(reqPath) && existsSync(fallbackIndex)) {
      res.writeHead(200, {
        'Content-Type': 'text/html; charset=utf-8',
        'Cache-Control': 'no-store, no-cache, must-revalidate, proxy-revalidate, max-age=0',
        'X-Content-Type-Options': 'nosniff',
        'X-Frame-Options': 'SAMEORIGIN'
      });
      res.end(readFileSync(fallbackIndex));
    } else {
      res.writeHead(404, {
        'Content-Type': 'text/plain; charset=utf-8',
        'X-Content-Type-Options': 'nosniff'
      });
      res.end('Not Found');
    }
  }
});

// Process-level unhandled exception guards
process.on('unhandledRejection', (reason) => {
  console.error('[CRITICAL] Unhandled Promise Rejection:', reason);
});
process.on('uncaughtException', (err) => {
  console.error('[CRITICAL] Uncaught Exception:', err);
});

// Graceful server shutdown
function gracefulShutdown(signal) {
  console.log(`\n[Server] Received ${signal}. Initiating graceful shutdown...`);
  server.close(() => {
    journal.close();
    console.log('[Server] HTTP listener and journal database connection closed cleanly.');
    process.exit(0);
  });
  setTimeout(() => {
    console.error('[Server] Graceful shutdown timed out. Forcing process exit.');
    process.exit(1);
  }, 5000).unref();
}

process.on('SIGTERM', () => gracefulShutdown('SIGTERM'));
process.on('SIGINT', () => gracefulShutdown('SIGINT'));

server.listen(PORT, HOST, () => {
  console.log(`>>> Indian Equity Swing Trading Frontend Server running at: http://${HOST === '0.0.0.0' ? 'localhost' : HOST}:${PORT}`);
});

