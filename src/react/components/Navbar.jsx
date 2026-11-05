import React, { useState, useRef, useEffect } from 'react';
import { Search } from 'lucide-react';
import { formatIndianCurrency } from '../utils/formatters.js';

export default function Navbar({ constituents = [], onSelectStock }) {
  const [query, setQuery] = useState('');
  const [isOpen, setIsOpen] = useState(false);
  const containerRef = useRef(null);

  const trimmed = query.trim().toLowerCase();
  const suggestions = trimmed.length >= 2
    ? constituents.filter(s => 
        s.symbol.toLowerCase().includes(trimmed) || 
        (s.name && s.name.toLowerCase().includes(trimmed))
      ).slice(0, 8)
    : [];

  useEffect(() => {
    function handleClickOutside(e) {
      if (containerRef.current && !containerRef.current.contains(e.target)) {
        setIsOpen(false);
      }
    }
    document.addEventListener('mousedown', handleClickOutside);
    return () => document.removeEventListener('mousedown', handleClickOutside);
  }, []);

  return (
    <header className="nse-main-nav bg-[#002B49] text-white py-3 px-6 flex items-center justify-between border-b-2 border-[#ED6C02] shadow-md">
      <div className="flex items-center gap-3">
        <div className="w-10 h-10 rounded bg-white flex items-center justify-center font-black text-xl text-[#002B49] border-2 border-[#ED6C02] shadow-sm select-none">
          NSE
        </div>
        <div>
          <div className="font-extrabold text-base tracking-tight leading-tight flex items-center gap-2">
            <span>NATIONAL STOCK EXCHANGE OF INDIA</span>
            <span className="text-[10px] bg-orange-600/30 text-orange-300 font-bold px-2 py-0.5 rounded border border-orange-500/40">
              REACT EDITION
            </span>
          </div>
          <div className="text-[10px] text-gray-300 tracking-wider font-medium">
            OFFICIAL CAPITAL MARKET (CM) &amp; BHAVCOPY PLATFORM
          </div>
        </div>
      </div>

      {/* Global Stock Search */}
      <div className="relative w-96" ref={containerRef}>
        <Search className="w-4 h-4 text-gray-400 absolute left-3 top-1/2 -translate-y-1/2 pointer-events-none" />
        <input
          type="text"
          value={query}
          onChange={(e) => {
            setQuery(e.target.value);
            setIsOpen(true);
          }}
          onFocus={() => {
            if (trimmed.length >= 2) setIsOpen(true);
          }}
          placeholder="Search Symbol, Company (e.g. RELIANCE, TCS, INFY)..."
          className="nse-search-input w-full bg-white text-slate-800 placeholder-gray-400 rounded pl-9 pr-4 py-2 text-xs font-medium border border-gray-300 focus:outline-none focus:border-[#ED6C02] focus:ring-1 focus:ring-[#ED6C02] shadow-inner transition"
        />

        {isOpen && suggestions.length > 0 && (
          <div className="absolute top-full left-0 right-0 mt-1 bg-white border border-gray-300 rounded shadow-2xl max-h-80 overflow-y-auto z-50 divide-y divide-gray-100">
            {suggestions.map((s) => {
              const chg = s.change_perc || 0;
              const isUp = chg >= 0;
              return (
                <div
                  key={s.symbol}
                  className="px-3.5 py-2.5 hover:bg-sky-50 cursor-pointer flex items-center justify-between transition"
                  onClick={() => {
                    onSelectStock(s);
                    setIsOpen(false);
                    setQuery('');
                  }}
                >
                  <div>
                    <span className="font-extrabold text-[#002B49] text-xs">{s.symbol}</span>
                    <span className="text-[11px] text-gray-500 ml-2 truncate max-w-[180px] inline-block align-bottom">{s.name}</span>
                    <span className="text-[10px] bg-gray-100 text-gray-600 px-1.5 py-0.5 rounded ml-2 font-mono">{s.sector || 'EQ'}</span>
                  </div>
                  <div className="text-right">
                    <div className="font-black text-slate-900 text-xs font-mono">{formatIndianCurrency(s.ltp)}</div>
                    <div className={`text-[10px] font-bold ${isUp ? 'text-emerald-700' : 'text-red-700'}`}>
                      {isUp ? '+' : ''}{chg.toFixed(2)}%
                    </div>
                  </div>
                </div>
              );
            })}
          </div>
        )}
      </div>

      {/* MCP Status Indicators */}
      <div className="flex items-center gap-3">
        <div className="text-right">
          <div className="text-[10px] text-gray-300 font-semibold tracking-wide uppercase">Active MCP Nodes</div>
          <div className="text-xs font-bold text-emerald-400 flex items-center gap-1.5 justify-end">
            <span>nse-bhavcopy</span>
            <span>&bull;</span>
            <span>cm-market</span>
          </div>
        </div>
        <div className="w-3 h-3 rounded-full bg-emerald-400 animate-pulse border-2 border-emerald-600"></div>
      </div>
    </header>
  );
}

