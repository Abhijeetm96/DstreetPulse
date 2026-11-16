import React, { useState, useEffect, useMemo } from 'react';
import {
  X,
  TrendingUp,
  TrendingDown,
  Layers,
  Building2,
  BarChart2,
  Calculator,
  Copy,
  Check,
  Target,
  ShieldAlert,
  ShieldCheck,
  Calendar,
  Percent,
  Activity,
  Award,
  AlertTriangle,
  Clock,
  Sparkles,
  Info,
  Zap,
  CheckCircle2,
  Share2,
  FileText,
  ArrowLeft,
  ChevronLeft,
  ChevronRight,
  Briefcase,
  Landmark,
  ExternalLink,
  Flame,
  Search,
  Maximize2,
  Minimize2,
  Scale
} from 'lucide-react';
import { formatIndianCurrency, formatVolume } from '../utils/formatters.js';
import { computeStockDiagnostics, calculateStatutoryCharges } from '../utils/tradeCopilot.js';
import { getMarketCap } from '../utils/mktCapRegistry.js';
import { getAsmStatus } from '../utils/asmRegistry.js';

export default function StockModal({
  stock,
  onClose,
  parentTabName = 'Market',
  allStocks = [],
  onNavigateStock
}) {
  const [activeTab, setActiveTab] = useState('copilot'); // 'copilot' | 'chart' | 'returns' | 'deals' | 'sizer' | 'ohlc'
  const [liveQuote, setLiveQuote] = useState(null);
  const [copied, setCopied] = useState(false);
  const [copiedLink, setCopiedLink] = useState(false);
  const [ticketBroker, setTicketBroker] = useState('zerodha'); // 'zerodha' | 'nse_bracket' | 'alpaca'
  const [copiedTicket, setCopiedTicket] = useState(false);

  // Chart & Returns State
  const [returnsData, setReturnsData] = useState(null);
  const [loadingReturns, setLoadingReturns] = useState(false);
  const [returnsError, setReturnsError] = useState(null);
  const [selectedWindow, setSelectedWindow] = useState('1Y'); // '1W' | '1M' | '3M' | '6M' | '1Y' | '3Y' | '5Y' | '10Y' | '20Y'
  const [hoveredPoint, setHoveredPoint] = useState(null);
  const [chartType, setChartType] = useState('area'); // 'area' | 'candles'
  const [showEma, setShowEma] = useState(true);
  const [showVolume, setShowVolume] = useState(true);
  const [chartHeightMode, setChartHeightMode] = useState('full'); // 'full' (500px) | 'cinema' (650px)

  // Deals State for this specific stock
  const [stockDeals, setStockDeals] = useState(null);
  const [loadingDeals, setLoadingDeals] = useState(false);

  // Trade Calculator State
  const [riskBudget, setRiskBudget] = useState(1000); // ₹1,000 risk budget
  const [stopLossPct, setStopLossPct] = useState(2.5); // 2.5% stop loss

  // Keyboard navigation: Esc to close, [ and ] to cycle prev/next
  useEffect(() => {
    function handleKeyDown(e) {
      if (e.target.tagName === 'INPUT' || e.target.tagName === 'SELECT' || e.target.tagName === 'TEXTAREA') return;
      if (e.key === 'Escape' || e.key === 'Backspace') {
        onClose();
      } else if (e.key === '[' && onNavigateStock) {
        onNavigateStock('prev');
      } else if (e.key === ']' && onNavigateStock) {
        onNavigateStock('next');
      }
    }
    window.addEventListener('keydown', handleKeyDown);
    return () => window.removeEventListener('keydown', handleKeyDown);
  }, [onClose, onNavigateStock]);

  // Fetch Point-in-Time & Rolling Returns from institutional engine
  useEffect(() => {
    if (!stock?.symbol) return;
    setLoadingReturns(true);
    setReturnsError(null);

    fetch(`./api/stock-returns?symbol=${encodeURIComponent(stock.symbol)}`)
      .then(async (res) => {
        if (!res.ok) throw new Error(`HTTP error ${res.status}`);
        return res.json();
      })
      .then((data) => {
        setReturnsData(data);
        setLoadingReturns(false);
      })
      .catch(() => {
        // Fallback default calculation from stock object for static demo
        setReturnsData({
          symbol: stock.symbol,
          returns: stock.returns || {
            '1D': stock.change_perc || 0,
            '1W': 1.25,
            '1M': 3.40,
            '3M': 7.80,
            '6M': 14.20,
            '1Y': 24.50
          }
        });
        setLoadingReturns(false);
      });
  }, [stock?.symbol]);

  // Fetch Smart Money & Institutional Deals for this specific stock
  useEffect(() => {
    if (!stock?.symbol) return;
    setLoadingDeals(true);
    fetch(`./api/deals?q=${encodeURIComponent(stock.symbol)}`)
      .then(async (res) => {
        if (!res.ok) throw new Error();
        return res.json();
      })
      .catch(async () => {
        const fallback = await fetch('./data/deals.json');
        if (!fallback.ok) return null;
        return fallback.json();
      })
      .then((data) => {
        setStockDeals(data);
        setLoadingDeals(false);
      })
      .catch(() => setLoadingDeals(false));
  }, [stock?.symbol]);

  if (!stock) return null;

  const current = liveQuote || stock;
  const ltp = current.ltp || stock.ltp || 1000;
  const chg = current.day_change_perc !== undefined ? current.day_change_perc : (stock.change_perc || 0);
  const isUp = chg >= 0;
  const high = current.high || stock.high || ltp * 1.02;
  const low = current.low || stock.low || ltp * 0.98;
  const open = current.open || stock.open || ltp;
  const close = current.close || stock.close || ltp;
  const rangeSpan = high - low || 1;
  const posPct = Math.min(100, Math.max(0, ((ltp - low) / rangeSpan) * 100));

  const mcap = getMarketCap(stock);
  const asm = getAsmStatus(stock.symbol);

  // Risk / Sizing Calculations
  const stopLossPrice = Number((ltp * (1 - stopLossPct / 100)).toFixed(2));
  const riskPerShare = Math.max(0.05, ltp - stopLossPrice);
  const calculatedQty = Math.max(1, Math.floor(riskBudget / riskPerShare));
  const totalInvestment = Number((calculatedQty * ltp).toFixed(2));
  const target2RPrice = Number((ltp + riskPerShare * 2).toFixed(2));
  const potentialProfit = Number((calculatedQty * (target2RPrice - ltp)).toFixed(2));
  const actualRisk = Number((calculatedQty * riskPerShare).toFixed(2));

  const copySymbol = () => {
    navigator.clipboard?.writeText(stock.symbol);
    setCopied(true);
    setTimeout(() => setCopied(false), 1500);
  };

  const copyShareLink = () => {
    const url = `${window.location.origin}${window.location.pathname}#stock/${stock.symbol}`;
    navigator.clipboard?.writeText(url);
    setCopiedLink(true);
    setTimeout(() => setCopiedLink(false), 2000);
  };

  const diagnostics = useMemo(() => {
    return computeStockDiagnostics(stock, riskBudget);
  }, [stock, riskBudget]);

  const copyTicketPayload = (payload) => {
    navigator.clipboard?.writeText(typeof payload === 'string' ? payload : JSON.stringify(payload, null, 2));
    setCopiedTicket(true);
    setTimeout(() => setCopiedTicket(false), 2000);
  };

  // Active Rolling Return Data & Timeframe Data
  const activeRolling = returnsData?.rolling?.[selectedWindow];
  const activeTf = returnsData?.timeframeSeries?.[selectedWindow];

  // SVG Chart Dimensions & Computations
  const chartWidth = 1000;
  const isCinema = chartHeightMode === 'cinema';
  const chartHeight = isCinema ? 580 : 440;
  const pad = { top: 28, right: 80, bottom: 45, left: 80 };

  const chartData = useMemo(() => {
    let rawPoints = [];
    let startRefPrice = ltp;
    let endRefPrice = ltp;
    let tfReturnPct = 0;
    let tfCagrPct = null;

    if (activeTf && activeTf.points && activeTf.points.length > 0) {
      rawPoints = activeTf.points;
      startRefPrice = activeTf.startPrice;
      endRefPrice = activeTf.endPrice;
      tfReturnPct = activeTf.returnPct;
      tfCagrPct = activeTf.cagrPct;
    } else if (activeRolling?.series && activeRolling.series.length > 0) {
      rawPoints = activeRolling.series.map(s => ({
        date: s.date,
        close: s.endPrice || s.returnPct || ltp,
        high: (s.endPrice || ltp) * 1.012,
        low: (s.endPrice || ltp) * 0.988,
        volume: 500000
      }));
      startRefPrice = rawPoints[0].close;
      endRefPrice = rawPoints[rawPoints.length - 1].close;
      tfReturnPct = ((endRefPrice - startRefPrice) / startRefPrice) * 100;
    } else {
      return null;
    }

    if (rawPoints.length === 0) return null;

    const prices = rawPoints.map(p => p.close);
    const minVal = Math.min(...prices);
    const maxVal = Math.max(...prices);

    // 4% headroom top and bottom so line does not touch edges
    const span = maxVal - minVal || 1;
    const rangeMin = Math.max(0, minVal - span * 0.04);
    const rangeMax = maxVal + span * 0.04;
    const rangeSpan = rangeMax - rangeMin || 1;

    const innerW = chartWidth - pad.left - pad.right;
    const innerH = chartHeight - pad.top - pad.bottom;

    const points = rawPoints.map((p, idx) => {
      const x = pad.left + (idx / Math.max(1, rawPoints.length - 1)) * innerW;
      const y = pad.top + (1 - (p.close - rangeMin) / rangeSpan) * innerH;
      const returnFromStart = startRefPrice > 0 ? ((p.close - startRefPrice) / startRefPrice) * 100 : 0;
      return {
        ...p,
        price: p.close,
        returnFromStart: Number(returnFromStart.toFixed(2)),
        x,
        y
      };
    });

    // 20 EMA calculation
    const ema20Points = [];
    const k = 2 / (Math.min(20, Math.max(3, points.length)) + 1);
    let ema = points[0]?.price || ltp;
    points.forEach((pt) => {
      ema = pt.price * k + ema * (1 - k);
      const emaY = pad.top + (1 - (ema - rangeMin) / rangeSpan) * innerH;
      ema20Points.push({ x: pt.x, y: emaY, ema });
    });

    const pathD = points.reduce((acc, pt, i) => `${acc} ${i === 0 ? 'M' : 'L'} ${pt.x.toFixed(1)} ${pt.y.toFixed(1)}`, '');
    const emaPathD = ema20Points.reduce((acc, pt, i) => `${acc} ${i === 0 ? 'M' : 'L'} ${pt.x.toFixed(1)} ${pt.y.toFixed(1)}`, '');
    const areaD = `${pathD} L ${points[points.length - 1].x.toFixed(1)} ${pad.top + innerH} L ${points[0].x.toFixed(1)} ${pad.top + innerH} Z`;

    // Volume histogram calculations
    const maxVol = Math.max(...rawPoints.map(p => p.volume || 1), 1);
    const volHeightMax = innerH * 0.22;
    const volBaseY = pad.top + innerH;
    const barWidth = Math.max(1.5, Math.min(10, (innerW / rawPoints.length) * 0.75));

    const volBars = points.map((pt, idx) => {
      const vol = pt.volume || 0;
      const h = Math.max(2, (vol / maxVol) * volHeightMax);
      const prevClose = idx > 0 ? points[idx - 1].price : pt.price;
      const isBarUp = pt.price >= prevClose;
      return {
        x: pt.x - barWidth / 2,
        y: volBaseY - h,
        width: barWidth,
        height: h,
        color: isBarUp ? '#00E887' : '#FF5959',
        vol
      };
    });

    // 5 Horizontal benchmark grid levels
    const gridLevels = [
      { y: pad.top, val: rangeMax },
      { y: pad.top + innerH * 0.25, val: rangeMin + rangeSpan * 0.75 },
      { y: pad.top + innerH * 0.50, val: rangeMin + rangeSpan * 0.50 },
      { y: pad.top + innerH * 0.75, val: rangeMin + rangeSpan * 0.25 },
      { y: pad.top + innerH, val: rangeMin }
    ];

    // 6 to 8 Vertical Date markers along X-axis
    const dateTicks = [];
    const tickCount = Math.min(7, Math.max(3, Math.floor(points.length / 10)));
    for (let t = 0; t <= tickCount; t++) {
      const idx = Math.min(points.length - 1, Math.round((t / tickCount) * (points.length - 1)));
      const pt = points[idx];
      if (pt) {
        dateTicks.push({
          x: pt.x,
          date: pt.date
        });
      }
    }

    return {
      points,
      pathD,
      emaPathD,
      areaD,
      rangeMin,
      rangeMax,
      rangeSpan,
      minVal,
      maxVal,
      startRefPrice,
      endRefPrice,
      tfReturnPct,
      tfCagrPct,
      isPositive: tfReturnPct >= 0,
      innerW,
      innerH,
      volBars,
      gridLevels,
      dateTicks,
      totalBars: activeTf?.totalBars || rawPoints.length,
      startDate: rawPoints[0].date,
      endDate: rawPoints[rawPoints.length - 1].date
    };
  }, [activeTf, activeRolling, ltp, chartHeight, chartHeightMode]);

  // Total deals for this stock
  const dealsCount = (stockDeals?.blockDeals?.length || 0) + (stockDeals?.bulkDeals?.length || 0) + (stockDeals?.insiderTrades?.length || 0);

  // -------------------------------------------------------------
  // PRIMARY FULL-PAGE TERMINAL WORKSPACE
  // -------------------------------------------------------------
  return (
    <div className="space-y-4 sm:space-y-5 animate-in fade-in duration-200 w-full">
      {/* 1. Architectural Breadcrumb, Stock Switcher & Action Controls */}
      <div className="neopop-card p-3 sm:p-4 border-2 border-black bg-[#151515] rounded-[4px] shadow-[4px_4px_0px_#000000] flex flex-wrap items-center justify-between gap-3">
        {/* Left: Breadcrumbs & Back Button */}
        <div className="flex items-center gap-2 sm:gap-3 flex-wrap">
          <button
            onClick={onClose}
            className="neopop-btn neopop-btn-dark text-xs px-3 py-1.5 flex items-center gap-1.5 font-bold hover:bg-[#252525] border-2 border-black shadow-[2px_2px_0px_#000000]"
            title="Return to Table (Keyboard: Esc / Backspace)"
          >
            <ArrowLeft className="w-3.5 h-3.5 text-[#FEE360]" />
            <span>← Back to {parentTabName}</span>
          </button>

          <div className="flex items-center gap-1.5 text-xs font-mono">
            <span className="text-zinc-500">DstreetPulse</span>
            <span className="text-zinc-600">/</span>
            <span className="text-zinc-400 font-bold uppercase">{parentTabName}</span>
            <span className="text-zinc-600">/</span>
            <span className="text-[#FEE360] font-black">{stock.symbol}</span>
          </div>

          {/* Quick Prev / Next Stock Carousel */}
          {onNavigateStock && (
            <div className="flex items-center gap-1 ml-1">
              <button
                onClick={() => onNavigateStock('prev')}
                className="neopop-btn neopop-btn-dark text-[10px] px-2 py-1 flex items-center gap-0.5 font-mono"
                title="Previous Stock in Universe (Keyboard: [)"
              >
                <ChevronLeft className="w-3 h-3 text-[#FEE360]" />
                <span className="hidden sm:inline">Prev</span>
              </button>
              <button
                onClick={() => onNavigateStock('next')}
                className="neopop-btn neopop-btn-dark text-[10px] px-2 py-1 flex items-center gap-0.5 font-mono"
                title="Next Stock in Universe (Keyboard: ])"
              >
                <span className="hidden sm:inline">Next</span>
                <ChevronRight className="w-3 h-3 text-[#FEE360]" />
              </button>
            </div>
          )}
        </div>

        {/* Right: Action Controls (Compare, Share & Close) */}
        <div className="flex items-center gap-2">
          {/* Compare with Peers */}
          <button
            onClick={() => {
              const peers = stock.sector === 'IT' ? [stock.symbol, 'TCS', 'INFY']
                : stock.sector === 'Banking' ? [stock.symbol, 'HDFCBANK', 'ICICIBANK']
                : stock.sector === 'Energy' ? [stock.symbol, 'TATAPOWER', 'NTPC']
                : stock.sector === 'Automobile' ? [stock.symbol, 'TATAMOTORS', 'M&M']
                : [stock.symbol, 'RELIANCE', 'TCS'];
              window.location.hash = `#compare?stocks=${peers.join(',')}`;
            }}
            className="neopop-btn neopop-btn-dark text-[11px] px-2.5 py-1.5 flex items-center gap-1 font-mono border-2 border-black hover:bg-[#252525]"
            title={`Compare ${stock.symbol} with industry peers on charts, fundamentals & technicals`}
          >
            <Scale className="w-3.5 h-3.5 text-[#FEE360]" />
            <span className="hidden sm:inline">Compare Peers</span>
          </button>

          {/* Share Direct Link */}
          <button
            onClick={copyShareLink}
            className="neopop-btn neopop-btn-dark text-[11px] px-2.5 py-1.5 flex items-center gap-1 font-mono border-2 border-black"
            title="Copy shareable direct stock URL"
          >
            {copiedLink ? <Check className="w-3.5 h-3.5 text-[#00E887]" /> : <Share2 className="w-3.5 h-3.5 text-zinc-400" />}
            <span>{copiedLink ? 'Link Copied!' : 'Share'}</span>
          </button>

          <button
            onClick={onClose}
            className="neopop-btn neopop-btn-danger text-xs px-3 py-1.5 flex items-center gap-1.5 font-bold border-2 border-black shadow-[2px_2px_0px_#000000]"
            title="Return to Table (Esc)"
          >
            <X className="w-3.5 h-3.5" />
            <span>Close</span>
          </button>
        </div>
      </div>

      {/* 2. Main Terminal Card (CRED NeoPOP Geometry) */}
      <div className="neopop-card border-2 border-black rounded-[4px] shadow-[6px_6px_0px_#000000] overflow-hidden bg-[#141414]">
        {/* Stock Identity Ribbon */}
        <div className="bg-[#0C0C0C] text-white px-4 sm:px-6 py-4 flex flex-wrap items-center justify-between border-b-2 border-black gap-3">
          <div className="flex items-center gap-3">
            <div className="w-11 h-11 rounded-[3px] bg-[#FEE360] text-black font-black text-sm flex items-center justify-center border-2 border-black shadow-[2px_2px_0px_#000000]">
              NSE
            </div>
            <div>
              <div className="flex items-center gap-2 flex-wrap">
                <h2 className="font-black text-xl sm:text-2xl text-white tracking-tight leading-tight font-mono neopop-heading">
                  {stock.symbol}
                </h2>
                <button
                  onClick={copySymbol}
                  className="neopop-btn neopop-btn-dark p-1 text-zinc-300"
                  title="Copy Symbol"
                >
                  {copied ? <Check className="w-3.5 h-3.5 text-[#00E887]" /> : <Copy className="w-3.5 h-3.5" />}
                </button>

                {/* Market Cap Tier Badge */}
                <span
                  className="neopop-tag text-[10px] py-0.5 px-2 font-black border"
                  style={{
                    backgroundColor: `${mcap.color}20`,
                    color: mcap.color,
                    borderColor: `${mcap.color}50`
                  }}
                  title={`SEBI Tier: ${mcap.label} • Estimated Mcap: ₹${mcap.mkt_cap_cr.toLocaleString('en-IN')} Cr`}
                >
                  {mcap.category} • ₹{mcap.mkt_cap_cr.toLocaleString('en-IN')} Cr
                </span>

                {mcap.isPenny && (
                  <span className="neopop-tag bg-[#FF5959]/20 text-[#FF5959] border border-[#FF5959]/40 text-[9px] py-0.5 px-1.5 font-black">
                    PENNY EQUITY
                  </span>
                )}

                {stock.sector && (
                  <span className="neopop-tag bg-[#1E1E1E] text-zinc-300 text-[10px]">
                    {stock.sector}
                  </span>
                )}

                {(asm.isAsm || stock.asm?.isAsm || diagnostics?.asm?.isAsm) && (
                  <span className="neopop-tag bg-[#FF5959] text-white font-black text-xs px-2.5 py-0.5 border border-black shadow-[2px_2px_0px_#000000]">
                    ⚠️ {(asm.badge || stock.asm?.badge || 'ASM STAGE-1')} • 100% MARGIN
                  </span>
                )}
              </div>
              <div className="text-xs text-zinc-400 font-medium truncate max-w-xl mt-0.5">{stock.name}</div>
            </div>
          </div>

          {/* Quick Stats: Day Range Bar */}
          <div className="flex items-center gap-4 text-xs font-mono">
            <div className="text-right">
              <div className="text-[10px] text-zinc-400 uppercase font-bold">52W Range</div>
              <div className="text-zinc-200 mt-0.5">
                <span className="text-[#FF5959]">₹{stock.low_52w || stock.low || '—'}</span>
                <span className="text-zinc-500 mx-1">&bull;</span>
                <span className="text-[#00E887]">₹{stock.high_52w || stock.high || '—'}</span>
              </div>
            </div>
            <div className="text-right pl-3 border-l border-black/40">
              <div className="text-[10px] text-zinc-400 uppercase font-bold">Traded Volume</div>
              <div className="text-white font-bold mt-0.5">{formatVolume(stock.volume)}</div>
            </div>
          </div>
        </div>

        {/* Live Price Ribbon */}
        <div className="bg-[#171717] px-4 sm:px-6 py-3 border-b-2 border-black flex flex-wrap items-center justify-between gap-3">
          <div className="flex items-center gap-4">
            <div>
              <div className="text-[10px] text-zinc-400 uppercase tracking-wider font-bold neopop-caps">Last Traded Price</div>
              <div className="text-2xl sm:text-3xl font-black text-white font-mono tracking-tight tabular-nums mt-0.5">
                {formatIndianCurrency(ltp)}
              </div>
            </div>
            <span
              className={`neopop-tag text-xs font-black px-3 py-1.5 ${
                isUp ? 'bg-[#00E887] text-black' : 'bg-[#FF5959] text-white'
              }`}
            >
              {isUp ? <TrendingUp className="w-4 h-4" /> : <TrendingDown className="w-4 h-4" />}
              <span>{isUp ? '+' : ''}{chg.toFixed(2)}%</span>
            </span>
          </div>

          {/* Quick Metrics Bar: 52W High/Low distance & Current Rolling Return */}
          <div className="flex items-center gap-4 text-xs font-mono">
            {activeRolling && (
              <div className="p-1.5 bg-[#111111] border border-black rounded-[3px] shadow-[2px_2px_0px_#000000]">
                <span className="text-zinc-400 text-[10px] uppercase font-bold mr-1.5">{selectedWindow} Performance:</span>
                <b className={(activeRolling.current ?? activeRolling.avg ?? 0) >= 0 ? 'text-[#00E887]' : 'text-[#FF5959]'}>
                  {(activeRolling.current ?? activeRolling.avg ?? 0) >= 0 ? '+' : ''}{(activeRolling.current ?? activeRolling.avg ?? 0).toFixed(2)}%
                </b>
              </div>
            )}
            <div className="text-right">
              <span className="text-[10px] text-zinc-400 uppercase font-bold block">Day Range</span>
              <span className="text-zinc-200 font-bold">
                ₹{stock.low ? Number(stock.low).toFixed(1) : (ltp * 0.98).toFixed(1)} - ₹{stock.high ? Number(stock.high).toFixed(1) : (ltp * 1.02).toFixed(1)}
              </span>
            </div>
          </div>
        </div>

        {/* HERO TECHNICAL PRICE CHART (Full-Size Bloomberg / TradingView Terminal Engine) */}
        <div className="p-4 sm:p-6 border-b-2 border-black bg-[#121212]">
          <div className="neopop-card p-4 sm:p-5 border-2 border-black bg-[#171717] rounded-[4px] shadow-[4px_4px_0px_#000000] space-y-3">
            {/* Chart Header Bar: Title, Timeframe Pills & Controls */}
            <div className="flex flex-wrap items-center justify-between gap-3 border-b-2 border-black pb-3">
              <div className="flex items-center gap-2">
                <Activity className="w-4 h-4 text-[#00E887]" />
                <h3 className="text-xs sm:text-sm font-black text-white uppercase tracking-wider neopop-caps flex items-center gap-2">
                  <span>Technical Price &amp; Trend Terminal</span>
                  <span className="text-[10px] text-zinc-400 font-mono font-normal">
                    ({selectedWindow} Window • {showEma ? '20 EMA' : 'Line'} • {chartData?.totalBars || '—'} Bars)
                  </span>
                </h3>
              </div>

              {/* Timeframe Selector Pills (1W, 1M, 3M, 6M, 1Y, 3Y, 5Y, 10Y, 20Y) & Controls */}
              <div className="flex items-center gap-1.5 flex-wrap">
                {['1W', '1M', '3M', '6M', '1Y', '3Y', '5Y', '10Y', '20Y'].map(win => (
                  <button
                    key={win}
                    onClick={() => setSelectedWindow(win)}
                    className={`neopop-btn text-[10px] px-2.5 py-1 font-mono font-bold ${
                      selectedWindow === win ? 'neopop-btn-primary' : 'neopop-btn-dark'
                    }`}
                    title={`View ${win} Historical Chart`}
                  >
                    {win}
                  </button>
                ))}

                {/* 20 EMA Toggle */}
                <button
                  onClick={() => setShowEma(!showEma)}
                  className={`neopop-btn text-[10px] px-2.5 py-1 font-mono font-bold ml-1 ${
                    showEma ? 'neopop-btn-success' : 'neopop-btn-dark'
                  }`}
                  title="Toggle 20-period Exponential Moving Average"
                >
                  {showEma ? '20 EMA ON' : '20 EMA OFF'}
                </button>

                {/* Volume Toggle */}
                <button
                  onClick={() => setShowVolume(!showVolume)}
                  className={`neopop-btn text-[10px] px-2.5 py-1 font-mono font-bold ${
                    showVolume ? 'neopop-btn-warning' : 'neopop-btn-dark'
                  }`}
                  title="Toggle Volume Histogram"
                >
                  <BarChart2 className="w-3 h-3 inline mr-1" />
                  {showVolume ? 'VOL ON' : 'VOL OFF'}
                </button>

                {/* Full Size / Cinema Height Toggle */}
                <button
                  onClick={() => setChartHeightMode(chartHeightMode === 'cinema' ? 'full' : 'cinema')}
                  className="neopop-btn neopop-btn-dark text-[10px] px-2.5 py-1 font-mono font-bold flex items-center gap-1 hover:bg-[#252525]"
                  title={chartHeightMode === 'cinema' ? 'Switch to Standard Full Size (500px)' : 'Switch to Max Cinema View (650px)'}
                >
                  {chartHeightMode === 'cinema' ? (
                    <>
                      <Minimize2 className="w-3 h-3 text-[#FEE360]" />
                      <span>500PX</span>
                    </>
                  ) : (
                    <>
                      <Maximize2 className="w-3 h-3 text-[#FEE360]" />
                      <span>MAX 650PX</span>
                    </>
                  )}
                </button>
              </div>
            </div>

            {/* Performance & Multi-Year Ribbon Banner */}
            {chartData && (
              <div className="bg-[#111111] p-2.5 sm:p-3 border border-black rounded-[3px] shadow-[2px_2px_0px_#000000] flex flex-wrap items-center justify-between gap-3 text-xs font-mono">
                <div className="flex items-center gap-3 sm:gap-4 flex-wrap">
                  <div>
                    <span className="text-[10px] text-zinc-400 uppercase font-bold block">{selectedWindow} Total Return</span>
                    <span className={`text-base font-black ${chartData.isPositive ? 'text-[#00E887]' : 'text-[#FF5959]'}`}>
                      {chartData.isPositive ? '+' : ''}{chartData.tfReturnPct.toFixed(2)}%
                    </span>
                  </div>

                  {chartData.tfCagrPct !== null && (
                    <div className="border-l border-zinc-800 pl-3">
                      <span className="text-[10px] text-zinc-400 uppercase font-bold block">Annualized CAGR</span>
                      <span className={`text-base font-black ${chartData.tfCagrPct >= 0 ? 'text-[#00E887]' : 'text-[#FF5959]'}`}>
                        {chartData.tfCagrPct >= 0 ? '+' : ''}{chartData.tfCagrPct.toFixed(2)}% <span className="text-[10px] font-normal text-zinc-400">p.a.</span>
                      </span>
                    </div>
                  )}

                  <div className="border-l border-zinc-800 pl-3">
                    <span className="text-[10px] text-zinc-400 uppercase font-bold block">Period Range</span>
                    <span className="text-zinc-200 font-bold">
                      <span className="text-[#FF5959]">₹{chartData.minVal.toFixed(2)}</span>
                      <span className="text-zinc-500 mx-1">→</span>
                      <span className="text-[#00E887]">₹{chartData.maxVal.toFixed(2)}</span>
                    </span>
                  </div>
                </div>

                <div className="text-right">
                  <span className="text-[10px] text-zinc-400 uppercase font-bold block">Date Span</span>
                  <span className="text-zinc-300 font-bold">
                    {chartData.startDate} <span className="text-zinc-500">to</span> {chartData.endDate}
                    <span className="text-zinc-400 text-[10px] ml-1.5 font-normal">({chartData.totalBars} sessions)</span>
                  </span>
                </div>
              </div>
            )}

            {/* SVG Technical Price Chart */}
            {chartData ? (
              <div className="relative">
                <svg
                  viewBox={`0 0 ${chartWidth} ${chartHeight}`}
                  className={`w-full select-none ${chartHeightMode === 'cinema' ? 'h-[580px] sm:h-[640px]' : 'h-[440px] sm:h-[500px]'}`}
                >
                  <defs>
                    <linearGradient id="terminalGreenGradient" x1="0" y1="0" x2="0" y2="1">
                      <stop offset="0%" stopColor="#00E887" stopOpacity="0.30" />
                      <stop offset="100%" stopColor="#00E887" stopOpacity="0.00" />
                    </linearGradient>
                    <linearGradient id="terminalRedGradient" x1="0" y1="0" x2="0" y2="1">
                      <stop offset="0%" stopColor="#FF5959" stopOpacity="0.30" />
                      <stop offset="100%" stopColor="#FF5959" stopOpacity="0.00" />
                    </linearGradient>
                  </defs>

                  {/* Volume Histogram (bottom 22% of chart area) */}
                  {showVolume && chartData.volBars.map((vb, idx) => (
                    <rect
                      key={idx}
                      x={vb.x}
                      y={vb.y}
                      width={vb.width}
                      height={vb.height}
                      fill={vb.color}
                      opacity="0.35"
                    />
                  ))}

                  {/* Horizontal Grid lines & Price Labels (5 Benchmark Levels) */}
                  {chartData.gridLevels.map((gl, i) => (
                    <g key={i}>
                      <line
                        x1={pad.left}
                        y1={gl.y}
                        x2={chartWidth - pad.right}
                        y2={gl.y}
                        stroke="#262626"
                        strokeDasharray={i === 0 || i === chartData.gridLevels.length - 1 ? 'none' : '3,3'}
                        strokeWidth="1"
                      />
                      {/* Left price scale */}
                      <text x={pad.left - 10} y={gl.y + 3.5} textAnchor="end" fill="#71717A" fontSize="10" fontFamily="monospace" fontWeight="bold">
                        ₹{gl.val >= 100 ? gl.val.toFixed(0) : gl.val.toFixed(1)}
                      </text>
                      {/* Right price scale */}
                      <text x={chartWidth - pad.right + 10} y={gl.y + 3.5} textAnchor="start" fill="#71717A" fontSize="10" fontFamily="monospace" fontWeight="bold">
                        ₹{gl.val >= 100 ? gl.val.toFixed(0) : gl.val.toFixed(1)}
                      </text>
                    </g>
                  ))}

                  {/* Vertical Date Grid lines & X-Axis Labels */}
                  {chartData.dateTicks.map((dt, i) => (
                    <g key={i}>
                      <line
                        x1={dt.x}
                        y1={pad.top}
                        x2={dt.x}
                        y2={chartHeight - pad.bottom}
                        stroke="#1F1F1F"
                        strokeDasharray="2,2"
                        strokeWidth="1"
                      />
                      <text
                        x={dt.x}
                        y={chartHeight - pad.bottom + 18}
                        textAnchor="middle"
                        fill="#71717A"
                        fontSize="10"
                        fontFamily="monospace"
                        fontWeight="bold"
                      >
                        {dt.date.length === 10 ? dt.date.slice(0, 7) : dt.date}
                      </text>
                    </g>
                  ))}

                  {/* Area Fill */}
                  <path
                    d={chartData.areaD}
                    fill={chartData.isPositive ? 'url(#terminalGreenGradient)' : 'url(#terminalRedGradient)'}
                  />

                  {/* Price Line */}
                  <path
                    d={chartData.pathD}
                    fill="none"
                    stroke={chartData.isPositive ? '#00E887' : '#FF5959'}
                    strokeWidth="2.5"
                  />

                  {/* 20 EMA Overlay */}
                  {showEma && chartData.emaPathD && (
                    <path
                      d={chartData.emaPathD}
                      fill="none"
                      stroke="#FEE360"
                      strokeWidth="1.8"
                      strokeDasharray="4,3"
                    />
                  )}

                  {/* Interactive Hover crosshair and active axes */}
                  {hoveredPoint && (
                    <g>
                      {/* Vertical line across full height */}
                      <line
                        x1={hoveredPoint.x}
                        y1={pad.top}
                        x2={hoveredPoint.x}
                        y2={chartHeight - pad.bottom}
                        stroke="#FFFFFF"
                        strokeWidth="1"
                        strokeDasharray="3,3"
                        opacity="0.8"
                      />
                      {/* Horizontal line to right scale */}
                      <line
                        x1={pad.left}
                        y1={hoveredPoint.y}
                        x2={chartWidth - pad.right}
                        y2={hoveredPoint.y}
                        stroke="#FFFFFF"
                        strokeWidth="1"
                        strokeDasharray="3,3"
                        opacity="0.8"
                      />
                      {/* Right axis price pill */}
                      <rect
                        x={chartWidth - pad.right + 2}
                        y={hoveredPoint.y - 10}
                        width="70"
                        height="20"
                        fill="#FEE360"
                        stroke="#000000"
                        strokeWidth="1"
                        rx="2"
                      />
                      <text
                        x={chartWidth - pad.right + 37}
                        y={hoveredPoint.y + 4}
                        textAnchor="middle"
                        fill="#000000"
                        fontSize="10"
                        fontFamily="monospace"
                        fontWeight="black"
                      >
                        ₹{hoveredPoint.price.toFixed(1)}
                      </text>
                      {/* Marker circle */}
                      <circle
                        cx={hoveredPoint.x}
                        cy={hoveredPoint.y}
                        r="5"
                        fill={chartData.isPositive ? '#00E887' : '#FF5959'}
                        stroke="#000000"
                        strokeWidth="2.5"
                      />
                    </g>
                  )}

                  {/* Transparent overlay for smooth mouse interactions */}
                  <rect
                    x={pad.left}
                    y={pad.top}
                    width={chartData.innerW}
                    height={chartData.innerH}
                    fill="transparent"
                    onMouseMove={(e) => {
                      const rect = e.currentTarget.getBoundingClientRect();
                      const mouseX = ((e.clientX - rect.left) / rect.width) * chartData.innerW + pad.left;
                      const closest = chartData.points.reduce((prev, curr) => {
                        return Math.abs(curr.x - mouseX) < Math.abs(prev.x - mouseX) ? curr : prev;
                      });
                      setHoveredPoint(closest);
                    }}
                    onMouseLeave={() => setHoveredPoint(null)}
                  />
                </svg>

                {/* Floating NeoPOP HUD Card for Hovered Point */}
                {hoveredPoint && (
                  <div className="absolute top-3 left-20 p-2.5 bg-[#111111]/95 border-2 border-black rounded-[4px] text-xs font-mono shadow-[4px_4px_0px_#000000] backdrop-blur-md flex items-center gap-3 pointer-events-none">
                    <div>
                      <span className="text-[10px] text-zinc-400 block font-bold">DATE</span>
                      <span className="text-zinc-200 font-bold">{hoveredPoint.date}</span>
                    </div>
                    <div className="border-l border-zinc-700 pl-3">
                      <span className="text-[10px] text-zinc-400 block font-bold">PRICE</span>
                      <span className="text-[#00E887] font-black">₹{hoveredPoint.price.toFixed(2)}</span>
                    </div>
                    <div className="border-l border-zinc-700 pl-3">
                      <span className="text-[10px] text-zinc-400 block font-bold">WINDOW GAIN</span>
                      <span className={`font-black ${hoveredPoint.returnFromStart >= 0 ? 'text-[#00E887]' : 'text-[#FF5959]'}`}>
                        {hoveredPoint.returnFromStart >= 0 ? '+' : ''}{hoveredPoint.returnFromStart.toFixed(2)}%
                      </span>
                    </div>
                    {hoveredPoint.volume > 0 && (
                      <div className="border-l border-zinc-700 pl-3 hidden sm:block">
                        <span className="text-[10px] text-zinc-400 block font-bold">VOLUME</span>
                        <span className="text-zinc-300 font-bold">{formatVolume(hoveredPoint.volume)}</span>
                      </div>
                    )}
                  </div>
                )}
              </div>
            ) : (
              <div className="p-12 text-center text-zinc-500 font-mono text-xs">
                {loadingReturns ? 'Loading full-size technical charting terminal...' : 'Historical series compiling...'}
              </div>
            )}
          </div>
        </div>

        {/* Workspace Tab Bar */}
        <div className="bg-[#181818] px-4 sm:px-6 py-2.5 border-b-2 border-black flex items-center gap-1.5 overflow-x-auto scrollbar-none">
          <button
            onClick={() => setActiveTab('copilot')}
            className={`neopop-btn text-xs px-3 py-1.5 flex items-center gap-1.5 ${
              activeTab === 'copilot' ? 'neopop-btn-primary' : 'neopop-btn-dark'
            }`}
          >
            <Target className="w-3.5 h-3.5 shrink-0" />
            <span>Pre-Flight Copilot</span>
          </button>
          <button
            onClick={() => setActiveTab('returns')}
            className={`neopop-btn text-xs px-3 py-1.5 flex items-center gap-1.5 ${
              activeTab === 'returns' ? 'neopop-btn-primary' : 'neopop-btn-dark'
            }`}
          >
            <TrendingUp className="w-3.5 h-3.5 shrink-0" />
            <span>Rolling Returns</span>
          </button>
          <button
            onClick={() => setActiveTab('deals')}
            className={`neopop-btn text-xs px-3 py-1.5 flex items-center gap-1.5 ${
              activeTab === 'deals' ? 'neopop-btn-primary' : 'neopop-btn-dark'
            }`}
          >
            <Landmark className="w-3.5 h-3.5 shrink-0" />
            <span>Smart Money ({dealsCount})</span>
          </button>
          <button
            onClick={() => setActiveTab('sizer')}
            className={`neopop-btn text-xs px-3 py-1.5 flex items-center gap-1.5 ${
              activeTab === 'sizer' ? 'neopop-btn-primary' : 'neopop-btn-dark'
            }`}
          >
            <Calculator className="w-3.5 h-3.5 shrink-0" />
            <span>Position Sizer</span>
          </button>
          <button
            onClick={() => setActiveTab('ohlc')}
            className={`neopop-btn text-xs px-3 py-1.5 flex items-center gap-1.5 ${
              activeTab === 'ohlc' ? 'neopop-btn-primary' : 'neopop-btn-dark'
            }`}
          >
            <BarChart2 className="w-3.5 h-3.5 shrink-0" />
            <span>OHLC &amp; Info</span>
          </button>
        </div>

        {/* Tab Content Panels */}
        <div className="p-4 sm:p-6 space-y-6">
          {/* TAB 1: PRE-FLIGHT TRADE COPILOT */}
          {activeTab === 'copilot' && diagnostics && (
            <div className="space-y-6">
              {/* Diagnostic Hero Plinth */}
              <div className="neopop-card p-4 sm:p-5 border-2 border-black rounded-[4px] bg-[#171717] shadow-[4px_4px_0px_#000000] space-y-4">
                <div className="flex flex-col md:flex-row md:items-center justify-between gap-4">
                  <div className="flex items-center gap-4">
                    <div className="p-3 bg-[#111111] border-2 border-black rounded-[4px] text-center min-w-[110px] shadow-[2px_2px_0px_#000000]">
                      <div className="text-[10px] uppercase font-mono font-bold text-zinc-400">Diagnostic</div>
                      <div className="text-3xl font-black text-white font-mono mt-0.5">
                        {diagnostics.tradeDoctor.score}<span className="text-xs text-zinc-500 font-normal">/100</span>
                      </div>
                      <div className="text-[9px] font-mono text-[#00E887] font-bold">6-Point Check</div>
                    </div>
                    <div>
                      <div className="flex items-center gap-2 flex-wrap">
                        <span className={`neopop-tag text-xs font-black px-2.5 py-1 ${
                          diagnostics.tradeDoctor.verdict === 'READY_TO_ENTER'
                            ? 'bg-[#00E887] text-black'
                            : diagnostics.tradeDoctor.verdict === 'CAUTION'
                            ? 'bg-[#FEE360] text-black'
                            : 'bg-[#FF5959] text-white'
                        }`}>
                          {diagnostics.tradeDoctor.verdictLabel}
                        </span>
                        <span className="neopop-tag bg-[#1E1E1E] text-zinc-300">
                          {diagnostics.confluence.tripleAligned ? '🟢🟢🟢 3x Confluence' : '🟢🟢🔴 Partial Alignment'}
                        </span>
                      </div>
                      <div className="text-xs text-zinc-400 mt-1 neopop-body">
                        {diagnostics.tradeDoctor.verdict === 'READY_TO_ENTER'
                          ? 'All structural parameters verified: Safe EMA distance, high delivery purity, VWAP anchor, and zero overhead trap selling.'
                          : diagnostics.tradeDoctor.verdict === 'CAUTION'
                          ? 'Setup is developing but shows moderate extension or retail churn. Sizing discipline recommended.'
                          : 'Severe overhead selling wick or deep supply rejection detected. Wait for clean daily close.'}
                      </div>
                    </div>
                  </div>

                  {/* Monte Carlo 10,000 Replays Visual */}
                  <div className="bg-[#111111] p-3 border-2 border-black rounded-[4px] shadow-[2px_2px_0px_#000000] space-y-1.5 min-w-[240px]">
                    <div className="flex items-center justify-between text-xs font-mono">
                      <span className="text-zinc-400 font-bold flex items-center gap-1">
                        <Target className="w-3.5 h-3.5 text-[#00E887]" /> Monte Carlo (10k Sim)
                      </span>
                      <span className="text-[#00E887] font-black">{diagnostics.monteCarlo.targetOddsPct}% Win</span>
                    </div>
                    <div className="h-2.5 bg-[#222222] border border-black flex rounded-[2px] overflow-hidden">
                      <div style={{ width: `${diagnostics.monteCarlo.targetOddsPct}%` }} className="bg-[#00E887] h-full" />
                      <div style={{ width: `${diagnostics.monteCarlo.stopOddsPct}%` }} className="bg-[#FF5959] h-full" />
                      <div style={{ width: `${diagnostics.monteCarlo.timeoutOddsPct}%` }} className="bg-[#3657FF] h-full" />
                    </div>
                    <div className="flex justify-between text-[10px] font-mono text-zinc-400">
                      <span>🎯 2R: <b className="text-white">{diagnostics.monteCarlo.targetOddsPct}%</b></span>
                      <span>🛑 SL: <b className="text-[#FF5959]">{diagnostics.monteCarlo.stopOddsPct}%</b></span>
                      <span>EV: <b className="text-[#00E887]">+{diagnostics.monteCarlo.expectedValueR}R</b></span>
                    </div>
                  </div>
                </div>

                {/* Triple Timeframe Confluence */}
                <div className="grid grid-cols-1 sm:grid-cols-3 gap-2 pt-2 border-t-2 border-black text-xs font-mono">
                  <div className="p-2.5 bg-[#111111] border border-black rounded-[2px] flex items-center justify-between">
                    <div>
                      <div className="text-[10px] text-zinc-400 uppercase font-bold">[W] Weekly Macro</div>
                      <div className="text-xs text-zinc-200 mt-0.5">Above 30-Week EMA Base</div>
                    </div>
                    <span className={`neopop-tag text-[10px] font-black ${
                      diagnostics.confluence.weekly === 'BULLISH' ? 'bg-[#00E887] text-black' : 'bg-[#FF5959] text-white'
                    }`}>
                      {diagnostics.confluence.weekly === 'BULLISH' ? '🟢 BULLISH' : '🔴 BEARISH'}
                    </span>
                  </div>

                  <div className="p-2.5 bg-[#111111] border border-black rounded-[2px] flex items-center justify-between">
                    <div>
                      <div className="text-[10px] text-zinc-400 uppercase font-bold">[D] Daily Base</div>
                      <div className="text-xs text-zinc-200 mt-0.5">Stage 2 Expansion</div>
                    </div>
                    <span className={`neopop-tag text-[10px] font-black ${
                      diagnostics.confluence.daily === 'BULLISH' ? 'bg-[#00E887] text-black' : 'bg-[#FF5959] text-white'
                    }`}>
                      {diagnostics.confluence.daily === 'BULLISH' ? '🟢 BULLISH' : '🔴 BEARISH'}
                    </span>
                  </div>

                  <div className="p-2.5 bg-[#111111] border border-black rounded-[2px] flex items-center justify-between">
                    <div>
                      <div className="text-[10px] text-zinc-400 uppercase font-bold">[15M] Intraday</div>
                      <div className="text-xs text-zinc-200 mt-0.5">VWAP &amp; BCL Trigger</div>
                    </div>
                    <span className={`neopop-tag text-[10px] font-black ${
                      diagnostics.confluence.intraday === 'BULLISH' ? 'bg-[#00E887] text-black' : 'bg-[#FF5959] text-white'
                    }`}>
                      {diagnostics.confluence.intraday === 'BULLISH' ? '🟢 BULLISH' : '🔴 BEARISH'}
                    </span>
                  </div>
                </div>
              </div>

              {/* 6-Point Checklist */}
              <div className="space-y-3">
                <div className="flex items-center gap-2">
                  <ShieldCheck className="w-4 h-4 text-[#00E887]" />
                  <h4 className="text-xs font-black text-white uppercase tracking-wider neopop-caps">
                    6-Point Pre-Flight Diagnostic Checklist (Anti-Trap Gatekeeper)
                  </h4>
                </div>
                <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-3">
                  {diagnostics.tradeDoctor.checks.map((chk) => (
                    <div
                      key={chk.id}
                      className={`p-3.5 rounded-[4px] border-2 border-black bg-[#161616] shadow-[2px_2px_0px_#000000] flex flex-col justify-between space-y-2 ${
                        chk.pass ? 'hover:border-[#00E887]' : 'hover:border-[#FF5959]'
                      }`}
                    >
                      <div className="flex items-start justify-between gap-2">
                        <div>
                          <div className="text-xs font-bold text-white neopop-heading">{chk.name}</div>
                          <div className="text-[10px] text-zinc-400 mt-0.5">{chk.detail}</div>
                        </div>
                        <span className={`neopop-tag text-[9px] font-black shrink-0 ${
                          chk.pass ? 'bg-[#00E887] text-black' : 'bg-[#FF5959] text-white'
                        }`}>
                          {chk.pass ? 'PASS' : 'FLAG'}
                        </span>
                      </div>
                      <div className="flex items-center justify-between text-[11px] font-mono pt-1 border-t border-white/5">
                        <span className="text-zinc-400">Actual: <b className="text-white">{chk.value}</b></span>
                        <span className="text-zinc-500">Req: {chk.threshold}</span>
                      </div>
                    </div>
                  ))}

                  {/* 6th Check: Net Take-Home Math */}
                  <div className="p-3.5 rounded-[4px] border-2 border-black bg-[#161616] shadow-[2px_2px_0px_#000000] flex flex-col justify-between space-y-2 hover:border-[#00E887]">
                    <div className="flex items-start justify-between gap-2">
                      <div>
                        <div className="text-xs font-bold text-white neopop-heading">Statutory Net Take-Home Math</div>
                        <div className="text-[10px] text-zinc-400 mt-0.5">Post-tax payout factoring STT, GST &amp; SEBI</div>
                      </div>
                      <span className="neopop-tag text-[9px] font-black bg-[#00E887] text-black shrink-0">
                        {diagnostics.statutoryMath.effectiveRr >= 1.8 ? 'PASS' : 'TIGHT'}
                      </span>
                    </div>
                    <div className="flex items-center justify-between text-[11px] font-mono pt-1 border-t border-white/5">
                      <span className="text-zinc-400">Gross: ₹{diagnostics.statutoryMath.grossProfit}</span>
                      <span className="text-[#00E887] font-bold">Net: ₹{diagnostics.statutoryMath.netTakeHome}</span>
                    </div>
                  </div>
                </div>
              </div>

              {/* 1-Click Order Ticket Generator */}
              <div className="neopop-card p-4 sm:p-5 border-2 border-black rounded-[4px] bg-[#161616] shadow-[4px_4px_0px_#000000] space-y-4">
                <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-3">
                  <div>
                    <h4 className="text-xs font-black text-white uppercase tracking-wider neopop-caps flex items-center gap-1.5">
                      <Zap className="w-4 h-4 text-[#FEE360]" />
                      1-Click Institutional Order Ticket Payloads
                    </h4>
                    <p className="text-[11px] text-zinc-400 mt-0.5">
                      Instant execution payloads with strict bracket stop loss and take-profit targets.
                    </p>
                  </div>
                  <div className="flex items-center gap-1.5">
                    <button
                      onClick={() => setTicketBroker('zerodha')}
                      className={`neopop-btn text-[11px] px-3 py-1 ${ticketBroker === 'zerodha' ? 'neopop-btn-primary' : 'neopop-btn-dark'}`}
                    >
                      Zerodha Kite
                    </button>
                    <button
                      onClick={() => setTicketBroker('nse_bracket')}
                      className={`neopop-btn text-[11px] px-3 py-1 ${ticketBroker === 'nse_bracket' ? 'neopop-btn-primary' : 'neopop-btn-dark'}`}
                    >
                      NSE Bracket
                    </button>
                    <button
                      onClick={() => setTicketBroker('alpaca')}
                      className={`neopop-btn text-[11px] px-3 py-1 ${ticketBroker === 'alpaca' ? 'neopop-btn-primary' : 'neopop-btn-dark'}`}
                    >
                      Alpaca Bracket
                    </button>
                  </div>
                </div>

                {(() => {
                  const activeTicketPayload = ticketBroker === 'zerodha'
                    ? (diagnostics.orderTickets?.zerodhaBasket || diagnostics.orderTickets?.zerodha)
                    : ticketBroker === 'nse_bracket'
                    ? (diagnostics.orderTickets?.bracketPayload || diagnostics.orderTickets?.nseBracketPayload)
                    : (diagnostics.orderTickets?.alpacaPayload || diagnostics.orderTickets?.alpaca);
                  return (
                    <div className="relative">
                      <pre className="p-3 bg-[#0D0D0D] border-2 border-black rounded-[3px] text-xs font-mono text-[#00E887] overflow-x-auto max-h-48 scrollbar-thin">
                        {JSON.stringify(activeTicketPayload, null, 2)}
                      </pre>
                      <button
                        onClick={() => copyTicketPayload(activeTicketPayload)}
                        className="absolute top-2 right-2 neopop-btn neopop-btn-dark text-[10px] px-2.5 py-1 flex items-center gap-1 font-mono"
                      >
                        {copiedTicket ? <Check className="w-3 h-3 text-[#00E887]" /> : <Copy className="w-3 h-3" />}
                        <span>{copiedTicket ? 'Copied to Clipboard!' : 'Copy Ticket'}</span>
                      </button>
                    </div>
                  );
                })()}
              </div>
            </div>
          )}

          {/* TAB 2: ROLLING RETURNS ENGINE */}
          {activeTab === 'returns' && (
            <div className="space-y-4">
              <div className="neopop-card p-4 sm:p-5 border-2 border-black bg-[#171717] rounded-[4px] shadow-[4px_4px_0px_#000000] space-y-4">
                <div className="flex items-center justify-between border-b-2 border-black pb-3">
                  <div className="flex items-center gap-2">
                    <TrendingUp className="w-4 h-4 text-[#FEE360]" />
                    <h4 className="text-xs font-black text-white uppercase tracking-wider neopop-caps">
                      Point-in-Time &amp; Rolling Returns Breakdown
                    </h4>
                  </div>
                  <span className="text-[10px] font-mono text-zinc-400">
                    Calculated over {returnsData?.dataPoints || 494} daily sessions
                  </span>
                </div>

                {/* Point in Time Returns Grid */}
                <div className="grid grid-cols-2 sm:grid-cols-5 lg:grid-cols-10 gap-2 text-center font-mono">
                  {Object.entries(returnsData?.pointInTime || { '1W': 1.8, '2W': 4.2, '1M': 6.8, '3M': 12.4, '6M': 18.2, '1Y': 24.5, '3Y': 65.4, '5Y': 142.1, '10Y': 380.5, '20Y': 1250.0 }).map(([period, val]) => {
                    const cagrVal = returnsData?.cagr?.[period];
                    return (
                      <div
                        key={period}
                        onClick={() => setSelectedWindow(period)}
                        className={`p-2.5 bg-[#111111] border rounded-[3px] shadow-[2px_2px_0px_#000000] cursor-pointer transition-colors ${
                          selectedWindow === period ? 'border-[#FEE360] bg-[#1a1a1a]' : 'border-black hover:border-zinc-600'
                        }`}
                        title={`Click to load ${period} on Technical Chart`}
                      >
                        <div className="text-[10px] text-zinc-400 uppercase font-black">{period} Return</div>
                        <div className={`text-base font-black mt-0.5 ${val >= 0 ? 'text-[#00E887]' : 'text-[#FF5959]'}`}>
                          {val >= 0 ? '+' : ''}{val}%
                        </div>
                        {cagrVal !== undefined && cagrVal !== null && (
                          <div className="text-[9px] text-[#FEE360] font-bold mt-0.5">
                            {cagrVal >= 0 ? '+' : ''}{cagrVal}% p.a.
                          </div>
                        )}
                      </div>
                    );
                  })}
                </div>

                {/* Statistical Summary */}
                {activeRolling && (
                  <div className="grid grid-cols-2 sm:grid-cols-4 gap-2 pt-2 border-t border-black/40 text-xs font-mono">
                    <div className="p-2.5 bg-[#111111] border border-black rounded-[2px]">
                      <span className="text-[10px] text-zinc-400 uppercase font-bold">Win Rate:</span>
                      <div className="text-[#00E887] font-black text-sm mt-0.5">{activeRolling.winRate}%</div>
                    </div>
                    <div className="p-2.5 bg-[#111111] border border-black rounded-[2px]">
                      <span className="text-[10px] text-zinc-400 uppercase font-bold">Average Period Return:</span>
                      <div className="text-white font-black text-sm mt-0.5">+{activeRolling.avg}%</div>
                    </div>
                    <div className="p-2.5 bg-[#111111] border border-black rounded-[2px]">
                      <span className="text-[10px] text-zinc-400 uppercase font-bold">Max Upside:</span>
                      <div className="text-[#00E887] font-black text-sm mt-0.5">+{activeRolling.max}%</div>
                    </div>
                    <div className="p-2.5 bg-[#111111] border border-black rounded-[2px]">
                      <span className="text-[10px] text-zinc-400 uppercase font-bold">Max Drawdown:</span>
                      <div className="text-[#FF5959] font-black text-sm mt-0.5">{activeRolling.min}%</div>
                    </div>
                  </div>
                )}
              </div>
            </div>
          )}

          {/* TAB 4: SMART MONEY & INSTITUTIONAL DEALS */}
          {activeTab === 'deals' && (
            <div className="space-y-4">
              <div className="neopop-card p-4 sm:p-5 border-2 border-black bg-[#171717] rounded-[4px] shadow-[4px_4px_0px_#000000] space-y-4">
                <div className="flex items-center justify-between border-b-2 border-black pb-3">
                  <div className="flex items-center gap-2">
                    <Landmark className="w-4 h-4 text-[#FEE360]" />
                    <h4 className="text-xs font-black text-white uppercase tracking-wider neopop-caps">
                      Institutional Flow, Block Windows &amp; Promoter Filings for {stock.symbol}
                    </h4>
                  </div>
                  <span className="neopop-tag bg-[#1E1E1E] text-zinc-300">
                    {dealsCount} Transactions Found
                  </span>
                </div>

                {dealsCount > 0 ? (
                  <div className="space-y-3 font-mono text-xs">
                    {stockDeals?.blockDeals?.map(d => (
                      <div key={d.id} className="p-3 bg-[#111111] border-2 border-black rounded-[3px] shadow-[2px_2px_0px_#000000] flex items-center justify-between flex-wrap gap-2">
                        <div>
                          <div className="flex items-center gap-2">
                            <span className="neopop-tag bg-[#3657FF] text-white text-[9px] py-0 px-1 font-black">BLOCK WINDOW</span>
                            <span className="text-white font-bold">{d.clientName}</span>
                            <span className="text-zinc-500">&rarr;</span>
                            <span className="text-zinc-400">{d.counterparty}</span>
                          </div>
                          <div className="text-[10px] text-zinc-500 mt-0.5">Session: {d.date} ({d.window})</div>
                        </div>
                        <div className="text-right">
                          <span className={`neopop-tag text-[9px] font-black ${d.dealType === 'BUY' ? 'bg-[#00E887] text-black' : 'bg-[#FF5959] text-white'}`}>
                            {d.dealType} • ₹{d.dealValueCr.toFixed(2)} Cr
                          </span>
                          <div className="text-[10px] text-zinc-400 mt-0.5">{d.quantity.toLocaleString('en-IN')} shares @ ₹{d.tradePrice}</div>
                        </div>
                      </div>
                    ))}

                    {stockDeals?.bulkDeals?.map(d => (
                      <div key={d.id} className="p-3 bg-[#111111] border-2 border-black rounded-[3px] shadow-[2px_2px_0px_#000000] flex items-center justify-between flex-wrap gap-2">
                        <div>
                          <div className="flex items-center gap-2">
                            <span className="neopop-tag bg-[#00E887] text-black text-[9px] py-0 px-1 font-black">BULK DEAL (&gt;0.5%)</span>
                            <span className="text-white font-bold">{d.clientName}</span>
                          </div>
                          <div className="text-[10px] text-zinc-500 mt-0.5">Date: {d.date} • Stake: {d.stakePct}%</div>
                        </div>
                        <div className="text-right">
                          <span className={`neopop-tag text-[9px] font-black ${d.dealType === 'BUY' ? 'bg-[#00E887] text-black' : 'bg-[#FF5959] text-white'}`}>
                            {d.dealType} • ₹{d.dealValueCr.toFixed(2)} Cr
                          </span>
                        </div>
                      </div>
                    ))}

                    {stockDeals?.insiderTrades?.map(d => (
                      <div key={d.id} className="p-3 bg-[#111111] border-2 border-black rounded-[3px] shadow-[2px_2px_0px_#000000] flex items-center justify-between flex-wrap gap-2">
                        <div>
                          <div className="flex items-center gap-2">
                            <span className="neopop-tag bg-[#FEE360] text-black text-[9px] py-0 px-1 font-black">PROMOTER SAST</span>
                            <span className="text-white font-bold">{d.personName} ({d.designation})</span>
                          </div>
                          <div className="text-[10px] text-zinc-500 mt-0.5">{d.date} • Stake: {d.preStakePct}% &rarr; {d.postStakePct}%</div>
                        </div>
                        <div className="text-right">
                          <span className={`neopop-tag text-[9px] font-black ${d.action === 'BUY' ? 'bg-[#00E887] text-black' : 'bg-[#FF5959] text-white'}`}>
                            {d.action} • ₹{d.dealValueCr.toFixed(2)} Cr
                          </span>
                        </div>
                      </div>
                    ))}
                  </div>
                ) : (
                  <div className="p-8 text-center text-zinc-500 font-mono text-xs">
                    {loadingDeals ? 'Querying exchange block & bulk deal ledger...' : 'No large block or bulk disclosures recorded for this stock in the recent 5 sessions.'}
                  </div>
                )}
              </div>
            </div>
          )}

          {/* TAB 5: POSITION SIZER & STATUTORY FEES */}
          {activeTab === 'sizer' && (
            <div className="space-y-4">
              <div className="neopop-card p-4 sm:p-5 border-2 border-black bg-[#171717] rounded-[4px] shadow-[4px_4px_0px_#000000] space-y-4">
                <div className="flex items-center justify-between border-b-2 border-black pb-3">
                  <div className="flex items-center gap-2">
                    <Calculator className="w-4 h-4 text-[#FEE360]" />
                    <h4 className="text-xs font-black text-white uppercase tracking-wider neopop-caps">
                      Dalal Street Position Sizer &amp; Statutory Fee Friction Calculator
                    </h4>
                  </div>
                  <span className="neopop-tag bg-[#1E1E1E] text-zinc-300">SEBI &bull; STT &bull; Stamp Duty</span>
                </div>

                <div className="grid grid-cols-1 sm:grid-cols-2 gap-4 text-xs font-mono">
                  <div>
                    <label className="text-zinc-300 font-bold uppercase text-[11px]">Risk Budget (₹):</label>
                    <input
                      type="number"
                      value={riskBudget}
                      onChange={(e) => setRiskBudget(Math.max(100, Number(e.target.value)))}
                      className="neopop-input w-full px-3 py-1.5 text-xs font-black text-white mt-1 bg-[#111111] border border-black"
                    />
                  </div>
                  <div>
                    <label className="text-zinc-300 font-bold uppercase text-[11px]">Stop Loss (%):</label>
                    <input
                      type="number"
                      step="0.5"
                      value={stopLossPct}
                      onChange={(e) => setStopLossPct(Math.max(0.5, Number(e.target.value)))}
                      className="neopop-input w-full px-3 py-1.5 text-xs font-black text-white mt-1 bg-[#111111] border border-black"
                    />
                  </div>
                </div>

                <div className="grid grid-cols-1 sm:grid-cols-3 gap-3 pt-3 border-t-2 border-black text-center font-mono">
                  <div className="bg-[#111111] p-3 rounded-[3px] border border-black shadow-[2px_2px_0px_#000000]">
                    <div className="text-[10px] text-zinc-400 uppercase font-black">Calculated Shares</div>
                    <div className="text-2xl font-black text-[#FEE360] mt-1">{calculatedQty} Qty</div>
                    <div className="text-[10px] text-zinc-400 mt-0.5">Capital: ₹{totalInvestment.toLocaleString('en-IN')}</div>
                  </div>
                  <div className="bg-[#111111] p-3 rounded-[3px] border-2 border-black shadow-[2px_2px_0px_#000000]">
                    <div className="text-[10px] text-[#FF5959] uppercase font-black flex items-center justify-center gap-1">
                      <ShieldAlert className="w-3 h-3" /> Stop Loss
                    </div>
                    <div className="text-2xl font-black text-[#FF5959] mt-1">₹{stopLossPrice}</div>
                    <div className="text-[10px] text-zinc-400 mt-0.5">Max Loss: -₹{actualRisk}</div>
                  </div>
                  <div className="bg-[#111111] p-3 rounded-[3px] border-2 border-black shadow-[2px_2px_0px_#000000]">
                    <div className="text-[10px] text-[#00E887] uppercase font-black flex items-center justify-center gap-1">
                      <Target className="w-3 h-3" /> 2R Target
                    </div>
                    <div className="text-2xl font-black text-[#00E887] mt-1">₹{target2RPrice}</div>
                    <div className="text-[10px] text-zinc-400 mt-0.5">Gross Gain: +₹{potentialProfit}</div>
                  </div>
                </div>
              </div>
            </div>
          )}

          {/* TAB 6: OHLC & SECURITY MASTER */}
          {activeTab === 'ohlc' && (
            <div className="space-y-4">
              <div className="grid grid-cols-2 sm:grid-cols-4 gap-3 text-center font-mono">
                <div className="bg-[#111111] border border-black shadow-[2px_2px_0px_#000000] rounded-[3px] p-3">
                  <div className="text-[10px] text-zinc-400 font-black uppercase">Open</div>
                  <div className="text-base font-black text-white mt-1">{formatIndianCurrency(open)}</div>
                </div>
                <div className="bg-[#111111] border-2 border-black shadow-[2px_2px_0px_#000000] rounded-[3px] p-3">
                  <div className="text-[10px] text-[#00E887] font-black uppercase">High</div>
                  <div className="text-base font-black text-[#00E887] mt-1">{formatIndianCurrency(high)}</div>
                </div>
                <div className="bg-[#111111] border-2 border-black shadow-[2px_2px_0px_#000000] rounded-[3px] p-3">
                  <div className="text-[10px] text-[#FF5959] font-black uppercase">Low</div>
                  <div className="text-base font-black text-[#FF5959] mt-1">{formatIndianCurrency(low)}</div>
                </div>
                <div className="bg-[#111111] border border-black shadow-[2px_2px_0px_#000000] rounded-[3px] p-3">
                  <div className="text-[10px] text-zinc-400 font-black uppercase">Prev Close</div>
                  <div className="text-base font-black text-white mt-1">{formatIndianCurrency(close)}</div>
                </div>
              </div>

              {/* Intraday Range Indicator */}
              <div className="bg-[#111111] border border-black shadow-[2px_2px_0px_#000000] rounded-[3px] p-4 font-mono">
                <div className="flex items-center justify-between text-xs font-bold text-zinc-400 mb-2">
                  <span>Day Low: {formatIndianCurrency(low)}</span>
                  <span className="text-[#FEE360] font-black">Position in Range: {posPct.toFixed(0)}%</span>
                  <span>Day High: {formatIndianCurrency(high)}</span>
                </div>
                <div className="relative w-full bg-[#222222] h-2.5 border border-black overflow-hidden rounded-[1px]">
                  <div className="bg-[#00E887] h-full transition-all duration-300" style={{ width: `${posPct}%` }} />
                </div>
              </div>

              {/* Security Master Information */}
              <div className="grid grid-cols-1 sm:grid-cols-2 gap-3 text-xs font-mono pt-2 border-t-2 border-black">
                <div className="p-3 bg-[#111111] border border-black rounded-[2px] flex items-center justify-between">
                  <span className="text-zinc-400 uppercase font-bold text-[10px]">Sector:</span>
                  <b className="text-white">{stock.sector || 'Capital Market'}</b>
                </div>
                <div className="p-3 bg-[#111111] border border-black rounded-[2px] flex items-center justify-between">
                  <span className="text-zinc-400 uppercase font-bold text-[10px]">Market Cap Category:</span>
                  <b style={{ color: mcap.color }}>{mcap.label} (₹{mcap.mkt_cap_cr.toLocaleString('en-IN')} Cr)</b>
                </div>
                <div className="p-3 bg-[#111111] border border-black rounded-[2px] flex items-center justify-between">
                  <span className="text-zinc-400 uppercase font-bold text-[10px]">ISIN Identifier:</span>
                  <b className="text-zinc-300">{stock.isin || 'INE' + stock.symbol + '01'}</b>
                </div>
                <div className="p-3 bg-[#111111] border border-black rounded-[2px] flex items-center justify-between">
                  <span className="text-zinc-400 uppercase font-bold text-[10px]">SEBI Surveillance:</span>
                  <b className={asm.isAsm ? 'text-[#FF5959]' : 'text-[#00E887]'}>
                    {asm.isAsm ? `${asm.badge} (100% Margin)` : 'NORMAL (No ASM)'}
                  </b>
                </div>
              </div>
            </div>
          )}
        </div>

        {/* Footer */}
        <div className="bg-[#0C0C0C] px-6 py-3.5 border-t-2 border-black flex items-center justify-between text-xs text-zinc-400">
          <span className="font-mono text-[11px] flex items-center gap-1.5">
            <Info className="w-3.5 h-3.5 text-[#FEE360]" />
            DstreetPulse Institutional Terminal &bull; NSE Capital Market &amp; SEC EDGAR Feeds
          </span>
          <button
            onClick={onClose}
            className="neopop-btn neopop-btn-dark px-4 py-1.5 text-xs font-bold"
          >
            ← Back to {parentTabName}
          </button>
        </div>
      </div>
    </div>
  );
}
