import React from 'react';

export default function TopStrip({ marketDate = 'Thursday, 29 October 2026' }) {
  return (
    <div className="nse-top-strip flex justify-between items-center text-xs py-1.5 px-6 bg-[#001A2C] text-gray-300 border-b border-slate-700">
      <div className="flex items-center gap-4">
        <span>
          <b className="text-gray-400">Market Status:</b>{' '}
          <span className="text-emerald-400 font-semibold">● Normal Trading (Closed)</span>
        </span>
        <span className="text-slate-600">|</span>
        <span>
          <b className="text-gray-400">Date:</b>{' '}
          <span className="text-white font-medium">{marketDate}</span>
        </span>
      </div>
      <div className="flex items-center gap-4 text-[11px]">
        <span className="flex items-center gap-1.5">
          <span className="w-2 h-2 rounded-full bg-emerald-400 animate-pulse"></span>
          <span>NSE Capital Market MCP Server:</span>
          <b className="text-emerald-400">mcp.nseindia.in (Live)</b>
        </span>
      </div>
    </div>
  );
}

