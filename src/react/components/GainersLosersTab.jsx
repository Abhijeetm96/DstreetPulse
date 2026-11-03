import React, { useState, useMemo } from 'react';
import {
  TrendingUp,
  TrendingDown,
  ExternalLink,
  Flame,
  ShieldAlert,
  Filter,
  Sparkles,
  Clock,
  Zap,
  RotateCcw
} from 'lucide-react';
import { formatIndianCurrency, formatVolume } from '../utils/formatters.js';
import { getMarketCap, filterByMarketCap } from '../utils/mktCapRegistry.js';
import MarketCapFilter from './MarketCapFilter.jsx';

const TIMEFRAME_OPTIONS = [
  { id: '1D', label: '1 Day', sublabel: 'Live Intraday' },
  { id: '1W', label: '1 Week', sublabel: 'Trailing 5d' },
  { id: '1M', label: '1 Month', sublabel: 'Trailing 21d' },
  { id: '3M', label: '3 Months', sublabel: 'Quarterly' },
  { id: '6M', label: '6 Months', sublabel: 'Half-Year' },
  { id: '1Y', label: '1 Year', sublabel: 'Trailing 250d' }
];

const STRATEGY_PRESETS = [
  { id: 'ALL', label: 'All Movers', desc: 'No special filter applied' },
  { id: 'HIGH_RVOL', label: '⚡ High RVOL (>2x)', desc: 'Institutional volume expansion (>2x 20d average)' },
  { id: 'NEAR_52W_HIGH', label: '🎯 Near 52W High (≤3%)', desc: 'Testing 52-week structural breakout ceiling' },
  { id: 'NEAR_52W_LOW', label: '💎 Near 52W Low (≤5%)', desc: 'Oversold mean-reversion & bargain zone' },
  { id: 'HIGH_MOMENTUM', label: '🚀 Explosive (>3%)', desc: 'Outsized single-session momentum movers' },
  { id: 'NON_ASM', label: '🛡️ Non-ASM Safe', desc: 'Zero SEBI surveillance margin surcharge' },
  { id: 'NIFTY50', label: '🏛️ NIFTY 50', desc: 'Benchmark frontline heavyweights' }
];

export default function GainersLosersTab({
  constituents = [],
  officialGainers = [],
  officialLosers = [],
  onSelectStock,
  recentTicks = {}
}) {
  const [timeframe, setTimeframe] = useState('1D'); // '1D' | '1W' | '1M' | '3M' | '6M' | '1Y'
  const [limit, setLimit] = useState(25); // 10 | 25 | 50
  const [selectedSector, setSelectedSector] = useState('ALL');
  const [selectedCap, setSelectedCap] = useState('ALL'); // 'ALL' | 'LARGE' | 'MID' | 'SMALL' | 'MICRO' | 'PENNY'
  const [activePreset, setActivePreset] = useState('ALL');

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

  const sectors = useMemo(() => {
    return [...new Set(constituents.map(c => c.sector).filter(Boolean))].sort();
  }, [constituents]);

  // Helper to extract the return value for the active timeframe
  const getStockReturn = (s, tf) => {
    if (!s) return 0;
    if (s.base_prices && s.base_prices[tf] && s.base_prices[tf] > 0) {
      return Number((((s.ltp - s.base_prices[tf]) / s.base_prices[tf]) * 100).toFixed(2));
    }
    if (tf === '1D') return s.change_perc || 0;
    if (s.returns && typeof s.returns[tf] === 'number') {
      return s.returns[tf];
    }
    return s.change_perc || 0;
  };

  const filteredConstituents = useMemo(() => {
    let list = constituents;

    // 1. Sector Filter
    if (selectedSector !== 'ALL') {
      list = list.filter(c => c.sector === selectedSector);
    }

    // 2. Market Cap Tier Filter
    if (selectedCap !== 'ALL') {
      list = filterByMarketCap(list, selectedCap);
    }

    // 3. Strategy / Technical Preset Filters
    if (activePreset === 'HIGH_RVOL') {
      list = list.filter(c => (c.rvol || 1.0) >= 2.0);
    } else if (activePreset === 'NEAR_52W_HIGH') {
      list = list.filter(c => c.high_52w && ((c.high_52w - c.ltp) / c.high_52w) * 100 <= 3.0);
    } else if (activePreset === 'NEAR_52W_LOW') {
      list = list.filter(c => c.low_52w && ((c.ltp - c.low_52w) / c.low_52w) * 100 <= 5.0);
    } else if (activePreset === 'HIGH_MOMENTUM') {
      const threshold = timeframe === '1D' ? 3.0 : timeframe === '1W' ? 6.0 : 12.0;
      list = list.filter(c => Math.abs(getStockReturn(c, timeframe)) >= threshold);
    } else if (activePreset === 'NON_ASM') {
      list = list.filter(c => !c.asm?.isAsm);
    } else if (activePreset === 'NIFTY50') {
      list = list.filter(c => c.nifty50 === true);
    }

    return list;
  }, [constituents, selectedSector, selectedCap, activePreset, timeframe]);

  // Multi-Timeframe Gainers (Highest return descending)
  const fullGainers = useMemo(() => {
    return [...filteredConstituents]
      .sort((a, b) => getStockReturn(b, timeframe) - getStockReturn(a, timeframe))
      .slice(0, limit);
  }, [filteredConstituents, limit, timeframe]);

  // Multi-Timeframe Losers (Lowest / most negative return ascending)
  const fullLosers = useMemo(() => {
    return [...filteredConstituents]
      .sort((a, b) => getStockReturn(a, timeframe) - getStockReturn(b, timeframe))
      .slice(0, limit);
  }, [filteredConstituents, limit, timeframe]);

  const activeTimeframeLabel = TIMEFRAME_OPTIONS.find(t => t.id === timeframe)?.label || '1 Day';

  return (
    <div className="space-y-4 sm:space-y-6">
      {/* Control Filter & Preset Card */}
      <div className="neopop-card p-3 sm:p-4 border-2 border-black bg-[#171717] rounded-[4px] shadow-[4px_4px_0px_#000000] space-y-3.5">
        
        {/* Top Header & Timeframe Horizon Row */}
        <div className="flex flex-wrap items-center justify-between gap-4">
          <div className="flex items-center gap-2.5">
            <span className="p-2 rounded-[3px] bg-[#111111] text-[#FEE360] border-2 border-black shadow-[2px_2px_0px_#000000]">
              <Flame className="w-5 h-5 text-[#FEE360]" />
            </span>
            <div>
              <div className="flex items-center gap-2 flex-wrap">
                <h2 className="neopop-heading font-black text-lg sm:text-xl text-white tracking-tight">
                  NSE Capital Market Top Movers
                </h2>
                <span className="neopop-tag bg-[#FEE360] text-black text-[10px] font-black uppercase">
                  {activeTimeframeLabel}
                </span>
              </div>
              <p className="neopop-body text-xs text-zinc-400 mt-0.5">
                Multi-timeframe momentum leaders and lagging securities across all 501 Capital Market equities.
              </p>
            </div>
          </div>

          {/* Timeframe Horizon Switcher (1D, 1W, 1M, 3M, 6M, 1Y) */}
          <div className="flex items-center gap-1 bg-[#101010] p-1 rounded border-2 border-black shadow-[2px_2px_0px_#000]">
            <span className="text-[10px] font-mono font-bold text-zinc-400 px-2 hidden sm:flex items-center gap-1 border-r border-zinc-800">
              <Clock className="w-3 h-3 text-[#FEE360]" /> Horizon:
            </span>
            {TIMEFRAME_OPTIONS.map((tf) => {
              const isActive = timeframe === tf.id;
              return (
                <button
                  key={tf.id}
                  onClick={() => setTimeframe(tf.id)}
                  title={`${tf.label} (${tf.sublabel})`}
                  className={`px-2.5 py-1 text-xs font-mono font-black rounded transition-all cursor-pointer ${
                    isActive
                      ? 'bg-[#FEE360] text-black border border-black shadow-[1px_1px_0px_#000]'
                      : 'text-zinc-400 hover:text-white hover:bg-[#1C1C1C]'
                  }`}
                >
                  {tf.id}
                </button>
              );
            })}
          </div>
        </div>

        {/* Secondary Row: Sector & Limit Controls */}
        <div className="flex flex-wrap items-center justify-between gap-3 pt-2 border-t border-zinc-800/80">
          <div className="flex flex-wrap items-center gap-3">
            {/* Sector filter */}
            <div className="flex items-center gap-1.5">
              <Filter className="w-3.5 h-3.5 text-zinc-400" />
              <select
                value={selectedSector}
                onChange={(e) => setSelectedSector(e.target.value)}
                className="neopop-input text-xs font-bold text-white px-2.5 py-1 cursor-pointer bg-[#141414]"
              >
                <option value="ALL">All 18 Sectors ({constituents.length})</option>
                {sectors.map(sec => (
                  <option key={sec} value={sec} className="bg-[#141414]">
                    {sec} ({constituents.filter(c => c.sector === sec).length})
                  </option>
                ))}
              </select>
            </div>

            {/* Limit selector */}
            <div className="flex items-center gap-1">
              <span className="text-[10px] font-mono text-zinc-400 mr-1 hidden xs:inline">Count:</span>
              {[10, 25, 50].map((num) => (
                <button
                  key={num}
                  onClick={() => setLimit(num)}
                  className={`neopop-btn text-xs px-2.5 py-1 ${
                    limit === num
                      ? 'neopop-btn-primary'
                      : 'neopop-btn-dark'
                  }`}
                >
                  Top {num}
                </button>
              ))}
            </div>
          </div>

          <div className="text-[11px] font-mono text-zinc-400 flex items-center gap-2">
            <span>Filtered Pool: <b className="text-[#FEE360]">{filteredConstituents.length}</b> stocks</span>
            {(activePreset !== 'ALL' || selectedSector !== 'ALL' || selectedCap !== 'ALL') && (
              <button
                onClick={() => { setActivePreset('ALL'); setSelectedSector('ALL'); setSelectedCap('ALL'); }}
                className="neopop-tag bg-[#222222] hover:bg-[#2A2A2A] text-zinc-300 text-[10px] py-0.5 px-1.5 border border-zinc-700 flex items-center gap-1 cursor-pointer"
                title="Reset all filters"
              >
                <RotateCcw className="w-2.5 h-2.5 text-[#FEE360]" /> Reset
              </button>
            )}
          </div>
        </div>

        {/* Market Cap Filter Row */}
        <div className="pt-2.5 border-t border-zinc-800 flex flex-wrap items-center justify-between gap-2">
          <MarketCapFilter
            selectedCap={selectedCap}
            onSelectCap={setSelectedCap}
            counts={mktCapCounts}
          />
        </div>

        {/* Strategy & Technical Presets Row */}
        <div className="pt-2.5 border-t border-zinc-800/80 flex flex-wrap items-center gap-2">
          <span className="text-[10px] font-mono font-bold uppercase text-zinc-400 flex items-center gap-1 mr-1">
            <Sparkles className="w-3 h-3 text-[#FEE360]" /> Presets:
          </span>
          {STRATEGY_PRESETS.map((preset) => {
            const isActive = activePreset === preset.id;
            return (
              <button
                key={preset.id}
                onClick={() => setActivePreset(activePreset === preset.id ? 'ALL' : preset.id)}
                title={preset.desc}
                className={`neopop-tag text-[10px] py-1 px-2.5 font-black transition-all cursor-pointer border ${
                  isActive
                    ? 'bg-[#FEE360] text-black border-black shadow-[2px_2px_0px_#000]'
                    : 'bg-[#181818] text-zinc-300 border-[#2A2A2A] hover:border-zinc-500 hover:text-white hover:bg-[#202020]'
                }`}
              >
                {preset.label}
              </button>
            );
          })}
        </div>
      </div>

      {/* Gainers & Losers Tables Grid */}
      <div className="grid grid-cols-1 lg:grid-cols-2 gap-4 sm:gap-6">
        
        {/* Gainers / Advancing Table */}
        <div className="neopop-card overflow-hidden">
          <div className="bg-[#1A1A1A] px-5 py-4 border-b-2 border-black flex items-center justify-between">
            <h3 className="font-black text-white text-sm flex items-center gap-2.5 uppercase">
              <span className="w-2.5 h-2.5 bg-[#00E887] border border-black shadow-[1px_1px_0px_#000]"></span>
              <span>Top {limit} Advancing Stocks ({activeTimeframeLabel})</span>
            </h3>
            <span className="neopop-tag bg-[#00E887] text-black font-black">
              Leading Momentum
            </span>
          </div>
          <div className="overflow-x-auto" style={{ maxHeight: '680px' }}>
            <table className="w-full text-xs text-left border-collapse">
              <thead>
                <tr className="bg-[#141414] text-zinc-400 text-[10px] sm:text-[11px] uppercase tracking-wider sticky top-0 z-10 border-b-2 border-black select-none font-mono font-bold">
                  <th className="py-3 px-3 w-10 text-center">#</th>
                  <th className="py-3 px-3">Symbol &amp; Company</th>
                  <th className="py-3 px-3 text-right">LTP (₹)</th>
                  <th className="py-3 px-3 text-right whitespace-nowrap">% {timeframe} Return</th>
                  <th className="py-3 px-3 text-right hidden sm:table-cell">Volume</th>
                </tr>
              </thead>
              <tbody className="divide-y divide-[#222222] font-medium">
                {fullGainers.length === 0 ? (
                  <tr>
                    <td colSpan={5} className="py-8 text-center text-zinc-400 font-mono text-xs">
                      No stocks matched current preset &amp; filter criteria.
                    </td>
                  </tr>
                ) : (
                  fullGainers.map((s, idx) => {
                    const mcap = getMarketCap(s);
                    const tickDir = recentTicks[s.symbol];
                    const tickBg = tickDir === 'up' ? 'bg-[#00E887]/20 border-l-2 border-l-[#00E887]' : tickDir === 'down' ? 'bg-[#FF5959]/20 border-l-2 border-l-[#FF5959]' : '';
                    const ret = getStockReturn(s, timeframe);

                    return (
                      <tr
                        key={s.symbol}
                        onClick={() => onSelectStock(s)}
                        className={`hover:bg-[#1E1E1E] transition-colors cursor-pointer group ${tickBg}`}
                      >
                        <td className="py-2.5 px-3 text-center font-mono font-bold text-zinc-500">
                          <span className={`inline-flex items-center justify-center w-5 h-5 rounded-[2px] text-[10px] border border-black shadow-[1px_1px_0px_#000] ${
                            idx === 0 ? 'bg-[#FEE360] text-black font-black' :
                            idx === 1 ? 'bg-zinc-300 text-black font-black' :
                            idx === 2 ? 'bg-[#00E887] text-black font-black' :
                            'text-zinc-400 bg-[#1A1A1A]'
                          }`}>
                            {idx + 1}
                          </span>
                        </td>
                        <td className="py-2.5 px-3 font-bold text-white">
                          <div className="flex items-center gap-1.5 flex-wrap">
                            <span className="group-hover:text-[#FEE360] group-hover:underline transition-colors text-xs sm:text-sm font-black flex items-center gap-1">
                              {s.symbol}
                              <ExternalLink className="w-2.5 h-2.5 text-zinc-500 group-hover:text-[#FEE360] opacity-0 group-hover:opacity-100 transition-opacity" />
                            </span>
                            <span
                              className="neopop-tag text-[8px] py-0 px-1 border border-black font-extrabold"
                              style={{
                                backgroundColor: mcap.badgeColor,
                                color: mcap.category === 'LARGE' || mcap.category === 'SMALL' ? '#000000' : '#FFFFFF'
                              }}
                              title={`${mcap.label} • ₹${mcap.mktCapCr.toLocaleString('en-IN')} Cr`}
                            >
                              {mcap.badge}
                            </span>
                            <span className="neopop-tag bg-[#1E1E1E] text-zinc-300 text-[9px] py-0 px-1 border-black hidden xs:inline">
                              {s.sector || 'EQ'}
                            </span>
                          </div>
                          <div className="text-[10px] text-zinc-400 font-normal truncate max-w-[120px] sm:max-w-[170px] mt-0.5">{s.name}</div>
                        </td>
                        <td className="py-2.5 px-3 text-right font-black font-mono text-white text-xs sm:text-sm">
                          {formatIndianCurrency(s.ltp)}
                        </td>
                        <td className="py-2.5 px-3 text-right">
                          <div className="flex flex-col items-end">
                            <span className={`neopop-tag font-black text-[11px] whitespace-nowrap ${
                              ret >= 0 ? 'bg-[#00E887] text-black' : 'bg-[#FF5959] text-white'
                            }`}>
                              {ret >= 0 ? <TrendingUp className="w-3 h-3" /> : <TrendingDown className="w-3 h-3" />}
                              {ret >= 0 ? `+${ret.toFixed(2)}%` : `${ret.toFixed(2)}%`}
                            </span>
                            {timeframe !== '1D' && (
                              <span className={`text-[9px] font-mono mt-0.5 ${s.change_perc >= 0 ? 'text-[#00E887]' : 'text-[#FF5959]'}`}>
                                Today: {s.change_perc >= 0 ? '+' : ''}{s.change_perc?.toFixed(2)}%
                              </span>
                            )}
                          </div>
                        </td>
                        <td className="py-2.5 px-3 text-right text-zinc-300 font-mono hidden sm:table-cell">
                          {typeof s.volume === 'number' ? s.volume.toLocaleString('en-IN') : s.volume}
                        </td>
                      </tr>
                    );
                  })
                )}
              </tbody>
            </table>
          </div>
        </div>

        {/* Losers / Declining Table */}
        <div className="neopop-card overflow-hidden">
          <div className="bg-[#1A1A1A] px-5 py-4 border-b-2 border-black flex items-center justify-between">
            <h3 className="font-black text-white text-sm flex items-center gap-2.5 uppercase">
              <span className="w-2.5 h-2.5 bg-[#FF5959] border border-black shadow-[1px_1px_0px_#000]"></span>
              <span>Top {limit} Declining Stocks ({activeTimeframeLabel})</span>
            </h3>
            <span className="neopop-tag bg-[#FF5959] text-white font-black">
              Lagging Market
            </span>
          </div>
          <div className="overflow-x-auto" style={{ maxHeight: '680px' }}>
            <table className="w-full text-xs text-left border-collapse">
              <thead>
                <tr className="bg-[#141414] text-zinc-400 text-[10px] sm:text-[11px] uppercase tracking-wider sticky top-0 z-10 border-b-2 border-black select-none font-mono font-bold">
                  <th className="py-3 px-3 w-10 text-center">#</th>
                  <th className="py-3 px-3">Symbol &amp; Company</th>
                  <th className="py-3 px-3 text-right">LTP (₹)</th>
                  <th className="py-3 px-3 text-right whitespace-nowrap">% {timeframe} Return</th>
                  <th className="py-3 px-3 text-right hidden sm:table-cell">Volume</th>
                </tr>
              </thead>
              <tbody className="divide-y divide-[#222222] font-medium">
                {fullLosers.length === 0 ? (
                  <tr>
                    <td colSpan={5} className="py-8 text-center text-zinc-400 font-mono text-xs">
                      No stocks matched current preset &amp; filter criteria.
                    </td>
                  </tr>
                ) : (
                  fullLosers.map((s, idx) => {
                    const mcap = getMarketCap(s);
                    const tickDir = recentTicks[s.symbol];
                    const tickBg = tickDir === 'up' ? 'bg-[#00E887]/20 border-l-2 border-l-[#00E887]' : tickDir === 'down' ? 'bg-[#FF5959]/20 border-l-2 border-l-[#FF5959]' : '';
                    const ret = getStockReturn(s, timeframe);

                    return (
                      <tr
                        key={s.symbol}
                        onClick={() => onSelectStock(s)}
                        className={`hover:bg-[#1E1E1E] transition-colors cursor-pointer group ${tickBg}`}
                      >
                        <td className="py-2.5 px-3 text-center font-mono font-bold text-zinc-500">
                          <span className="inline-flex items-center justify-center w-5 h-5 rounded-[2px] text-[10px] bg-[#1A1A1A] text-zinc-400 border border-black shadow-[1px_1px_0px_#000]">
                            {idx + 1}
                          </span>
                        </td>
                        <td className="py-2.5 px-3 font-bold text-white">
                          <div className="flex items-center gap-1.5 flex-wrap">
                            <span className="group-hover:text-[#FEE360] group-hover:underline transition-colors text-xs sm:text-sm font-black flex items-center gap-1">
                              {s.symbol}
                              <ExternalLink className="w-2.5 h-2.5 text-zinc-500 group-hover:text-[#FEE360] opacity-0 group-hover:opacity-100 transition-opacity" />
                            </span>
                            <span
                              className="neopop-tag text-[8px] py-0 px-1 border border-black font-extrabold"
                              style={{
                                backgroundColor: mcap.badgeColor,
                                color: mcap.category === 'LARGE' || mcap.category === 'SMALL' ? '#000000' : '#FFFFFF'
                              }}
                              title={`${mcap.label} • ₹${mcap.mktCapCr.toLocaleString('en-IN')} Cr`}
                            >
                              {mcap.badge}
                            </span>
                            <span className="neopop-tag bg-[#1E1E1E] text-zinc-300 text-[9px] py-0 px-1 border-black hidden xs:inline">
                              {s.sector || 'EQ'}
                            </span>
                          </div>
                          <div className="text-[10px] text-zinc-400 font-normal truncate max-w-[120px] sm:max-w-[170px] mt-0.5">{s.name}</div>
                        </td>
                        <td className="py-2.5 px-3 text-right font-black font-mono text-white text-xs sm:text-sm">
                          {formatIndianCurrency(s.ltp)}
                        </td>
                        <td className="py-2.5 px-3 text-right">
                          <div className="flex flex-col items-end">
                            <span className={`neopop-tag font-black text-[11px] whitespace-nowrap ${
                              ret <= 0 ? 'bg-[#FF5959] text-white' : 'bg-[#00E887] text-black'
                            }`}>
                              {ret <= 0 ? <TrendingDown className="w-3 h-3" /> : <TrendingUp className="w-3 h-3" />}
                              {ret > 0 ? `+${ret.toFixed(2)}%` : `${ret.toFixed(2)}%`}
                            </span>
                            {timeframe !== '1D' && (
                              <span className={`text-[9px] font-mono mt-0.5 ${s.change_perc >= 0 ? 'text-[#00E887]' : 'text-[#FF5959]'}`}>
                                Today: {s.change_perc >= 0 ? '+' : ''}{s.change_perc?.toFixed(2)}%
                              </span>
                            )}
                          </div>
                        </td>
                        <td className="py-2.5 px-3 text-right text-zinc-300 font-mono hidden sm:table-cell">
                          {typeof s.volume === 'number' ? s.volume.toLocaleString('en-IN') : s.volume}
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
    </div>
  );
}
