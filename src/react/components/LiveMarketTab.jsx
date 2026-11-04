import React, { useState, useMemo } from 'react';
import {
  TrendingUp,
  TrendingDown,
  Filter,
  ArrowUpRight,
  ArrowDownRight,
  ExternalLink,
  Zap,
  Activity,
  IndianRupee,
  Maximize2,
  Compass,
  BarChart2,
  Gauge,
  Flame,
  ShieldAlert,
  ChevronRight,
  Layers
} from 'lucide-react';
import { formatIndianCurrency, formatVolume } from '../utils/formatters.js';
import { getAsmStatus } from '../utils/asmRegistry.js';
import { getMarketCap, filterByMarketCap } from '../utils/mktCapRegistry.js';
import MarketCapFilter from './MarketCapFilter.jsx';

const PARAMETER_CONFIGS = [
  { key: '52w', label: '52W High / Low', icon: Flame, title: '52-Week High & Low Extremes Radar' },
  { key: 'volume', label: 'By Volume & RVOL', icon: BarChart2, title: 'Volume Surge Shockers & Liquidity Heavyweights' },
  { key: 'sentiment', label: 'Market Sentiment', icon: Gauge, title: 'Market Sentiment Leaders & Orderflow Distribution' },
  { key: 'turnover', label: 'Turnover & Del %', icon: IndianRupee, title: 'Institutional Turnover & Delivery Accumulation' },
  { key: 'gainers-losers', label: 'Gainers & Losers', icon: TrendingUp, title: 'Intraday Momentum Gainers & Losers' },
];

export default function LiveMarketTab({
  constituents = [],
  indices = [],
  officialGainers = [],
  officialLosers = [],
  marketStatus = null,
  onSelectStock,
  recentTicks = {}
}) {
  const [filterMode, setFilterMode] = useState('ALL'); // 'ALL' | 'NIFTY50'
  const [selectedCap, setSelectedCap] = useState('ALL'); // 'ALL' | 'LARGE' | 'MID' | 'SMALL' | 'MICRO' | 'PENNY'
  const [metricMode, setMetricMode] = useState('all'); // 'all' (all 5 parameter individual tables) | '52w' | 'volume' | 'sentiment' | 'turnover' | 'gainers-losers'
  const [tableLayout, setTableLayout] = useState('separate'); // 'separate' | 'split'
  const [tableFilter, setTableFilter] = useState('all'); // 'all' | 'left' | 'right'

  const mktCapCounts = useMemo(() => {
    return {
      ALL: constituents.length,
      LARGE: constituents.filter(s => getMarketCap(s).category === 'LARGE').length,
      MID: constituents.filter(s => getMarketCap(s).category === 'MID').length,
      SMALL: constituents.filter(s => getMarketCap(s).category === 'SMALL').length,
      MICRO: constituents.filter(s => getMarketCap(s).category === 'MICRO').length,
      PENNY: constituents.filter(s => getMarketCap(s).category === 'PENNY' || s.ltp <= 35).length
    };
  }, [constituents]);

  const advances = constituents.filter(c => (c.change_perc || 0) > 0).length;
  const declines = constituents.filter(c => (c.change_perc || 0) < 0).length;
  const unchanged = constituents.filter(c => (c.change_perc || 0) === 0).length;
  const total = constituents.length || 1;
  const advRatio = Math.round((advances / total) * 100);

  // Global Market Mood Index (0 to 100) based on Advance/Decline breadth and NIFTY momentum
  const n50 = indices.find(i => i.name === 'NIFTY 50') || { change_perc: 0.23 };
  const marketMoodScore = Math.min(100, Math.max(0, Math.round(advRatio * 0.7 + (n50.change_perc >= 0 ? 30 : 10))));
  const marketMoodLabel = marketMoodScore >= 70 ? 'EXTREME GREED'
    : marketMoodScore >= 55 ? 'BULLISH'
    : marketMoodScore >= 45 ? 'NEUTRAL'
    : marketMoodScore >= 30 ? 'BEARISH'
    : 'EXTREME FEAR';

  // Process Scoped Constituents with all parameters
  const scopedConstituents = useMemo(() => {
    let list = constituents;
    if (filterMode === 'NIFTY50') {
      list = constituents.filter(c => c.nifty50 || (c.weight && c.weight >= 0.8));
    }
    if (selectedCap !== 'ALL') {
      list = filterByMarketCap(list, selectedCap);
    }

    return list.map(s => {
      const ltp = Number(s.ltp || 0);
      const high = Number(s.high || ltp);
      const low = Number(s.low || ltp);
      const prev_close = Number(s.prev_close || s.open || ltp);
      const volume = Number(s.volume || 0);
      const turnoverCr = s.turnover_lacs ? (Number(s.turnover_lacs) / 100) : ((ltp * volume) / 10000000);
      const dayRangePct = low > 0 ? (((high - low) / low) * 100) : 0;
      const posPct = high > low ? Math.min(100, Math.max(0, ((ltp - low) / (high - low)) * 100)) : 50;
      const high52w = Number(s.high_52w || (high * 1.05));
      const low52w = Number(s.low_52w || (low * 0.75));
      const dist52wHighPct = high52w > 0 ? (((high52w - ltp) / high52w) * 100) : 0;
      const dist52wLowPct = low52w > 0 ? (((ltp - low52w) / low52w) * 100) : 0;
      const rvol = Number(s.rvol || 1.0);
      const deliveryPct = Number(s.delivery_pct || 45.0);
      const sentimentScore = Number(s.sentiment_score !== undefined ? s.sentiment_score : 50);
      const sentimentLabel = s.sentiment_label || (sentimentScore >= 65 ? 'BULLISH' : sentimentScore <= 35 ? 'BEARISH' : 'NEUTRAL');

      return {
        ...s,
        ltp,
        high,
        low,
        prev_close,
        volume,
        turnoverCr,
        dayRangePct,
        posPct,
        high_52w: high52w,
        low_52w: low52w,
        dist_52w_high_pct: dist52wHighPct,
        dist_52w_low_pct: dist52wLowPct,
        rvol,
        delivery_pct: deliveryPct,
        sentiment_score: sentimentScore,
        sentiment_label: sentimentLabel
      };
    });
  }, [constituents, filterMode, selectedCap]);

  // Top Apex Records of the Day
  const dayApex = useMemo(() => {
    if (scopedConstituents.length === 0) return null;
    const sorted52High = [...scopedConstituents].sort((a, b) => a.dist_52w_high_pct - b.dist_52w_high_pct);
    const sortedVolume = [...scopedConstituents].sort((a, b) => (b.volume - a.volume) || (b.turnoverCr - a.turnoverCr));
    const sortedRvol = [...scopedConstituents].sort((a, b) => (b.rvol - a.rvol) || (b.volume - a.volume));
    const sortedSentiment = [...scopedConstituents].sort((a, b) => (b.sentiment_score - a.sentiment_score) || (b.change_perc || 0) - (a.change_perc || 0));
    const sortedTurnover = [...scopedConstituents].sort((a, b) => (b.turnoverCr - a.turnoverCr) || (b.volume - a.volume));

    return {
      top52High: sorted52High[0],
      topVolume: sortedVolume[0],
      topRvol: sortedRvol[0],
      topSentiment: sortedSentiment[0],
      topTurnover: sortedTurnover[0]
    };
  }, [scopedConstituents]);

  // Helper to compute datasets for any parameter mode
  function getModeDatasets(modeKey) {
    switch (modeKey) {
      case '52w': {
        const near52High = [...scopedConstituents]
          .sort((a, b) => a.dist_52w_high_pct - b.dist_52w_high_pct)
          .slice(0, 10);
        const near52Low = [...scopedConstituents]
          .sort((a, b) => a.dist_52w_low_pct - b.dist_52w_low_pct)
          .slice(0, 10);

        return {
          leftTitle: '52-Week High Breakouts & Radar',
          leftBadge: 'Near 52W High (0–3%)',
          leftData: near52High,
          rightTitle: '52-Week Low Breakdown / Support',
          rightBadge: 'Near 52W Low (Support Test)',
          rightData: near52Low,
          modeKey: '52w'
        };
      }
      case 'volume': {
        const rvolSurge = [...scopedConstituents]
          .sort((a, b) => (b.rvol - a.rvol) || (b.volume - a.volume))
          .slice(0, 10);
        const topVolume = [...scopedConstituents]
          .sort((a, b) => (b.volume - a.volume) || (b.turnoverCr - a.turnoverCr))
          .slice(0, 10);

        return {
          leftTitle: 'Volume Surge Shockers (RVOL)',
          leftBadge: 'High Institutional Surge',
          leftData: rvolSurge,
          rightTitle: 'Top Traded Volume (Shares)',
          rightBadge: 'Liquidity Heavyweights',
          rightData: topVolume,
          modeKey: 'volume'
        };
      }
      case 'sentiment': {
        const topBullish = [...scopedConstituents]
          .sort((a, b) => b.sentiment_score - a.sentiment_score || (b.change_perc || 0) - (a.change_perc || 0))
          .slice(0, 10);
        const topBearish = [...scopedConstituents]
          .sort((a, b) => a.sentiment_score - b.sentiment_score || (a.change_perc || 0) - (b.change_perc || 0))
          .slice(0, 10);

        return {
          leftTitle: 'Top Bullish Sentiment Leaders',
          leftBadge: 'Score 80–100 (Strong Buying)',
          leftData: topBullish,
          rightTitle: 'Top Bearish Sentiment / Selling',
          rightBadge: 'Score <35 (Distribution Pressure)',
          rightData: topBearish,
          modeKey: 'sentiment'
        };
      }
      case 'turnover': {
        const topTurnover = [...scopedConstituents]
          .sort((a, b) => (b.turnoverCr - a.turnoverCr) || (b.volume - a.volume))
          .slice(0, 10);
        const topDelivery = [...scopedConstituents]
          .sort((a, b) => (b.delivery_pct - a.delivery_pct) || (b.turnoverCr - a.turnoverCr))
          .slice(0, 10);

        return {
          leftTitle: 'Top Institutional Turnover (₹ Cr)',
          leftBadge: 'Cash Flow Concentration',
          leftData: topTurnover,
          rightTitle: 'Top Institutional Delivery %',
          rightBadge: 'Delivery Accumulation',
          rightData: topDelivery,
          modeKey: 'turnover'
        };
      }
      case 'gainers-losers':
      default: {
        const gainers = [...scopedConstituents].sort((a, b) => (b.change_perc || 0) - (a.change_perc || 0)).slice(0, 10);
        const losers = [...scopedConstituents].sort((a, b) => (a.change_perc || 0) - (b.change_perc || 0)).slice(0, 10);

        return {
          leftTitle: `Top Gainers (${filterMode === 'NIFTY50' ? 'NIFTY 50' : 'NSE Capital Market'})`,
          leftBadge: 'Advancing',
          leftData: gainers,
          rightTitle: `Top Losers (${filterMode === 'NIFTY50' ? 'NIFTY 50' : 'NSE Capital Market'})`,
          rightBadge: 'Declining',
          rightData: losers,
          modeKey: 'gainers-losers'
        };
      }
    }
  }

  // All 5 modes datasets for "All Parameters (Individual Tables)" mode
  const allModesData = useMemo(() => {
    return PARAMETER_CONFIGS.map(cfg => ({
      config: cfg,
      datasets: getModeDatasets(cfg.key)
    }));
  }, [scopedConstituents, filterMode, officialGainers, officialLosers]);

  // Single active mode dataset for isolated parameter viewing
  const activeModeDatasets = useMemo(() => {
    return getModeDatasets(metricMode === 'all' ? '52w' : metricMode);
  }, [metricMode, scopedConstituents, filterMode, officialGainers, officialLosers]);

  const { leftTitle, leftBadge, leftData, rightTitle, rightBadge, rightData, modeKey } = activeModeDatasets;

  return (
    <div className="space-y-4 sm:space-y-6">
      {/* Redesigned Sleek Unified NeoPOP Control & Parameters Deck */}
      <div className="neopop-card p-0 border-2 border-black bg-[#151515] rounded-[4px] shadow-[4px_4px_0px_#000000] overflow-hidden">
        {/* Tier 1: Toolbar with Parameter Mode Switchers & Scope */}
        <div className="p-3 sm:p-3.5 border-b-2 border-black flex flex-wrap items-center justify-between gap-3 bg-[#181818]">
          {/* Parameter Pill Switchers */}
          <div className="flex flex-wrap items-center gap-1.5 sm:gap-2">
            <span className="text-[10px] sm:text-[11px] font-black uppercase text-[#FEE360] font-mono flex items-center gap-1 mr-1">
              <Compass className="w-3.5 h-3.5 text-[#FEE360]" /> Parameters:
            </span>
            <button
              onClick={() => setMetricMode('all')}
              className={`neopop-btn text-xs px-2.5 sm:px-3 py-1 flex items-center gap-1.5 font-bold ${
                metricMode === 'all' ? 'neopop-btn-primary' : 'neopop-btn-dark'
              }`}
              title="Display all 5 parameter categories simultaneously as individual separate tables"
            >
              <Layers className="w-3.5 h-3.5" />
              <span>All Parameters (All 5 Tables)</span>
            </button>
            <button
              onClick={() => setMetricMode('52w')}
              className={`neopop-btn text-xs px-2.5 sm:px-3 py-1 flex items-center gap-1.5 ${
                metricMode === '52w' ? 'neopop-btn-primary' : 'neopop-btn-dark'
              }`}
            >
              <Flame className="w-3 h-3" />
              <span>52W High / Low</span>
            </button>
            <button
              onClick={() => setMetricMode('volume')}
              className={`neopop-btn text-xs px-2.5 sm:px-3 py-1 flex items-center gap-1.5 ${
                metricMode === 'volume' ? 'neopop-btn-primary' : 'neopop-btn-dark'
              }`}
            >
              <BarChart2 className="w-3 h-3" />
              <span>By Volume &amp; RVOL</span>
            </button>
            <button
              onClick={() => setMetricMode('sentiment')}
              className={`neopop-btn text-xs px-2.5 sm:px-3 py-1 flex items-center gap-1.5 ${
                metricMode === 'sentiment' ? 'neopop-btn-primary' : 'neopop-btn-dark'
              }`}
            >
              <Gauge className="w-3 h-3" />
              <span>Market Sentiment</span>
            </button>
            <button
              onClick={() => setMetricMode('turnover')}
              className={`neopop-btn text-xs px-2.5 sm:px-3 py-1 flex items-center gap-1.5 ${
                metricMode === 'turnover' ? 'neopop-btn-primary' : 'neopop-btn-dark'
              }`}
            >
              <IndianRupee className="w-3 h-3" />
              <span>Turnover &amp; Del %</span>
            </button>
            <button
              onClick={() => setMetricMode('gainers-losers')}
              className={`neopop-btn text-xs px-2.5 sm:px-3 py-1 flex items-center gap-1.5 ${
                metricMode === 'gainers-losers' ? 'neopop-btn-primary' : 'neopop-btn-dark'
              }`}
            >
              <TrendingUp className="w-3 h-3" />
              <span>Gainers &amp; Losers</span>
            </button>
          </div>

          {/* Scope, Layout & Market Breadth */}
          <div className="flex flex-wrap items-center gap-2">
            {/* Layout Mode (Separate Tables vs Split) */}
            <div className="flex items-center gap-1">
              <button
                onClick={() => setTableLayout('separate')}
                className={`neopop-btn text-[11px] px-2 py-1 ${
                  tableLayout === 'separate' ? 'neopop-btn-primary' : 'neopop-btn-dark'
                }`}
                title="View as separate full-width independent tables"
              >
                Separate Tables
              </button>
              <button
                onClick={() => setTableLayout('split')}
                className={`neopop-btn text-[11px] px-2 py-1 ${
                  tableLayout === 'split' ? 'neopop-btn-primary' : 'neopop-btn-dark'
                }`}
                title="View side-by-side"
              >
                Side-by-Side
              </button>
            </div>

            {/* Scope Selector */}
            <div className="flex items-center gap-1 border-l border-zinc-800 pl-2">
              <button
                onClick={() => setFilterMode('ALL')}
                className={`neopop-btn text-[11px] px-2.5 py-1 ${
                  filterMode === 'ALL' ? 'neopop-btn-secondary' : 'neopop-btn-dark'
                }`}
              >
                All 501 EQ
              </button>
              <button
                onClick={() => setFilterMode('NIFTY50')}
                className={`neopop-btn text-[11px] px-2.5 py-1 ${
                  filterMode === 'NIFTY50' ? 'neopop-btn-secondary' : 'neopop-btn-dark'
                }`}
              >
                NIFTY 50
              </button>
            </div>

            <div className="neopop-tag bg-[#0C0C0C] border-black text-[11px] px-2.5 py-1 font-mono flex items-center gap-1.5">
              <span className="text-[#00E887] font-bold">▲ {advances}</span>
              <span className="text-zinc-600">/</span>
              <span className="text-[#FF5959] font-bold">▼ {declines}</span>
              <span className="text-zinc-600">/</span>
              <span className="text-zinc-400 font-bold">● {unchanged}</span>
            </div>
          </div>
        </div>

        {/* Tier 1B: Market Cap Filter Strip (Large, Mid, Small, Micro, Penny) */}
        <div className="px-3 sm:px-3.5 py-2 border-b-2 border-black flex flex-wrap items-center justify-between gap-2.5 bg-[#141414]">
          <MarketCapFilter
            selectedCap={selectedCap}
            onSelectCap={setSelectedCap}
            counts={mktCapCounts}
          />
          <div className="text-[10px] font-mono text-zinc-400">
            Market Cap Scope: <b className="text-[#FEE360]">{scopedConstituents.length}</b> Equities
          </div>
        </div>

        {/* Tier 2: Seamless Horizontal Apex Ticker Ribbon (Ultra-Sleek 4-Way Segment) */}
        {dayApex && (
          <div className="grid grid-cols-2 md:grid-cols-4 divide-y-2 md:divide-y-0 md:divide-x-2 divide-black bg-[#111111]">
            {/* 1. 52W High Leader Segment */}
            {dayApex.top52High && (
              <div
                onClick={() => { setMetricMode('52w'); onSelectStock(dayApex.top52High); }}
                className="p-2.5 sm:p-3 hover:bg-[#1C1C1C] cursor-pointer transition-colors group flex items-center justify-between"
              >
                <div className="min-w-0 pr-2">
                  <div className="text-[10px] font-mono text-[#00E887] font-bold uppercase flex items-center gap-1 truncate">
                    <Flame className="w-3 h-3 text-[#00E887] shrink-0" />
                    <span>52W High Leader</span>
                  </div>
                  <div className="flex items-baseline gap-2 mt-0.5">
                    <span className="text-xs sm:text-sm font-black font-mono text-white group-hover:text-[#FEE360] transition-colors truncate">
                      {dayApex.top52High.symbol}
                    </span>
                    <span className="text-[10px] font-mono text-zinc-400">
                      {formatIndianCurrency(dayApex.top52High.ltp)}
                    </span>
                  </div>
                </div>
                <span className="neopop-tag bg-[#00E887] text-black text-[9px] py-0 px-1 font-black shrink-0">
                  {dayApex.top52High.dist_52w_high_pct === 0 || dayApex.top52High.ltp >= dayApex.top52High.high_52w
                    ? '⚡ BREAKOUT'
                    : `-${dayApex.top52High.dist_52w_high_pct.toFixed(1)}% to High`}
                </span>
              </div>
            )}

            {/* 2. Volume Shocker Segment */}
            {dayApex.topRvol && (
              <div
                onClick={() => { setMetricMode('volume'); onSelectStock(dayApex.topRvol); }}
                className="p-2.5 sm:p-3 hover:bg-[#1C1C1C] cursor-pointer transition-colors group flex items-center justify-between"
              >
                <div className="min-w-0 pr-2">
                  <div className="text-[10px] font-mono text-[#FEE360] font-bold uppercase flex items-center gap-1 truncate">
                    <BarChart2 className="w-3 h-3 text-[#FEE360] shrink-0" />
                    <span>Volume Surge (RVOL)</span>
                  </div>
                  <div className="flex items-baseline gap-2 mt-0.5">
                    <span className="text-xs sm:text-sm font-black font-mono text-white group-hover:text-[#FEE360] transition-colors truncate">
                      {dayApex.topRvol.symbol}
                    </span>
                    <span className="text-[10px] font-mono text-zinc-400">
                      {formatVolume(dayApex.topRvol.volume)}
                    </span>
                  </div>
                </div>
                <span className="neopop-tag bg-[#FEE360] text-black text-[9px] py-0 px-1 font-black shrink-0">
                  {dayApex.topRvol.rvol.toFixed(2)}x Surge
                </span>
              </div>
            )}

            {/* 3. Market Sentiment Segment */}
            <div
              onClick={() => setMetricMode('sentiment')}
              className="p-2.5 sm:p-3 hover:bg-[#1C1C1C] cursor-pointer transition-colors group flex items-center justify-between"
            >
              <div className="min-w-0 pr-2">
                <div className="text-[10px] font-mono text-cyan-400 font-bold uppercase flex items-center gap-1 truncate">
                  <Gauge className="w-3 h-3 text-cyan-400 shrink-0" />
                  <span>Market Mood &amp; Sentiment</span>
                </div>
                <div className="flex items-baseline gap-2 mt-0.5">
                  <span className="text-xs sm:text-sm font-black font-mono text-white group-hover:text-[#FEE360] transition-colors">
                    {marketMoodScore} / 100
                  </span>
                  <span className="text-[10px] font-mono text-zinc-400 truncate">
                    {marketMoodLabel}
                  </span>
                </div>
              </div>
              <span className={`neopop-tag text-[9px] py-0 px-1 font-black shrink-0 ${
                marketMoodScore >= 60 ? 'bg-[#00E887] text-black' : marketMoodScore <= 40 ? 'bg-[#FF5959] text-white' : 'bg-[#FEE360] text-black'
              }`}>
                {advRatio}% Bull
              </span>
            </div>

            {/* 4. Top Turnover Segment */}
            {dayApex.topTurnover && (
              <div
                onClick={() => { setMetricMode('turnover'); onSelectStock(dayApex.topTurnover); }}
                className="p-2.5 sm:p-3 hover:bg-[#1C1C1C] cursor-pointer transition-colors group flex items-center justify-between"
              >
                <div className="min-w-0 pr-2">
                  <div className="text-[10px] font-mono text-[#3657FF] font-bold uppercase flex items-center gap-1 truncate">
                    <IndianRupee className="w-3 h-3 text-[#3657FF] shrink-0" />
                    <span>Top Cash Turnover</span>
                  </div>
                  <div className="flex items-baseline gap-2 mt-0.5">
                    <span className="text-xs sm:text-sm font-black font-mono text-white group-hover:text-[#FEE360] transition-colors truncate">
                      {dayApex.topTurnover.symbol}
                    </span>
                    <span className="text-[10px] font-mono text-zinc-400">
                      {formatIndianCurrency(dayApex.topTurnover.ltp)}
                    </span>
                  </div>
                </div>
                <span className="neopop-tag bg-[#3657FF] text-white text-[9px] py-0 px-1 font-black shrink-0">
                  ₹{dayApex.topTurnover.turnoverCr.toFixed(1)} Cr
                </span>
              </div>
            )}
          </div>
        )}
      </div>

      {/* Sub-Table Selector (Visible when an isolated single parameter is active and separate layout is on) */}
      {tableLayout === 'separate' && metricMode !== 'all' && (
        <div className="flex items-center justify-between gap-2 px-1">
          <div className="flex items-center gap-1.5">
            <span className="text-[10px] font-mono font-bold uppercase text-zinc-400">View Tables:</span>
            <button
              onClick={() => setTableFilter('all')}
              className={`neopop-btn text-[11px] px-2.5 py-1 ${
                tableFilter === 'all' ? 'neopop-btn-secondary' : 'neopop-btn-dark'
              }`}
            >
              Both Tables (Stacked)
            </button>
            <button
              onClick={() => setTableFilter('left')}
              className={`neopop-btn text-[11px] px-2.5 py-1 flex items-center gap-1.5 ${
                tableFilter === 'left' ? 'neopop-btn-success' : 'neopop-btn-dark'
              }`}
            >
              <span className="w-1.5 h-1.5 bg-[#00E887] rounded-none"></span>
              <span>{leftTitle.split('(')[0].trim()}</span>
            </button>
            <button
              onClick={() => setTableFilter('right')}
              className={`neopop-btn text-[11px] px-2.5 py-1 flex items-center gap-1.5 ${
                tableFilter === 'right' ? 'neopop-btn-danger' : 'neopop-btn-dark'
              }`}
            >
              <span className="w-1.5 h-1.5 bg-[#FF5959] rounded-none"></span>
              <span>{rightTitle.split('(')[0].trim()}</span>
            </button>
          </div>
          <span className="text-[10px] font-mono text-zinc-500 hidden md:inline">
            Click any stock name to open full terminal analysis
          </span>
        </div>
      )}

      {/* Parameter Tables Container */}
      {metricMode === 'all' ? (
        <div className="space-y-6">
          <div className="flex items-center justify-between px-1 border-b border-zinc-800 pb-2">
            <div className="flex items-center gap-2">
              <Layers className="w-4 h-4 text-[#00E887]" />
              <span className="text-xs font-black font-mono uppercase text-white tracking-wider">
                All 5 Parameter Categories • 10 Dedicated Individual Tables
              </span>
            </div>
            <span className="text-[10px] font-mono text-zinc-400">
              {tableLayout === 'separate' ? 'Full-Width Individual Stacked Tables' : 'Side-by-Side Dual Column Tables'}
            </span>
          </div>

          {allModesData.map(({ config, datasets }) => (
            <div key={config.key} className="space-y-3">
              {/* Category Header Strip */}
              <div className="flex items-center justify-between border-b-2 border-black pb-2 px-1">
                <div className="flex items-center gap-2">
                  <config.icon className="w-4 h-4 text-[#FEE360]" />
                  <h3 className="neopop-heading font-black text-white text-xs sm:text-sm tracking-tight uppercase">
                    {config.title}
                  </h3>
                </div>
                <button
                  onClick={() => setMetricMode(config.key)}
                  className="neopop-btn neopop-btn-dark text-[10px] px-2.5 py-1 font-mono hover:bg-[#252525] flex items-center gap-1"
                  title={`Focus on ${config.label} tables`}
                >
                  <span>Focus {config.label}</span>
                  <ChevronRight className="w-3 h-3 text-[#FEE360]" />
                </button>
              </div>

              {/* Individual Tables for this parameter */}
              <div className={tableLayout === 'split' ? "grid grid-cols-1 lg:grid-cols-2 gap-4" : "space-y-4"}>
                <ParameterTable
                  title={datasets.leftTitle}
                  badgeText={datasets.leftBadge}
                  badgeColor="#00E887"
                  textColor="#000000"
                  stocks={datasets.leftData}
                  modeKey={datasets.modeKey}
                  tableSide="left"
                  onSelectStock={onSelectStock}
                  recentTicks={recentTicks}
                />
                <ParameterTable
                  title={datasets.rightTitle}
                  badgeText={datasets.rightBadge}
                  badgeColor="#FF5959"
                  textColor="#FFFFFF"
                  stocks={datasets.rightData}
                  modeKey={datasets.modeKey}
                  tableSide="right"
                  onSelectStock={onSelectStock}
                  recentTicks={recentTicks}
                />
              </div>
            </div>
          ))}
        </div>
      ) : (
        <div className={tableLayout === 'split' ? "flex flex-col lg:flex-row gap-4" : "space-y-4"}>
          {/* Left Column Table */}
          {(tableLayout === 'split' || tableFilter === 'all' || tableFilter === 'left') && (
            <ParameterTable
              title={leftTitle}
              badgeText={leftBadge}
              badgeColor="#00E887"
              textColor="#000000"
              stocks={leftData}
              modeKey={modeKey}
              tableSide="left"
              onSelectStock={onSelectStock}
              recentTicks={recentTicks}
            />
          )}

          {/* Right Column Table */}
          {(tableLayout === 'split' || tableFilter === 'all' || tableFilter === 'right') && (
            <ParameterTable
              title={rightTitle}
              badgeText={rightBadge}
              badgeColor="#FF5959"
              textColor="#FFFFFF"
              stocks={rightData}
              modeKey={modeKey}
              tableSide="right"
              onSelectStock={onSelectStock}
              recentTicks={recentTicks}
            />
          )}
        </div>
      )}
    </div>
  );
}

// Sub-component: Parameter Table for clean and modular rendering
function ParameterTable({ title, badgeText, badgeColor, textColor, stocks, modeKey, tableSide = 'left', onSelectStock, recentTicks = {} }) {
  return (
    <div className="neopop-card overflow-hidden flex-1 min-w-0 border-2 border-black bg-[#171717] rounded-[4px] shadow-[4px_4px_0px_#000000]">
      <div className="px-4 py-3 border-b-2 border-black flex items-center justify-between bg-[#1A1A1A]">
        <h3 className="neopop-heading font-black text-white text-xs sm:text-sm flex items-center gap-2 tracking-tight uppercase">
          <span
            className="w-2.5 h-2.5 rounded-none border border-black shadow-[1px_1px_0px_#000]"
            style={{ backgroundColor: badgeColor }}
          ></span>
          <span>{title}</span>
        </h3>
        <span
          className="neopop-tag font-black text-[10px]"
          style={{ backgroundColor: badgeColor, color: textColor }}
        >
          {badgeText}
        </span>
      </div>
      <div className="overflow-x-auto">
        <table className="w-full text-xs text-left border-collapse table-auto">
          <thead>
            <tr className="border-b-2 border-black text-zinc-400 text-[10px] uppercase tracking-wider font-mono font-bold bg-[#141414]">
              <th className="py-2.5 px-3 whitespace-nowrap">Symbol &amp; Sector</th>
              <th className="py-2.5 px-3 text-right whitespace-nowrap">LTP (₹)</th>
              <th className="py-2.5 px-3 text-right whitespace-nowrap">% Chg</th>

              {/* Dynamic Headers based on Mode */}
              {modeKey === '52w' && (
                <>
                  <th className="py-2.5 px-3 text-right font-mono whitespace-nowrap">52W Range</th>
                  <th className="py-2.5 px-3 text-center font-mono whitespace-nowrap">
                    {tableSide === 'left' ? 'Distance to 52W High' : 'Distance to 52W Low'}
                  </th>
                </>
              )}
              {modeKey === 'volume' && (
                <>
                  <th className="py-2.5 px-3 text-right font-mono whitespace-nowrap">Volume</th>
                  <th className="py-2.5 px-3 text-center font-mono whitespace-nowrap">RVOL Surge</th>
                </>
              )}
              {modeKey === 'sentiment' && (
                <>
                  <th className="py-2.5 px-3 text-center font-mono whitespace-nowrap">Sentiment Score</th>
                  <th className="py-2.5 px-3 text-right font-mono whitespace-nowrap">Turnover</th>
                </>
              )}
              {modeKey === 'turnover' && (
                <>
                  <th className="py-2.5 px-3 text-right font-mono whitespace-nowrap">Turnover (₹ Cr)</th>
                  <th className="py-2.5 px-3 text-center font-mono whitespace-nowrap">Delivery %</th>
                </>
              )}
              {modeKey === 'gainers-losers' && (
                <>
                  <th className="py-2.5 px-3 text-center hidden md:table-cell whitespace-nowrap">Day Range (L - H)</th>
                  <th className="py-2.5 px-3 text-right font-mono whitespace-nowrap">Turnover</th>
                </>
              )}
            </tr>
          </thead>
          <tbody className="divide-y divide-[#222222] font-medium">
            {stocks.map((s, idx) => {
              const chg = s.change_perc || 0;
              const isUp = chg >= 0;
              const asm = s.asm || getAsmStatus(s.symbol);
              const distHigh = s.dist_52w_high_pct !== undefined ? s.dist_52w_high_pct : 5.0;
              const distLow = s.dist_52w_low_pct !== undefined ? s.dist_52w_low_pct : 25.0;
              const rvol = s.rvol || 1.0;
              const sentiment = s.sentiment_score !== undefined ? s.sentiment_score : 50;
              const mcap = getMarketCap(s);
              const tickDir = recentTicks[s.symbol];
              const tickBg = tickDir === 'up' ? 'bg-[#00E887]/20 border-l-2 border-l-[#00E887]' : tickDir === 'down' ? 'bg-[#FF5959]/20 border-l-2 border-l-[#FF5959]' : '';

              return (
                <tr
                  key={s.symbol}
                  onClick={() => onSelectStock(s)}
                  className={`hover:bg-[#1E1E1E] transition-colors cursor-pointer group ${tickBg}`}
                >
                  <td className="py-2.5 px-3 font-bold text-white">
                    <div className="flex items-center gap-1.5 flex-wrap">
                      <span className="group-hover:text-[#FEE360] group-hover:underline transition-colors text-xs font-black font-mono flex items-center gap-1">
                        {s.symbol}
                        <ExternalLink className="w-2.5 h-2.5 text-zinc-500 group-hover:text-[#FEE360] opacity-0 group-hover:opacity-100 transition-opacity" />
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
                      {asm?.isAsm && (
                        <span
                          className="neopop-tag bg-[#FF5959]/20 text-[#FF5959] border border-[#FF5959]/40 text-[9px] py-0 px-1 font-black"
                          title={`${asm.badge} - 100% Margin Required`}
                        >
                          ASM
                        </span>
                      )}
                      {isUp ? (
                        <ArrowUpRight className="w-3.5 h-3.5 text-[#00E887] shrink-0" />
                      ) : (
                        <ArrowDownRight className="w-3.5 h-3.5 text-[#FF5959] shrink-0" />
                      )}
                      <span className="neopop-tag bg-[#1E1E1E] text-zinc-300 text-[9px] py-0 px-1 border-black hidden xs:inline">
                        {s.sector || 'EQ'}
                      </span>
                    </div>
                    <div className="text-[10px] text-zinc-400 font-normal truncate max-w-[130px] sm:max-w-[160px]">
                      {s.name}
                    </div>
                  </td>
                  <td className="py-2.5 px-3 text-right font-black font-mono text-white text-xs whitespace-nowrap">
                    {formatIndianCurrency(s.ltp)}
                  </td>
                  <td className="py-2.5 px-3 text-right font-mono whitespace-nowrap">
                    <span
                      className={`neopop-tag font-black text-[11px] ${
                        isUp ? 'bg-[#00E887] text-black' : 'bg-[#FF5959] text-white'
                      }`}
                    >
                      {isUp ? '+' : ''}{chg.toFixed(2)}%
                    </span>
                  </td>

                  {/* Mode-Specific Data Cells */}
                  {modeKey === '52w' && (
                    <>
                      <td className="py-2.5 px-3 text-right font-mono text-xs whitespace-nowrap">
                        <div className="text-white font-bold">H: ₹{s.high_52w?.toFixed(0)}</div>
                        <div className="text-[10px] text-zinc-500">L: ₹{s.low_52w?.toFixed(0)}</div>
                      </td>
                      <td className="py-2.5 px-3 text-center font-mono whitespace-nowrap">
                        {tableSide === 'left' ? (
                          distHigh === 0 || s.ltp >= s.high_52w ? (
                            <span className="neopop-tag bg-[#00E887] text-black text-[10px] font-black">
                              ⚡ AT 52W HIGH
                            </span>
                          ) : (
                            <span className="neopop-tag bg-[#1E1E1E] text-[#00E887] text-[10px] font-black border border-[#00E887]/40">
                              -{distHigh.toFixed(1)}% to High
                            </span>
                          )
                        ) : (
                          distLow === 0 || s.ltp <= s.low_52w ? (
                            <span className="neopop-tag bg-[#FF5959] text-white text-[10px] font-black">
                              ⚠️ AT 52W LOW
                            </span>
                          ) : (
                            <span className="neopop-tag bg-[#1E1E1E] text-[#FF5959] text-[10px] font-black border border-[#FF5959]/40">
                              +{distLow.toFixed(1)}% from Low
                            </span>
                          )
                        )}
                      </td>
                    </>
                  )}

                  {modeKey === 'volume' && (
                    <>
                      <td className="py-2.5 px-3 text-right font-mono text-xs text-white whitespace-nowrap">
                        <div className="font-bold">{formatVolume(s.volume)}</div>
                        <div className="text-[10px] text-zinc-500">Avg: {formatVolume(s.volume_avg_20d || s.volume)}</div>
                      </td>
                      <td className="py-2.5 px-3 text-center font-mono whitespace-nowrap">
                        <span className={`neopop-tag text-[10px] font-black ${
                          rvol >= 2.0 ? 'bg-[#FEE360] text-black' : rvol >= 1.3 ? 'bg-[#1E1E1E] text-[#00E887]' : 'bg-[#141414] text-zinc-400'
                        }`}>
                          {rvol.toFixed(2)}x Surge
                        </span>
                      </td>
                    </>
                  )}

                  {modeKey === 'sentiment' && (
                    <>
                      <td className="py-2.5 px-3 text-center font-mono whitespace-nowrap">
                        <div className="flex items-center justify-center gap-1.5">
                          <span className={`neopop-tag text-[10px] font-black ${
                            sentiment >= 80 ? 'bg-[#00E887] text-black' : sentiment >= 65 ? 'bg-emerald-900 text-emerald-300' : sentiment <= 25 ? 'bg-[#FF5959] text-white' : sentiment <= 40 ? 'bg-rose-950 text-rose-300' : 'bg-[#1E1E1E] text-[#FEE360]'
                          }`}>
                            {sentiment} / 100
                          </span>
                          <span className="text-[10px] text-zinc-400 font-bold uppercase hidden sm:inline">
                            {s.sentiment_label || (sentiment >= 65 ? 'BULL' : sentiment <= 35 ? 'BEAR' : 'NEUT')}
                          </span>
                        </div>
                      </td>
                      <td className="py-2.5 px-3 text-right font-mono text-xs text-white font-bold whitespace-nowrap">
                        ₹{(s.turnoverCr || 0).toFixed(1)} Cr
                      </td>
                    </>
                  )}

                  {modeKey === 'turnover' && (
                    <>
                      <td className="py-2.5 px-3 text-right font-mono text-xs font-bold text-[#FEE360] whitespace-nowrap">
                        ₹{(s.turnoverCr || 0).toFixed(1)} Cr
                      </td>
                      <td className="py-2.5 px-3 text-center font-mono whitespace-nowrap">
                        <span className={`neopop-tag text-[10px] font-bold ${
                          (s.delivery_pct || 0) >= 60 ? 'bg-[#00E887] text-black' : (s.delivery_pct || 0) >= 45 ? 'bg-[#FEE360] text-black' : 'bg-[#1E1E1E] text-zinc-300'
                        }`}>
                          {(s.delivery_pct || 45.0).toFixed(1)}% Del
                        </span>
                      </td>
                    </>
                  )}

                  {modeKey === 'gainers-losers' && (
                    <>
                      <td className="py-2.5 px-3 text-center hidden md:table-cell">
                        <div className="w-32 mx-auto">
                          <div className="flex items-center justify-between text-[9px] font-mono text-zinc-400">
                            <span>₹{s.low ? s.low.toFixed(0) : '—'}</span>
                            <span className="text-[#FEE360] font-bold">{s.posPct ? s.posPct.toFixed(0) : 50}%</span>
                            <span>₹{s.high ? s.high.toFixed(0) : '—'}</span>
                          </div>
                          <div className="w-full bg-[#111111] h-1.5 border border-black overflow-hidden mt-0.5">
                            <div
                              className={`h-full ${(s.posPct || 50) > 70 ? 'bg-[#00E887]' : (s.posPct || 50) < 30 ? 'bg-[#FF5959]' : 'bg-[#FEE360]'}`}
                              style={{ width: `${s.posPct || 50}%` }}
                            ></div>
                          </div>
                        </div>
                      </td>
                      <td className="py-2.5 px-3 text-right text-zinc-300 font-mono text-xs whitespace-nowrap">
                        ₹{(s.turnoverCr || 0).toFixed(1)} Cr
                      </td>
                    </>
                  )}
                </tr>
              );
            })}
          </tbody>
        </table>
      </div>
    </div>
  );
}
