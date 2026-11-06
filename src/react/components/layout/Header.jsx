import React, { useState, useRef, useEffect } from 'react';
import { Search, Download, RefreshCw, Radio, Sparkles, TrendingUp, Zap, Pause, Play, Lock, Menu, ArrowLeft } from 'lucide-react';
import { formatIndianCurrency } from '../../utils/formatters.js';
import { cn } from '../../lib/utils.js';

export default function Header({
  activeTabTitle,
  selectedStock = null,
  onCloseStock,
  constituents = [],
  onSelectStock,
  onExportCSV,
  onRefreshLive,
  isRefreshing,
  lastUpdated,
  isStreaming = false,
  ticksCount = 0,
  isPaused = false,
  onTogglePause,
  marketStatus = null,
  onToggleMobileMenu
}) {
  const [query, setQuery] = useState('');
  const [isOpen, setIsOpen] = useState(false);
  const searchRef = useRef(null);
  const inputRef = useRef(null);

  const trimmed = query.trim().toLowerCase();
  const suggestions = trimmed.length >= 2
    ? constituents.filter(s => 
        s.symbol.toLowerCase().includes(trimmed) || 
        (s.name && s.name.toLowerCase().includes(trimmed))
      ).slice(0, 8)
    : [];

  // Global Keyboard Shortcuts (⌘K or / to search, Space to pause/resume)
  useEffect(() => {
    function handleKeyDown(e) {
      if ((e.metaKey || e.ctrlKey) && e.key === 'k') {
        e.preventDefault();
        inputRef.current?.focus();
      } else if (e.key === '/' && document.activeElement?.tagName !== 'INPUT') {
        e.preventDefault();
        inputRef.current?.focus();
      }
    }
    window.addEventListener('keydown', handleKeyDown);
    return () => window.removeEventListener('keydown', handleKeyDown);
  }, []);

  useEffect(() => {
    function handleClickOutside(e) {
      if (searchRef.current && !searchRef.current.contains(e.target)) {
        setIsOpen(false);
      }
    }
    document.addEventListener('mousedown', handleClickOutside);
    return () => document.removeEventListener('mousedown', handleClickOutside);
  }, []);

  return (
    <header className="sticky top-0 z-20 flex h-16 items-center justify-between border-b-2 border-black bg-[#0C0C0C] px-3 sm:px-6 select-none gap-2">
      {/* Current Page / Breadcrumb + Mobile Menu Toggle */}
      <div className="flex items-center gap-2 shrink-0">
        <button
          onClick={onToggleMobileMenu}
          className="md:hidden text-slate-400 hover:text-white p-1.5 -ml-1 rounded border border-[#262626] bg-[#141414] hover:bg-[#1E1E1E] transition cursor-pointer"
          title="Open Menu"
        >
          <Menu className="w-5 h-5 text-[#FEE360]" />
        </button>

        {selectedStock && onCloseStock && (
          <button
            onClick={onCloseStock}
            className="neopop-btn neopop-btn-dark text-[11px] px-2 py-1 flex items-center gap-1 font-bold border border-black shadow-[1px_1px_0px_#000] hover:bg-[#252525]"
            title="Return to Table View (Esc)"
          >
            <ArrowLeft className="w-3.5 h-3.5 text-[#FEE360]" />
            <span className="hidden sm:inline">Back</span>
          </button>
        )}

        <div className="hidden sm:flex items-center gap-1.5 text-xs text-slate-400 font-mono">
          <span className="font-bold text-slate-300">NSE</span>
          <span className="text-slate-600">/</span>
        </div>
        <div className="flex items-center gap-2">
          <span className="text-xs sm:text-sm font-black text-white tracking-wider uppercase truncate max-w-[100px] xs:max-w-[140px] sm:max-w-none">
            {activeTabTitle}
          </span>
          <span className="w-2 h-2 bg-[#FEE360] border border-black shadow-[1px_1px_0px_#000] shrink-0"></span>
        </div>
      </div>

      {/* Center Modern Search Input */}
      <div className="relative flex-1 max-w-[140px] xs:max-w-[190px] sm:max-w-xs md:max-w-md mx-1" ref={searchRef}>
        <Search className="w-3.5 h-3.5 text-slate-400 absolute left-3 top-1/2 -translate-y-1/2 pointer-events-none" />
        <input
          ref={inputRef}
          type="text"
          value={query}
          onChange={(e) => {
            setQuery(e.target.value);
            setIsOpen(true);
          }}
          onFocus={() => {
            if (trimmed.length >= 2) setIsOpen(true);
          }}
          placeholder="Search 501 Equities..."
          className="w-full neopop-input pl-8 sm:pl-9 pr-3 sm:pr-12 py-1.5 sm:py-2 text-xs font-mono font-medium placeholder:text-slate-500"
        />
        <div className="absolute right-3 top-1/2 -translate-y-1/2 pointer-events-none hidden sm:block">
          <kbd className="inline-flex h-5 items-center gap-0.5 rounded border border-black bg-[#242424] px-1.5 font-mono text-[10px] font-bold text-slate-300 shadow-[1px_1px_0px_#000]">
            ⌘K
          </kbd>
        </div>

        {isOpen && suggestions.length > 0 && (
          <div className="absolute top-full left-0 right-0 mt-2 bg-[#141414] border-2 border-black rounded shadow-[5px_5px_0px_#000] max-h-80 overflow-y-auto z-50 divide-y divide-[#262626]">
            {suggestions.map((s) => {
              const chg = s.change_perc || 0;
              const isUp = chg >= 0;
              return (
                <div
                  key={s.symbol}
                  className="px-4 py-3 hover:bg-[#1F1F1F] cursor-pointer flex items-center justify-between transition group"
                  onClick={() => {
                    onSelectStock(s);
                    setIsOpen(false);
                    setQuery('');
                  }}
                >
                  <div>
                    <div className="flex items-center gap-2">
                      <span className="font-black text-white text-xs group-hover:text-[#FEE360] transition-colors">{s.symbol}</span>
                      <span className="text-[10px] bg-[#222222] text-slate-400 px-1.5 py-0.2 rounded font-mono border border-black">
                        {s.sector || 'EQ'}
                      </span>
                    </div>
                    <div className="text-[11px] text-slate-400 truncate max-w-[200px] mt-0.5">
                      {s.name}
                    </div>
                  </div>
                  <div className="text-right">
                    <div className="font-bold text-white text-xs font-mono">{formatIndianCurrency(s.ltp)}</div>
                    <div className={`text-[10px] font-black font-mono ${isUp ? 'text-[#00E887]' : 'text-[#FF5959]'}`}>
                      {isUp ? '+' : ''}{chg.toFixed(2)}%
                    </div>
                  </div>
                </div>
              );
            })}
          </div>
        )}
      </div>

      {/* Right Action Toolbar */}
      <div className="flex items-center gap-2 shrink-0">
        {/* Real-time Streaming Ticker Badge & Pause Toggle / Market Status */}
        {marketStatus && !marketStatus.isOpen ? (
          <div className="flex items-center gap-1.5 bg-[#141414] border border-black p-1 pl-2.5 rounded shadow-[2px_2px_0px_#000]">
            <span className="relative flex h-2 w-2">
              <span className="relative inline-flex rounded-full h-2 w-2 bg-[#FF5959]"></span>
            </span>
            <span className="font-mono font-black text-[#FF5959] text-[10px] sm:text-[11px] uppercase tracking-wider flex items-center gap-1">
              <Lock className="w-3 h-3 text-[#FF5959]" />
              <span className="hidden xs:inline">MARKET CLOSED</span>
              <span className="xs:hidden">CLOSED</span>
            </span>
            <span className="font-mono text-[10px] text-zinc-400 border-l border-[#262626] pl-1.5 hidden lg:inline" title={marketStatus.reason || 'Official Settlement Finalized'}>
              Settlement Finalized (15:30 IST)
            </span>
          </div>
        ) : (
          <div className="flex items-center gap-1.5 bg-[#141414] border border-black p-1 pl-2.5 rounded shadow-[2px_2px_0px_#000]">
            <div className="flex items-center gap-1.5">
              <span className="relative flex h-2 w-2">
                <span className={cn(
                  "absolute inline-flex h-full w-full rounded-full bg-[#00E887] opacity-75",
                  isStreaming && !isPaused && "animate-ping"
                )}></span>
                <span className={cn(
                  "relative inline-flex rounded-full h-2 w-2",
                  isPaused ? "bg-[#FEE360]" : "bg-[#00E887]"
                )}></span>
              </span>
              <span className="font-mono font-black text-[#00E887] text-[10px] sm:text-[11px] uppercase tracking-wider flex items-center gap-1">
                <Zap className="w-3 h-3 text-[#00E887]" />
                <span>{isPaused ? 'PAUSED' : 'LIVE'}</span>
                <span className="hidden xs:inline">{!isPaused && (marketStatus && !marketStatus.isOpen ? ' (REPLAY 1s)' : ' (1s)')}</span>
              </span>
              {ticksCount > 0 && (
                <span className="font-mono text-[10px] text-slate-400 border-l border-[#262626] pl-1.5 hidden lg:inline">
                  {ticksCount.toLocaleString()}
                </span>
              )}
            </div>

            {/* Pause / Resume Button */}
            {onTogglePause && (
              <button
                onClick={onTogglePause}
                className="p-1 rounded bg-[#222222] text-slate-300 hover:text-white hover:bg-[#333333] transition border border-black cursor-pointer ml-1"
                title={isPaused ? "Resume Live Streaming" : "Pause Live Streaming"}
              >
                {isPaused ? <Play className="w-3 h-3 text-[#00E887]" /> : <Pause className="w-3 h-3 text-[#FEE360]" />}
              </button>
            )}
          </div>
        )}

        {/* Sync Live Prices Button (NeoPOP Elevated 3D Button) */}
        <button
          onClick={onRefreshLive}
          disabled={isRefreshing}
          className="neopop-btn neopop-btn-primary px-3 sm:px-4 py-1.5 text-xs font-black disabled:opacity-50"
          title="Fetch latest settlement figures directly from exchange"
        >
          <RefreshCw className={cn("w-3.5 h-3.5", isRefreshing && "animate-spin")} />
          <span className="hidden sm:inline">{isRefreshing ? 'Syncing...' : 'Sync Live'}</span>
          <span className="sm:hidden">{isRefreshing ? '...' : 'Sync'}</span>
        </button>

        {/* Export Button (NeoPOP Elevated 3D Button) */}
        {onExportCSV && (
          <button
            onClick={onExportCSV}
            className="hidden sm:flex neopop-btn neopop-btn-dark px-3 py-1.5 text-xs font-bold"
          >
            <Download className="w-3.5 h-3.5 text-[#FEE360]" />
            <span>CSV</span>
          </button>
        )}
      </div>
    </header>
  );
}
