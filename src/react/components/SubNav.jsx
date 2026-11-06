import React from 'react';

const TABS = [
  { id: 'live-market', label: '📊 Live Market Snapshot' },
  { id: 'heatmaps', label: '🗺️ Sector & Index Heatmaps' },
  { id: 'indices', label: '📈 All Broad & Sectoral Indices (43)' },
  { id: 'bhavcopy', label: '📋 Official CM Bhavcopy (501 Equities)' },
  { id: 'gainers-losers', label: '🔥 Top Gainers & Losers' },
  { id: 'volume-gainers', label: '⚡ Most Active by Volume & Value' },
  { id: 'mcp-inspector', label: '🛠️ NSE MCP Server Specs' }
];

export default function SubNav({ activeTab, onTabChange }) {
  return (
    <nav className="nse-sub-nav bg-[#001E33] px-6 flex items-center gap-1 border-b border-slate-700 overflow-x-auto select-none scrollbar-none">
      {TABS.map((tab) => {
        const isActive = activeTab === tab.id;
        return (
          <button
            key={tab.id}
            onClick={() => onTabChange(tab.id)}
            className={`nse-tab-btn px-4 py-2.5 text-xs font-bold transition-all whitespace-nowrap border-b-2 flex items-center gap-1.5 ${
              isActive
                ? 'border-[#ED6C02] text-white bg-white/10 shadow-inner'
                : 'border-transparent text-gray-300 hover:text-white hover:bg-white/5'
            }`}
          >
            {tab.label}
          </button>
        );
      })}
    </nav>
  );
}

