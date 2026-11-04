import React from 'react';
import { Layers } from 'lucide-react';
import { MKT_CAP_DEFINITIONS } from '../utils/mktCapRegistry.js';

/**
 * Reusable NeoPOP Market Cap Filter Bar
 * Allows filtering stocks across Large, Mid, Small, Micro, and Penny tiers.
 */
export default function MarketCapFilter({
  selectedCap = 'ALL',
  onSelectCap,
  counts = {},
  size = 'sm',
  className = ''
}) {
  const caps = ['ALL', 'LARGE', 'MID', 'SMALL', 'MICRO', 'PENNY'];

  return (
    <div className={`flex items-center gap-1.5 flex-wrap ${className}`}>
      <span className="text-[10px] sm:text-[11px] font-black uppercase text-[#FEE360] font-mono flex items-center gap-1 mr-0.5 shrink-0">
        <Layers className="w-3.5 h-3.5 text-[#FEE360]" /> Cap:
      </span>

      <div className="flex items-center gap-1 flex-wrap">
        {caps.map((key) => {
          const def = MKT_CAP_DEFINITIONS[key];
          const isSelected = selectedCap === key;
          const count = counts[key];

          return (
            <button
              key={key}
              onClick={() => onSelectCap(key)}
              className={`neopop-btn text-[11px] font-bold px-2.5 py-1 flex items-center gap-1.5 transition-all active:translate-x-[1px] active:translate-y-[1px] ${
                isSelected
                  ? 'border-2 border-black shadow-[2px_2px_0px_#000000]'
                  : 'neopop-btn-dark hover:bg-[#202020]'
              }`}
              style={
                isSelected
                  ? { backgroundColor: def.bg, color: def.color }
                  : {}
              }
              title={def.desc ? `${def.label} (${def.desc})` : def.label}
            >
              <span
                className="w-1.5 h-1.5 rounded-none shrink-0 border border-black/40"
                style={{ backgroundColor: def.bg }}
              ></span>
              <span className="font-extrabold uppercase tracking-tight">{def.badge}</span>
              {typeof count === 'number' && (
                <span
                  className={`text-[9px] font-mono px-1 py-0 rounded-[2px] ${
                    isSelected
                      ? 'bg-black/20 text-current font-black'
                      : 'bg-[#121212] text-zinc-400 font-bold'
                  }`}
                >
                  {count}
                </span>
              )}
            </button>
          );
        })}
      </div>
    </div>
  );
}

