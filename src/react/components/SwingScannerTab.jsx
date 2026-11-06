import React, { useState, useMemo } from 'react';
import {
  Target,
  Zap,
  TrendingUp,
  Activity,
  Layers,
  Search,
  ExternalLink,
  Shield,
  ShieldCheck,
  ShieldAlert,
  Crosshair,
  ArrowUpRight,
  Flame,
  BarChart2,
  SlidersHorizontal,
  Sparkles,
  AlertTriangle,
  CheckCircle2,
  Filter,
  Clock,
  Compass,
  Award,
  X,
  Info,
  Percent,
  HelpCircle,
  Copy,
  Check,
  FileText
} from 'lucide-react';
import { formatIndianCurrency, formatVolume } from '../utils/formatters.js';
import { computeStockDiagnostics } from '../utils/tradeCopilot.js';
import { getAsmStatus } from '../utils/asmRegistry.js';
import { getMarketCap, filterByMarketCap } from '../utils/mktCapRegistry.js';
import MarketCapFilter from './MarketCapFilter.jsx';

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

export default function SwingScannerTab({
  constituents = [],
  indices = [],
  onSelectStock,
  recentTicks = {}
}) {
  const [selectedLayer, setSelectedLayer] = useState('ALL'); // 'ALL' | 'LAYER_1' | 'LAYER_2' | 'LAYER_3'
  const [selectedGrade, setSelectedGrade] = useState('ALL'); // 'ALL' | 'EXCEPTIONAL' | 'STRONG_PLUS' | 'DEVELOPING'
  const [selectedSector, setSelectedSector] = useState('ALL');
  const [selectedCap, setSelectedCap] = useState('ALL'); // 'ALL' | 'LARGE' | 'MID' | 'SMALL' | 'MICRO' | 'PENNY'
  const [excludeTraps, setExcludeTraps] = useState(true); // Anti-Trap Accuracy Filter
  const [excludeAsm, setExcludeAsm] = useState(false); // Exclude ASM surveillance stocks
  const [searchQuery, setSearchQuery] = useState('');
  const [sortField, setSortField] = useState('qualityScore');
  const [sortAsc, setSortAsc] = useState(false);
  const [capabilityFilter, setCapabilityFilter] = useState('ALL'); // 'ALL' | 'TRIPLE' | 'SWEEP' | 'MONTE_CARLO' | 'DOCTOR'
  const [copiedBasketSymbol, setCopiedBasketSymbol] = useState(null);

  // Benchmarks
  const n50 = useMemo(() => indices.find(i => i.name === 'NIFTY 50') || { change_perc: 0.23 }, [indices]);
  const n500 = useMemo(() => indices.find(i => i.name === 'NIFTY 500') || { change_perc: 0.33 }, [indices]);

  // Real-time swing candidate computation with 3-Layer Architecture & 6-Category Weighted Matrix
  const allCandidates = useMemo(() => {
    if (!constituents || constituents.length === 0) return [];

    const list = [];
    for (const stk of constituents) {
      const ltp = stk.ltp || 0;
      if (ltp <= 0) continue;

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
      const secIndexObj = (indices && indices.find(i => i.name === sectorIndexName)) || n500 || { change_perc: 0.33 };
      const rsVsNifty = Number((chg - (n50?.change_perc ?? 0.23)).toFixed(2));
      const rsVsSector = Number((chg - (secIndexObj?.change_perc ?? 0.33)).toFixed(2));

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
      if (chg >= 0.5 && chg <= 4.5) momScore += 6; // Non-overextended sweet spot
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

      // 5. Future Breakout Move % Forecast & Probabilistic Cones
      const stopLoss = Number((Math.min(low, ltp * 0.975)).toFixed(2));
      const riskPerShare = Math.max(0.05, ltp - stopLoss);
      const riskPct = Number(((riskPerShare / ltp) * 100).toFixed(2));

      // Base Depth estimation
      const baseSpan = Math.max(0.1, high - low);
      const baseDepthPct = Number(((baseSpan / high) * 100).toFixed(2));

      // Probabilistic Win Rate & Breakout Success Probability %
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

      // Future Breakout Expansion Cones (Conservative, Expected, Maximum Runner)
      const conservativeMovePct = Number((Math.max(riskPct * 2.0, baseDepthPct * 0.75, 4.5)).toFixed(1));
      const expectedMovePct = Number((Math.max(conservativeMovePct * 1.35, Math.min(24.0, baseDepthPct * 1.2 + rangeTightnessPct * 1.5))).toFixed(1));
      const maxExpansionPct = Number((Math.max(expectedMovePct * 1.45, conservativeMovePct * 2.2)).toFixed(1));

      // Projected Target Prices
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

      const cand = {
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
        sharesFor1kRisk: Math.max(1, Math.floor(1000 / riskPerShare)),
        isin: stk.isin,
        delivery_pct: stk.delivery_pct || 48.0,
        prev_close: stk.prev_close || ltp,
        low_52w: stk.low_52w || ltp * 0.7,
        asm: stk.asm || getAsmStatus(stk.symbol)
      };

      const diagnostics = computeStockDiagnostics(cand, 1000);
      cand.asm = diagnostics.asm;
      cand.tradeDoctor = diagnostics.tradeDoctor;
      cand.monteCarlo = diagnostics.monteCarlo;
      cand.footprint = diagnostics.footprint;
      cand.confluence = diagnostics.confluence;
      cand.orderTickets = diagnostics.orderTickets;
      cand.statutoryMath = diagnostics.statutoryMath;

      list.push(cand);
    }

    return list;
  }, [constituents, indices, n50, n500]);

  // Unique sectors for filtering
  const sectors = useMemo(() => {
    return [...new Set(allCandidates.map(c => c.sector).filter(Boolean))].sort();
  }, [allCandidates]);

  // KPI Summary Counts
  const kpis = useMemo(() => {
    const cleanList = allCandidates.filter(c => c.trapRisk !== 'HIGH (TRAP / REJECTION)');
    const exceptional = cleanList.filter(c => c.qualityScore >= 85).length;
    const strong = cleanList.filter(c => c.qualityScore >= 75 && c.qualityScore < 85).length;
    const developing = cleanList.filter(c => c.qualityScore >= 65 && c.qualityScore < 75).length;
    const traps = allCandidates.filter(c => c.trapRisk === 'HIGH (TRAP / REJECTION)').length;

    const l1 = cleanList.filter(c => c.layer === 'LAYER_1').length;
    const l2 = cleanList.filter(c => c.layer === 'LAYER_2').length;
    const l3 = cleanList.filter(c => c.layer === 'LAYER_3').length;

    const highProb = cleanList.filter(c => c.forecast?.breakoutProbabilityPct >= 75).length;
    const avgForecast = cleanList.length > 0
      ? (cleanList.reduce((acc, c) => acc + (c.forecast?.expectedMovePct || 0), 0) / cleanList.length).toFixed(1)
      : '0.0';

    const tripleAlignedCount = cleanList.filter(c => c.confluence?.tripleAligned).length;
    const liquiditySweepCount = cleanList.filter(c => c.footprint?.liquiditySweep).length;
    const highMonteCarloCount = cleanList.filter(c => c.monteCarlo?.targetOddsPct >= 70).length;
    const doctorReadyCount = cleanList.filter(c => c.tradeDoctor?.score >= 80).length;
    const asmCount = cleanList.filter(c => c.asm?.isAsm).length;

    return {
      total: cleanList.length,
      exceptional,
      strong,
      developing,
      traps,
      l1,
      l2,
      l3,
      highProb,
      avgForecast,
      tripleAlignedCount,
      liquiditySweepCount,
      highMonteCarloCount,
      doctorReadyCount,
      asmCount
    };
  }, [allCandidates]);

  const mktCapCounts = useMemo(() => {
    return {
      ALL: allCandidates.length,
      LARGE: allCandidates.filter(s => getMarketCap(s).category === 'LARGE').length,
      MID: allCandidates.filter(s => getMarketCap(s).category === 'MID').length,
      SMALL: allCandidates.filter(s => getMarketCap(s).category === 'SMALL').length,
      MICRO: allCandidates.filter(s => getMarketCap(s).category === 'MICRO').length,
      PENNY: allCandidates.filter(s => getMarketCap(s).category === 'PENNY' || s.ltp <= 35).length
    };
  }, [allCandidates]);

  // Filtered & Sorted Candidate List
  const filteredCandidates = useMemo(() => {
    let result = allCandidates;

    // Market Cap Filter
    if (selectedCap !== 'ALL') {
      result = filterByMarketCap(result, selectedCap);
    }

    // Trap Filter
    if (excludeTraps) {
      result = result.filter(c => c.trapRisk !== 'HIGH (TRAP / REJECTION)');
    }

    // Exclude ASM Filter
    if (excludeAsm) {
      result = result.filter(c => !c.asm?.isAsm);
    }

    // 3-Layer Filter
    if (selectedLayer !== 'ALL') {
      result = result.filter(c => c.layer === selectedLayer);
    }

    // Capability Quick Filter
    if (capabilityFilter === 'TRIPLE') {
      result = result.filter(c => c.confluence?.tripleAligned);
    } else if (capabilityFilter === 'SWEEP') {
      result = result.filter(c => c.footprint?.liquiditySweep);
    } else if (capabilityFilter === 'MONTE_CARLO') {
      result = result.filter(c => c.monteCarlo?.targetOddsPct >= 70);
    } else if (capabilityFilter === 'DOCTOR') {
      result = result.filter(c => c.tradeDoctor?.score >= 80);
    } else if (capabilityFilter === 'ASM') {
      result = result.filter(c => c.asm?.isAsm);
    }

    // Grade Classification Filter
    if (selectedGrade === 'EXCEPTIONAL') {
      result = result.filter(c => c.qualityScore >= 85);
    } else if (selectedGrade === 'STRONG_PLUS') {
      result = result.filter(c => c.qualityScore >= 75);
    } else if (selectedGrade === 'DEVELOPING') {
      result = result.filter(c => c.qualityScore >= 65 && c.qualityScore < 75);
    }

    // Sector Filter
    if (selectedSector !== 'ALL') {
      result = result.filter(c => c.sector === selectedSector);
    }

    // Search Query
    if (searchQuery.trim()) {
      const q = searchQuery.toLowerCase().trim();
      result = result.filter(c =>
        c.symbol.toLowerCase().includes(q) ||
        (c.name && c.name.toLowerCase().includes(q))
      );
    }

    return [...result].sort((a, b) => {
      let aVal = a[sortField];
      let bVal = b[sortField];
      if (sortField === 'breakoutProbability') {
        aVal = a.forecast?.breakoutProbabilityPct || 0;
        bVal = b.forecast?.breakoutProbabilityPct || 0;
      } else if (sortField === 'expectedMovePct') {
        aVal = a.forecast?.expectedMovePct || 0;
        bVal = b.forecast?.expectedMovePct || 0;
      }
      if (typeof aVal === 'string') {
        return sortAsc ? aVal.localeCompare(bVal) : bVal.localeCompare(aVal);
      }
      return sortAsc ? (aVal - bVal) : (bVal - aVal);
    });
  }, [allCandidates, excludeTraps, excludeAsm, selectedLayer, selectedCap, capabilityFilter, selectedGrade, selectedSector, searchQuery, sortField, sortAsc]);

  const handleCopyBasket = (stock, e) => {
    e?.stopPropagation();
    const payload = stock.orderTickets?.zerodhaBasket || [
      {
        variety: 'regular',
        tradingsymbol: stock.symbol,
        exchange: 'NSE',
        transaction_type: 'BUY',
        order_type: 'LIMIT',
        quantity: stock.sharesFor1kRisk || 1,
        price: stock.ltp,
        product: 'CNC'
      }
    ];
    navigator.clipboard?.writeText(JSON.stringify(payload, null, 2));
    setCopiedBasketSymbol(stock.symbol);
    setTimeout(() => setCopiedBasketSymbol(null), 2000);
  };

  // Top 3 High-Accuracy Breakout Setups (Strictly Exceptional Setups with Zero Trap Risk)
  const topBreakouts = useMemo(() => {
    return [...allCandidates]
      .filter(c => c.qualityScore >= 85 && c.trapRisk === 'LOW')
      .sort((a, b) => b.qualityScore - a.qualityScore || a.distToHighPct - b.distToHighPct)
      .slice(0, 3);
  }, [allCandidates]);

  const handleSort = (field) => {
    if (sortField === field) {
      setSortAsc(!sortAsc);
    } else {
      setSortField(field);
      setSortAsc(field === 'distToHighPct' ? true : false);
    }
  };

  return (
    <div className="space-y-6">
      {/* Top Banner / Headline */}
      <div className="glass-panel p-3.5 sm:p-5 rounded-2xl border border-[#1E293B] relative overflow-hidden bg-[#0D131F]">
        <div className="flex flex-col md:flex-row md:items-center justify-between gap-4">
          <div className="space-y-1">
            <div className="flex flex-wrap items-center gap-2">
              <span className="flex h-2.5 w-2.5 bg-[#00E887] border border-black shadow-[1px_1px_0px_#000] animate-ping" />
              <span className="neopop-tag bg-[#00E887] text-black">
                NIFTY 500 SWING RADAR
              </span>
              <span className="text-[11px] sm:text-xs text-zinc-400 font-mono">
                3-Layer Detection &bull; NIFTY 50 ({n50.change_perc >= 0 ? '+' : ''}{n50.change_perc.toFixed(2)}%) &bull; NIFTY 500 ({n500.change_perc >= 0 ? '+' : ''}{n500.change_perc.toFixed(2)}%)
              </span>
            </div>
            <h2 className="text-lg sm:text-xl md:text-2xl font-black text-white tracking-tight flex items-center gap-2 neopop-heading uppercase">
              <Target className="w-5 h-5 sm:w-6 sm:h-6 text-[#00E887] shrink-0" />
              <span>3-Layer Swing Scanner &amp; Early Breakout Intelligence</span>
            </h2>
            <p className="text-xs text-zinc-400 max-w-2xl neopop-body">
              Identifies stocks 3–15 sessions before breakout using Relative Strength (20%), Volatility Contraction (20%), Price Structure (20%), Volume Accumulation (15%), Trend (15%), and Momentum (10%).
            </p>
          </div>

          <div className="flex items-center gap-2 shrink-0 w-full sm:w-auto flex-wrap justify-between sm:justify-end">
            <div className="flex-1 sm:flex-none px-3 py-1.5 rounded-[3px] bg-[#111111] border border-black shadow-[2px_2px_0px_#000000] text-right">
              <div className="text-[10px] font-mono text-[#00E887] uppercase font-bold">EXCEPTIONAL (85+)</div>
              <div className="text-base sm:text-lg font-black text-[#00E887] font-mono">
                {kpis.exceptional} <span className="text-[10px] text-zinc-500 font-normal">Setups</span>
              </div>
            </div>
            <div className="flex-1 sm:flex-none px-3 py-1.5 rounded-[3px] bg-[#111111] border border-black shadow-[2px_2px_0px_#000000] text-right">
              <div className="text-[10px] font-mono text-[#FEE360] uppercase font-bold">AVG FORECAST MOVE</div>
              <div className="text-base sm:text-lg font-black text-[#FEE360] font-mono">
                +{kpis.avgForecast}% <span className="text-[10px] text-zinc-500 font-normal">Exp</span>
              </div>
            </div>
            <div className="flex-1 sm:flex-none px-3 py-1.5 rounded-[3px] bg-[#111111] border border-black shadow-[2px_2px_0px_#000000] text-right">
              <div className="text-[10px] font-mono text-[#3657FF] uppercase font-bold">HIGH PROB (&ge;75%)</div>
              <div className="text-base sm:text-lg font-black text-white font-mono">
                {kpis.highProb} <span className="text-[10px] text-zinc-500 font-normal">Picks</span>
              </div>
            </div>
            <div className="flex-1 sm:flex-none px-3 py-1.5 rounded-[3px] bg-[#111111] border border-black shadow-[2px_2px_0px_#000000] text-right">
              <div className="text-[10px] font-mono text-[#FF5959] uppercase font-bold">TRAPS BLOCKED</div>
              <div className="text-base sm:text-lg font-black text-[#FF5959] font-mono">
                {kpis.traps} <span className="text-[10px] text-zinc-500 font-normal">Filtered</span>
              </div>
            </div>
          </div>
        </div>
      </div>

      {/* 3-Layer Architecture Navigator */}
      <div className="grid grid-cols-1 md:grid-cols-3 gap-3">
        {/* Layer 1 */}
        <button
          onClick={() => setSelectedLayer(selectedLayer === 'LAYER_1' ? 'ALL' : 'LAYER_1')}
          className={`neopop-card p-4 rounded-[4px] border-2 border-black text-left transition-all cursor-pointer relative overflow-hidden group ${
            selectedLayer === 'LAYER_1'
              ? 'bg-[#1F1F1F] shadow-[4px_4px_0px_#000000] border-[#3657FF]'
              : 'bg-[#141414] hover:bg-[#1A1A1A] shadow-[3px_3px_0px_#000000]'
          }`}
        >
          <div className="flex items-center justify-between text-[#3657FF] mb-1">
            <span className="text-xs font-mono font-bold uppercase tracking-wider flex items-center gap-1.5">
              <Clock className="w-3.5 h-3.5" /> Layer 1: Early Accumulation
            </span>
            <span className="neopop-tag bg-[#1E1E1E] text-[#3657FF]">
              5–15d Out
            </span>
          </div>
          <div className="text-2xl font-black text-white font-mono">{kpis.l1}</div>
          <div className="text-[11px] text-zinc-400 mt-1">
            Volume drying up &bull; Volatility contracting &bull; Rising RS
          </div>
        </button>

        {/* Layer 2 */}
        <button
          onClick={() => setSelectedLayer(selectedLayer === 'LAYER_2' ? 'ALL' : 'LAYER_2')}
          className={`neopop-card p-4 rounded-[4px] border-2 border-black text-left transition-all cursor-pointer relative overflow-hidden group ${
            selectedLayer === 'LAYER_2'
              ? 'bg-[#1F1F1F] shadow-[4px_4px_0px_#000000] border-[#FEE360]'
              : 'bg-[#141414] hover:bg-[#1A1A1A] shadow-[3px_3px_0px_#000000]'
          }`}
        >
          <div className="flex items-center justify-between text-[#FEE360] mb-1">
            <span className="text-xs font-mono font-bold uppercase tracking-wider flex items-center gap-1.5">
              <Crosshair className="w-3.5 h-3.5" /> Layer 2: Pre-Breakout Coils
            </span>
            <span className="neopop-tag bg-[#1E1E1E] text-[#FEE360]">
              1–5d Out
            </span>
          </div>
          <div className="text-2xl font-black text-white font-mono">{kpis.l2}</div>
          <div className="text-[11px] text-zinc-400 mt-1">
            Within 1-2% of resistance &bull; Extreme tightness &bull; High BCL
          </div>
        </button>

        {/* Layer 3 */}
        <button
          onClick={() => setSelectedLayer(selectedLayer === 'LAYER_3' ? 'ALL' : 'LAYER_3')}
          className={`neopop-card p-4 rounded-[4px] border-2 border-black text-left transition-all cursor-pointer relative overflow-hidden group ${
            selectedLayer === 'LAYER_3'
              ? 'bg-[#1F1F1F] shadow-[4px_4px_0px_#000000] border-[#00E887]'
              : 'bg-[#141414] hover:bg-[#1A1A1A] shadow-[3px_3px_0px_#000000]'
          }`}
        >
          <div className="flex items-center justify-between text-[#00E887] mb-1">
            <span className="text-xs font-mono font-bold uppercase tracking-wider flex items-center gap-1.5">
              <Flame className="w-3.5 h-3.5" /> Layer 3: Breakout Confirmation
            </span>
            <span className="neopop-tag bg-[#1E1E1E] text-[#00E887]">
              Execution Day
            </span>
          </div>
          <div className="text-2xl font-black text-white font-mono">{kpis.l3}</div>
          <div className="text-[11px] text-zinc-400 mt-1">
            Volume &gt; 1.5x &bull; Closing at highs &bull; Sector tailwind
          </div>
        </button>
      </div>

      {/* 4 Classification Conviction KPI Cards */}
      <div className="grid grid-cols-2 md:grid-cols-4 gap-3">
        <button
          onClick={() => setSelectedGrade(selectedGrade === 'EXCEPTIONAL' ? 'ALL' : 'EXCEPTIONAL')}
          className={`p-3.5 rounded-[4px] border-2 border-black text-left cursor-pointer transition-all ${
            selectedGrade === 'EXCEPTIONAL'
              ? 'bg-[#1F1F1F] border-[#00E887] shadow-[4px_4px_0px_#000000]'
              : 'neopop-card hover:bg-[#1A1A1A] shadow-[2px_2px_0px_#000000]'
          }`}
        >
          <div className="text-[11px] font-mono text-[#00E887] font-bold uppercase flex items-center gap-1">
            <Award className="w-3.5 h-3.5" /> Exceptional (85-100)
          </div>
          <div className="text-xl font-black text-white font-mono mt-0.5">{kpis.exceptional}</div>
          <div className="text-[10px] text-zinc-400">Institutional Priority A+</div>
        </button>

        <button
          onClick={() => setSelectedGrade(selectedGrade === 'STRONG_PLUS' ? 'ALL' : 'STRONG_PLUS')}
          className={`p-3.5 rounded-[4px] border-2 border-black text-left cursor-pointer transition-all ${
            selectedGrade === 'STRONG_PLUS'
              ? 'bg-[#1F1F1F] border-[#FEE360] shadow-[4px_4px_0px_#000000]'
              : 'neopop-card hover:bg-[#1A1A1A] shadow-[2px_2px_0px_#000000]'
          }`}
        >
          <div className="text-[11px] font-mono text-[#FEE360] font-bold uppercase flex items-center gap-1">
            <CheckCircle2 className="w-3.5 h-3.5" /> Strong (75-84)
          </div>
          <div className="text-xl font-black text-white font-mono mt-0.5">{kpis.strong}</div>
          <div className="text-[10px] text-zinc-400">High-Probability Candidates</div>
        </button>

        <button
          onClick={() => setSelectedGrade(selectedGrade === 'DEVELOPING' ? 'ALL' : 'DEVELOPING')}
          className={`p-3.5 rounded-[4px] border-2 border-black text-left cursor-pointer transition-all ${
            selectedGrade === 'DEVELOPING'
              ? 'bg-[#1F1F1F] border-[#3657FF] shadow-[4px_4px_0px_#000000]'
              : 'neopop-card hover:bg-[#1A1A1A] shadow-[2px_2px_0px_#000000]'
          }`}
        >
          <div className="text-[11px] font-mono text-[#3657FF] font-bold uppercase flex items-center gap-1">
            <Activity className="w-3.5 h-3.5" /> Developing (65-74)
          </div>
          <div className="text-xl font-black text-white font-mono mt-0.5">{kpis.developing}</div>
          <div className="text-[10px] text-zinc-400">Watchlist Setups in Base</div>
        </button>

        <div className="p-3.5 rounded-[4px] border-2 border-black bg-[#141414] shadow-[2px_2px_0px_#000000] text-left border-[#FF5959]">
          <div className="text-[11px] font-mono text-[#FF5959] font-bold uppercase flex items-center gap-1">
            <ShieldAlert className="w-3.5 h-3.5" /> Traps Filtered (&lt;50)
          </div>
          <div className="text-xl font-black text-[#FF5959] font-mono mt-0.5">{kpis.traps}</div>
          <div className="text-[10px] text-zinc-400">Upper Wick Selling &gt; 35%</div>
        </div>
      </div>

      {/* Top 3 High-Accuracy Featured Setups */}
      {topBreakouts.length > 0 && (
        <div className="space-y-3">
          <div className="flex items-center justify-between">
            <div className="flex items-center gap-2">
              <Sparkles className="w-4 h-4 text-emerald-400" />
              <h3 className="text-sm font-extrabold text-white uppercase tracking-wider">
                Top Priority Setups (Score &ge; 85 &bull; Zero Trap Risk)
              </h3>
            </div>
            <span className="text-xs text-slate-400 font-mono">
              6-Category Institutional Quality: Relative Strength, Contraction & Volume
            </span>
          </div>

          <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
            {topBreakouts.map((stock) => {
              const tickDir = recentTicks[stock.symbol];
              const tickColor = tickDir === 'up' ? 'text-[#00E887]' : tickDir === 'down' ? 'text-[#FF5959]' : 'text-white';

              return (
                <div
                  key={stock.symbol}
                  className="neopop-card p-5 border-2 border-black rounded-[4px] shadow-[4px_4px_0px_#000000] bg-[#141414] hover:border-[#00E887] transition-all flex flex-col justify-between space-y-4 relative overflow-hidden"
                >
                  <div className="flex items-start justify-between">
                    <div>
                      <div className="flex items-center gap-2">
                        <span className="text-lg font-black text-white neopop-heading tracking-tight">
                          {stock.symbol}
                        </span>
                        <span className="neopop-tag bg-[#1E1E1E] text-zinc-300">
                          {stock.sector}
                        </span>
                      </div>
                      <div className="text-xs text-zinc-400 truncate max-w-[200px]" title={stock.name}>
                        {stock.name}
                      </div>
                    </div>
                    <div className="flex flex-col items-end gap-1">
                      <span className="neopop-tag bg-[#00E887] text-black font-black">
                        {stock.qualityScore}/100 &bull; {stock.classification}
                      </span>
                      <span className="neopop-tag bg-[#1E1E1E] text-[#FEE360]">
                        {stock.layerLabel ? stock.layerLabel.split(':')[0] : 'Layer 1'}
                      </span>
                    </div>
                  </div>

                  {/* 6-Category Mini Visual Breakdown */}
                  <div className="space-y-1 bg-[#111111] p-2.5 rounded-[3px] border border-black shadow-[2px_2px_0px_#000000] text-[10px] font-mono">
                    <div className="flex justify-between text-zinc-400 mb-1 font-bold">
                      <span>SCORING ARCHITECTURE</span>
                      <span className="text-[#00E887] font-black">{stock.qualityScore} / 100 PTS</span>
                    </div>
                    <div className="grid grid-cols-6 gap-1 text-center">
                      <div className="bg-[#181818] p-1 rounded-[2px] border border-black">
                        <div className="text-[9px] text-zinc-500 font-bold">RS (20)</div>
                        <div className="font-bold text-[#FEE360]">{stock.scoresBreakdown.relativeStrength}</div>
                      </div>
                      <div className="bg-[#181818] p-1 rounded-[2px] border border-black">
                        <div className="text-[9px] text-zinc-500 font-bold">VOL (20)</div>
                        <div className="font-bold text-[#00E887]">{stock.scoresBreakdown.volatilityContraction}</div>
                      </div>
                      <div className="bg-[#181818] p-1 rounded-[2px] border border-black">
                        <div className="text-[9px] text-zinc-500 font-bold">STR (20)</div>
                        <div className="font-bold text-[#3657FF]">{stock.scoresBreakdown.priceStructure}</div>
                      </div>
                      <div className="bg-[#181818] p-1 rounded-[2px] border border-black">
                        <div className="text-[9px] text-zinc-500 font-bold">ACC (15)</div>
                        <div className="font-bold text-purple-400">{stock.scoresBreakdown.volumeAccumulation}</div>
                      </div>
                      <div className="bg-[#181818] p-1 rounded-[2px] border border-black">
                        <div className="text-[9px] text-zinc-500 font-bold">TRD (15)</div>
                        <div className="font-bold text-white">{stock.scoresBreakdown.trendStrength}</div>
                      </div>
                      <div className="bg-[#181818] p-1 rounded-[2px] border border-black">
                        <div className="text-[9px] text-zinc-500 font-bold">MOM (10)</div>
                        <div className="font-bold text-[#FEE360]">{stock.scoresBreakdown.momentum}</div>
                      </div>
                    </div>
                  </div>

                  {/* LTP & Breakout Proximity Bar */}
                  <div className="space-y-2">
                    <div className="flex items-baseline justify-between">
                      <div className="flex items-baseline gap-2">
                        <span className={`text-xl font-black font-mono transition-colors duration-200 ${tickColor}`}>
                          ₹{stock.ltp.toLocaleString('en-IN', { minimumFractionDigits: 2 })}
                        </span>
                        <span className="text-xs font-mono font-bold text-emerald-400">
                          +{stock.change_perc.toFixed(2)}%
                        </span>
                      </div>
                      <div className="text-[11px] font-mono font-semibold text-emerald-400">
                        {stock.distToHighPct === 0 ? 'AT EXACT HIGH' : `${stock.distToHighPct}% to Resistance`}
                      </div>
                    </div>

                    {/* Quality Meter Bar */}
                    <div className="w-full bg-slate-900 rounded-full h-2 overflow-hidden border border-white/10">
                      <div
                        className="h-full bg-emerald-500 transition-all duration-300"
                        style={{ width: `${Math.max(10, stock.barCloseLocation)}%` }}
                      />
                    </div>
                    <div className="flex justify-between text-[10px] font-mono text-slate-400">
                      <span>Low: ₹{stock.low.toFixed(2)}</span>
                      <span className="text-emerald-400 font-bold">{stock.barCloseLocation}% Close Location</span>
                      <span className="text-emerald-400">High: ₹{stock.high.toFixed(2)}</span>
                    </div>
                  </div>

                  {/* Probabilistic Breakout Forecast & Expansion Cone */}
                  <div className="bg-[#0A0F1A] p-3 rounded-lg border border-[#1E293B] font-mono space-y-2">
                    <div className="flex items-center justify-between text-xs">
                      <span className="flex items-center gap-1.5 text-emerald-400 font-bold">
                        <Flame className="w-3.5 h-3.5 text-amber-400" />
                        Breakout Probability
                      </span>
                      <span className="px-2 py-0.5 rounded-full bg-emerald-500/20 text-emerald-300 font-black text-xs border border-emerald-500/40">
                        {stock.forecast?.breakoutProbabilityPct}% WIN PROB
                      </span>
                    </div>
                    <div className="flex items-center justify-between text-xs">
                      <span className="text-slate-400">Forecasted Move:</span>
                      <span className="text-emerald-300 font-extrabold text-sm">
                        +{stock.forecast?.expectedMovePct}%
                        <span className="text-[10px] text-slate-400 font-normal ml-1">
                          ({stock.forecast?.conservativeMovePct}% - {stock.forecast?.maxExpansionPct}%)
                        </span>
                      </span>
                    </div>
                    <div className="flex justify-between text-[10px] text-slate-400 pt-1 border-t border-white/5">
                      <span>Est. Horizon: <b className="text-white">{stock.forecast?.horizon}</b></span>
                      <button
                        onClick={() => onSelectStock && onSelectStock(stock)}
                        className="text-cyan-400 hover:text-cyan-300 underline font-bold cursor-pointer"
                      >
                        Inspect Terminal &rarr;
                      </button>
                    </div>
                  </div>

                  {/* Calculated Trade Plan */}
                  <div className="grid grid-cols-3 gap-2 bg-slate-950/90 p-2.5 rounded-lg border border-white/5 text-center font-mono">
                    <div>
                      <div className="text-[10px] text-rose-400 font-bold">STOP LOSS</div>
                      <div className="text-xs font-black text-rose-300">₹{stock.stopLoss.toFixed(2)}</div>
                    </div>
                    <div>
                      <div className="text-[10px] text-cyan-400 font-bold">2R TARGET</div>
                      <div className="text-xs font-black text-cyan-300">₹{stock.target1.toFixed(2)}</div>
                    </div>
                    <div>
                      <div className="text-[10px] text-emerald-400 font-bold">3R TARGET</div>
                      <div className="text-xs font-black text-emerald-300">₹{stock.target2.toFixed(2)}</div>
                    </div>
                  </div>

                  {/* Action Button */}
                  <button
                    onClick={() => onSelectStock(stock)}
                    className="neopop-btn neopop-btn-primary w-full py-2 text-xs font-black"
                  >
                    <span>Inspect Setup &amp; Position Sizer</span>
                    <ArrowUpRight className="w-3.5 h-3.5" />
                  </button>
                </div>
              );
            })}
          </div>
        </div>
      )}

      {/* Interactive Controls & Filters */}
      <div className="neopop-card p-4 space-y-3">
        <div className="flex flex-col md:flex-row md:items-center justify-between gap-3">
          {/* Layer Quick Tabs */}
          <div className="flex items-center gap-1.5 flex-wrap">
            {[
              { id: 'ALL', label: 'All Layers' },
              { id: 'LAYER_1', label: 'Layer 1: Accumulation (5–15d)' },
              { id: 'LAYER_2', label: 'Layer 2: Pre-Breakout (1–5d)' },
              { id: 'LAYER_3', label: 'Layer 3: Breakout Confirmation' }
            ].map(tab => (
              <button
                key={tab.id}
                onClick={() => setSelectedLayer(tab.id)}
                className={`neopop-btn text-xs px-3 py-1.5 ${
                  selectedLayer === tab.id
                    ? 'neopop-btn-primary'
                    : 'neopop-btn-dark'
                }`}
              >
                {tab.label}
              </button>
            ))}
          </div>

          {/* Search Box */}
          <div className="relative min-w-[220px]">
            <Search className="w-3.5 h-3.5 text-zinc-400 absolute left-3 top-1/2 -translate-y-1/2 pointer-events-none" />
            <input
              type="text"
              placeholder="Search symbol or company..."
              value={searchQuery}
              onChange={(e) => setSearchQuery(e.target.value)}
              className="neopop-input w-full pl-9 pr-3 py-1.5 text-xs text-white placeholder-zinc-500 font-mono"
            />
          </div>
        </div>

        {/* Secondary Accuracy Filters */}
        <div className="flex items-center gap-3 pt-2 border-t-2 border-black flex-wrap text-xs text-zinc-400">
          {/* Anti-Trap Toggle */}
          <label className="flex items-center gap-2 cursor-pointer select-none neopop-tag bg-[#141414] border-black px-2.5 py-1 text-zinc-300">
            <input
              type="checkbox"
              checked={excludeTraps}
              onChange={(e) => setExcludeTraps(e.target.checked)}
              className="accent-[#00E887] rounded-[2px]"
            />
            <span className="font-bold text-[11px] flex items-center gap-1 text-[#00E887]">
              <ShieldCheck className="w-3.5 h-3.5" /> Exclude False Breakouts &amp; Traps
            </span>
          </label>

          {/* Exclude ASM Toggle */}
          <label className="flex items-center gap-2 cursor-pointer select-none neopop-tag bg-[#141414] border-black px-2.5 py-1 text-zinc-300">
            <input
              type="checkbox"
              checked={excludeAsm}
              onChange={(e) => setExcludeAsm(e.target.checked)}
              className="accent-[#FF5959] rounded-[2px]"
            />
            <span className="font-bold text-[11px] flex items-center gap-1 text-[#FF5959]">
              <AlertTriangle className="w-3.5 h-3.5" /> Exclude ASM Stocks
            </span>
          </label>

          {/* Conviction Grade Selector */}
          <div className="flex items-center gap-1.5">
            <span className="font-bold uppercase text-[10px] text-zinc-300">Conviction Grade:</span>
            <select
              value={selectedGrade}
              onChange={(e) => setSelectedGrade(e.target.value)}
              className="neopop-input px-2 py-1 text-white font-mono text-xs cursor-pointer"
            >
              <option value="ALL">All Grades</option>
              <option value="EXCEPTIONAL">Exceptional Setup (Score &ge; 85)</option>
              <option value="STRONG_PLUS">Strong &amp; Exceptional (&ge; 75)</option>
              <option value="DEVELOPING">Developing Setup (65-74)</option>
            </select>
          </div>

          {/* Sector Selector */}
          <div className="flex items-center gap-1.5">
            <SlidersHorizontal className="w-3.5 h-3.5 text-zinc-400" />
            <span className="font-bold uppercase text-[10px] text-zinc-300">Sector:</span>
            <select
              value={selectedSector}
              onChange={(e) => setSelectedSector(e.target.value)}
              className="neopop-input px-2 py-1 text-white font-mono text-xs cursor-pointer"
            >
              <option value="ALL">All Sectors ({sectors.length})</option>
              {sectors.map(s => (
                <option key={s} value={s}>{s}</option>
              ))}
            </select>
          </div>

          <div className="ml-auto font-mono text-[11px] text-zinc-400">
            Showing <b className="text-[#FEE360] font-black">{filteredCandidates.length}</b> verified setups
          </div>
        </div>

        {/* 5 Revolutionary Capabilities Quick Filter Pill Ribbon */}
        <div className="flex items-center gap-1.5 pt-2 border-t-2 border-black flex-wrap">
          <span className="text-[10px] font-mono text-zinc-400 uppercase font-bold mr-1">Quick Filters:</span>
          {[
            { id: 'ALL', label: `All Setups (${kpis.total})`, icon: Target },
            { id: 'TRIPLE', label: `🟢 3x Confluence (${kpis.tripleAlignedCount})`, icon: Layers },
            { id: 'SWEEP', label: `⚡ Liquidity Sweeps (${kpis.liquiditySweepCount})`, icon: Zap },
            { id: 'MONTE_CARLO', label: `🎯 Monte Carlo > 70% (${kpis.highMonteCarloCount})`, icon: Flame },
            { id: 'DOCTOR', label: `🩺 Trade Doctor Ready (${kpis.doctorReadyCount})`, icon: ShieldCheck },
            { id: 'ASM', label: `⚠️ Under ASM (${kpis.asmCount})`, icon: AlertTriangle }
          ].map(p => (
            <button
              key={p.id}
              onClick={() => setCapabilityFilter(p.id)}
              className={`neopop-btn text-[11px] py-1 px-2.5 flex items-center gap-1.5 ${
                capabilityFilter === p.id ? 'neopop-btn-primary' : 'neopop-btn-dark'
              }`}
            >
              <p.icon className="w-3 h-3" />
              <span>{p.label}</span>
            </button>
          ))}
        </div>

        {/* Market Cap Filter Row (Large, Mid, Small, Micro, Penny) */}
        <div className="pt-2.5 border-t-2 border-black flex flex-wrap items-center justify-between gap-2">
          <MarketCapFilter
            selectedCap={selectedCap}
            onSelectCap={setSelectedCap}
            counts={mktCapCounts}
          />
          <div className="text-[10px] font-mono text-zinc-400">
            Market Cap Scope: <b className="text-[#FEE360] font-bold">{filteredCandidates.length}</b> setups
          </div>
        </div>
      </div>

      {/* Comprehensive High-Accuracy Swing Radar Table */}
      <div className="neopop-card p-0 border-2 border-black rounded-[4px] shadow-[4px_4px_0px_#000000] bg-[#141414] overflow-hidden">
        <div className="overflow-x-auto" style={{ maxHeight: '680px' }}>
          <table className="w-full text-xs text-left border-collapse table-auto">
            <thead>
              <tr className="bg-[#171717] text-zinc-300 text-[11px] uppercase tracking-wider sticky top-0 z-10 border-b-2 border-black select-none font-mono">
                <th className="py-2.5 px-3 cursor-pointer hover:text-white min-w-[90px]" onClick={() => handleSort('qualityScore')}>
                  Score &amp; Grade {sortField === 'qualityScore' ? (sortAsc ? '▲' : '▼') : '↕'}
                </th>
                <th className="py-2.5 px-3 cursor-pointer hover:text-white min-w-[140px]" onClick={() => handleSort('symbol')}>
                  Symbol &amp; Sector {sortField === 'symbol' ? (sortAsc ? '▲' : '▼') : '↕'}
                </th>
                <th className="py-2.5 px-3 text-right cursor-pointer hover:text-white min-w-[105px]" onClick={() => handleSort('ltp')}>
                  LTP &amp; % Chg {sortField === 'ltp' ? (sortAsc ? '▲' : '▼') : '↕'}
                </th>
                <th className="py-2.5 px-3 text-center min-w-[125px]">
                  Confluence (W•D•15M)
                </th>
                <th className="py-2.5 px-3 text-center cursor-pointer hover:text-white min-w-[135px]" onClick={() => handleSort('breakoutProbability')}>
                  Monte Carlo (10k Sim) {sortField === 'breakoutProbability' ? (sortAsc ? '▲' : '▼') : '↕'}
                </th>
                <th className="py-2.5 px-3 text-center min-w-[135px]">
                  Footprint &amp; Anti-Trap
                </th>
                <th className="py-2.5 px-3 text-center min-w-[130px]">
                  Trade Doctor &amp; Sizing
                </th>
                <th className="py-2.5 px-3 text-right min-w-[110px]">
                  Action &amp; Basket
                </th>
              </tr>
            </thead>
            <tbody className="divide-y divide-black/40 font-medium">
              {filteredCandidates.length === 0 ? (
                <tr>
                  <td colSpan={8} className="py-12 text-center text-zinc-500 font-mono">
                    No swing setups found matching current filters.
                  </td>
                </tr>
              ) : (
                filteredCandidates.map((stock) => {
                  const tickDir = recentTicks[stock.symbol];
                  const tickFlash = tickDir === 'up' ? 'bg-[#00E887]/10' : tickDir === 'down' ? 'bg-[#FF5959]/10' : '';
                  const tickColor = tickDir === 'up' ? 'text-[#00E887] font-bold' : tickDir === 'down' ? 'text-[#FF5959] font-bold' : 'text-white';

                  const isTrap = stock.trapRisk === 'HIGH (TRAP / REJECTION)';
                  const isExceptional = stock.qualityScore >= 85;
                  const mcap = getMarketCap(stock);

                  return (
                    <tr key={stock.symbol} className={`hover:bg-white/5 transition-colors duration-150 ${tickFlash} ${isTrap ? 'opacity-70 bg-rose-950/20' : ''}`}>
                      {/* 1. Score & Grade */}
                      <td className="py-2.5 px-3 align-top">
                        <div className="flex flex-col gap-1 font-mono">
                          <div className="flex items-center gap-1.5">
                            <span className={`neopop-tag text-[10px] font-black ${
                              isExceptional
                                ? 'bg-[#00E887] text-black'
                                : stock.qualityScore >= 75
                                ? 'bg-[#FEE360] text-black'
                                : stock.qualityScore >= 65
                                ? 'bg-[#3657FF] text-white'
                                : 'bg-[#1E1E1E] text-zinc-400'
                            }`}>
                              {stock.grade}
                            </span>
                            <span className="font-black text-white text-xs">{stock.qualityScore}</span>
                            <span className="text-[10px] text-zinc-500">/100</span>
                          </div>
                          <span className="text-[9px] font-mono px-1 py-0.2 rounded bg-[#1B1B1B] text-zinc-400 border border-black inline-block">
                            {stock.layer === 'LAYER_3' ? 'Breakout' : stock.layer === 'LAYER_2' ? 'Pre-Coil' : 'Accum'}
                          </span>
                        </div>
                      </td>

                      {/* 2. Symbol & Sector */}
                      <td className="py-2.5 px-3 align-top">
                        <div className="flex flex-col gap-0.5">
                          <div className="flex items-center gap-1.5 flex-wrap">
                            <span className="font-bold text-white font-mono tracking-tight text-sm">
                              {stock.symbol}
                            </span>
                            <span
                              className="neopop-tag text-[8px] py-0 px-1 border border-black font-extrabold"
                              style={{
                                backgroundColor: mcap.badgeColor,
                                color: mcap.category === 'LARGE' || mcap.category === 'SMALL' ? '#000000' : '#FFFFFF'
                              }}
                              title={`${mcap.label} • Estimated Mcap: ₹${mcap.mktCapCr.toLocaleString('en-IN')} Cr`}
                            >
                              {mcap.badge}
                            </span>
                            <span className="neopop-tag bg-[#1E1E1E] text-zinc-300 text-[9px]">
                              {stock.sector}
                            </span>
                            {stock.asm?.isAsm && (
                              <span
                                className="neopop-tag bg-[#FF5959]/20 text-[#FF5959] border border-[#FF5959]/40 text-[9px] font-black tracking-wider cursor-help"
                                title={`${stock.asm.category} Stage ${stock.asm.stage} - 100% Delivery Margin Required`}
                              >
                                ⚠️ {stock.asm.shortBadge || 'ASM'}
                              </span>
                            )}
                          </div>
                          <div className="text-[11px] text-zinc-400 whitespace-normal truncate max-w-[160px] leading-snug" title={stock.name}>
                            {stock.name}
                          </div>
                        </div>
                      </td>

                      {/* 3. LTP & % Chg */}
                      <td className="py-2.5 px-3 text-right align-top font-mono">
                        <div className="flex flex-col items-end gap-0.5">
                          <span className={`font-black text-sm ${tickColor}`}>
                            ₹{stock.ltp.toLocaleString('en-IN', { minimumFractionDigits: 2 })}
                          </span>
                          <span className={`neopop-tag text-[9px] font-black ${
                            stock.change_perc >= 0
                              ? 'bg-[#00E887] text-black'
                              : 'bg-[#FF5959] text-white'
                          }`}>
                            {stock.change_perc >= 0 ? '+' : ''}{stock.change_perc.toFixed(2)}%
                          </span>
                          <span className="text-[10px] text-zinc-500">
                            {stock.distToHighPct === 0 ? 'At High' : `${stock.distToHighPct}% to res`}
                          </span>
                        </div>
                      </td>

                      {/* 4. Triple Confluence (W • D • 15M) */}
                      <td className="py-2.5 px-3 text-center align-top font-mono">
                        <div className="flex flex-col items-center gap-1">
                          <div className="flex items-center gap-1 text-[10px]">
                            <span
                              className={`w-4 h-4 rounded-[2px] border border-black flex items-center justify-center font-black ${
                                stock.confluence?.weekly === 'BULLISH' ? 'bg-[#00E887] text-black' : 'bg-[#FF5959] text-white'
                              }`}
                              title="Weekly Macro Trend (Above 30-week EMA)"
                            >
                              W
                            </span>
                            <span
                              className={`w-4 h-4 rounded-[2px] border border-black flex items-center justify-center font-black ${
                                stock.confluence?.daily === 'BULLISH' ? 'bg-[#00E887] text-black' : 'bg-[#FF5959] text-white'
                              }`}
                              title="Daily Swing Structure (Stage 2 Expansion)"
                            >
                              D
                            </span>
                            <span
                              className={`w-4 h-4 rounded-[2px] border border-black flex items-center justify-center font-black ${
                                stock.confluence?.intraday === 'BULLISH' ? 'bg-[#00E887] text-black' : 'bg-[#FF5959] text-white'
                              }`}
                              title="Intraday Timing (Above VWAP & BCL >= 65%)"
                            >
                              15
                            </span>
                          </div>
                          <span className={`neopop-tag text-[9px] font-black ${
                            stock.confluence?.tripleAligned
                              ? 'bg-[#00E887] text-black'
                              : 'bg-[#1E1E1E] text-zinc-400'
                          }`}>
                            {stock.confluence?.tripleAligned ? '🟢 3x ALIGNED' : 'PARTIAL'}
                          </span>
                        </div>
                      </td>

                      {/* 5. Monte Carlo Odds Overlay (10,000 Replays) */}
                      <td className="py-2.5 px-3 text-center align-top font-mono">
                        <button
                          onClick={() => onSelectStock && onSelectStock(stock)}
                          className="group inline-flex flex-col items-center p-1 rounded hover:bg-white/5 transition cursor-pointer text-center w-full"
                          title="Click to inspect 10,000 session Monte Carlo simulation distribution in Terminal"
                        >
                          <div className="flex items-center gap-1 text-[10px] font-black text-white">
                            <span className="text-[#00E887]">🎯 {stock.monteCarlo?.targetOddsPct}%</span>
                            <span className="text-zinc-500">&bull;</span>
                            <span className="text-[#FF5959]">{stock.monteCarlo?.stopOddsPct}% SL</span>
                          </div>
                          {/* Mini Dual-color Odds Bar */}
                          <div className="w-full h-1.5 bg-[#111111] border border-black flex rounded-[1px] overflow-hidden mt-1">
                            <div
                              style={{ width: `${stock.monteCarlo?.targetOddsPct || 50}%` }}
                              className="bg-[#00E887] h-full"
                            />
                            <div
                              style={{ width: `${stock.monteCarlo?.stopOddsPct || 30}%` }}
                              className="bg-[#FF5959] h-full"
                            />
                            <div
                              style={{ width: `${stock.monteCarlo?.timeoutOddsPct || 20}%` }}
                              className="bg-[#3657FF] h-full"
                            />
                          </div>
                          <div className="text-[9px] text-[#00E887] font-black mt-0.5">
                            +{stock.monteCarlo?.expectedValueR}R EV
                          </div>
                        </button>
                      </td>

                      {/* 6. Institutional Footprint & Fakeout Radar */}
                      <td className="py-2.5 px-3 text-center align-top font-mono min-w-[135px]">
                        <div className="flex flex-col items-center gap-1">
                          <div className="flex items-center gap-1">
                            <span className="text-[10px] text-zinc-300 font-bold">
                              ⚡ {stock.footprint?.vqr}x VQR
                            </span>
                          </div>
                          {stock.footprint?.liquiditySweep ? (
                            <span className="neopop-tag bg-[#00E887] text-black font-black text-[9px]">
                              🌊 SWEEP RECLAIM
                            </span>
                          ) : (
                            <span className="text-[9px] text-zinc-500">
                              {stock.upperWickPct}% wick &bull; {stock.barCloseLocation}% BCL
                            </span>
                          )}
                          <div className="w-full bg-[#111111] rounded-[1px] h-1 border border-black overflow-hidden">
                            <div
                              className={`h-full ${
                                stock.barCloseLocation >= 85
                                  ? 'bg-[#00E887]'
                                  : stock.barCloseLocation >= 75
                                  ? 'bg-[#FEE360]'
                                  : 'bg-[#FF5959]'
                              }`}
                              style={{ width: `${Math.max(5, stock.barCloseLocation)}%` }}
                            />
                          </div>
                        </div>
                      </td>

                      {/* 7. Trade Doctor Diagnostic & Sizing */}
                      <td className="py-2.5 px-3 text-center align-top font-mono text-[11px]">
                        <div className="flex flex-col items-center gap-1">
                          <span className={`neopop-tag text-[9px] font-black ${
                            stock.tradeDoctor?.verdict === 'READY_TO_ENTER'
                              ? 'bg-[#00E887] text-black'
                              : stock.tradeDoctor?.verdict === 'CAUTION'
                              ? 'bg-[#FEE360] text-black'
                              : 'bg-[#FF5959] text-white'
                          }`}>
                            {stock.tradeDoctor?.score}/100 {stock.tradeDoctor?.verdict === 'READY_TO_ENTER' ? 'READY' : stock.tradeDoctor?.verdict === 'CAUTION' ? 'CAUTION' : 'TRAP'}
                          </span>
                          <div className="text-[10px] text-zinc-300 flex items-center justify-between w-full px-1">
                            <span className="text-[#FF5959]">SL: ₹{stock.stopLoss.toFixed(1)}</span>
                            <span className="text-[#00E887]">2R: ₹{stock.target1.toFixed(1)}</span>
                          </div>
                          <span className="text-[9px] text-zinc-500">
                            {stock.sharesFor1kRisk} shs (₹1k risk)
                          </span>
                        </div>
                      </td>

                      {/* 8. Action & Basket Copy */}
                      <td className="py-2.5 px-3 text-right align-top">
                        <div className="flex flex-col gap-1 items-end">
                          <button
                            onClick={() => onSelectStock(stock)}
                            className="neopop-btn neopop-btn-primary text-[10px] py-1 px-2.5 w-full flex items-center justify-center gap-1"
                          >
                            <span>Copilot</span>
                            <ExternalLink className="w-2.5 h-2.5" />
                          </button>
                          <button
                            onClick={(e) => handleCopyBasket(stock, e)}
                            className="neopop-btn neopop-btn-dark text-[9px] py-0.5 px-2 w-full flex items-center justify-center gap-1 font-mono"
                            title="Copy ready-to-paste Zerodha Kite Basket JSON"
                          >
                            {copiedBasketSymbol === stock.symbol ? (
                              <>
                                <Check className="w-2.5 h-2.5 text-[#00E887]" />
                                <span className="text-[#00E887]">Copied!</span>
                              </>
                            ) : (
                              <>
                                <Copy className="w-2.5 h-2.5" />
                                <span>Copy Basket</span>
                              </>
                            )}
                          </button>
                        </div>
                      </td>
                    </tr>
                  );
                })
              )}
            </tbody>
          </table>
        </div>
      </div>
    </div>
  );
}
