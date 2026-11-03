import React from 'react';
import { TrendingUp, TrendingDown } from 'lucide-react';

export default function IndicesStrip({ indices = [], selectedIndex, onSelectIndex, recentTicks = {} }) {
  const topIndices = indices.slice(0, 12);

  return (
    <div className="indices-strip bg-[#0C0C0C] border-b-2 border-black px-3 sm:px-6 py-2 sm:py-2.5 flex items-center gap-2 sm:gap-3 overflow-x-auto select-none scrollbar-none">
      {topIndices.map((idx) => {
        const isSelected = selectedIndex === idx.name;
        const chg = idx.change_perc || 0;
        const isUp = chg >= 0;
        const tickDir = recentTicks[idx.name];
        const tickGlow = tickDir === 'up'
          ? 'ring-2 ring-[#00E887]'
          : tickDir === 'down'
            ? 'ring-2 ring-[#FF5959]'
            : '';

        const high = idx.high || idx.ltp || 1;
        const low = idx.low || idx.ltp || 0;
        const ltp = idx.ltp || low;
        const rangeSpan = Math.max(0.1, high - low);
        const posPct = Math.min(100, Math.max(0, ((ltp - low) / rangeSpan) * 100));

        return (
          <div
            key={idx.name}
            onClick={() => onSelectIndex(idx.name)}
            className={`index-card flex-shrink-0 px-3 sm:px-3.5 py-1.5 sm:py-2 min-w-[155px] sm:min-w-[185px] cursor-pointer transition-all border rounded-[4px] shadow-[2px_2px_0px_#000000] ${tickGlow} ${isSelected
                ? 'bg-[#1F1F1F] border-[#FEE360]'
                : 'bg-[#141414] hover:bg-[#1A1A1A] border-[#2A2A2A]'
              }`}
          >
            <div className="flex items-center justify-between">
              <span className="text-[11px] font-black text-white truncate tracking-tight">{idx.name}</span>
              <span className={`text-[10px] font-black font-mono flex items-center gap-0.5 px-1.5 py-0.5 rounded-[2px] border border-black shadow-[1px_1px_0px_#000000] ${isUp ? 'text-black bg-[#00E887]' : 'text-white bg-[#FF5959]'
                }`}>
                {isUp ? <TrendingUp className="w-2.5 h-2.5" /> : <TrendingDown className="w-2.5 h-2.5" />}
                <span>{isUp ? '+' : ''}{chg.toFixed(2)}%</span>
              </span>
            </div>
            <div className="flex items-baseline justify-between mt-1.5">
              <span className="text-xs sm:text-sm font-black text-white font-mono tracking-tight">
                ₹{(idx.ltp || 0).toLocaleString('en-IN', { minimumFractionDigits: 2 })}
              </span>
              <span className="text-[9px] font-mono text-zinc-400 font-bold hidden sm:inline">
                {idx.category || 'BROAD'}
              </span>
            </div>
            {/* Range Bar */}
            <div className="w-full bg-[#222222] h-1 border border-black mt-1.5 overflow-hidden flex">
              <div
                className={`h-full ${isUp ? 'bg-[#00E887]' : 'bg-[#FF5959]'}`}
                style={{ width: `${posPct}%` }}
              ></div>
            </div>
          </div>
        );
      })}
    </div>
  );
}
