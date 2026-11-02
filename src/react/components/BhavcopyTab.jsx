import React, { useState, useMemo, useCallback } from 'react';
import { Search, Download, ChevronLeft, ChevronRight, ChevronsLeft, ChevronsRight, ExternalLink, Copy, Check, Filter } from 'lucide-react';
import { formatIndianCurrency, formatVolume } from '../utils/formatters.js';
import { getAsmStatus } from '../utils/asmRegistry.js';
import { getMarketCap, filterByMarketCap } from '../utils/mktCapRegistry.js';
import MarketCapFilter from './MarketCapFilter.jsx';

export default function BhavcopyTab({ constituents = [], onSelectStock, recentTicks = {} }) {
  const [filter, setFilter] = useState('');
  const [filterType, setFilterType] = useState('ALL'); // 'ALL' | 'NIFTY50' | 'GAINERS' | 'LOSERS'
  const [selectedCap, setSelectedCap] = useState('ALL'); // 'ALL' | 'LARGE' | 'MID' | 'SMALL' | 'MICRO' | 'PENNY'
  const [sectorFilter, setSectorFilter] = useState('ALL');
  const [sortKey, setSortKey] = useState('volume');
  const [sortAsc, setSortAsc] = useState(false);
  const [pageSize, setPageSize] = useState(50); // 50, 100, 250, 0 (all)
  const [currentPage, setCurrentPage] = useState(1);
  const [copiedSymbol, setCopiedSymbol] = useState(null);

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

  // All unique sectors
  const sectors = useMemo(() => {
    return [...new Set(constituents.map(c => c.sector).filter(Boolean))].sort();
  }, [constituents]);

  const handleSort = (key) => {
    if (sortKey === key) {
      setSortAsc(!sortAsc);
    } else {
      setSortKey(key);
      setSortAsc(key === 'symbol' || key === 'name' || key === 'sector');
    }
    setCurrentPage(1);
  };

  const copyToClipboard = (text, e) => {
    e.stopPropagation();
    navigator.clipboard?.writeText(text);
    setCopiedSymbol(text);
    setTimeout(() => setCopiedSymbol(null), 1500);
  };

  const filteredList = useMemo(() => {
    let list = constituents;

    // Filter by type
    if (filterType === 'NIFTY50') {
      list = list.filter(c => c.nifty50 || (c.weight && c.weight >= 1.0));
    } else if (filterType === 'GAINERS') {
      list = list.filter(c => (c.change_perc || 0) > 0);
    } else if (filterType === 'LOSERS') {
      list = list.filter(c => (c.change_perc || 0) < 0);
    }

    // Filter by sector
    if (sectorFilter !== 'ALL') {
      list = list.filter(c => c.sector === sectorFilter);
    }

    // Filter by market cap (Large, Mid, Small, Micro, Penny)
    if (selectedCap !== 'ALL') {
      list = filterByMarketCap(list, selectedCap);
    }

    // Text search
    const q = filter.trim().toLowerCase();
    if (q) {
      list = list.filter(c =>
        c.symbol.toLowerCase().includes(q) ||
        (c.name && c.name.toLowerCase().includes(q)) ||
        (c.sector && c.sector.toLowerCase().includes(q)) ||
        (c.isin && c.isin.toLowerCase().includes(q))
      );
    }

    const arr = [...list];
    arr.sort((a, b) => {
      const va = a[sortKey], vb = b[sortKey];
      if (typeof va === 'string') {
        return sortAsc ? va.localeCompare(vb) : vb.localeCompare(va);
      }
      return sortAsc ? (va || 0) - (vb || 0) : (vb || 0) - (va || 0);
    });
    return arr;
  }, [constituents, filter, filterType, sectorFilter, selectedCap, sortKey, sortAsc]);

  // Pagination calculation
  const totalItems = filteredList.length;
  const effectivePageSize = pageSize === 0 ? totalItems : pageSize;
  const totalPages = Math.ceil(totalItems / effectivePageSize) || 1;
  const clampedPage = Math.min(currentPage, totalPages);
  const startIndex = (clampedPage - 1) * effectivePageSize;
  const displayedList = pageSize === 0 ? filteredList : filteredList.slice(startIndex, startIndex + effectivePageSize);

  const downloadCSV = () => {
    const headers = ['Symbol', 'Security Name', 'Sector', 'Series', 'Open', 'High', 'Low', 'Close / LTP', 'Change %', 'Traded Volume', 'ISIN'];
    const rows = filteredList.map(c => [
      c.symbol,
      `"${c.name}"`,
      c.sector || 'EQ',
      'EQ',
      c.open || c.ltp,
      c.high || c.ltp,
      c.low || c.ltp,
      c.ltp,
      c.change_perc,
      c.volume,
      c.isin
    ]);
    const csvContent = 'data:text/csv;charset=utf-8,' + [headers.join(','), ...rows.map(r => r.join(','))].join('\n');
    const encodedUri = encodeURI(csvContent);
    const link = document.createElement('a');
    link.setAttribute('href', encodedUri);
    link.setAttribute('download', `NSE_Capital_Market_Bhavcopy_${new Date().toISOString().slice(0, 10)}.csv`);
    document.body.appendChild(link);
    link.click();
    document.body.removeChild(link);
  };

  return (
    <div className="space-y-4 sm:space-y-6">
      {/* Control Header & Filters */}
      <div className="neopop-card p-4 sm:p-5 border-2 border-black bg-[#171717] rounded-[4px] shadow-[4px_4px_0px_#000000] space-y-4">
        <div className="flex flex-wrap items-center justify-between gap-4">
          <div>
            <div className="flex items-center gap-2.5">
              <span className="w-2.5 h-2.5 bg-[#FEE360] border border-black shadow-[1px_1px_0px_#000]"></span>
              <h2 className="neopop-heading font-black text-lg sm:text-xl text-white tracking-tight">
                NSE Capital Market Official Bhavcopy
              </h2>
              <span className="neopop-tag bg-[#1E1E1E] text-[#FEE360]">
                {totalItems} Equities
              </span>
            </div>
            <p className="neopop-body text-xs text-zinc-400 mt-1">
              Complete daily security master, official settlement quotes, open/high/low/close figures, and ISIN identifiers.
            </p>
          </div>

          <div className="flex items-center gap-2.5">
            <button
              onClick={downloadCSV}
              className="neopop-btn neopop-btn-dark text-xs px-3.5 py-1.5"
            >
              <Download className="w-3.5 h-3.5 text-[#FEE360]" />
              <span>Export CSV</span>
            </button>
            <div className="relative w-48 sm:w-64">
              <Search className="w-3.5 h-3.5 text-zinc-400 absolute left-3 top-1/2 -translate-y-1/2 pointer-events-none" />
              <input
                type="text"
                value={filter}
                onChange={(e) => { setFilter(e.target.value); setCurrentPage(1); }}
                placeholder="Search symbol, ISIN, company..."
                className="neopop-input pl-9 pr-3 py-1.5 text-xs font-mono w-full"
              />
            </div>
          </div>
        </div>

        {/* Quick Filter Bar */}
        <div className="pt-3 border-t-2 border-black flex flex-wrap items-center justify-between gap-3 text-xs">
          <div className="flex flex-wrap items-center gap-2">
            <span className="text-zinc-400 font-bold uppercase flex items-center gap-1">
              <Filter className="w-3 h-3 text-[#FEE360]" /> Filter:
            </span>
            <button
              onClick={() => { setFilterType('ALL'); setCurrentPage(1); }}
              className={`neopop-btn text-xs px-3 py-1 ${
                filterType === 'ALL'
                  ? 'neopop-btn-primary'
                  : 'neopop-btn-dark'
              }`}
            >
              All Equities ({constituents.length})
            </button>
            <button
              onClick={() => { setFilterType('NIFTY50'); setCurrentPage(1); }}
              className={`neopop-btn text-xs px-3 py-1 ${
                filterType === 'NIFTY50'
                  ? 'neopop-btn-primary'
                  : 'neopop-btn-dark'
              }`}
            >
              NIFTY 50
            </button>
            <button
              onClick={() => { setFilterType('GAINERS'); setCurrentPage(1); }}
              className={`neopop-btn text-xs px-3 py-1 ${
                filterType === 'GAINERS'
                  ? 'neopop-btn-success'
                  : 'neopop-btn-dark'
              }`}
            >
              ▲ Advancing
            </button>
            <button
              onClick={() => { setFilterType('LOSERS'); setCurrentPage(1); }}
              className={`neopop-btn text-xs px-3 py-1 ${
                filterType === 'LOSERS'
                  ? 'neopop-btn-danger'
                  : 'neopop-btn-dark'
              }`}
            >
              ▼ Declining
            </button>

            {/* Sector Dropdown */}
            <select
              value={sectorFilter}
              onChange={(e) => {
                setSectorFilter(e.target.value);
                setCurrentPage(1);
              }}
              className="neopop-input px-3 py-1 text-xs font-bold text-white ml-1 cursor-pointer"
            >
              <option value="ALL">All Sectors</option>
              {sectors.map(sec => (
                <option key={sec} value={sec} className="bg-[#141414]">{sec}</option>
              ))}
            </select>
          </div>

          {/* Page Size Selector */}
          <div className="flex items-center gap-2 text-zinc-400">
            <span className="font-bold text-xs uppercase">Rows:</span>
            {[50, 100, 250, 0].map(sz => (
              <button
                key={sz}
                onClick={() => { setPageSize(sz); setCurrentPage(1); }}
                className={`neopop-btn text-xs px-2.5 py-1 ${
                  pageSize === sz
                    ? 'neopop-btn-primary'
                    : 'neopop-btn-dark'
                }`}
              >
                {sz === 0 ? 'All' : sz}
              </button>
            ))}
          </div>
        </div>

        {/* Market Cap Filter Row */}
        <div className="pt-3 border-t border-zinc-800 flex flex-wrap items-center justify-between gap-2">
          <MarketCapFilter
            selectedCap={selectedCap}
            onSelectCap={(c) => { setSelectedCap(c); setCurrentPage(1); }}
            counts={mktCapCounts}
          />
          <div className="text-[10px] font-mono text-zinc-400">
            Market Cap Scope: <b className="text-[#FEE360]">{filteredList.length}</b> equities
          </div>
        </div>
      </div>

      {/* Bhavcopy Table Container */}
      <div className="neopop-card border-2 border-black bg-[#171717] rounded-[4px] shadow-[4px_4px_0px_#000000] overflow-hidden">
        <div className="overflow-x-auto" style={{ maxHeight: '680px' }}>
          <table className="w-full text-xs text-left border-collapse table-auto">
            <thead>
              <tr className="bg-[#0C0C0C] text-zinc-300 text-[10px] sm:text-[11px] uppercase tracking-wider sticky top-0 z-10 border-b-2 border-black select-none font-mono font-extrabold">
                <th className="py-3 px-3 cursor-pointer hover:text-white" onClick={() => handleSort('symbol')}>
                  Symbol {sortKey === 'symbol' ? (sortAsc ? '▲' : '▼') : '↕'}
                </th>
                <th className="py-3 px-3 cursor-pointer hover:text-white hidden sm:table-cell" onClick={() => handleSort('name')}>
                  Security Name {sortKey === 'name' ? (sortAsc ? '▲' : '▼') : '↕'}
                </th>
                <th className="py-3 px-3 cursor-pointer hover:text-white hidden md:table-cell" onClick={() => handleSort('sector')}>
                  Sector {sortKey === 'sector' ? (sortAsc ? '▲' : '▼') : '↕'}
                </th>
                <th className="py-3 px-3 text-right cursor-pointer hover:text-white" onClick={() => handleSort('ltp')}>
                  Close / LTP {sortKey === 'ltp' ? (sortAsc ? '▲' : '▼') : '↕'}
                </th>
                <th className="py-3 px-3 text-right cursor-pointer hover:text-white" onClick={() => handleSort('change_perc')}>
                  % Chg {sortKey === 'change_perc' ? (sortAsc ? '▲' : '▼') : '↕'}
                </th>
                <th className="py-3 px-3 text-center hidden lg:table-cell w-36">
                  Day's Range
                </th>
                <th className="py-3 px-3 text-right cursor-pointer hover:text-white hidden sm:table-cell" onClick={() => handleSort('volume')}>
                  Volume {sortKey === 'volume' ? (sortAsc ? '▲' : '▼') : '↕'}
                </th>
                <th className="py-3 px-3 hidden xl:table-cell">ISIN</th>
              </tr>
            </thead>
            <tbody className="divide-y divide-white/5 font-medium">
              {displayedList.map((s) => (
                <BhavcopyRow
                  key={s.symbol}
                  stock={s}
                  onSelectStock={onSelectStock}
                  tickDir={recentTicks[s.symbol]}
                  copiedSymbol={copiedSymbol}
                  onCopy={copyToClipboard}
                />
              ))}
            </tbody>
          </table>
        </div>

        {/* High-Usability Pagination Footer */}
        <div className="bg-slate-950/80 px-5 py-3.5 border-t border-white/10 flex flex-wrap items-center justify-between gap-3 text-xs text-slate-400">
          <div className="flex items-center gap-2 font-mono">
            <span>
              Showing <b className="text-white">{totalItems === 0 ? 0 : startIndex + 1}</b> to{' '}
              <b className="text-white">{Math.min(startIndex + effectivePageSize, totalItems)}</b> of{' '}
              <b className="text-white">{totalItems}</b> equities
            </span>
            {pageSize > 0 && totalPages > 1 && (
              <span className="text-slate-500 hidden sm:inline">&bull; Page {clampedPage} of {totalPages}</span>
            )}
          </div>

          {pageSize > 0 && totalPages > 1 && (
            <div className="flex items-center gap-1.5 select-none font-mono">
              <button
                onClick={() => setCurrentPage(1)}
                disabled={clampedPage === 1}
                className="p-1.5 rounded-lg hover:bg-white/10 disabled:opacity-30 disabled:pointer-events-none transition cursor-pointer"
                title="First Page"
              >
                <ChevronsLeft className="w-4 h-4" />
              </button>
              <button
                onClick={() => setCurrentPage(p => Math.max(1, p - 1))}
                disabled={clampedPage === 1}
                className="p-1.5 rounded-lg hover:bg-white/10 disabled:opacity-30 disabled:pointer-events-none transition cursor-pointer"
                title="Previous Page"
              >
                <ChevronLeft className="w-4 h-4" />
              </button>

              <div className="flex items-center gap-1.5 px-1">
                {[...Array(Math.min(5, totalPages))].map((_, idx) => {
                  let pNum;
                  if (totalPages <= 5) {
                    pNum = idx + 1;
                  } else if (clampedPage <= 3) {
                    pNum = idx + 1;
                  } else if (clampedPage >= totalPages - 2) {
                    pNum = totalPages - 4 + idx;
                  } else {
                    pNum = clampedPage - 2 + idx;
                  }

                  return (
                    <button
                      key={pNum}
                      onClick={() => setCurrentPage(pNum)}
                      className={`w-7 h-7 text-xs font-black cursor-pointer neopop-btn ${
                        clampedPage === pNum
                          ? 'neopop-btn-primary'
                          : 'neopop-btn-dark'
                      }`}
                    >
                      {pNum}
                    </button>
                  );
                })}
              </div>

              <button
                onClick={() => setCurrentPage(p => Math.min(totalPages, p + 1))}
                disabled={clampedPage === totalPages}
                className="neopop-btn neopop-btn-dark p-1.5 disabled:opacity-30 disabled:pointer-events-none"
                title="Next Page"
              >
                <ChevronRight className="w-4 h-4" />
              </button>
              <button
                onClick={() => setCurrentPage(totalPages)}
                disabled={clampedPage === totalPages}
                className="neopop-btn neopop-btn-dark p-1.5 disabled:opacity-30 disabled:pointer-events-none"
                title="Last Page"
              >
                <ChevronsRight className="w-4 h-4" />
              </button>
            </div>
          )}
        </div>
      </div>
    </div>
  );
}

// Memoized Row Component
const BhavcopyRow = React.memo(function BhavcopyRow({ stock, onSelectStock, tickDir, copiedSymbol, onCopy }) {
  const chg = stock.change_perc || 0;
  const isUp = chg >= 0;
  const asm = stock.asm || getAsmStatus(stock.symbol);
  const rowFlash = tickDir === 'up'
    ? 'bg-[#00E887]/15'
    : tickDir === 'down'
    ? 'bg-[#FF5959]/15'
    : '';

  const high = stock.high || stock.ltp || 1;
  const low = stock.low || stock.ltp || 0;
  const ltp = stock.ltp || low;
  const rangeSpan = Math.max(0.1, high - low);
  const posPct = Math.min(100, Math.max(0, ((ltp - low) / rangeSpan) * 100));
  const mcap = getMarketCap(stock);

  return (
    <tr
      onClick={() => onSelectStock(stock)}
      className={`hover:bg-[#1C1C1C] transition-colors cursor-pointer group ${rowFlash}`}
    >
      <td className="py-2.5 px-3 font-bold text-white tracking-tight">
        <div className="flex items-center gap-1.5 flex-wrap">
          {tickDir === 'up' && <span className="w-2 h-2 bg-[#00E887]"></span>}
          {tickDir === 'down' && <span className="w-2 h-2 bg-[#FF5959]"></span>}
          <span className="font-mono text-xs sm:text-sm font-black group-hover:text-[#FEE360] group-hover:underline transition-colors flex items-center gap-1">
            {stock.symbol}
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
          {asm?.isAsm && (
            <span
              className="neopop-tag bg-[#FF5959]/20 text-[#FF5959] border border-[#FF5959]/40 text-[9px] py-0 px-1 font-black cursor-help"
              title={`${asm.badge} - 100% Margin Required`}
            >
              ⚠️ {asm.shortBadge || 'ASM'}
            </span>
          )}
          <button
            onClick={(e) => onCopy(stock.symbol, e)}
            className="text-zinc-500 hover:text-white p-0.5 rounded transition opacity-0 group-hover:opacity-100"
            title="Copy Symbol"
          >
            {copiedSymbol === stock.symbol ? <Check className="w-3 h-3 text-[#00E887]" /> : <Copy className="w-3 h-3" />}
          </button>
        </div>
        <div className="text-[10px] text-zinc-400 sm:hidden truncate max-w-[120px]">{stock.name}</div>
      </td>
      <td className="py-2.5 px-3 text-zinc-300 font-normal max-w-[200px] truncate hidden sm:table-cell" title={stock.name}>
        {stock.name}
      </td>
      <td className="py-2.5 px-3 hidden md:table-cell">
        <span className="neopop-tag bg-[#1E1E1E] text-zinc-300">
          {stock.sector || 'EQ'}
        </span>
      </td>
      <td className={`py-2.5 px-3 text-right font-black font-mono text-xs sm:text-sm ${
        tickDir === 'up' ? 'text-[#00E887]' :
        tickDir === 'down' ? 'text-[#FF5959]' :
        'text-white'
      }`}>
        ₹{stock.ltp.toLocaleString('en-IN', { minimumFractionDigits: 2 })}
      </td>
      <td className="py-2.5 px-3 text-right">
        <span className={`neopop-tag text-[11px] font-black ${
          isUp
            ? 'bg-[#00E887] text-black'
            : 'bg-[#FF5959] text-white'
        }`}>
          {isUp ? '+' : ''}{chg.toFixed(2)}%
        </span>
      </td>
      <td className="py-2.5 px-3 text-center hidden lg:table-cell">
        <div className="flex justify-between text-[9px] text-zinc-500 font-mono mb-1">
          <span>₹{low.toLocaleString('en-IN')}</span>
          <span>₹{high.toLocaleString('en-IN')}</span>
        </div>
        <div className="w-full bg-[#222222] h-1.5 border border-black overflow-hidden flex">
          <div
            className={`h-full ${isUp ? 'bg-[#00E887]' : 'bg-[#FF5959]'}`}
            style={{ width: `${posPct}%` }}
          ></div>
        </div>
      </td>
      <td className="py-2.5 px-3 text-right font-mono font-bold text-zinc-300 hidden sm:table-cell">
        {(stock.volume || 0).toLocaleString('en-IN')}
      </td>
      <td className="py-2.5 px-3 text-zinc-500 font-mono text-[10px] hidden xl:table-cell">
        <span className="hover:text-white transition" onClick={(e) => onCopy(stock.isin, e)} title="Click to copy ISIN">
          {stock.isin || '—'}
        </span>
      </td>
    </tr>
  );
});
