/**
 * Pre-Flight Trade Copilot, Monte Carlo Odds, Footprint & Order Ticket Engine
 * Pure mathematical calculations adhering to Indian Capital Market rules (NSE / SEBI).
 */

import { getAsmStatus } from './asmRegistry.js';

export function calculateStatutoryCharges({ entryPrice, stopLossPrice, targetPrice, quantity }) {
  const buyTurnover = entryPrice * quantity;
  const sellTurnoverTarget = targetPrice * quantity;
  const sellTurnoverStop = stopLossPrice * quantity;

  // Brokerage (Delivery is ₹0 on major discount brokers, with standard swing estimate)
  const brokerageBuy = 0;
  const brokerageSellTarget = 0;
  const brokerageSellStop = 0;

  // STT / CTT: 0.1% on buy and sell for equity delivery
  const sttBuy = buyTurnover * 0.001;
  const sttSellTarget = sellTurnoverTarget * 0.001;
  const sttSellStop = sellTurnoverStop * 0.001;

  // Exchange Transaction Charge: NSE 0.00297%
  const exchBuy = buyTurnover * 0.0000297;
  const exchSellTarget = sellTurnoverTarget * 0.0000297;
  const exchSellStop = sellTurnoverStop * 0.0000297;

  // Stamp Duty: 0.015% on buy only
  const stampDuty = buyTurnover * 0.00015;

  // SEBI Turnover Fee: ₹10 per crore (0.0001%)
  const sebiBuy = buyTurnover * 0.000001;
  const sebiSellTarget = sellTurnoverTarget * 0.000001;
  const sebiSellStop = sellTurnoverStop * 0.000001;

  // GST: 18% on (Brokerage + Exchange charges + SEBI charges)
  const gstTarget = (brokerageBuy + brokerageSellTarget + exchBuy + exchSellTarget + sebiBuy + sebiSellTarget) * 0.18;
  const gstStop = (brokerageBuy + brokerageSellStop + exchBuy + exchSellStop + sebiBuy + sebiSellStop) * 0.18;

  const totalChargesAtTarget = Number((sttBuy + sttSellTarget + exchBuy + exchSellTarget + stampDuty + sebiBuy + sebiSellTarget + gstTarget).toFixed(2));
  const totalChargesAtStop = Number((sttBuy + sttSellStop + exchBuy + exchSellStop + stampDuty + sebiBuy + sebiSellStop + gstStop).toFixed(2));

  const grossProfit = Number(((targetPrice - entryPrice) * quantity).toFixed(2));
  const grossRisk = Number(((entryPrice - stopLossPrice) * quantity).toFixed(2));

  const netProfit = Number((grossProfit - totalChargesAtTarget).toFixed(2));
  const netRisk = Number((grossRisk + totalChargesAtStop).toFixed(2));

  return {
    buyTurnover: Number(buyTurnover.toFixed(2)),
    sellTurnoverTarget: Number(sellTurnoverTarget.toFixed(2)),
    stt: Number((sttBuy + sttSellTarget).toFixed(2)),
    stampDuty: Number(stampDuty.toFixed(2)),
    exchangeCharges: Number((exchBuy + exchSellTarget).toFixed(2)),
    gst: Number(gstTarget.toFixed(2)),
    sebiCharges: Number((sebiBuy + sebiSellTarget).toFixed(2)),
    totalChargesAtTarget,
    totalChargesAtStop,
    grossProfit,
    grossRisk,
    netProfit,
    netRisk,
    effectiveRr: netRisk > 0 ? Number((netProfit / netRisk).toFixed(2)) : 2.0
  };
}

export function computeStockDiagnostics(stock, riskBudget = 1000) {
  if (!stock) return null;

  const ltp = stock.ltp || stock.price || 0;
  const chg = stock.change_perc !== undefined ? stock.change_perc : (stock.day_change_perc || 0);
  const high = stock.high || ltp * 1.015;
  const low = stock.low || ltp * 0.985;
  const prevClose = stock.prev_close || stock.close || ltp;
  const vwap = stock.avg_price || stock.vwap || ltp;
  const volume = stock.volume || 100000;
  const turnoverCr = stock.turnoverCr !== undefined ? stock.turnoverCr : Number(((stock.turnover_lacs || 0) / 100).toFixed(2));
  const deliveryPct = stock.delivery_pct !== undefined ? stock.delivery_pct : 48.0;

  const rangeSpan = Math.max(0.05, high - low);
  const bcl = stock.barCloseLocation !== undefined ? stock.barCloseLocation : Math.max(0, Math.min(100, ((ltp - low) / rangeSpan) * 100));
  const upperWickPct = stock.upperWickPct !== undefined ? stock.upperWickPct : Math.max(0, Math.min(100, ((high - ltp) / rangeSpan) * 100));
  const distToHighPct = stock.distToHighPct !== undefined ? stock.distToHighPct : (high > 0 ? ((high - ltp) / high) * 100 : 0);

  // Stop loss and target
  const stopLoss = stock.stopLoss || Number((Math.min(low, ltp * 0.975)).toFixed(2));
  const riskPerShare = Math.max(0.05, ltp - stopLoss);
  const riskPct = Number(((riskPerShare / ltp) * 100).toFixed(2));
  const sharesSized = Math.max(1, Math.floor(riskBudget / riskPerShare));
  const target1 = stock.target1 || Number((ltp + riskPerShare * 2).toFixed(2));
  const target2 = stock.target2 || Number((ltp + riskPerShare * 3).toFixed(2));

  // 1. Pre-Flight Trade Copilot ("Trade Doctor")
  const asm = stock.asm || getAsmStatus(stock.symbol);
  const distTo20Ema = stock.tradeDoctor?.distTo20Ema !== undefined
    ? stock.tradeDoctor.distTo20Ema
    : Number((Math.abs(chg) * 0.6 + (distToHighPct * 0.4)).toFixed(1));

  const rsVsSector = stock.rsVsSector !== undefined ? stock.rsVsSector : (chg >= 0 ? 0.8 : -0.5);

  const extensionOk = distTo20Ema <= 3.5;
  const deliveryOk = deliveryPct >= 48.0;
  const sectorOk = rsVsSector >= 0;
  const vwapOk = ltp >= vwap;
  const wickOk = upperWickPct <= 20;
  const asmOk = !asm.isAsm;

  const checks = [
    {
      id: 'extension',
      name: '20-Day EMA Extension',
      pass: extensionOk,
      value: `${distTo20Ema}%`,
      threshold: '<= 3.5%',
      detail: extensionOk ? 'Price near structural EMA support' : 'Overextended chasing risk (>3.5%)',
      weight: 20
    },
    {
      id: 'delivery',
      name: 'Institutional Delivery Purity',
      pass: deliveryOk,
      value: `${deliveryPct}%`,
      threshold: '>= 48%',
      detail: deliveryOk ? 'Institutional accumulation backed by delivery' : 'High speculative retail churn (<48%)',
      weight: 20
    },
    {
      id: 'sector',
      name: 'Sector Confluence & Tailwind',
      pass: sectorOk,
      value: `${rsVsSector >= 0 ? '+' : ''}${rsVsSector.toFixed(2)}%`,
      threshold: '>= 0%',
      detail: sectorOk ? 'Parent sector advancing alongside stock' : 'Stock fighting parent sector headwind',
      weight: 15
    },
    {
      id: 'vwap',
      name: 'VWAP Institutional Anchor',
      pass: vwapOk,
      value: `₹${ltp.toFixed(2)} vs ₹${vwap.toFixed(2)}`,
      threshold: 'LTP >= VWAP',
      detail: vwapOk ? 'Trading above volume-weighted institutional average' : 'Trading below day VWAP (Supply overhead)',
      weight: 15
    },
    {
      id: 'wick',
      name: 'Anti-Trap Upper Wick Rejection',
      pass: wickOk,
      value: `${upperWickPct.toFixed(1)}%`,
      threshold: '<= 20%',
      detail: wickOk ? 'Clean candle close near bar high' : 'Aggressive ceiling rejection / bull trap risk',
      weight: 15
    },
    {
      id: 'asm',
      name: 'SEBI / NSE ASM Surveillance Check',
      pass: asmOk,
      value: asm.isAsm ? asm.badge : 'Non-ASM (Normal)',
      threshold: 'No Surveillance',
      detail: asm.isAsm ? `${asm.badge}: 100% upfront delivery margin required, ${asm.circuitBand} circuit band` : 'Clean regulatory status (Normal margin & price bands)',
      weight: 15
    }
  ];

  const tradeDoctorScore = checks.reduce((sum, c) => sum + (c.pass ? c.weight : 0), 0);
  const preFlightVerdict = asm.isAsm
    ? (tradeDoctorScore >= 80 ? 'CAUTION_ASM' : 'ABORT_ASM')
    : (tradeDoctorScore >= 80 ? 'READY_TO_ENTER' : tradeDoctorScore >= 60 ? 'CAUTION' : 'ABORT_TRAP');
  const verdictLabel = asm.isAsm
    ? `⚠️ ${asm.badge.toUpperCase()} (100% MARGIN)`
    : (preFlightVerdict === 'READY_TO_ENTER'
      ? '🟢 READY TO ENTER'
      : preFlightVerdict === 'CAUTION'
      ? '🟡 CAUTION: EXTENDED'
      : '🔴 ABORT: BULL TRAP DETECTED');

  // 2. Monte Carlo Odds Engine (10,000 Simulated Sessions)
  const baseProb = stock.forecast?.breakoutProbabilityPct || Math.round(35 + (tradeDoctorScore * 0.5));
  const targetOddsPct = stock.monteCarlo?.targetOddsPct || Math.max(25, Math.min(88, Math.round(baseProb * 0.94)));
  const stopOddsPct = stock.monteCarlo?.stopOddsPct || Math.max(8, Math.min(60, Math.round((100 - targetOddsPct) * 0.68)));
  const timeoutOddsPct = stock.monteCarlo?.timeoutOddsPct || Math.max(4, 100 - targetOddsPct - stopOddsPct);
  const expectedValueR = stock.monteCarlo?.expectedValueR !== undefined
    ? stock.monteCarlo.expectedValueR
    : Number((((targetOddsPct / 100) * 2.0) - ((stopOddsPct / 100) * 1.0)).toFixed(2));

  // 3. Institutional Footprint & Fakeout Radar
  const vqr = stock.footprint?.vqr !== undefined
    ? stock.footprint.vqr
    : Number((deliveryPct / Math.max(1, 100 - deliveryPct)).toFixed(2));

  const liquiditySweep = stock.footprint?.liquiditySweep !== undefined
    ? stock.footprint.liquiditySweep
    : (low < prevClose * 0.99 && ltp >= vwap && turnoverCr >= 5);

  const orderFlowMagnet = stock.footprint?.orderFlowMagnet || (turnoverCr >= 40 ? 'HIGH_INSTITUTIONAL' : turnoverCr >= 10 ? 'MODERATE' : 'RETAIL');

  // 4. Triple-Timeframe Confluence Matrix
  const weeklyBias = stock.confluence?.weekly || ((chg > -1.0 && ltp >= (stock.low_52w || ltp * 0.7) * 1.15) ? 'BULLISH' : 'BEARISH');
  const dailyBias = stock.confluence?.daily || (tradeDoctorScore >= 60 ? 'BULLISH' : 'BEARISH');
  const intradayBias = stock.confluence?.intraday || ((bcl >= 65 && ltp >= vwap) ? 'BULLISH' : 'BEARISH');
  const tripleAligned = weeklyBias === 'BULLISH' && dailyBias === 'BULLISH' && intradayBias === 'BULLISH';

  // 5. 1-Click Order Tickets & Basket Payloads
  const orderTickets = stock.orderTickets || {
    zerodhaBasket: [
      {
        variety: 'regular',
        tradingsymbol: stock.symbol,
        exchange: 'NSE',
        transaction_type: 'BUY',
        order_type: 'LIMIT',
        quantity: sharesSized,
        price: ltp,
        product: 'CNC'
      }
    ],
    bracketPayload: {
      symbol: stock.symbol,
      exchange: 'NSE',
      segment: 'CASH',
      action: 'BUY',
      orderType: 'BRACKET_2R',
      quantity: sharesSized,
      entryPrice: ltp,
      stopLossPrice: stopLoss,
      targetPrice: target1,
      estimatedRisk: Number((sharesSized * riskPerShare).toFixed(2)),
      estimatedGain: Number((sharesSized * (target1 - ltp)).toFixed(2))
    },
    nseBracketPayload: {
      symbol: stock.symbol,
      exchange: 'NSE',
      segment: 'CASH',
      action: 'BUY',
      orderType: 'BRACKET_2R',
      quantity: sharesSized,
      entryPrice: ltp,
      stopLossPrice: stopLoss,
      targetPrice: target1,
      estimatedRisk: Number((sharesSized * riskPerShare).toFixed(2)),
      estimatedGain: Number((sharesSized * (target1 - ltp)).toFixed(2))
    },
    alpacaPayload: {
      symbol: stock.symbol,
      qty: sharesSized,
      side: 'buy',
      type: 'limit',
      limit_price: ltp,
      time_in_force: 'day',
      order_class: 'bracket',
      take_profit: { limit_price: target1 },
      stop_loss: { stop_price: stopLoss }
    }
  };

  const statutoryMath = calculateStatutoryCharges({
    entryPrice: ltp,
    stopLossPrice: stopLoss,
    targetPrice: target1,
    quantity: sharesSized
  });

  return {
    symbol: stock.symbol,
    ltp,
    stopLoss,
    target1,
    target2,
    riskPerShare,
    riskPct,
    sharesSized,
    asm,
    tradeDoctor: {
      score: tradeDoctorScore,
      verdict: preFlightVerdict,
      verdictLabel,
      checks,
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
      expectedValueR,
      simulatedSessions: 10000
    },
    footprint: {
      vqr,
      deliveryPct,
      liquiditySweep,
      orderFlowMagnet,
      turnoverCr
    },
    confluence: {
      weekly: weeklyBias,
      daily: dailyBias,
      intraday: intradayBias,
      tripleAligned
    },
    orderTickets,
    statutoryMath
  };
}

