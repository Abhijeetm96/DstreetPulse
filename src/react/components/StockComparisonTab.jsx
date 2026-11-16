import React, { useState, useEffect, useMemo } from 'react';
import {
  Scale,
  TrendingUp,
  TrendingDown,
  Layers,
  Search,
  Plus,
  X,
  Award,
  ShieldCheck,
  Zap,
  Activity,
  IndianRupee,
  BarChart2,
  Calendar,
  Share2,
  Check,
  Copy,
  ExternalLink,
  ChevronRight,
  Maximize2,
  Minimize2,
  AlertTriangle
} from 'lucide-react';
import { formatIndianCurrency, formatVolume } from '../utils/formatters.js';
import { getPresetFileForSymbols, generateClientComparativeAnalysis } from '../lib/clientComparativeEngine.js';

// High-contrast NeoPOP color palette for comparing up to 6 stocks
export const STOCK_PALETTE = [
  { stroke: '#00E887', fill: '#00E887', text: '#000000', name: 'Emerald Green' },
  { stroke: '#00D8F6', fill: '#00D8F6', text: '#000000', name: 'Neon Cyan' },
  { stroke: '#FEE360', fill: '#FEE360', text: '#000000', name: 'Vivid Yellow' },
  { stroke: '#FF62A5', fill: '#FF62A5', text: '#FFFFFF', name: 'Hot Pink' },
  { stroke: '#FF9500', fill: '#FF9500', text: '#000000', name: 'Bright Orange' },
  { stroke: '#B57EDC', fill: '#B57EDC', text: '#000000', name: 'Electric Purple' }
];

export default function StockComparisonTab({
  constituents = [],
  initialSymbols = ['TCS', 'INFY', 'WIPRO'],
  onSelectStock
}) {
  const [selectedSymbols, setSelectedSymbols] = useState(initialSymbols);
  const [comparisonData, setComparisonData] = useState(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState(null);

  // Chart Controls
  const [selectedTimeframe, setSelectedTimeframe] = useState('1Y');
  const [chartMode, setChartMode] = useState('return'); // 'return' (% change from t0) | 'indexed' (Base 100)
  const [hoveredPoint, setHoveredPoint] = useState(null);
  const [chartSize, setChartSize] = useState('full'); // 'full' (480px) | 'cinema' (620px)

  // Sub-Tab Switcher
  const [activeSubTab, setActiveSubTab] = useState('overview'); // 'overview' | 'technicals' | 'fundamentals' | 'financials' | 'returns'

  // Search & Add Stock State
  const [searchQuery, setSearchQuery] = useState('');
  const [showSearchDropdown, setShowSearchDropdown] = useState(false);
  const [copiedLink, setCopiedLink] = useState(false);

  // Sync with initialSymbols if passed from parent
  useEffect(() => {
    if (initialSymbols && initialSymbols.length > 0) {
      setSelectedSymbols(initialSymbols);
    }
  }, [initialSymbols?.join(',')]);

  // Fetch Comparison Data from Engine
  useEffect(() => {
    if (selectedSymbols.length === 0) return;
    setLoading(true);
    setError(null);

    const query = selectedSymbols.join(',');
    const sortedKey = selectedSymbols.slice().sort().join(',');

    fetch(`./api/compare?symbols=${encodeURIComponent(query)}`)
      .then(async (res) => {
        if (!res.ok) throw new Error(`HTTP ${res.status}`);
        return res.json();
      })
      .catch(async () => {
        // 1. Direct preset file match (e.g. compare_green_energy.json for ADANIGREEN,TATAPOWER,NTPC)
        const presetFile = getPresetFileForSymbols(selectedSymbols);
        if (presetFile) {
          const pRes = await fetch(`./data/${presetFile}`).catch(() => null);
          if (pRes && pRes.ok) {
            return pRes.json();
          }
        }

        // 2. Multi-preset catalog lookup
        const presetsRes = await fetch('./data/compare_presets.json').catch(() => null);
        if (presetsRes && presetsRes.ok) {
          const presetsData = await presetsRes.json();
          if (presetsData[query]) return presetsData[query];
          if (presetsData[sortedKey]) return presetsData[sortedKey];
        }

        // 3. Client-side dynamic generator from constituents
        const clientGen = generateClientComparativeAnalysis(selectedSymbols, constituents);
        if (clientGen) return clientGen;

        // 4. Default baseline fallback
        const fallback = await fetch('./data/compare.json');
        if (!fallback.ok) throw new Error('Comparison data unavailable');
        return fallback.json();
      })
      .then((data) => {
        setComparisonData(data);
        setLoading(false);
      })
      .catch((err) => {
        console.error('Comparison load error:', err);
        const fallbackGen = generateClientComparativeAnalysis(selectedSymbols, constituents);
        if (fallbackGen) {
          setComparisonData(fallbackGen);
        } else {
          setError(err.message);
        }
        setLoading(false);
      });
  }, [selectedSymbols.join(','), constituents?.length]);

  // Handle adding a stock to the basket
  const handleAddStock = (sym) => {
    const clean = sym.toUpperCase().trim();
    if (!clean || selectedSymbols.includes(clean)) return;
    if (selectedSymbols.length >= 6) {
      alert('You can compare up to 6 stocks simultaneously for optimal visual clarity.');
      return;
    }
    const next = [...selectedSymbols, clean];
    setSelectedSymbols(next);
    setSearchQuery('');
    setShowSearchDropdown(false);
    updateUrlHash(next);
  };

  // Handle removing a stock
  const handleRemoveStock = (sym) => {
    if (selectedSymbols.length <= 1) {
      alert('Please keep at least one stock to evaluate.');
      return;
    }
    const next = selectedSymbols.filter(s => s !== sym);
    setSelectedSymbols(next);
    updateUrlHash(next);
  };

  // Preset Peer Group Selector
  const handleSelectPreset = (presetSymbols) => {
    setSelectedSymbols(presetSymbols);
    updateUrlHash(presetSymbols);
  };

  const updateUrlHash = (symbols) => {
    const newHash = `#compare?stocks=${symbols.join(',')}`;
    history.pushState(null, '', newHash);
  };

  const copyShareLink = () => {
    const url = `${window.location.origin}${window.location.pathname}#compare?stocks=${selectedSymbols.join(',')}`;
    navigator.clipboard?.writeText(url);
    setCopiedLink(true);
    setTimeout(() => setCopiedLink(false), 2000);
  };

  // Filtered search matches from 501 NSE equities
  const searchResults = useMemo(() => {
    if (!searchQuery.trim()) return [];
    const q = searchQuery.toUpperCase().trim();
    return (constituents || [])
      .filter(s => (s.symbol.toUpperCase().includes(q) || (s.name || '').toUpperCase().includes(q)) && !selectedSymbols.includes(s.symbol))
      .slice(0, 8);
  }, [searchQuery, constituents, selectedSymbols]);

  // Chart Dimension Configuration
  const isCinema = chartSize === 'cinema';
  const chartWidth = 1000;
  const chartHeight = isCinema ? 540 : 420;
  const pad = { top: 30, right: 80, bottom: 45, left: 80 };

  // Comparative Normalized Chart Computation
  const chartData = useMemo(() => {
    const activeCurve = comparisonData?.normalizedCurves?.[selectedTimeframe];
    if (!activeCurve || !activeCurve.timeline || activeCurve.timeline.length === 0) return null;

    const timeline = activeCurve.timeline;
    const stocksInCurve = activeCurve.stocks || [];

    // Find min and max normalized return values across all stocks
    let minVal = 0;
    let maxVal = 0;
    timeline.forEach(pt => {
      stocksInCurve.forEach(s => {
        const val = pt[s.symbol];
        if (typeof val === 'number') {
          if (val < minVal) minVal = val;
          if (val > maxVal) maxVal = val;
        }
      });
    });

    // 8% headroom so curves never touch the frame
    const span = maxVal - minVal || 1;
    const rangeMin = minVal - span * 0.08;
    const rangeMax = maxVal + span * 0.08;
    const rangeSpan = rangeMax - rangeMin || 1;

    const innerW = chartWidth - pad.left - pad.right;
    const innerH = chartHeight - pad.top - pad.bottom;

    // Zero-line Y coordinate (0% baseline)
    const zeroY = pad.top + (1 - (0 - rangeMin) / rangeSpan) * innerH;

    // Generate paths for each stock
    const paths = stocksInCurve.map((s, sIdx) => {
      const palette = STOCK_PALETTE[sIdx % STOCK_PALETTE.length];
      const points = timeline.map((pt, idx) => {
        const x = pad.left + (idx / Math.max(1, timeline.length - 1)) * innerW;
        const retVal = pt[s.symbol] ?? 0;
        const y = pad.top + (1 - (retVal - rangeMin) / rangeSpan) * innerH;
        return {
          date: pt.date,
          returnPct: retVal,
          price: pt[`${s.symbol}_price`],
          x,
          y
        };
      });

      const pathD = points.reduce((acc, pt, i) => `${acc} ${i === 0 ? 'M' : 'L'} ${pt.x.toFixed(1)} ${pt.y.toFixed(1)}`, '');

      return {
        symbol: s.symbol,
        palette,
        finalReturnPct: s.finalReturnPct,
        cagrPct: s.cagrPct,
        points,
        pathD
      };
    });

    // 5 Horizontal Reference Grid Levels
    const gridLevels = [
      { y: pad.top, val: rangeMax },
      { y: pad.top + innerH * 0.25, val: rangeMin + rangeSpan * 0.75 },
      { y: pad.top + innerH * 0.50, val: rangeMin + rangeSpan * 0.50 },
      { y: pad.top + innerH * 0.75, val: rangeMin + rangeSpan * 0.25 },
      { y: pad.top + innerH, val: rangeMin }
    ];

    // 6 to 8 Date Ticks along X-axis
    const dateTicks = [];
    const tickCount = Math.min(7, Math.max(3, Math.floor(timeline.length / 12)));
    for (let t = 0; t <= tickCount; t++) {
      const idx = Math.min(timeline.length - 1, Math.round((t / tickCount) * (timeline.length - 1)));
      const pt = timeline[idx];
      if (pt) {
        const x = pad.left + (idx / Math.max(1, timeline.length - 1)) * innerW;
        dateTicks.push({ x, date: pt.date });
      }
    }

    return {
      paths,
      gridLevels,
      dateTicks,
      zeroY,
      rangeMin,
      rangeMax,
      innerW,
      innerH,
      timeline,
      startDate: timeline[0].date,
      endDate: timeline[timeline.length - 1].date
    };
  }, [comparisonData, selectedTimeframe, chartHeight, chartSize]);

  const winnerBadges = comparisonData?.winnerBadges;
  const stocks = comparisonData?.stocks || [];

  return (
    <div className="space-y-4 sm:space-y-5 animate-in fade-in duration-200">
      {/* 1. Header Toolbar & Interactive Stock Basket Manager */}
      <div className="neopop-card p-3 sm:p-4 border-2 border-black bg-[#151515] rounded-[4px] shadow-[4px_4px_0px_#000000] flex flex-wrap items-center justify-between gap-3">
        <div className="flex items-center gap-2 sm:gap-3 flex-wrap">
          <div className="p-2 bg-[#FEE360] border-2 border-black rounded-[4px] shadow-[2px_2px_0px_#000000]">
            <Scale className="w-5 h-5 text-black" />
          </div>
          <div>
            <div className="flex items-center gap-2">
              <h1 className="text-sm sm:text-base font-black text-white uppercase tracking-wider neopop-caps">
                Comparative Peer Intelligence Engine
              </h1>
              <span className="neopop-tag bg-[#00E887] text-black font-black text-[10px] px-2 py-0.5 border border-black shadow-[1px_1px_0px_#000000]">
                {selectedSymbols.length} EQUITIES LOADED
              </span>
            </div>
            <div className="text-[11px] text-zinc-400 font-mono mt-0.5">
              Side-by-side comparative analysis across Normalized Price Curves, Technicals, Fundamentals &amp; Audited Financials
            </div>
          </div>
        </div>

        {/* Share Comparison Link */}
        <div className="flex items-center gap-2">
          <button
            onClick={copyShareLink}
            className="neopop-btn neopop-btn-dark text-xs px-3 py-1.5 flex items-center gap-1.5 font-bold hover:bg-[#252525] border-2 border-black shadow-[2px_2px_0px_#000000]"
            title="Copy Direct URL for this exact multi-stock comparison"
          >
            {copiedLink ? <Check className="w-3.5 h-3.5 text-[#00E887]" /> : <Share2 className="w-3.5 h-3.5" />}
            <span>{copiedLink ? 'Link Copied!' : 'Share Comparison'}</span>
          </button>
        </div>
      </div>

      {/* 2. Stock Basket Pills & Autocomplete Search Bar */}
      <div className="neopop-card p-3 sm:p-4 border-2 border-black bg-[#181818] rounded-[4px] shadow-[4px_4px_0px_#000000] space-y-3">
        <div className="flex flex-wrap items-center justify-between gap-3">
          {/* Active Stock Chips */}
          <div className="flex items-center gap-2 flex-wrap">
            <span className="text-[11px] text-zinc-400 font-bold uppercase font-mono mr-1">Active Basket:</span>
            {selectedSymbols.map((sym, idx) => {
              const pal = STOCK_PALETTE[idx % STOCK_PALETTE.length];
              const st = stocks.find(s => s.symbol === sym) || (constituents || []).find(s => s.symbol === sym);
              const ltpVal = st?.ltp;
              const chgVal = st?.dayChangePct !== undefined ? st.dayChangePct : (st?.change_perc !== undefined ? st.change_perc : null);
              return (
                <div
                  key={sym}
                  className="flex items-center gap-1.5 px-2.5 py-1 rounded-[3px] border-2 border-black shadow-[2px_2px_0px_#000000] text-xs font-mono font-black"
                  style={{ backgroundColor: '#111111', color: '#FFFFFF' }}
                >
                  <span
                    className="w-2.5 h-2.5 rounded-full shrink-0 border border-black shadow-[1px_1px_0px_#000000]"
                    style={{ backgroundColor: pal.stroke }}
                  />
                  <span>{sym}</span>
                  {ltpVal !== undefined && (
                    <span className="text-[10px] text-zinc-400 font-normal">
                      ₹{ltpVal} {chgVal !== null ? `(${chgVal >= 0 ? '+' : ''}${chgVal.toFixed(1)}%)` : ''}
                    </span>
                  )}
                  <button
                    onClick={() => handleRemoveStock(sym)}
                    className="ml-1 p-0.5 hover:bg-white/20 rounded text-zinc-400 hover:text-white"
                    title={`Remove ${sym}`}
                  >
                    <X className="w-3 h-3" />
                  </button>
                </div>
              );
            })}
          </div>

          {/* Search to Add More Stocks (up to 6) */}
          <div className="relative min-w-[240px] sm:w-72">
            <div className="relative flex items-center">
              <Search className="w-3.5 h-3.5 absolute left-2.5 text-zinc-400" />
              <input
                type="text"
                placeholder="Add stock (e.g. TATAPOWER, SBIN)..."
                value={searchQuery}
                onChange={(e) => {
                  setSearchQuery(e.target.value);
                  setShowSearchDropdown(true);
                }}
                onFocus={() => setShowSearchDropdown(true)}
                className="w-full bg-[#111111] border-2 border-black rounded-[3px] text-xs font-mono text-white pl-8 pr-3 py-1.5 focus:outline-none focus:border-[#FEE360] shadow-[2px_2px_0px_#000000]"
              />
            </div>

            {/* Autocomplete Dropdown */}
            {showSearchDropdown && searchResults.length > 0 && (
              <div className="absolute top-full left-0 right-0 mt-1 bg-[#171717] border-2 border-black rounded-[4px] shadow-[4px_4px_0px_#000000] z-50 max-h-56 overflow-y-auto">
                {searchResults.map((s) => (
                  <div
                    key={s.symbol}
                    onClick={() => handleAddStock(s.symbol)}
                    className="p-2.5 hover:bg-[#252525] cursor-pointer flex items-center justify-between border-b border-black/40 text-xs font-mono"
                  >
                    <div>
                      <b className="text-white">{s.symbol}</b>
                      <span className="text-zinc-400 text-[10px] ml-2 truncate max-w-[140px] inline-block align-bottom">{s.name}</span>
                    </div>
                    <div className="flex items-center gap-2">
                      <span className="text-zinc-300">₹{s.ltp}</span>
                      <Plus className="w-3.5 h-3.5 text-[#00E887]" />
                    </div>
                  </div>
                ))}
              </div>
            )}
          </div>
        </div>

        {/* 1-Click Peer Presets Ribbon */}
        <div className="pt-2 border-t border-black/50 flex items-center gap-1.5 overflow-x-auto scrollbar-none text-[11px] font-mono">
          <span className="text-zinc-400 font-bold uppercase shrink-0 mr-1">Peer Presets:</span>
          {comparisonData?.presets?.map((p) => {
            const isMatch = p.symbols.every(s => selectedSymbols.includes(s)) && selectedSymbols.length === p.symbols.length;
            return (
              <button
                key={p.id}
                onClick={() => handleSelectPreset(p.symbols)}
                className={`neopop-btn text-[10px] px-2.5 py-1 whitespace-nowrap font-bold flex items-center gap-1 ${isMatch ? 'neopop-btn-primary' : 'neopop-btn-dark'
                  }`}
              >
                <span>⚡ {p.name}</span>
                <span className="text-[9px] opacity-70">({p.symbols.join(' vs ')})</span>
              </button>
            );
          })}
        </div>
      </div>

      {/* 3. Category Winner Highlights Ribbon */}
      {winnerBadges && (
        <div className="grid grid-cols-2 sm:grid-cols-3 lg:grid-cols-6 gap-2 sm:gap-3">
          <div className="neopop-card p-3 border-2 border-black bg-[#161616] rounded-[4px] shadow-[2px_2px_0px_#000000] flex flex-col justify-between">
            <span className="text-[10px] text-zinc-400 uppercase font-black tracking-wider">🏆 1Y Return Leader</span>
            <div className="mt-1 flex items-baseline justify-between">
              <b className="text-white text-xs font-mono">{winnerBadges.best1YReturn?.symbol}</b>
              <span className="text-[#00E887] font-black text-xs font-mono">{winnerBadges.best1YReturn?.value}</span>
            </div>
          </div>

          <div className="neopop-card p-3 border-2 border-black bg-[#161616] rounded-[4px] shadow-[2px_2px_0px_#000000] flex flex-col justify-between">
            <span className="text-[10px] text-zinc-400 uppercase font-black tracking-wider">📈 5Y CAGR Leader</span>
            <div className="mt-1 flex items-baseline justify-between">
              <b className="text-white text-xs font-mono">{winnerBadges.best5YCagr?.symbol}</b>
              <span className="text-[#00E887] font-black text-xs font-mono">{winnerBadges.best5YCagr?.value}</span>
            </div>
          </div>

          <div className="neopop-card p-3 border-2 border-black bg-[#161616] rounded-[4px] shadow-[2px_2px_0px_#000000] flex flex-col justify-between">
            <span className="text-[10px] text-zinc-400 uppercase font-black tracking-wider">💎 Value / Lowest P/E</span>
            <div className="mt-1 flex items-baseline justify-between">
              <b className="text-white text-xs font-mono">{winnerBadges.lowestPe?.symbol}</b>
              <span className="text-[#FEE360] font-black text-xs font-mono">{winnerBadges.lowestPe?.value}</span>
            </div>
          </div>

          <div className="neopop-card p-3 border-2 border-black bg-[#161616] rounded-[4px] shadow-[2px_2px_0px_#000000] flex flex-col justify-between">
            <span className="text-[10px] text-zinc-400 uppercase font-black tracking-wider">⚡ Profitability (ROE)</span>
            <div className="mt-1 flex items-baseline justify-between">
              <b className="text-white text-xs font-mono">{winnerBadges.highestRoe?.symbol}</b>
              <span className="text-[#00E887] font-black text-xs font-mono">{winnerBadges.highestRoe?.value}</span>
            </div>
          </div>

          <div className="neopop-card p-3 border-2 border-black bg-[#161616] rounded-[4px] shadow-[2px_2px_0px_#000000] flex flex-col justify-between">
            <span className="text-[10px] text-zinc-400 uppercase font-black tracking-wider">🛡️ Lowest Debt / Eq</span>
            <div className="mt-1 flex items-baseline justify-between">
              <b className="text-white text-xs font-mono">{winnerBadges.lowestDebt?.symbol}</b>
              <span className="text-[#00D8F6] font-black text-xs font-mono">{winnerBadges.lowestDebt?.value}</span>
            </div>
          </div>

          <div className="neopop-card p-3 border-2 border-black bg-[#161616] rounded-[4px] shadow-[2px_2px_0px_#000000] flex flex-col justify-between">
            <span className="text-[10px] text-zinc-400 uppercase font-black tracking-wider">🏛️ Institutional Flow</span>
            <div className="mt-1 flex items-baseline justify-between">
              <b className="text-white text-xs font-mono">{winnerBadges.highestInstOwnership?.symbol}</b>
              <span className="text-[#FF62A5] font-black text-xs font-mono">{winnerBadges.highestInstOwnership?.value}</span>
            </div>
          </div>
        </div>
      )}

      {/* 4. COMPARATIVE NORMALIZED CHART ENGINE (Full Size 500px / 620px) */}
      <div className="neopop-card p-4 sm:p-5 border-2 border-black bg-[#171717] rounded-[4px] shadow-[4px_4px_0px_#000000] space-y-3">
        {/* Chart Header Bar: Title, Timeframe Pills & Mode Toggles */}
        <div className="flex flex-wrap items-center justify-between gap-3 border-b-2 border-black pb-3">
          <div className="flex items-center gap-2">
            <Activity className="w-4 h-4 text-[#FEE360]" />
            <h3 className="text-xs sm:text-sm font-black text-white uppercase tracking-wider neopop-caps flex items-center gap-2">
              <span>Normalized Comparative Price Chart</span>
              <span className="text-[10px] text-zinc-400 font-mono font-normal">
                (Baseline 0% at {chartData?.startDate || '—'} • {selectedTimeframe} Window)
              </span>
            </h3>
          </div>

          <div className="flex items-center gap-1.5 flex-wrap">
            {/* Timeframe Pills */}
            {['1W', '1M', '3M', '6M', '1Y', '3Y', '5Y', '10Y', '20Y'].map((tf) => (
              <button
                key={tf}
                onClick={() => setSelectedTimeframe(tf)}
                className={`neopop-btn text-[10px] px-2.5 py-1 font-mono font-bold ${selectedTimeframe === tf ? 'neopop-btn-primary' : 'neopop-btn-dark'
                  }`}
              >
                {tf}
              </button>
            ))}

            {/* Height Toggle */}
            <button
              onClick={() => setChartSize(chartSize === 'cinema' ? 'full' : 'cinema')}
              className="neopop-btn neopop-btn-dark text-[10px] px-2.5 py-1 font-mono font-bold flex items-center gap-1 hover:bg-[#252525] ml-1 sm:ml-2"
              title={chartSize === 'cinema' ? 'Switch to Standard 500px' : 'Switch to Max 620px'}
            >
              {chartSize === 'cinema' ? <Minimize2 className="w-3 h-3 text-[#FEE360]" /> : <Maximize2 className="w-3 h-3 text-[#FEE360]" />}
              <span>{chartSize === 'cinema' ? '500PX' : 'MAX 620PX'}</span>
            </button>
          </div>
        </div>

        {/* Legend Ribbon showing current final return & rank for each stock */}
        {chartData && (
          <div className="bg-[#111111] p-2.5 border border-black rounded-[3px] shadow-[2px_2px_0px_#000000] flex flex-wrap items-center justify-between gap-3 text-xs font-mono">
            <div className="flex items-center gap-4 flex-wrap">
              {chartData.paths.map((p, idx) => (
                <div key={p.symbol} className="flex items-center gap-2">
                  <span
                    className="w-3 h-3 rounded-[2px] border border-black"
                    style={{ backgroundColor: p.palette.stroke }}
                  />
                  <b className="text-white">{p.symbol}:</b>
                  <span className={`font-black ${p.finalReturnPct >= 0 ? 'text-[#00E887]' : 'text-[#FF5959]'}`}>
                    {p.finalReturnPct >= 0 ? '+' : ''}{p.finalReturnPct.toFixed(2)}%
                  </span>
                  {p.cagrPct !== null && (
                    <span className="text-[10px] text-zinc-400 font-normal">
                      ({p.cagrPct >= 0 ? '+' : ''}{p.cagrPct.toFixed(1)}% p.a.)
                    </span>
                  )}
                </div>
              ))}
            </div>

            <div className="text-right text-[10px] text-zinc-400">
              Timeline: <b className="text-zinc-200">{chartData.startDate}</b> → <b className="text-zinc-200">{chartData.endDate}</b>
            </div>
          </div>
        )}

        {/* SVG Multi-Line Comparative Chart */}
        {loading ? (
          <div className="p-16 text-center text-zinc-400 font-mono text-xs">
            Compiling comparative data series for {selectedSymbols.join(', ')}...
          </div>
        ) : chartData ? (
          <div className="relative">
            <svg
              viewBox={`0 0 ${chartWidth} ${chartHeight}`}
              className={`w-full select-none ${isCinema ? 'h-[520px] sm:h-[600px]' : 'h-[420px] sm:h-[480px]'}`}
            >
              {/* Zero Baseline (0.0% Relative Return) */}
              <line
                x1={pad.left}
                y1={chartData.zeroY}
                x2={chartWidth - pad.right}
                y2={chartData.zeroY}
                stroke="#FFFFFF"
                strokeWidth="1.5"
                opacity="0.4"
              />
              <text
                x={pad.left - 10}
                y={chartData.zeroY + 3.5}
                textAnchor="end"
                fill="#FFFFFF"
                fontSize="10"
                fontFamily="monospace"
                fontWeight="black"
              >
                0.0%
              </text>
              <text
                x={chartWidth - pad.right + 10}
                y={chartData.zeroY + 3.5}
                textAnchor="start"
                fill="#FFFFFF"
                fontSize="10"
                fontFamily="monospace"
                fontWeight="black"
              >
                0.0%
              </text>

              {/* Horizontal Reference Grid lines */}
              {chartData.gridLevels.map((gl, i) => (
                <g key={i}>
                  <line
                    x1={pad.left}
                    y1={gl.y}
                    x2={chartWidth - pad.right}
                    y2={gl.y}
                    stroke="#262626"
                    strokeDasharray="3,3"
                    strokeWidth="1"
                  />
                  <text
                    x={pad.left - 10}
                    y={gl.y + 3.5}
                    textAnchor="end"
                    fill="#71717A"
                    fontSize="10"
                    fontFamily="monospace"
                    fontWeight="bold"
                  >
                    {gl.val >= 0 ? '+' : ''}{gl.val.toFixed(0)}%
                  </text>
                  <text
                    x={chartWidth - pad.right + 10}
                    y={gl.y + 3.5}
                    textAnchor="start"
                    fill="#71717A"
                    fontSize="10"
                    fontFamily="monospace"
                    fontWeight="bold"
                  >
                    {gl.val >= 0 ? '+' : ''}{gl.val.toFixed(0)}%
                  </text>
                </g>
              ))}

              {/* Vertical Date Grid lines & X-axis Labels */}
              {chartData.dateTicks.map((dt, i) => (
                <g key={i}>
                  <line
                    x1={dt.x}
                    y1={pad.top}
                    x2={dt.x}
                    y2={chartHeight - pad.bottom}
                    stroke="#1E1E1E"
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

              {/* Render Multi-Stock Paths */}
              {chartData.paths.map((p) => (
                <path
                  key={p.symbol}
                  d={p.pathD}
                  fill="none"
                  stroke={p.palette.stroke}
                  strokeWidth="2.5"
                  strokeLinecap="round"
                  strokeLinejoin="round"
                />
              ))}

              {/* Hover Crosshairs & Tracking Dots */}
              {hoveredPoint && (
                <g>
                  {/* Vertical Crosshair Line */}
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

                  {/* Marker Dot for Each Stock at this Date */}
                  {hoveredPoint.stockMetrics.map((sm) => (
                    <circle
                      key={sm.symbol}
                      cx={hoveredPoint.x}
                      cy={sm.y}
                      r="4.5"
                      fill={sm.palette.stroke}
                      stroke="#000000"
                      strokeWidth="2"
                    />
                  ))}
                </g>
              )}

              {/* Transparent Overlay for Smooth Crosshair Interaction */}
              <rect
                x={pad.left}
                y={pad.top}
                width={chartData.innerW}
                height={chartData.innerH}
                fill="transparent"
                onMouseMove={(e) => {
                  const rect = e.currentTarget.getBoundingClientRect();
                  const mouseX = ((e.clientX - rect.left) / rect.width) * chartData.innerW + pad.left;
                  const ratio = Math.max(0, Math.min(1, (mouseX - pad.left) / chartData.innerW));
                  const idx = Math.min(chartData.timeline.length - 1, Math.round(ratio * (chartData.timeline.length - 1)));
                  const pt = chartData.timeline[idx];

                  if (pt) {
                    const stockMetrics = chartData.paths.map(p => {
                      const sp = p.points[idx];
                      return {
                        symbol: p.symbol,
                        palette: p.palette,
                        returnPct: sp?.returnPct ?? 0,
                        price: sp?.price ?? 0,
                        y: sp?.y ?? chartData.zeroY
                      };
                    });
                    setHoveredPoint({
                      date: pt.date,
                      x: pad.left + (idx / Math.max(1, chartData.timeline.length - 1)) * chartData.innerW,
                      stockMetrics
                    });
                  }
                }}
                onMouseLeave={() => setHoveredPoint(null)}
              />
            </svg>

            {/* Floating Multi-Stock Comparison HUD */}
            {hoveredPoint && (
              <div className="absolute top-3 left-20 p-3 bg-[#111111]/95 border-2 border-black rounded-[4px] text-xs font-mono shadow-[4px_4px_0px_#000000] backdrop-blur-md space-y-1.5 pointer-events-none z-20">
                <div className="text-[10px] text-zinc-400 font-bold border-b border-zinc-800 pb-1 flex items-center justify-between gap-4">
                  <span>DATE: <b className="text-white">{hoveredPoint.date}</b></span>
                  <span className="text-zinc-500 uppercase">Normalized divergence</span>
                </div>
                <div className="space-y-1">
                  {hoveredPoint.stockMetrics.map(sm => (
                    <div key={sm.symbol} className="flex items-center justify-between gap-4">
                      <div className="flex items-center gap-1.5">
                        <span className="w-2 h-2 rounded-full" style={{ backgroundColor: sm.palette.stroke }} />
                        <b className="text-white">{sm.symbol}:</b>
                      </div>
                      <div className="flex items-center gap-2">
                        <span className="text-zinc-300">₹{sm.price?.toFixed(1) || '—'}</span>
                        <b className={sm.returnPct >= 0 ? 'text-[#00E887]' : 'text-[#FF5959]'}>
                          {sm.returnPct >= 0 ? '+' : ''}{sm.returnPct.toFixed(2)}%
                        </b>
                      </div>
                    </div>
                  ))}
                </div>
              </div>
            )}
          </div>
        ) : (
          <div className="p-16 text-center text-zinc-500 font-mono text-xs">
            No comparative curve data available for selected stocks.
          </div>
        )}
      </div>

      {/* 5. COMPARISON MATRIX NAVIGATION TABS */}
      <div className="bg-[#181818] p-2 border-2 border-black rounded-[4px] shadow-[4px_4px_0px_#000000] flex items-center gap-1.5 overflow-x-auto scrollbar-none">
        <button
          onClick={() => setActiveSubTab('overview')}
          className={`neopop-btn text-xs px-3.5 py-1.5 flex items-center gap-1.5 font-bold ${activeSubTab === 'overview' ? 'neopop-btn-primary' : 'neopop-btn-dark'
            }`}
        >
          <Layers className="w-3.5 h-3.5" />
          <span>All-in-One Executive Summary</span>
        </button>
        <button
          onClick={() => setActiveSubTab('technicals')}
          className={`neopop-btn text-xs px-3.5 py-1.5 flex items-center gap-1.5 font-bold ${activeSubTab === 'technicals' ? 'neopop-btn-primary' : 'neopop-btn-dark'
            }`}
        >
          <Activity className="w-3.5 h-3.5 text-[#00E887]" />
          <span>Technicals &amp; Momentum Radar</span>
        </button>
        <button
          onClick={() => setActiveSubTab('fundamentals')}
          className={`neopop-btn text-xs px-3.5 py-1.5 flex items-center gap-1.5 font-bold ${activeSubTab === 'fundamentals' ? 'neopop-btn-primary' : 'neopop-btn-dark'
            }`}
        >
          <IndianRupee className="w-3.5 h-3.5 text-[#FEE360]" />
          <span>Fundamentals &amp; Valuation</span>
        </button>
        <button
          onClick={() => setActiveSubTab('financials')}
          className={`neopop-btn text-xs px-3.5 py-1.5 flex items-center gap-1.5 font-bold ${activeSubTab === 'financials' ? 'neopop-btn-primary' : 'neopop-btn-dark'
            }`}
        >
          <BarChart2 className="w-3.5 h-3.5 text-[#00D8F6]" />
          <span>Financials &amp; P&amp;L Statements</span>
        </button>
        <button
          onClick={() => setActiveSubTab('returns')}
          className={`neopop-btn text-xs px-3.5 py-1.5 flex items-center gap-1.5 font-bold ${activeSubTab === 'returns' ? 'neopop-btn-primary' : 'neopop-btn-dark'
            }`}
        >
          <TrendingUp className="w-3.5 h-3.5 text-[#FF62A5]" />
          <span>Multi-Period Returns &amp; CAGR</span>
        </button>
      </div>

      {/* 6. COMPARISON TABLES SECTION */}
      <div className="space-y-4">
        {/* SUB-TAB 1: ALL-IN-ONE EXECUTIVE SUMMARY */}
        {activeSubTab === 'overview' && (
          <div className="neopop-card p-4 sm:p-5 border-2 border-black bg-[#171717] rounded-[4px] shadow-[4px_4px_0px_#000000] space-y-4">
            <div className="flex items-center justify-between border-b-2 border-black pb-3">
              <h4 className="text-xs sm:text-sm font-black text-white uppercase tracking-wider neopop-caps flex items-center gap-2">
                <span>Executive Peer Comparison Matrix</span>
                <span className="text-[10px] text-zinc-400 font-mono font-normal">
                  (Best-in-category highlighted in green)
                </span>
              </h4>
            </div>

            <div className="overflow-x-auto scrollbar-thin">
              <table className="w-full text-xs font-mono border-collapse">
                <thead>
                  <tr className="border-b-2 border-black bg-[#111111] text-zinc-400 uppercase text-[10px]">
                    <th className="py-2.5 px-3 text-left w-56 font-bold">Metric / Dimension</th>
                    {stocks.map((st, idx) => {
                      const pal = STOCK_PALETTE[idx % STOCK_PALETTE.length];
                      return (
                        <th key={st.symbol} className="py-2.5 px-3 text-right">
                          <button
                            onClick={() => onSelectStock && onSelectStock(st)}
                            className="inline-flex items-center gap-1 hover:underline text-white font-black text-xs"
                            title={`Open dedicated terminal for ${st.symbol}`}
                          >
                            <span className="w-2.5 h-2.5 rounded-full inline-block" style={{ backgroundColor: pal.stroke }} />
                            <span>{st.symbol}</span>
                            <ExternalLink className="w-3 h-3 text-zinc-500" />
                          </button>
                          <div className="text-[10px] text-zinc-400 font-normal truncate max-w-[130px] ml-auto">
                            {st.name}
                          </div>
                        </th>
                      );
                    })}
                  </tr>
                </thead>
                <tbody className="divide-y divide-black/40">
                  {/* Category: Price & Valuation */}
                  <tr className="bg-[#121212] font-black text-[10px] text-[#FEE360] uppercase">
                    <td colSpan={stocks.length + 1} className="py-1.5 px-3">Valuation &amp; Market Cap</td>
                  </tr>
                  <tr>
                    <td className="py-2.5 px-3 text-zinc-300 font-bold">Market Cap</td>
                    {stocks.map(st => (
                      <td key={st.symbol} className="py-2.5 px-3 text-right text-white font-bold">
                        ₹{(st.fundamentals?.mktCapCr ?? 0).toLocaleString('en-IN')} Cr
                        <span className="text-[10px] text-zinc-400 block">{st.fundamentals?.mktCapCategory ?? 'LARGE'} CAP</span>
                      </td>
                    ))}
                  </tr>
                  <tr>
                    <td className="py-2.5 px-3 text-zinc-300 font-bold">P/E Ratio (vs Industry)</td>
                    {stocks.map(st => {
                      const isBest = winnerBadges?.lowestPe?.symbol === st.symbol;
                      return (
                        <td key={st.symbol} className="py-2.5 px-3 text-right font-bold">
                          <span className={isBest ? 'bg-[#00E887] text-black px-1.5 py-0.5 rounded font-black' : 'text-white'}>
                            {st.fundamentals?.peRatio ?? '—'}x
                          </span>
                          <span className="text-[10px] text-zinc-400 block font-normal">Ind: {st.fundamentals?.industryPe ?? '—'}x</span>
                        </td>
                      );
                    })}
                  </tr>
                  <tr>
                    <td className="py-2.5 px-3 text-zinc-300 font-bold">P/B Ratio</td>
                    {stocks.map(st => (
                      <td key={st.symbol} className="py-2.5 px-3 text-right text-zinc-200">
                        {st.fundamentals?.pbRatio ?? '—'}x
                      </td>
                    ))}
                  </tr>

                  {/* Category: Quality & Profitability */}
                  <tr className="bg-[#121212] font-black text-[10px] text-[#00E887] uppercase">
                    <td colSpan={stocks.length + 1} className="py-1.5 px-3">Quality &amp; Profitability</td>
                  </tr>
                  <tr>
                    <td className="py-2.5 px-3 text-zinc-300 font-bold">Return on Equity (ROE)</td>
                    {stocks.map(st => {
                      const isBest = winnerBadges?.highestRoe?.symbol === st.symbol;
                      return (
                        <td key={st.symbol} className="py-2.5 px-3 text-right font-bold">
                          <span className={isBest ? 'bg-[#00E887] text-black px-1.5 py-0.5 rounded font-black' : 'text-white'}>
                            {st.fundamentals?.roePct ?? '—'}%
                          </span>
                        </td>
                      );
                    })}
                  </tr>
                  <tr>
                    <td className="py-2.5 px-3 text-zinc-300 font-bold">Net Profit Margin (PAT %)</td>
                    {stocks.map(st => {
                      const isBest = winnerBadges?.highestMargin?.symbol === st.symbol;
                      return (
                        <td key={st.symbol} className="py-2.5 px-3 text-right font-bold">
                          <span className={isBest ? 'bg-[#00E887] text-black px-1.5 py-0.5 rounded font-black' : 'text-zinc-200'}>
                            {st.financials?.patMarginPct ?? '—'}%
                          </span>
                        </td>
                      );
                    })}
                  </tr>
                  <tr>
                    <td className="py-2.5 px-3 text-zinc-300 font-bold">Debt-to-Equity Ratio</td>
                    {stocks.map(st => {
                      const isBest = winnerBadges?.lowestDebt?.symbol === st.symbol;
                      const debt = st.fundamentals?.debtToEquity ?? 0;
                      return (
                        <td key={st.symbol} className="py-2.5 px-3 text-right font-bold">
                          <span className={isBest ? 'bg-[#00E887] text-black px-1.5 py-0.5 rounded font-black' : debt > 1.5 ? 'text-[#FF5959]' : 'text-zinc-200'}>
                            {st.fundamentals?.debtToEquity ?? '—'}x
                          </span>
                          <span className="text-[10px] text-zinc-400 block font-normal">{st.fundamentals?.debtStatus ?? 'NORMAL'}</span>
                        </td>
                      );
                    })}
                  </tr>

                  {/* Category: Growth & Scale */}
                  <tr className="bg-[#121212] font-black text-[10px] text-[#00D8F6] uppercase">
                    <td colSpan={stocks.length + 1} className="py-1.5 px-3">Revenue &amp; P&amp;L Scale</td>
                  </tr>
                  <tr>
                    <td className="py-2.5 px-3 text-zinc-300 font-bold">Revenue TTM (YoY Growth)</td>
                    {stocks.map(st => (
                      <td key={st.symbol} className="py-2.5 px-3 text-right text-white font-bold">
                        ₹{(st.financials?.revenueTtmCr ?? 0).toLocaleString('en-IN')} Cr
                        <span className={`text-[10px] block font-bold ${(st.financials?.revenueGrowthYoyPct ?? 0) >= 0 ? 'text-[#00E887]' : 'text-[#FF5959]'}`}>
                          {(st.financials?.revenueGrowthYoyPct ?? 0) >= 0 ? '+' : ''}{st.financials?.revenueGrowthYoyPct ?? 0}% YoY
                        </span>
                      </td>
                    ))}
                  </tr>
                  <tr>
                    <td className="py-2.5 px-3 text-zinc-300 font-bold">Net Profit / PAT TTM</td>
                    {stocks.map(st => (
                      <td key={st.symbol} className="py-2.5 px-3 text-right text-[#00E887] font-bold">
                        ₹{(st.financials?.patTtmCr ?? 0).toLocaleString('en-IN')} Cr
                      </td>
                    ))}
                  </tr>

                  {/* Category: Technical Momentum & Alpha */}
                  <tr className="bg-[#121212] font-black text-[10px] text-[#FF62A5] uppercase">
                    <td colSpan={stocks.length + 1} className="py-1.5 px-3">Momentum &amp; Historical Alpha</td>
                  </tr>
                  <tr>
                    <td className="py-2.5 px-3 text-zinc-300 font-bold">1-Year Return</td>
                    {stocks.map(st => {
                      const isBest = winnerBadges?.best1YReturn?.symbol === st.symbol;
                      const ret = st.returns?.['1Y'] ?? 0;
                      return (
                        <td key={st.symbol} className="py-2.5 px-3 text-right font-bold">
                          <span className={isBest ? 'bg-[#00E887] text-black px-1.5 py-0.5 rounded font-black' : ret >= 0 ? 'text-[#00E887]' : 'text-[#FF5959]'}>
                            {ret >= 0 ? '+' : ''}{ret}%
                          </span>
                        </td>
                      );
                    })}
                  </tr>
                  <tr>
                    <td className="py-2.5 px-3 text-zinc-300 font-bold">5-Year Annualized CAGR</td>
                    {stocks.map(st => {
                      const isBest = winnerBadges?.best5YCagr?.symbol === st.symbol;
                      const cagr = st.cagr?.['5Y'];
                      return (
                        <td key={st.symbol} className="py-2.5 px-3 text-right font-bold">
                          {cagr !== undefined && cagr !== null ? (
                            <span className={isBest ? 'bg-[#00E887] text-black px-1.5 py-0.5 rounded font-black' : cagr >= 0 ? 'text-[#00E887]' : 'text-[#FF5959]'}>
                              {cagr >= 0 ? '+' : ''}{cagr}% p.a.
                            </span>
                          ) : '—'}
                        </td>
                      );
                    })}
                  </tr>
                  <tr>
                    <td className="py-2.5 px-3 text-zinc-300 font-bold">RSI (14) Momentum</td>
                    {stocks.map(st => (
                      <td key={st.symbol} className="py-2.5 px-3 text-right font-bold text-white">
                        {st.technicals.rsi14}
                        <span className="text-[10px] text-zinc-400 block font-normal">
                          {st.technicals.rsi14 >= 70 ? 'OVERBOUGHT' : st.technicals.rsi14 <= 30 ? 'OVERSOLD' : 'NEUTRAL'}
                        </span>
                      </td>
                    ))}
                  </tr>
                </tbody>
              </table>
            </div>
          </div>
        )}

        {/* SUB-TAB 2: TECHNICALS & MOMENTUM RADAR */}
        {activeSubTab === 'technicals' && (
          <div className="neopop-card p-4 sm:p-5 border-2 border-black bg-[#171717] rounded-[4px] shadow-[4px_4px_0px_#000000] space-y-4">
            <h4 className="text-xs sm:text-sm font-black text-white uppercase tracking-wider neopop-caps border-b-2 border-black pb-3">
              Technical Indicators, Moving Average Alignment &amp; Momentum
            </h4>
            <div className="overflow-x-auto scrollbar-thin">
              <table className="w-full text-xs font-mono border-collapse">
                <thead>
                  <tr className="border-b-2 border-black bg-[#111111] text-zinc-400 uppercase text-[10px]">
                    <th className="py-2.5 px-3 text-left font-bold">Technical Parameter</th>
                    {stocks.map(st => (
                      <th key={st.symbol} className="py-2.5 px-3 text-right font-black text-white">
                        {st.symbol}
                      </th>
                    ))}
                  </tr>
                </thead>
                <tbody className="divide-y divide-black/40">
                  <tr>
                    <td className="py-2 px-3 text-zinc-300 font-bold">Current LTP &amp; Change</td>
                    {stocks.map(st => (
                      <td key={st.symbol} className="py-2 px-3 text-right font-bold">
                        <span className="text-white">₹{st.ltp}</span>
                        <span className={`text-[10px] ml-1.5 ${st.dayChangePct >= 0 ? 'text-[#00E887]' : 'text-[#FF5959]'}`}>
                          ({st.dayChangePct >= 0 ? '+' : ''}{st.dayChangePct.toFixed(2)}%)
                        </span>
                      </td>
                    ))}
                  </tr>
                  <tr>
                    <td className="py-2 px-3 text-zinc-300 font-bold">52-Week Range</td>
                    {stocks.map(st => (
                      <td key={st.symbol} className="py-2 px-3 text-right text-zinc-200">
                        ₹{st.technicals?.low52w ?? '—'} → ₹{st.technicals?.high52w ?? '—'}
                      </td>
                    ))}
                  </tr>
                  <tr>
                    <td className="py-2 px-3 text-zinc-300 font-bold">Distance from 52W High</td>
                    {stocks.map(st => (
                      <td key={st.symbol} className="py-2 px-3 text-right text-zinc-300">
                        {st.technicals?.dist52wHighPct !== undefined ? `-${st.technicals.dist52wHighPct}%` : '—'}
                      </td>
                    ))}
                  </tr>
                  <tr>
                    <td className="py-2 px-3 text-zinc-300 font-bold">20 EMA / 50 SMA / 200 SMA Status</td>
                    {stocks.map(st => {
                      const sig = st.technicals?.maSignal || 'NEUTRAL';
                      return (
                        <td key={st.symbol} className="py-2 px-3 text-right font-bold">
                          <span className={sig.includes('BULLISH') ? 'text-[#00E887]' : 'text-zinc-300'}>
                            {sig}
                          </span>
                        </td>
                      );
                    })}
                  </tr>
                  <tr>
                    <td className="py-2 px-3 text-zinc-300 font-bold">RSI (14-period)</td>
                    {stocks.map(st => (
                      <td key={st.symbol} className="py-2 px-3 text-right text-white font-bold">
                        {st.technicals?.rsi14 ?? '—'}
                      </td>
                    ))}
                  </tr>
                  <tr>
                    <td className="py-2 px-3 text-zinc-300 font-bold">Beta (vs NIFTY 50)</td>
                    {stocks.map(st => (
                      <td key={st.symbol} className="py-2 px-3 text-right text-zinc-200">
                        {st.technicals?.beta ?? '1.0'}
                      </td>
                    ))}
                  </tr>
                  <tr>
                    <td className="py-2 px-3 text-zinc-300 font-bold">Delivery %</td>
                    {stocks.map(st => (
                      <td key={st.symbol} className="py-2 px-3 text-right text-zinc-200">
                        {st.technicals?.deliveryPct ?? '—'}%
                      </td>
                    ))}
                  </tr>
                  <tr>
                    <td className="py-2 px-3 text-zinc-300 font-bold">Regulatory Surveillance (ASM/GSM)</td>
                    {stocks.map(st => (
                      <td key={st.symbol} className="py-2 px-3 text-right font-bold">
                        {st.technicals?.isAsm ? (
                          <span className="bg-[#FF5959] text-white px-2 py-0.5 rounded text-[10px]">
                            ⚠️ {st.technicals.asmGsmStatus}
                          </span>
                        ) : (
                          <span className="text-[#00E887] text-[10px]">REGULAR</span>
                        )}
                      </td>
                    ))}
                  </tr>
                </tbody>
              </table>
            </div>
          </div>
        )}

        {/* SUB-TAB 3: FUNDAMENTALS & VALUATION */}
        {activeSubTab === 'fundamentals' && (
          <div className="neopop-card p-4 sm:p-5 border-2 border-black bg-[#171717] rounded-[4px] shadow-[4px_4px_0px_#000000] space-y-4">
            <h4 className="text-xs sm:text-sm font-black text-white uppercase tracking-wider neopop-caps border-b-2 border-black pb-3">
              Institutional Fundamentals, Valuation Multiples &amp; Ownership Structure
            </h4>
            <div className="overflow-x-auto scrollbar-thin">
              <table className="w-full text-xs font-mono border-collapse">
                <thead>
                  <tr className="border-b-2 border-black bg-[#111111] text-zinc-400 uppercase text-[10px]">
                    <th className="py-2.5 px-3 text-left font-bold">Fundamental Parameter</th>
                    {stocks.map(st => (
                      <th key={st.symbol} className="py-2.5 px-3 text-right font-black text-white">
                        {st.symbol}
                      </th>
                    ))}
                  </tr>
                </thead>
                <tbody className="divide-y divide-black/40">
                  <tr>
                    <td className="py-2 px-3 text-zinc-300 font-bold">Price-to-Earnings (P/E)</td>
                    {stocks.map(st => (
                      <td key={st.symbol} className="py-2 px-3 text-right font-bold text-white">
                        {st.fundamentals?.peRatio ?? '—'}x
                        <span className="text-[10px] text-zinc-400 block font-normal">Ind: {st.fundamentals?.industryPe ?? '—'}x {st.fundamentals?.peStatus ? `(${st.fundamentals.peStatus})` : ''}</span>
                      </td>
                    ))}
                  </tr>
                  <tr>
                    <td className="py-2 px-3 text-zinc-300 font-bold">Price-to-Book (P/B)</td>
                    {stocks.map(st => (
                      <td key={st.symbol} className="py-2 px-3 text-right text-zinc-200">
                        {st.fundamentals?.pbRatio ?? '—'}x
                      </td>
                    ))}
                  </tr>
                  <tr>
                    <td className="py-2 px-3 text-zinc-300 font-bold">Dividend Yield</td>
                    {stocks.map(st => (
                      <td key={st.symbol} className="py-2 px-3 text-right text-zinc-200">
                        {st.fundamentals?.divYieldPct ?? '0.0'}%
                      </td>
                    ))}
                  </tr>
                  <tr>
                    <td className="py-2 px-3 text-zinc-300 font-bold">Return on Equity (ROE)</td>
                    {stocks.map(st => (
                      <td key={st.symbol} className="py-2 px-3 text-right font-bold text-[#00E887]">
                        {st.fundamentals?.roePct ?? '—'}%
                      </td>
                    ))}
                  </tr>
                  <tr>
                    <td className="py-2 px-3 text-zinc-300 font-bold">Return on Capital Employed (ROCE)</td>
                    {stocks.map(st => (
                      <td key={st.symbol} className="py-2 px-3 text-right font-bold text-[#00D8F6]">
                        {st.fundamentals?.rocePct ?? '—'}%
                      </td>
                    ))}
                  </tr>
                  <tr>
                    <td className="py-2 px-3 text-zinc-300 font-bold">Debt-to-Equity</td>
                    {stocks.map(st => (
                      <td key={st.symbol} className="py-2 px-3 text-right font-bold">
                        {st.fundamentals?.debtToEquity ?? '—'}x
                        <span className="text-[10px] text-zinc-400 block font-normal">{st.fundamentals?.debtStatus ?? 'NORMAL'}</span>
                      </td>
                    ))}
                  </tr>
                  <tr>
                    <td className="py-2 px-3 text-zinc-300 font-bold">Promoter Shareholding</td>
                    {stocks.map(st => (
                      <td key={st.symbol} className="py-2 px-3 text-right text-white font-bold">
                        {st.fundamentals?.promoterHoldingPct ?? '—'}%
                        {(st.fundamentals?.pledgedPromoterPct ?? 0) > 0 && (
                          <span className="text-[10px] text-[#FF5959] block font-normal">Pledged: {st.fundamentals.pledgedPromoterPct}%</span>
                        )}
                      </td>
                    ))}
                  </tr>
                  <tr>
                    <td className="py-2 px-3 text-zinc-300 font-bold">Institutional Ownership (FII + DII)</td>
                    {stocks.map(st => (
                      <td key={st.symbol} className="py-2 px-3 text-right font-bold text-white">
                        {st.fundamentals?.institutionalHoldingPct ?? '—'}%
                        <span className="text-[10px] text-zinc-400 block font-normal">FII: {st.fundamentals?.fiiHoldingPct ?? '—'}% • DII: {st.fundamentals?.diiHoldingPct ?? '—'}%</span>
                      </td>
                    ))}
                  </tr>
                </tbody>
              </table>
            </div>
          </div>
        )}

        {/* SUB-TAB 4: FINANCIALS & P&L STATEMENTS */}
        {activeSubTab === 'financials' && (
          <div className="neopop-card p-4 sm:p-5 border-2 border-black bg-[#171717] rounded-[4px] shadow-[4px_4px_0px_#000000] space-y-4">
            <h4 className="text-xs sm:text-sm font-black text-white uppercase tracking-wider neopop-caps border-b-2 border-black pb-3">
              Annual / TTM Financial Statements &amp; Cash Flow Breakdown
            </h4>
            <div className="overflow-x-auto scrollbar-thin">
              <table className="w-full text-xs font-mono border-collapse">
                <thead>
                  <tr className="border-b-2 border-black bg-[#111111] text-zinc-400 uppercase text-[10px]">
                    <th className="py-2.5 px-3 text-left font-bold">Financial Parameter</th>
                    {stocks.map(st => (
                      <th key={st.symbol} className="py-2.5 px-3 text-right font-black text-white">
                        {st.symbol}
                      </th>
                    ))}
                  </tr>
                </thead>
                <tbody className="divide-y divide-black/40">
                  <tr>
                    <td className="py-2 px-3 text-zinc-300 font-bold">Revenue TTM</td>
                    {stocks.map(st => (
                      <td key={st.symbol} className="py-2 px-3 text-right text-white font-bold">
                        ₹{(st.financials?.revenueTtmCr ?? 0).toLocaleString('en-IN')} Cr
                      </td>
                    ))}
                  </tr>
                  <tr>
                    <td className="py-2 px-3 text-zinc-300 font-bold">Revenue YoY Growth</td>
                    {stocks.map(st => (
                      <td key={st.symbol} className="py-2 px-3 text-right font-bold">
                        <span className={(st.financials?.revenueGrowthYoyPct ?? 0) >= 0 ? 'text-[#00E887]' : 'text-[#FF5959]'}>
                          {(st.financials?.revenueGrowthYoyPct ?? 0) >= 0 ? '+' : ''}{st.financials?.revenueGrowthYoyPct ?? '0.0'}%
                        </span>
                      </td>
                    ))}
                  </tr>
                  <tr>
                    <td className="py-2 px-3 text-zinc-300 font-bold">Operating Profit / EBITDA</td>
                    {stocks.map(st => (
                      <td key={st.symbol} className="py-2 px-3 text-right text-white font-bold">
                        ₹{(st.financials?.ebitdaCr ?? 0).toLocaleString('en-IN')} Cr
                        <span className="text-[10px] text-zinc-400 block font-normal">Margin: {st.financials?.ebitdaMarginPct ?? '—'}%</span>
                      </td>
                    ))}
                  </tr>
                  <tr>
                    <td className="py-2 px-3 text-zinc-300 font-bold">Net Profit / PAT TTM</td>
                    {stocks.map(st => (
                      <td key={st.symbol} className="py-2 px-3 text-right font-bold text-[#00E887]">
                        ₹{(st.financials?.patTtmCr ?? 0).toLocaleString('en-IN')} Cr
                        <span className="text-[10px] text-zinc-400 block font-normal">PAT Margin: {st.financials?.patMarginPct ?? '—'}%</span>
                      </td>
                    ))}
                  </tr>
                  <tr>
                    <td className="py-2 px-3 text-zinc-300 font-bold">EPS TTM (Diluted)</td>
                    {stocks.map(st => (
                      <td key={st.symbol} className="py-2 px-3 text-right font-bold text-white">
                        ₹{st.financials?.epsTtm ?? '—'}
                        <span className={`text-[10px] block font-normal ${(st.financials?.epsGrowthYoyPct ?? 0) >= 0 ? 'text-[#00E887]' : 'text-[#FF5959]'}`}>
                          ({(st.financials?.epsGrowthYoyPct ?? 0) >= 0 ? '+' : ''}{st.financials?.epsGrowthYoyPct ?? '0.0'}% YoY)
                        </span>
                      </td>
                    ))}
                  </tr>
                  <tr>
                    <td className="py-2 px-3 text-zinc-300 font-bold">Free Cash Flow (FCF)</td>
                    {stocks.map(st => (
                      <td key={st.symbol} className="py-2 px-3 text-right font-bold">
                        <span className={(st.financials?.freeCashFlowCr ?? 0) >= 0 ? 'text-[#00E887]' : 'text-[#FF5959]'}>
                          ₹{(st.financials?.freeCashFlowCr ?? 0).toLocaleString('en-IN')} Cr
                        </span>
                      </td>
                    ))}
                  </tr>
                </tbody>
              </table>
            </div>
          </div>
        )}

        {/* SUB-TAB 5: MULTI-PERIOD RETURNS & CAGR */}
        {activeSubTab === 'returns' && (
          <div className="neopop-card p-4 sm:p-5 border-2 border-black bg-[#171717] rounded-[4px] shadow-[4px_4px_0px_#000000] space-y-4">
            <h4 className="text-xs sm:text-sm font-black text-white uppercase tracking-wider neopop-caps border-b-2 border-black pb-3">
              Multi-Period Cumulative Returns &amp; Annualized Secular CAGR
            </h4>
            <div className="overflow-x-auto scrollbar-thin">
              <table className="w-full text-xs font-mono border-collapse">
                <thead>
                  <tr className="border-b-2 border-black bg-[#111111] text-zinc-400 uppercase text-[10px]">
                    <th className="py-2.5 px-3 text-left font-bold">Evaluation Window</th>
                    {stocks.map(st => (
                      <th key={st.symbol} className="py-2.5 px-3 text-right font-black text-white">
                        {st.symbol}
                      </th>
                    ))}
                  </tr>
                </thead>
                <tbody className="divide-y divide-black/40">
                  {['1W', '1M', '3M', '6M', '1Y', '3Y', '5Y', '10Y', '20Y'].map((win) => {
                    const isMultiYear = ['3Y', '5Y', '10Y', '20Y'].includes(win);
                    return (
                      <tr key={win}>
                        <td className="py-2.5 px-3 text-zinc-300 font-bold">
                          {win} Period {isMultiYear ? '(Total & CAGR)' : 'Return'}
                        </td>
                        {stocks.map(st => {
                          const ret = st.returns?.[win];
                          const cagr = st.cagr?.[win];
                          return (
                            <td key={st.symbol} className="py-2.5 px-3 text-right font-bold">
                              {ret !== undefined && ret !== null ? (
                                <>
                                  <span className={ret >= 0 ? 'text-[#00E887]' : 'text-[#FF5959]'}>
                                    {ret >= 0 ? '+' : ''}{ret}%
                                  </span>
                                  {isMultiYear && cagr !== undefined && cagr !== null && (
                                    <span className="text-[10px] text-[#FEE360] block font-bold">
                                      CAGR: {cagr >= 0 ? '+' : ''}{cagr}% p.a.
                                    </span>
                                  )}
                                </>
                              ) : (
                                <span className="text-zinc-500">—</span>
                              )}
                            </td>
                          );
                        })}
                      </tr>
                    );
                  })}
                </tbody>
              </table>
            </div>
          </div>
        )}
      </div>
    </div>
  );
}

