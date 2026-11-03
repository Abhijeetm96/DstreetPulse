import React, { useState, useMemo } from 'react';
import { Search, TrendingUp, TrendingDown, Layers, BarChart2, ArrowUpRight, ArrowDownRight, Compass } from 'lucide-react';
import { formatIndianCurrency } from '../utils/formatters.js';

export default function IndicesTab({ indices = [], recentTicks = {} }) {
  const [filter, setFilter] = useState('');
  const [categoryFilter, setCategoryFilter] = useState('ALL'); // 'ALL' | 'BROAD' | 'SECTORAL' | 'THEMATIC'

  const categories = [
    { id: 'ALL', label: 'All 43 Indices' },
    { id: 'BROAD', label: 'Broad Market' },
    { id: 'SECTORAL', label: 'Sectoral' },
    { id: 'THEMATIC', label: 'Thematic & Strategy' }
  ];

  const filteredList = useMemo(() => {
    let list = indices;

    if (categoryFilter !== 'ALL') {
      list = list.filter(idx => {
        const cat = (idx.category || 'BROAD').toUpperCase();
        if (categoryFilter === 'THEMATIC') return cat === 'THEMATIC' || cat === 'STRATEGY';
        return cat === categoryFilter;
      });
    }

    const q = filter.trim().toLowerCase();
    if (q) {
      list = list.filter(idx =>
        idx.name.toLowerCase().includes(q) ||
        (idx.category && idx.category.toLowerCase().includes(q))
      );
    }

    return list;
  }, [indices, categoryFilter, filter]);

  // Top gainer and loser index
  const topGainerIndex = useMemo(() => {
    if (indices.length === 0) return null;
    return [...indices].sort((a, b) => (b.change_perc || 0) - (a.change_perc || 0))[0];
  }, [indices]);

  const topLoserIndex = useMemo(() => {
    if (indices.length === 0) return null;
    return [...indices].sort((a, b) => (a.change_perc || 0) - (b.change_perc || 0))[0];
  }, [indices]);

  const avgIndexChange = useMemo(() => {
    if (indices.length === 0) return '0.00';
    return (indices.reduce((acc, i) => acc + (i.change_perc || 0), 0) / indices.length).toFixed(2);
  }, [indices]);

  return (
    <div className="space-y-4 sm:space-y-6">
      {/* 3 Summary Index Pulse KPI Cards */}
      <div className="grid grid-cols-1 sm:grid-cols-3 gap-3.5 sm:gap-4.5">
        <div className="rounded-2xl border border-white/[0.08] bg-slate-900/60 p-4 sm:p-5 backdrop-blur-xl shadow-xl flex items-center justify-between">
          <div>
            <span className="text-[10px] sm:text-[11px] font-black uppercase tracking-wider text-slate-400">Total Tracked Indices</span>
            <div className="text-2xl sm:text-3xl font-black text-white font-mono mt-1">43 Benchmark Indices</div>
            <div className="text-xs text-cyan-400 font-semibold mt-1">Real-time NSE Index Feeds</div>
          </div>
          <span className="p-2.5 rounded-xl bg-cyan-500/10 text-cyan-400 border border-cyan-500/20">
            <Compass className="w-5 h-5" />
          </span>
        </div>

        <div className="rounded-2xl border border-white/[0.08] bg-slate-900/60 p-4 sm:p-5 backdrop-blur-xl shadow-xl flex items-center justify-between">
          <div>
            <span className="text-[10px] sm:text-[11px] font-black uppercase tracking-wider text-slate-400">Top Performing Index</span>
            <div className="text-base sm:text-lg font-black text-white tracking-tight mt-1 truncate max-w-[190px]">
              {topGainerIndex?.name || 'NIFTY IT'}
            </div>
            <div className="text-xs font-mono font-bold text-emerald-400 mt-1 flex items-center gap-1">
              <span>▲ +{topGainerIndex?.change_perc?.toFixed(2) || '2.45'}%</span>
              <span className="text-slate-400 text-[10px]">({topGainerIndex?.ltp ? '₹' + topGainerIndex.ltp.toLocaleString('en-IN') : ''})</span>
            </div>
          </div>
          <span className="p-2.5 rounded-xl bg-emerald-500/10 text-emerald-400 border border-emerald-500/20">
            <ArrowUpRight className="w-5 h-5" />
          </span>
        </div>

        <div className="rounded-2xl border border-white/[0.08] bg-slate-900/60 p-4 sm:p-5 backdrop-blur-xl shadow-xl flex items-center justify-between">
          <div>
            <span className="text-[10px] sm:text-[11px] font-black uppercase tracking-wider text-slate-400">Index Market Pulse</span>
            <div className="text-2xl sm:text-3xl font-black text-white font-mono mt-1">
              {Number(avgIndexChange) >= 0 ? '+' : ''}{avgIndexChange}%
            </div>
            <div className="text-xs text-slate-400 font-semibold mt-1">Average Sectoral Return Today</div>
          </div>
          <span className="p-2.5 rounded-xl bg-purple-500/10 text-purple-400 border border-purple-500/20">
            <BarChart2 className="w-5 h-5" />
          </span>
        </div>
      </div>

      {/* Control Filter Bar */}
      <div className="neopop-card p-4 sm:p-5 flex flex-wrap items-center justify-between gap-4">
        {/* Category Pills */}
        <div className="flex flex-wrap items-center gap-1.5">
          {categories.map((cat) => (
            <button
              key={cat.id}
              onClick={() => setCategoryFilter(cat.id)}
              className={`neopop-btn text-xs px-3 py-1.5 ${
                categoryFilter === cat.id
                  ? 'neopop-btn-primary'
                  : 'neopop-btn-dark'
              }`}
            >
              {cat.label}
            </button>
          ))}
        </div>

        {/* Search */}
        <div className="relative w-full sm:w-72">
          <Search className="w-3.5 h-3.5 text-zinc-400 absolute left-3 top-1/2 -translate-y-1/2 pointer-events-none" />
          <input
            type="text"
            value={filter}
            onChange={(e) => setFilter(e.target.value)}
            placeholder="Search index (e.g. BANK, IT, AUTO)..."
            className="neopop-input pl-9 pr-3 py-1.5 text-xs font-mono w-full"
          />
        </div>
      </div>

      {/* Indices Table */}
      <div className="neopop-card overflow-hidden">
        <div className="overflow-x-auto">
          <table className="w-full text-xs text-left border-collapse">
            <thead>
              <tr className="bg-[#141414] text-zinc-400 text-[10px] sm:text-[11px] uppercase tracking-wider border-b-2 border-black select-none font-mono font-bold">
                <th className="py-3 px-3 sm:px-4">Index Name</th>
                <th className="py-3 px-2 sm:px-4 hidden sm:table-cell">Category</th>
                <th className="py-3 px-3 sm:px-4 text-right">LTP (₹)</th>
                <th className="py-3 px-3 sm:px-4 text-right">% Change</th>
                <th className="py-3 px-3 sm:px-4 text-center hidden md:table-cell w-44">Day's Range (Low — High)</th>
                <th className="py-3 px-2 sm:px-4 text-right hidden lg:table-cell">Turnover</th>
              </tr>
            </thead>
            <tbody className="divide-y divide-[#222222] font-medium">
              {filteredList.map((idx) => {
                const chg = idx.change_perc || 0;
                const isUp = chg >= 0;
                const tickDir = recentTicks[idx.name];
                const rowFlash = tickDir === 'up'
                  ? 'bg-[#00E887]/15'
                  : tickDir === 'down'
                  ? 'bg-[#FF5959]/15'
                  : '';

                // Day's range position
                const high = idx.high || idx.ltp || 1;
                const low = idx.low || idx.ltp || 0;
                const ltp = idx.ltp || low;
                const rangeSpan = Math.max(0.1, high - low);
                const posPct = Math.min(100, Math.max(0, ((ltp - low) / rangeSpan) * 100));

                return (
                  <tr key={idx.name} className={`hover:bg-[#1E1E1E] transition-colors ${rowFlash}`}>
                    <td className="py-3 px-3 sm:px-4 font-bold text-white tracking-tight flex items-center gap-2">
                      <span className={`w-2.5 h-2.5 shrink-0 border border-black shadow-[1px_1px_0px_#000] ${
                        isUp ? 'bg-[#00E887]' : 'bg-[#FF5959]'
                      }`}></span>
                      <span className="truncate text-xs sm:text-sm font-black">{idx.name}</span>
                    </td>
                    <td className="py-3 px-2 sm:px-4 hidden sm:table-cell">
                      <span className="neopop-tag bg-[#1E1E1E] text-zinc-300">
                        {idx.category || 'BROAD'}
                      </span>
                    </td>
                    <td className="py-3 px-3 sm:px-4 text-right font-black font-mono text-xs sm:text-sm text-white">
                      ₹{(idx.ltp || 0).toLocaleString('en-IN', { minimumFractionDigits: 2 })}
                    </td>
                    <td className="py-3 px-3 sm:px-4 text-right">
                      <span className={`neopop-tag text-[11px] font-black ${
                        isUp
                          ? 'bg-[#00E887] text-black'
                          : 'bg-[#FF5959] text-white'
                      }`}>
                        {isUp ? <TrendingUp className="w-3 h-3" /> : <TrendingDown className="w-3 h-3" />}
                        {isUp ? '+' : ''}{chg.toFixed(2)}%
                      </span>
                    </td>
                    <td className="py-3 px-3 sm:px-4 text-center hidden md:table-cell">
                      <div className="flex justify-between text-[9px] text-zinc-500 font-mono mb-1">
                        <span>L: {idx.low ? '₹' + idx.low.toLocaleString('en-IN') : '—'}</span>
                        <span>H: {idx.high ? '₹' + idx.high.toLocaleString('en-IN') : '—'}</span>
                      </div>
                      <div className="w-full bg-[#222222] h-1.5 border border-black overflow-hidden flex relative">
                        <div
                          className="bg-[#00E887] h-full"
                          style={{ width: `${posPct}%` }}
                        ></div>
                      </div>
                    </td>
                    <td className="py-3 px-2 sm:px-4 text-right font-mono font-bold text-slate-300 hidden lg:table-cell">
                      {idx.turnover_formatted || (idx.turnover_cr ? '₹' + idx.turnover_cr.toLocaleString('en-IN') + ' Cr' : '—')}
                    </td>
                  </tr>
                );
              })}
            </tbody>
          </table>
        </div>
      </div>
    </div>
  );
}
