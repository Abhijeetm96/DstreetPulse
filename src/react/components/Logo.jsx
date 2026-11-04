import React from 'react';

/**
 * DstreetPulse Brand Logo
 * Premium NeoPOP geometric badge:
 * - Dalal Street Bull Horns / 'D' Gateway combined with High-Frequency Electric Pulse line
 * - High-contrast palette: Carbon Black (#0C0C0C), Electric Gold (#FEE360), Neon Green (#00E887)
 */
export default function Logo({ size = 32, className = '', showText = false, textVariant = 'full' }) {
  return (
    <div className={`inline-flex items-center gap-2.5 select-none ${className}`}>
      {/* NeoPOP Logo Icon Badge */}
      <div 
        style={{ width: size, height: size }}
        className="relative rounded-[4px] bg-[#0A0A0A] border-2 border-black shadow-[2px_2px_0px_#FEE360] flex items-center justify-center shrink-0 overflow-hidden group transition-transform active:translate-x-[1px] active:translate-y-[1px]"
      >
        <svg
          viewBox="0 0 100 100"
          className="w-full h-full p-1"
          fill="none"
          xmlns="http://www.w3.org/2000/svg"
        >
          {/* Background Technical Grid */}
          <line x1="20" y1="20" x2="20" y2="80" stroke="#1F1F1F" strokeWidth="1.5" strokeDasharray="3 3" />
          <line x1="50" y1="20" x2="50" y2="80" stroke="#1F1F1F" strokeWidth="1.5" strokeDasharray="3 3" />
          <line x1="80" y1="20" x2="80" y2="80" stroke="#1F1F1F" strokeWidth="1.5" strokeDasharray="3 3" />
          <line x1="20" y1="50" x2="80" y2="50" stroke="#1F1F1F" strokeWidth="1.5" strokeDasharray="3 3" />

          {/* Dalal Street Apex Triangle / Gateway 'D' Monogram */}
          <path
            d="M 22 18 L 52 18 C 74 18, 82 32, 82 50 C 82 68, 74 82, 52 82 L 22 82 Z"
            fill="#121212"
            stroke="#FFFFFF"
            strokeWidth="6"
            strokeLinecap="square"
            strokeLinejoin="miter"
          />

          {/* Electric Pulse / Heartbeat Waveform (Ascending Momentum Breakout) */}
          <path
            d="M 12 56 L 28 56 L 38 32 L 48 76 L 62 24 L 72 56 L 88 56"
            stroke="#FEE360"
            strokeWidth="6"
            strokeLinecap="round"
            strokeLinejoin="round"
          />

          {/* High-Momentum Breakout Arrow Tip at Right */}
          <path
            d="M 80 48 L 90 56 L 80 64"
            stroke="#00E887"
            strokeWidth="5"
            strokeLinecap="round"
            strokeLinejoin="round"
          />

          {/* Electric Nodes */}
          <circle cx="62" cy="24" r="4.5" fill="#00E887" stroke="#000" strokeWidth="2" />
          <circle cx="48" cy="76" r="4" fill="#FEE360" stroke="#000" strokeWidth="2" />
        </svg>
      </div>

      {/* Optional Typography Lockup */}
      {showText && (
        <div className="flex flex-col text-left">
          <div className="flex items-center gap-1.5 leading-none">
            <span className="font-black text-sm tracking-wider text-white uppercase font-sans">
              DSTREET<span className="text-[#FEE360]">PULSE</span>
            </span>
            <span className="text-[9px] font-black tracking-widest px-1 py-0.5 rounded-[2px] bg-[#FEE360] text-black border border-black shadow-[1px_1px_0px_#000]">
              PRO
            </span>
          </div>
          {textVariant === 'full' && (
            <span className="text-[10px] text-zinc-400 font-mono tracking-wide truncate mt-0.5">
              DALAL STREET INTELLIGENCE
            </span>
          )}
        </div>
      )}
    </div>
  );
}
