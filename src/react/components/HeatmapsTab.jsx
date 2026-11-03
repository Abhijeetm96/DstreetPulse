import React, { useState, useMemo, useCallback } from 'react';
import { Search, Layers, Grid3X3, BarChart3, TrendingUp, TrendingDown, LayoutGrid, Maximize2 } from 'lucide-react';
import { formatIndianCurrency, formatVolume, getHeatmapColorClass } from '../utils/formatters.js';

export default function HeatmapsTab({ constituents = [], indices = [], onSelectStock, initialSector = 'ALL', recentTicks = {} }) {
  const [subView, setSubView] = useState('sectors'); // 'sectors' | 'treemap' | 'indices'
  const [selectedSector, setSelectedSector] = useState(initialSector);
  const [sortBy, setSortBy] = useState('change_desc'); // 'change_desc' | 'change_asc' | 'volume_desc' | 'symbol_asc'
  const [searchQuery, setSearchQuery] = useState('');
  const [isDense, setIsDense] = useState(false);

  // Extract all unique sectors sorted alphabetically
  const sectors = useMemo(() => {
    return [...new Set(constituents.map(c => c.sector).filter(Boolean))].sort();
  }, [constituents]);

  // Helper sorting function
  const sortList = useCallback((list) => {
    const arr = [...list];
    if (sortBy === 'change_desc') arr.sort((a,b) => (b.change_perc || 0) - (a.change_perc || 0));
    else if (sortBy === 'change_asc') arr.sort((a,b) => (a.change_perc || 0) - (b.change_perc || 0));
    else if (sortBy === 'volume_desc') arr.sort((a,b) => (b.volume || 0) - (a.volume || 0));
    else if (sortBy === 'symbol_asc') arr.sort((a,b) => a.symbol.localeCompare(b.symbol));
    return arr;
  }, [sortBy]);

  // Filtered & sorted constituents for Treemap
  const treemapList = useMemo(() => {
    let list = constituents;
    if (selectedSector !== 'ALL') {
      list = list.filter(c => c.sector === selectedSector);
    }
    const q = searchQuery.trim().toLowerCase();
    if (q) {
      list = list.filter(c => c.symbol.toLowerCase().includes(q) || (c.name && c.name.toLowerCase().includes(q)));
    }
    return sortList(list);
  }, [constituents, selectedSector, searchQuery, sortList]);

  // Sectors to display in Sectors view
  const activeSectors = useMemo(() => {
    if (selectedSector !== 'ALL') {
      return sectors.filter(s => s === selectedSector);
    }
    return sectors;
  }, [sectors, selectedSector]);

  // Categorized Indices
  const categorizedIndices = useMemo(() => {
    const q = searchQuery.trim().toLowerCase();
    let list = indices;
    if (q) {
      list = list.filter(idx => idx.name.toLowerCase().includes(q) || (idx.category && idx.category.toLowerCase().includes(q)));
    }
    return {
      broad: list.filter(idx => !idx.category || idx.category === 'BROAD'),
      sectoral: list.filter(idx => idx.category === 'SECTORAL'),
      thematic: list.filter(idx => idx.category === 'THEMATIC' || idx.category === 'STRATEGY')
    };
  }, [indices, searchQuery]);

  return (
    <div className="space-y-6">
      {/* Control Toolbar */}
      <div className="neopop-card p-5 border-2 border-black bg-[#171717] rounded-[4px] shadow-[4px_4px_0px_#000000]">
        <div className="flex flex-wrap items-center justify-between gap-4">
          <div>
            <div className="flex items-center gap-2.5">
              <span className="w-2.5 h-2.5 bg-[#FEE360] border border-black shadow-[1px_1px_0px_#000]"></span>
              <h2 className="neopop-heading font-black text-xl text-white tracking-tight">NSE Sector &amp; Index Heatmaps</h2>
              <span className="neopop-tag bg-[#1E1E1E] text-[#FEE360]">
                18 Sectors &bull; 43 Indices &bull; 501 Equities
              </span>
            </div>
            <p className="neopop-body text-xs text-zinc-400 mt-1">
              Live market visualization of all 501 Capital Market constituents grouped by sector and weighted by traded volume.
            </p>
          </div>

          {/* Sub-view Switcher & Density Toggle */}
          <div className="flex flex-wrap items-center gap-2">
            <div className="flex items-center gap-1.5">
              <button
                onClick={() => setSubView('sectors')}
                className={`neopop-btn text-xs px-3 py-1.5 flex items-center gap-1.5 ${
                  subView === 'sectors'
                    ? 'neopop-btn-primary'
                    : 'neopop-btn-dark'
                }`}
              >
                <Layers className="w-3.5 h-3.5" />
                <span>18 Sectors</span>
              </button>
              <button
                onClick={() => setSubView('treemap')}
                className={`neopop-btn text-xs px-3 py-1.5 flex items-center gap-1.5 ${
                  subView === 'treemap'
                    ? 'neopop-btn-primary'
                    : 'neopop-btn-dark'
                }`}
              >
                <Grid3X3 className="w-3.5 h-3.5" />
                <span>Full Treemap (501)</span>
              </button>
              <button
                onClick={() => setSubView('indices')}
                className={`neopop-btn text-xs px-3 py-1.5 flex items-center gap-1.5 ${
                  subView === 'indices'
                    ? 'neopop-btn-primary'
                    : 'neopop-btn-dark'
                }`}
              >
                <BarChart3 className="w-3.5 h-3.5" />
                <span>Indices Matrix (43)</span>
              </button>
            </div>

            {/* Density Toggle */}
            <button
              onClick={() => setIsDense(!isDense)}
              className={`neopop-btn p-2 ${
                isDense
                  ? 'neopop-btn-primary'
                  : 'neopop-btn-dark'
              }`}
              title={isDense ? "Switch to Standard View" : "Switch to Ultra-Dense Micro Cells"}
            >
              {isDense ? <Maximize2 className="w-4 h-4" /> : <LayoutGrid className="w-4 h-4" />}
            </button>
          </div>
        </div>

        {/* Filters & Color Scale Legend */}
        <div className="mt-4 pt-4 border-t-2 border-black flex flex-wrap items-center justify-between gap-4">
          <div className="flex flex-wrap items-center gap-3">
            {/* Sector Dropdown */}
            <div className="flex items-center gap-2">
              <label className="text-xs font-bold uppercase text-zinc-400 font-mono">Sector:</label>
              <select
                value={selectedSector}
                onChange={(e) => setSelectedSector(e.target.value)}
                className="neopop-input px-3 py-1.5 text-xs font-bold text-white cursor-pointer"
              >
                <option value="ALL">All 18 Sectors ({constituents.length})</option>
                {sectors.map(s => {
                  const count = constituents.filter(c => c.sector === s).length;
                  return (
                    <option key={s} value={s}>
                      {s} ({count})
                    </option>
                  );
                })}
              </select>
            </div>

            {/* Sort Dropdown */}
            <div className="flex items-center gap-2">
              <label className="text-xs font-bold text-zinc-400 font-mono">Sort By:</label>
              <select
                value={sortBy}
                onChange={(e) => setSortBy(e.target.value)}
                className="neopop-input px-3 py-1.5 text-xs font-bold text-white cursor-pointer"
              >
                <option value="change_desc">% Change (High → Low)</option>
                <option value="change_asc">% Change (Low → High)</option>
                <option value="volume_desc">Traded Volume</option>
                <option value="symbol_asc">Symbol Name (A → Z)</option>
              </select>
            </div>

            {/* Filter Input */}
            <div className="relative">
              <Search className="w-3.5 h-3.5 text-zinc-400 absolute left-2.5 top-1/2 -translate-y-1/2 pointer-events-none" />
              <input
                type="text"
                value={searchQuery}
                onChange={(e) => setSearchQuery(e.target.value)}
                placeholder="Filter symbol/index..."
                className="neopop-input pl-8 pr-3 py-1.5 text-xs font-mono font-medium text-white placeholder-zinc-500 w-48"
              />
            </div>
          </div>

          {/* Modern Neon Color Scale Legend */}
          <div className="flex items-center gap-1.5 text-[10px] font-bold select-none">
            <span className="mr-1 text-zinc-400 font-mono font-semibold">Scale:</span>
            <span className="px-1.5 py-0.5 rounded-[2px] border border-black shadow-[1px_1px_0px_#000] text-white hm-dark-red font-mono">&lt; -3%</span>
            <span className="px-1.5 py-0.5 rounded-[2px] border border-black shadow-[1px_1px_0px_#000] text-white hm-mid-red font-mono">-1.5% to -3%</span>
            <span className="px-1.5 py-0.5 rounded-[2px] border border-black shadow-[1px_1px_0px_#000] text-white hm-pale-red font-mono">0 to -1.5%</span>
            <span className="px-1.5 py-0.5 rounded-[2px] border border-black shadow-[1px_1px_0px_#000] text-emerald-300 hm-pale-green font-mono">0 to +1.5%</span>
            <span className="px-1.5 py-0.5 rounded-[2px] border border-black shadow-[1px_1px_0px_#000] text-white hm-mid-green font-mono">+1.5% to +3%</span>
            <span className="px-1.5 py-0.5 rounded-[2px] border border-black shadow-[1px_1px_0px_#000] text-white hm-dark-green font-mono">&gt; +3%</span>
          </div>
        </div>
      </div>

      {/* SUB-VIEW 1: All 18 Sectors Group Cards */}
      {subView === 'sectors' && (
        <div className="space-y-6">
          {activeSectors.map((secName) => {
            let stocks = constituents.filter(c => c.sector === secName);
            const q = searchQuery.trim().toLowerCase();
            if (q) {
              stocks = stocks.filter(c => c.symbol.toLowerCase().includes(q) || (c.name && c.name.toLowerCase().includes(q)));
            }
            if (stocks.length === 0) return null;

            stocks = sortList(stocks);
            const totalSec = stocks.length;
            const avgChange = stocks.reduce((acc, c) => acc + (c.change_perc || 0), 0) / (totalSec || 1);
            const advances = stocks.filter(c => (c.change_perc || 0) > 0).length;
            const declines = stocks.filter(c => (c.change_perc || 0) < 0).length;
            const unchanged = totalSec - advances - declines;
            const advPct = totalSec > 0 ? (advances / totalSec) * 100 : 0;
            const isUp = avgChange >= 0;

            return (
              <div key={secName} className="neopop-card p-5 border-2 border-black bg-[#171717] rounded-[4px] shadow-[4px_4px_0px_#000000]">
                {/* Sector Header */}
                <div className="flex flex-wrap items-center justify-between gap-3 mb-4 pb-3 border-b-2 border-black">
                  <div className="flex items-center gap-3">
                    <h3 className="neopop-heading font-black text-white text-base tracking-tight">{secName.toUpperCase()}</h3>
                    <span className="neopop-tag bg-[#1E1E1E] text-zinc-300">
                      {totalSec} stocks
                    </span>
                    <span className={`neopop-tag font-black flex items-center gap-1 ${
                      isUp
                        ? 'bg-[#00E887] text-black'
                        : 'bg-[#FF5959] text-white'
                    }`}>
                      {isUp ? <TrendingUp className="w-3 h-3" /> : <TrendingDown className="w-3 h-3" />}
                      Avg {isUp ? '+' : ''}{avgChange.toFixed(2)}%
                    </span>
                  </div>

                  {/* Mini Breadth Bar */}
                  <div className="flex items-center gap-3 text-xs font-mono">
                    <span className="font-bold text-[#00E887]">▲ {advances}</span>
                    <span className="text-zinc-600 font-bold">|</span>
                    <span className="font-bold text-[#FF5959]">▼ {declines}</span>
                    {unchanged > 0 && (
                      <>
                        <span className="text-zinc-600 font-bold">|</span>
                        <span className="text-zinc-400 font-medium">Unch: {unchanged}</span>
                      </>
                    )}
                    <div className="w-28 bg-[#111111] h-2.5 border border-black overflow-hidden flex ml-1">
                      <div className="bg-[#00E887] h-full" style={{ width: `${advPct}%` }}></div>
                      <div className="bg-[#FF5959] h-full" style={{ width: `${100 - advPct}%` }}></div>
                    </div>
                  </div>
                </div>

                {/* Constituent Cells */}
                <div className={`grid ${
                  isDense
                    ? 'grid-cols-3 sm:grid-cols-4 md:grid-cols-6 lg:grid-cols-8 xl:grid-cols-12 gap-1.5'
                    : 'grid-cols-2 sm:grid-cols-3 md:grid-cols-4 lg:grid-cols-6 xl:grid-cols-8 gap-2.5'
                }`}>
                  {stocks.map((s) => (
                    <StockCell
                      key={s.symbol}
                      stock={s}
                      onSelectStock={onSelectStock}
                      tickDir={recentTicks[s.symbol]}
                      isDense={isDense}
                    />
                  ))}
                </div>
              </div>
            );
          })}
        </div>
      )}

      {/* SUB-VIEW 2: Market Treemap (501 Constituents Grid) */}
      {subView === 'treemap' && (
        <div className="neopop-card p-5 border-2 border-black bg-[#171717] rounded-[4px] shadow-[4px_4px_0px_#000000]">
          <div className="flex items-center justify-between mb-4 pb-3 border-b-2 border-black">
            <div>
              <h3 className="neopop-heading font-black text-white text-base">Full NIFTY 500 Market Treemap</h3>
              <p className="neopop-body text-xs text-zinc-400">
                All 501 constituents in one continuous high-density visual board. Click any cell to inspect full OHLC and volume.
              </p>
            </div>
            <div className="neopop-tag bg-[#1E1E1E] text-[#FEE360]">
              {treemapList.length} Stocks Displayed
            </div>
          </div>

          <div className={`grid ${
            isDense
              ? 'grid-cols-3 sm:grid-cols-6 md:grid-cols-8 lg:grid-cols-12 xl:grid-cols-14 gap-1'
              : 'grid-cols-2 sm:grid-cols-4 md:grid-cols-6 lg:grid-cols-8 xl:grid-cols-10 gap-2'
          }`}>
            {treemapList.map((s) => (
              <StockCell
                key={s.symbol}
                stock={s}
                onSelectStock={onSelectStock}
                tickDir={recentTicks[s.symbol]}
                isDense={isDense}
              />
            ))}
          </div>
        </div>
      )}

      {/* SUB-VIEW 3: Indices Matrix (43 Indices) */}
      {subView === 'indices' && (
        <div className="space-y-6">
          {/* Broad Market */}
          <div className="neopop-card p-5 border-2 border-black bg-[#171717] rounded-[4px] shadow-[4px_4px_0px_#000000]">
            <div className="flex items-center justify-between mb-4 border-b-2 border-black pb-3">
              <div>
                <h3 className="neopop-heading font-black text-white text-sm flex items-center gap-2">
                  <span className="w-2.5 h-2.5 bg-[#FEE360] border border-black shadow-[1px_1px_0px_#000]"></span> Broad Market Benchmark Indices
                </h3>
                <p className="neopop-body text-xs text-zinc-400">NIFTY 50, NIFTY NEXT 50, MIDCAP, SMALLCAP, and Broad Market benchmarks.</p>
              </div>
              <span className="neopop-tag bg-[#1E1E1E] text-zinc-300">
                {categorizedIndices.broad.length} Indices
              </span>
            </div>
            <div className="grid grid-cols-1 sm:grid-cols-2 md:grid-cols-3 lg:grid-cols-4 xl:grid-cols-5 gap-3">
              {categorizedIndices.broad.map((idx) => (
                <IndexMatrixCard key={idx.name} idx={idx} recentTicks={recentTicks} />
              ))}
            </div>
          </div>

          {/* Sectoral */}
          <div className="neopop-card p-5 border-2 border-black bg-[#171717] rounded-[4px] shadow-[4px_4px_0px_#000000]">
            <div className="flex items-center justify-between mb-4 border-b-2 border-black pb-3">
              <div>
                <h3 className="neopop-heading font-black text-white text-sm flex items-center gap-2">
                  <span className="w-2.5 h-2.5 bg-[#00E887] border border-black shadow-[1px_1px_0px_#000]"></span> Sectoral Indices
                </h3>
                <p className="neopop-body text-xs text-zinc-400">Official sector benchmarks covering Banking, IT, Auto, Pharma, FMCG, Metal, and Energy.</p>
              </div>
              <span className="neopop-tag bg-[#1E1E1E] text-zinc-300">
                {categorizedIndices.sectoral.length} Indices
              </span>
            </div>
            <div className="grid grid-cols-1 sm:grid-cols-2 md:grid-cols-3 lg:grid-cols-4 xl:grid-cols-5 gap-3">
              {categorizedIndices.sectoral.map((idx) => (
                <IndexMatrixCard key={idx.name} idx={idx} recentTicks={recentTicks} />
              ))}
            </div>
          </div>

          {/* Thematic & Strategy */}
          <div className="neopop-card p-5 border-2 border-black bg-[#171717] rounded-[4px] shadow-[4px_4px_0px_#000000]">
            <div className="flex items-center justify-between mb-4 border-b-2 border-black pb-3">
              <div>
                <h3 className="neopop-heading font-black text-white text-sm flex items-center gap-2">
                  <span className="w-2.5 h-2.5 bg-[#3657FF] border border-black shadow-[1px_1px_0px_#000]"></span> Thematic &amp; Strategy Indices
                </h3>
                <p className="neopop-body text-xs text-zinc-400">Commodities, PSE, CPSE, MNC, Alpha, Low Volatility, Quality, and ESG strategies.</p>
              </div>
              <span className="neopop-tag bg-[#1E1E1E] text-zinc-300">
                {categorizedIndices.thematic.length} Indices
              </span>
            </div>
            <div className="grid grid-cols-1 sm:grid-cols-2 md:grid-cols-3 lg:grid-cols-4 xl:grid-cols-5 gap-3">
              {categorizedIndices.thematic.map((idx) => (
                <IndexMatrixCard key={idx.name} idx={idx} recentTicks={recentTicks} />
              ))}
            </div>
          </div>
        </div>
      )}
    </div>
  );
}

// Memoized Stock Cell for Buttery-Smooth 60 FPS Heatmap Rendering
const StockCell = React.memo(function StockCell({ stock, onSelectStock, tickDir, isDense }) {
  const chg = stock.change_perc || 0;
  const colorCls = getHeatmapColorClass(chg);
  const tickRing = tickDir === 'up'
    ? 'border-2 border-[#00E887] translate-x-[-1px] translate-y-[-1px] shadow-[3px_3px_0px_#000000]'
    : tickDir === 'down'
    ? 'border-2 border-[#FF5959] translate-x-[-1px] translate-y-[-1px] shadow-[3px_3px_0px_#000000]'
    : 'border border-black shadow-[2px_2px_0px_#000000]';

  return (
    <div
      onClick={() => onSelectStock(stock)}
      title={`${stock.symbol} - ${stock.name}\nLTP: ₹${stock.ltp.toLocaleString('en-IN')}\nChange: ${chg >= 0 ? '+' : ''}${chg.toFixed(2)}%\nTraded Volume: ${formatVolume(stock.volume)}\nSector: ${stock.sector}\n\nClick to inspect in NSE Detail Modal`}
      className={`heatmap-cell ${colorCls} ${tickRing} rounded-[3px] ${
        isDense ? 'p-1.5 min-h-[46px]' : 'p-2.5 min-h-[58px]'
      } flex flex-col items-center justify-center cursor-pointer active:translate-x-[2px] active:translate-y-[2px] active:shadow-none transition-all duration-75 text-center select-none`}
    >
      <div className={`cell-symbol font-extrabold leading-tight tracking-tight text-white font-mono ${isDense ? 'text-[10px]' : 'text-xs'}`}>
        {stock.symbol}
      </div>
      <div className={`cell-chg font-black font-mono mt-0.5 ${isDense ? 'text-[9px]' : 'text-[11px]'}`}>
        {chg >= 0 ? '+' : ''}{chg.toFixed(2)}%
      </div>
      <div className={`cell-ltp font-mono opacity-85 mt-0.5 ${isDense ? 'text-[8px]' : 'text-[10px]'}`}>
        ₹{stock.ltp.toLocaleString('en-IN', { maximumFractionDigits: isDense ? 0 : 1 })}
      </div>
    </div>
  );
});

// Memoized Index Matrix Card
const IndexMatrixCard = React.memo(function IndexMatrixCard({ idx, recentTicks = {} }) {
  const chg = idx.change_perc || 0;
  const isUp = chg >= 0;
  const colorCls = getHeatmapColorClass(chg);
  const tickDir = recentTicks[idx.name];
  const tickRing = tickDir === 'up'
    ? 'border-2 border-[#00E887] shadow-[4px_4px_0px_#000000]'
    : tickDir === 'down'
    ? 'border-2 border-[#FF5959] shadow-[4px_4px_0px_#000000]'
    : 'border-2 border-black shadow-[3px_3px_0px_#000000]';

  return (
    <div
      className={`p-3.5 rounded-[4px] bg-[#171717] transition-all ${tickRing} hover:shadow-[5px_5px_0px_#000000] active:translate-x-[2px] active:translate-y-[2px] active:shadow-none cursor-pointer select-none`}
      title={`Index: ${idx.name}\nLTP: ₹${(idx.ltp || 0).toLocaleString('en-IN')}\nChange: ${isUp ? '+' : ''}${chg.toFixed(2)}%\nTurnover: ${idx.turnover_formatted || '—'}`}
    >
      <div className="flex items-start justify-between gap-1">
        <div className="font-bold text-white text-xs truncate font-mono" title={idx.name}>
          {idx.name}
        </div>
        <span className={`text-[10px] font-black font-mono px-2 py-0.5 rounded-[2px] border border-black shadow-[1px_1px_0px_#000] ${colorCls} text-white`}>
          {isUp ? '+' : ''}{chg.toFixed(2)}%
        </span>
      </div>
      <div className="text-base font-black text-white mt-1.5 font-mono">
        ₹{(idx.ltp || 0).toLocaleString('en-IN', { minimumFractionDigits: 2 })}
      </div>
      <div className="flex items-center justify-between text-[10px] text-zinc-400 mt-2.5 pt-2 border-t-2 border-black font-mono font-medium">
        <span>Turnover</span>
        <span className="font-mono font-bold text-zinc-300">
          {idx.turnover_formatted || (idx.turnover_cr ? '₹' + idx.turnover_cr.toLocaleString('en-IN') + ' Cr' : '—')}
        </span>
      </div>
    </div>
  );
});
