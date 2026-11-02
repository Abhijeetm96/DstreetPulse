import React from 'react';
import Logo from './Logo.jsx';

export default function Footer() {
  return (
    <footer className="mt-16 bg-[#0C0C0C] text-zinc-400 text-xs py-8 px-4 sm:px-6 border-t-2 border-black">
      <div className="max-w-7xl mx-auto flex flex-col sm:flex-row justify-between items-center gap-6 text-center sm:text-left">
        {/* Brand & Identity */}
        <div className="flex flex-col sm:flex-row items-center sm:items-start gap-4">
          <Logo size={42} />
          <div>
            <div className="flex items-center justify-center sm:justify-start gap-2">
              <span className="neopop-heading font-black text-white text-sm tracking-wide uppercase">
                Dstreet<span className="text-[#FEE360]">Pulse</span>
              </span>
              <span className="text-[9px] font-black tracking-widest px-1.5 py-0.5 rounded-[2px] bg-[#FEE360] text-black border border-black shadow-[1px_1px_0px_#000]">
                TERMINAL
              </span>
            </div>
            <div className="text-[11px] text-zinc-400 font-mono mt-1">
              Dalal Street High-Frequency &amp; Swing Intelligence &bull; Real-time NSE Market Tape
            </div>
            <div className="text-[10px] text-zinc-600 font-mono mt-0.5">
              Powered by NSE Capital Market &amp; Bhavcopy Engine &bull; Zero Slippage Execution
            </div>
          </div>
        </div>

        {/* Live Metrics & Design System Badges */}
        <div className="flex flex-wrap items-center justify-center sm:justify-end gap-3 sm:gap-4 text-xs font-mono">
          <span className="font-bold text-[#00E887] flex items-center gap-1.5 bg-[#121212] px-2.5 py-1 border border-black shadow-[2px_2px_0px_#000]">
            <span className="w-2 h-2 bg-[#00E887] rounded-none"></span>
            501 NSE Equities
          </span>
          <span className="text-[#FEE360] font-bold bg-[#121212] px-2.5 py-1 border border-black shadow-[2px_2px_0px_#000]">
            43 Sectoral Indices
          </span>
          <span className="neopop-tag bg-[#1E1E1E] text-white border border-black shadow-[2px_2px_0px_#000]">
            CRED NeoPOP System
          </span>
        </div>
      </div>
    </footer>
  );
}
