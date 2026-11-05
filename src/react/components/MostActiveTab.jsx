import React, { useState, useMemo } from 'react';
import { TrendingUp, TrendingDown, ExternalLink, Zap, IndianRupee, Activity } from 'lucide-react';
import { formatIndianCurrency, formatVolume } from '../utils/formatters.js';
import { getMarketCap, filterByMarketCap } from '../utils/mktCapRegistry.js';
import MarketCapFilter from './MarketCapFilter.jsx';

export default function MostActiveTab({
  constituents = [],
  officialVolume = [],
  officialValue = [],
  onSelectStock,
  recentTicks = {}
}) {
  const [limit, setLimit] = useState(15);
  const [selectedCap, setSelectedCap] = useState('ALL'); // 'ALL' | 'LARGE' | 'MID' | 'SMALL' | 'MICRO' | 'PENNY'

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

  const scopedConstituents = useMemo(() => {
    if (selectedCap === 'ALL') return constituents;
    return filterByMarketCap(constituents, selectedCap);
  }, [constituents, selectedCap]);

  const byVolume = useMemo(() => {
    return [...scopedConstituents]
      .sort((a, b) => (b.volume || 0) - (a.volume || 0))
      .slice(0, limit);
  }, [scopedConstituents, limit]);

  const maxVolume = useMemo(() => {
    return Math.max(...byVolume.map(s => Number(s.volume) || 1), 1);
  }, [byVolume]);

  const byValue = useMemo(() => {
    return [...scopedConstituents]
      .map(s => ({
        ...s,
        turnoverCr: Number((((s.volume || 0) * (s.ltp || 0)) / 10000000).toFixed(2))
      }))
      .sort((a, b) => b.turnoverCr - a.turnoverCr)
      .slice(0, limit);
  }, [scopedConstituents, limit]);

  const maxValueCr = useMemo(() => {
    return Math.max(...byValue.map(s => s.turnoverCr || 1), 1);
  }, [byValue]);

  return (
    <div className="space-y-4 sm:space-y-6">
      {/* Control Filter Bar */}
      <div className="neopop-card p-3 sm:p-4 border-2 border-black bg-[#171717] rounded-[4px] shadow-[4px_4px_0px_#000000] space-y-3">
        <div className="flex flex-wrap items-center justify-between gap-4">
          <div className="flex items-center gap-2.5">
            <span className="p-2 rounded-[3px] bg-[#111111] text-[#FEE360] border-2 border-black shadow-[2px_2px_0px_#000000]">
              <Zap className="w-5 h-5 text-[#FEE360]" />
            </span>
            <div>
              <h2 className="neopop-heading font-black text-lg sm:text-xl text-white tracking-tight">
                Most Active Securities (Liquidity &amp; Turnover)
              </h2>
              <p className="neopop-body text-xs text-zinc-400">
                Institutional order flow concentration by cumulative share volume and total cash value traded.
              </p>
            </div>
          </div>

          <div className="flex items-center gap-1.5">
            {[10, 15, 25].map((num) => (
              <button
                key={num}
                onClick={() => setLimit(num)}
                className={`neopop-btn text-xs px-3 py-1 ${limit === num
                    ? 'neopop-btn-primary'
                    : 'neopop-btn-dark'
                  }`}
              >
                Top {num}
              </button>
            ))}
          </div>
        </div>

        {/* Market Cap Filter Strip */}
        <div className="pt-2.5 border-t border-zinc-800 flex flex-wrap items-center justify-between gap-2">
          <MarketCapFilter
            selectedCap={selectedCap}
            onSelectCap={setSelectedCap}
            counts={mktCapCounts}
          />
          <div className="text-[10px] font-mono text-zinc-400">
            Filtered Universe: <b className="text-[#FEE360]">{scopedConstituents.length}</b> equities
          </div>
        </div>
      </div>

      <div className="grid grid-cols-1 lg:grid-cols-2 gap-4 sm:gap-6">
        {/* Most Active by Volume */}
        <div className="neopop-card overflow-hidden">
          <div className="bg-[#1A1A1A] px-5 py-4 border-b-2 border-black flex items-center justify-between">
            <h3 className="font-black text-white text-sm flex items-center gap-2.5 uppercase">
              <span className="w-2.5 h-2.5 bg-[#FEE360] border border-black shadow-[1px_1px_0px_#000]"></span>
              <span>Top {limit} Most Active by Traded Volume</span>
            </h3>
            <span className="neopop-tag bg-[#1E1E1E] text-[#FEE360]">
              Volume Leaders
            </span>
          </div>
          <div className="overflow-x-auto">
            <table className="w-full text-xs text-left border-collapse">
              <thead>
                <tr className="bg-[#141414] text-zinc-400 text-[10px] sm:text-[11px] uppercase tracking-wider border-b-2 border-black select-none font-mono font-bold">
                  <th className="py-3 px-3 w-10 text-center">#</th>
                  <th className="py-3 px-3">Symbol &amp; Company</th>
                  <th className="py-3 px-3 text-right">LTP (₹)</th>
                  <th className="py-3 px-3 text-right">% Chg</th>
                  <th className="py-3 px-3 text-right hidden sm:table-cell w-36">Volume (Relative Bar)</th>
                </tr>
              </thead>
              <tbody className="divide-y divide-[#222222] font-medium">
                {byVolume.map((s, idx) => {
                  const chg = s.change_perc || 0;
                  const isUp = chg >= 0;
                  const volNum = typeof s.volume === 'number' ? s.volume : parseInt(s.volume, 10) || 0;
                  const volSharePct = Math.min(100, Math.max(5, (volNum / maxVolume) * 100));
                  const mcap = getMarketCap(s);
                  const tickDir = recentTicks[s.symbol];
                  const tickBg = tickDir === 'up' ? 'bg-[#00E887]/20 border-l-2 border-l-[#00E887]' : tickDir === 'down' ? 'bg-[#FF5959]/20 border-l-2 border-l-[#FF5959]' : '';

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
                        <div className="text-[10px] text-zinc-400 font-normal truncate max-w-[120px] sm:max-w-[160px] mt-0.5">{s.name}</div>
                      </td>
                      <td className="py-2.5 px-3 text-right font-black font-mono text-white text-xs sm:text-sm">
                        {formatIndianCurrency(s.ltp)}
                      </td>
                      <td className="py-2.5 px-3 text-right">
                        <span className={`neopop-tag text-[11px] font-black ${isUp
                            ? 'bg-[#00E887] text-black'
                            : 'bg-[#FF5959] text-white'
                          }`}>
                          {isUp ? <TrendingUp className="w-3 h-3" /> : <TrendingDown className="w-3 h-3" />}
                          {isUp ? '+' : ''}{chg.toFixed(2)}%
                        </span>
                      </td>
                      <td className="py-2.5 px-3 text-right font-mono hidden sm:table-cell">
                        <div className="font-bold text-zinc-300 text-xs">
                          {volNum.toLocaleString('en-IN')}
                        </div>
                        <div className="w-full bg-[#222222] h-1.5 border border-black mt-1 overflow-hidden flex">
                          <div
                            className="bg-[#FEE360] h-full"
                            style={{ width: `${volSharePct}%` }}
                          ></div>
                        </div>
                      </td>
                    </tr>
                  );
                })}
              </tbody>
            </table>
          </div>
        </div>

        {/* Most Active by Value */}
        <div className="neopop-card overflow-hidden">
          <div className="bg-[#1A1A1A] px-5 py-4 border-b-2 border-black flex items-center justify-between">
            <h3 className="font-black text-white text-sm flex items-center gap-2.5 uppercase">
              <span className="w-2.5 h-2.5 bg-[#00E887] border border-black shadow-[1px_1px_0px_#000]"></span>
              <span>Top {limit} Most Active by Traded Value</span>
            </h3>
            <span className="neopop-tag bg-[#1E1E1E] text-[#00E887]">
              Turnover Leaders
            </span>
          </div>
          <div className="overflow-x-auto">
            <table className="w-full text-xs text-left border-collapse">
              <thead>
                <tr className="bg-[#141414] text-zinc-400 text-[10px] sm:text-[11px] uppercase tracking-wider border-b-2 border-black select-none font-mono font-bold">
                  <th className="py-3 px-3 w-10 text-center">#</th>
                  <th className="py-3 px-3">Symbol &amp; Company</th>
                  <th className="py-3 px-3 text-right">LTP (₹)</th>
                  <th className="py-3 px-3 text-right">% Chg</th>
                  <th className="py-3 px-3 text-right hidden sm:table-cell w-36">Turnover (Cr)</th>
                </tr>
              </thead>
              <tbody className="divide-y divide-[#222222] font-medium">
                {byValue.map((s, idx) => {
                  const chg = s.change_perc || 0;
                  const isUp = chg >= 0;
                  const crVal = s.turnoverCr || 1;
                  const valueSharePct = Math.min(100, Math.max(5, (crVal / maxValueCr) * 100));
                  const mcap = getMarketCap(s);
                  const tickDir = recentTicks[s.symbol];
                  const tickBg = tickDir === 'up' ? 'bg-[#00E887]/20 border-l-2 border-l-[#00E887]' : tickDir === 'down' ? 'bg-[#FF5959]/20 border-l-2 border-l-[#FF5959]' : '';

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
                        <div className="text-[10px] text-zinc-400 font-normal truncate max-w-[120px] sm:max-w-[160px] mt-0.5">{s.name}</div>
                      </td>
                      <td className="py-2.5 px-3 text-right font-black font-mono text-white text-xs sm:text-sm">
                        {formatIndianCurrency(s.ltp)}
                      </td>
                      <td className="py-2.5 px-3 text-right">
                        <span className={`neopop-tag text-[11px] font-black ${isUp
                            ? 'bg-[#00E887] text-black'
                            : 'bg-[#FF5959] text-white'
                          }`}>
                          {isUp ? <TrendingUp className="w-3 h-3" /> : <TrendingDown className="w-3 h-3" />}
                          {isUp ? '+' : ''}{chg.toFixed(2)}%
                        </span>
                      </td>
                      <td className="py-2.5 px-3 text-right font-mono hidden sm:table-cell">
                        <div className="font-black text-[#FEE360] text-xs">
                          {s.turnover_formatted || `₹${crVal.toFixed(2)} Cr`}
                        </div>
                        <div className="w-full bg-[#222222] h-1.5 border border-black mt-1 overflow-hidden flex">
                          <div
                            className="bg-[#00E887] h-full"
                            style={{ width: `${valueSharePct}%` }}
                          ></div>
                        </div>
                      </td>
                    </tr>
                  );
                })}
              </tbody>
            </table>
          </div>
        </div>
      </div>
    </div>
  );
}
