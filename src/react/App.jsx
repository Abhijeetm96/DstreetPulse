import React, { useState, useEffect } from 'react';
import Sidebar from './components/layout/Sidebar.jsx';
import Header from './components/layout/Header.jsx';
import IndicesStrip from './components/IndicesStrip.jsx';
import LiveMarketTab from './components/LiveMarketTab.jsx';
import HeatmapsTab from './components/HeatmapsTab.jsx';
import IndicesTab from './components/IndicesTab.jsx';
import BhavcopyTab from './components/BhavcopyTab.jsx';
import GainersLosersTab from './components/GainersLosersTab.jsx';
import MostActiveTab from './components/MostActiveTab.jsx';
import BlockDealsTab from './components/BlockDealsTab.jsx';
import McpInspectorTab from './components/McpInspectorTab.jsx';
import SwingScannerTab from './components/SwingScannerTab.jsx';
import FiiDiiTab from './components/FiiDiiTab.jsx';
import StockComparisonTab from './components/StockComparisonTab.jsx';
import StockModal from './components/StockModal.jsx';
import Footer from './components/Footer.jsx';

const TAB_TITLES = {
  'live-market': 'Live Market Snapshot',
  'swing-scanner': 'Swing Trade Breakout Radar',
  'block-deals': 'Block & Bulk Deals (Smart Money Flow)',
  'fii-dii': 'FII & DII Institutional Activity',
  'compare': 'Multi-Stock Comparative Intelligence',
  'heatmaps': 'Sector & Index Heatmaps',
  'indices': 'All Broad & Sectoral Indices',
  'bhavcopy': 'Capital Market Bhavcopy',
  'gainers-losers': 'Top Gainers & Losers',
  'volume-gainers': 'Most Active Securities',
  'mcp-inspector': 'Investor Guide & Terminal Capabilities'
};

const TAB_ORDER = [
  'live-market',
  'swing-scanner',
  'block-deals',
  'fii-dii',
  'compare',
  'heatmaps',
  'indices',
  'bhavcopy',
  'gainers-losers',
  'volume-gainers',
  'mcp-inspector'
];

export default function App() {
  const [data, setData] = useState({ constituents: [], indices: [] });
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState(null);
  const [activeTab, setActiveTab] = useState('live-market');
  const [isSidebarCollapsed, setIsSidebarCollapsed] = useState(false);
  const [isMobileMenuOpen, setIsMobileMenuOpen] = useState(false);
  const [selectedStock, setSelectedStock] = useState(null);
  const [comparisonSymbols, setComparisonSymbols] = useState(['TCS', 'INFY', 'WIPRO']);
  const [selectedSector, setSelectedSector] = useState('ALL');
  const [isRefreshing, setIsRefreshing] = useState(false);
  const [lastUpdated, setLastUpdated] = useState(null);
  const [isStreaming, setIsStreaming] = useState(false);
  const [isPaused, setIsPaused] = useState(false);
  const [ticksCount, setTicksCount] = useState(0);
  const [recentTicks, setRecentTicks] = useState({});

  // 1. Initial Data Fetch
  useEffect(() => {
    async function loadData() {
      try {
        let res = null;
        try {
          const apiRes = await fetch('./api/heatmaps');
          if (apiRes.ok) res = apiRes;
        } catch {
          // Static host fallback
        }
        if (!res) {
          res = await fetch('./data/heatmaps.json');
        }
        if (!res.ok) throw new Error(`HTTP ${res.status}`);
        const json = await res.json();
        setData({
          constituents: json.constituents || [],
          indices: json.indices || [],
          officialGainers: json.officialGainers || [],
          officialLosers: json.officialLosers || [],
          officialVolume: json.officialVolume || [],
          officialValue: json.officialValue || [],
          marketStatus: json.marketStatus || null
        });
        if (json.timestamp) setLastUpdated(json.timestamp);
      } catch (err) {
        console.error('Failed to load NSE market data:', err);
        setError(err.message);
      } finally {
        setLoading(false);
      }
    }
    loadData();
  }, []);

  // 2. Global Keyboard Navigation (1-9 for tabs, Space to toggle pause)
  useEffect(() => {
    function handleGlobalKeys(e) {
      if (e.target.tagName === 'INPUT' || e.target.tagName === 'SELECT' || e.target.tagName === 'TEXTAREA') {
        return;
      }
      const num = parseInt(e.key);
      if (num >= 1 && num <= 9) {
        e.preventDefault();
        setActiveTab(TAB_ORDER[num - 1]);
        setSelectedStock(null);
      } else if (e.code === 'Space') {
        e.preventDefault();
        setIsPaused(p => !p);
      }
    }

    window.addEventListener('keydown', handleGlobalKeys);
    return () => window.removeEventListener('keydown', handleGlobalKeys);
  }, []);

  // 2B. URL Hash synchronization
  useEffect(() => {
    function handleHashChange() {
      const hash = window.location.hash;
      if (!hash || hash === '#' || hash === '#market' || hash === '#live-market') {
        setSelectedStock(null);
        setActiveTab('live-market');
        return;
      }
      if (hash.startsWith('#stock/')) {
        const sym = decodeURIComponent(hash.replace('#stock/', '')).toUpperCase();
        setSelectedStock(prev => {
          if (prev?.symbol === sym) return prev;
          const found = data.constituents?.find(s => s.symbol === sym);
          return found || { symbol: sym, name: sym, ltp: 1000, change_perc: 0 };
        });
        return;
      }
      if (hash.startsWith('#compare')) {
        setSelectedStock(null);
        setActiveTab('compare');
        const qMatch = hash.match(/(?:stocks|symbols)=([^&]+)/);
        if (qMatch && qMatch[1]) {
          const syms = decodeURIComponent(qMatch[1]).split(',').map(s => s.trim().toUpperCase()).filter(Boolean);
          if (syms.length > 0) setComparisonSymbols(syms);
        }
        return;
      }
      if (hash === '#deals' || hash === '#block-deals') {
        setSelectedStock(null);
        setActiveTab('block-deals');
        return;
      }
      if (hash === '#fii-dii') {
        setSelectedStock(null);
        setActiveTab('fii-dii');
        return;
      }

      const cleanTab = hash.slice(1).split('?')[0];
      const aliasMap = {
        'market': 'live-market',
        'scanner': 'swing-scanner',
        'deals': 'block-deals',
        'movers': 'gainers-losers',
        'active': 'volume-gainers',
        'mcp': 'mcp-inspector',
        'guide': 'mcp-inspector',
        'playbook': 'mcp-inspector'
      };
      const targetTab = aliasMap[cleanTab] || cleanTab;
      if (TAB_ORDER.includes(targetTab)) {
        setSelectedStock(null);
        setActiveTab(targetTab);
      }
    }

    handleHashChange();
    window.addEventListener('hashchange', handleHashChange);
    return () => window.removeEventListener('hashchange', handleHashChange);
  }, []);

  // Update selected stock modal details once constituents load for direct #stock/ links
  useEffect(() => {
    if (window.location.hash.startsWith('#stock/') && data.constituents?.length > 0) {
      const sym = decodeURIComponent(window.location.hash.replace('#stock/', '')).toUpperCase();
      const found = data.constituents.find(s => s.symbol === sym);
      if (found) {
        setSelectedStock(found);
      }
    }
  }, [data.constituents]);

  const handleSelectStock = (stock) => {
    if (!stock) {
      setSelectedStock(null);
      window.location.hash = activeTab;
      return;
    }
    setSelectedStock(stock);
    window.location.hash = `stock/${stock.symbol}`;
  };

  const handleCloseStock = () => {
    setSelectedStock(null);
    window.location.hash = activeTab;
  };

  const handleNavigateStock = (direction) => {
    if (!selectedStock || !data.constituents?.length) return;
    const currentIndex = data.constituents.findIndex(s => s.symbol === selectedStock.symbol);
    if (currentIndex === -1) return;
    const nextIndex = direction === 'next'
      ? (currentIndex + 1) % data.constituents.length
      : (currentIndex - 1 + data.constituents.length) % data.constituents.length;
    const nextStock = data.constituents[nextIndex];
    setSelectedStock(nextStock);
    window.location.hash = `stock/${nextStock.symbol}`;
  };

  // 3. Real-Time 1-Second Price Streaming Engine (SSE)
  useEffect(() => {
    let es = null;
    let failedAttempts = 0;

    function startStreaming() {
      try {
        es = new EventSource('./api/stream-ticks');
        es.onopen = () => {
          setIsStreaming(true);
          failedAttempts = 0;
        };

        es.onmessage = (event) => {
          if (isPaused) return; // Skip updating UI if user paused streaming

          try {
            const payload = JSON.parse(event.data);
            if (!payload) return;

            // Handle market status updates (e.g. Market Closed / Session Ended)
            if (payload.marketStatus) {
              setData(prev => ({ ...prev, marketStatus: payload.marketStatus }));
            }

            if (!payload.ticks || payload.ticks.length === 0) return;

            setTicksCount(prev => prev + payload.ticks.length);
            setLastUpdated(payload.timestamp);

            // Record tick flash map (symbol -> 'up' | 'down')
            const flash = {};
            payload.ticks.forEach(t => {
              flash[t.symbol] = t.dir;
            });
            if (payload.indices) {
              payload.indices.forEach(i => {
                flash[i.name] = i.dir;
              });
            }
            setRecentTicks(prev => ({ ...prev, ...flash }));

            setTimeout(() => {
              setRecentTicks(prev => {
                const next = { ...prev };
                payload.ticks.forEach(t => {
                  delete next[t.symbol];
                });
                if (payload.indices) {
                  payload.indices.forEach(i => {
                    delete next[i.name];
                  });
                }
                return next;
              });
            }, 750);

            // Update state with updated constituents and indices
            setData(prev => {
              const tickMap = new Map(payload.ticks.map(t => [t.symbol, t]));
              const nextConstituents = prev.constituents.map(c => {
                const t = tickMap.get(c.symbol);
                if (t) {
                  const newLtp = t.ltp;
                  let updatedReturns = c.returns;
                  if (c.base_prices) {
                    updatedReturns = {
                      '1D': t.change_perc,
                      '1W': c.base_prices['1W'] ? Number((((newLtp - c.base_prices['1W']) / c.base_prices['1W']) * 100).toFixed(2)) : c.returns?.['1W'],
                      '1M': c.base_prices['1M'] ? Number((((newLtp - c.base_prices['1M']) / c.base_prices['1M']) * 100).toFixed(2)) : c.returns?.['1M'],
                      '3M': c.base_prices['3M'] ? Number((((newLtp - c.base_prices['3M']) / c.base_prices['3M']) * 100).toFixed(2)) : c.returns?.['3M'],
                      '6M': c.base_prices['6M'] ? Number((((newLtp - c.base_prices['6M']) / c.base_prices['6M']) * 100).toFixed(2)) : c.returns?.['6M'],
                      '1Y': c.base_prices['1Y'] ? Number((((newLtp - c.base_prices['1Y']) / c.base_prices['1Y']) * 100).toFixed(2)) : c.returns?.['1Y']
                    };
                  } else if (c.returns) {
                    updatedReturns = { ...c.returns, '1D': t.change_perc };
                  }

                  return {
                    ...c,
                    ltp: t.ltp,
                    change_perc: t.change_perc,
                    returns: updatedReturns,
                    open: t.open || c.open,
                    high: t.high || c.high,
                    low: t.low || c.low,
                    volume: t.volume || c.volume
                  };
                }
                return c;
              });

              let nextIndices = prev.indices;
              if (payload.indices && payload.indices.length > 0) {
                const idxMap = new Map(payload.indices.map(i => [i.name, i]));
                nextIndices = prev.indices.map(idx => {
                  const t = idxMap.get(idx.name);
                  if (t) {
                    return {
                      ...idx,
                      ltp: t.ltp,
                      change_perc: t.change_perc
                    };
                  }
                  return idx;
                });
              }

              return {
                ...prev,
                constituents: nextConstituents,
                indices: nextIndices
              };
            });

            // Update selected stock in modal if open
            setSelectedStock(current => {
              if (!current) return current;
              const t = payload.ticks.find(x => x.symbol === current.symbol);
              if (t) {
                return {
                  ...current,
                  ltp: t.ltp,
                  change_perc: t.change_perc,
                  open: t.open || current.open,
                  high: t.high || current.high,
                  low: t.low || current.low,
                  volume: t.volume || current.volume
                };
              }
              return current;
            });
          } catch (e) {
            console.error('Tick processing error:', e);
          }
        };

        es.onerror = () => {
          setIsStreaming(false);
          if (es) {
            es.close();
            es = null;
          }
          failedAttempts++;
          if (failedAttempts < 2) {
            setTimeout(startStreaming, 4000);
          }
        };
      } catch (err) {
        console.error('SSE connect failed:', err);
      }
    }

    startStreaming();

    return () => {
      if (es) es.close();
    };
  }, [isPaused]);

  const handleRefreshLive = async () => {
    setIsRefreshing(true);
    try {
      let res = null;
      try {
        const apiRes = await fetch('./api/refresh-live');
        if (apiRes.ok) res = apiRes;
      } catch {
        // static fallback
      }
      if (!res) {
        res = await fetch('./data/heatmaps.json');
      }
      if (res.ok) {
        const json = await res.json();
        if (json.catalog) {
          setData({
            constituents: json.catalog.constituents || [],
            indices: json.catalog.indices || [],
            officialGainers: json.catalog.officialGainers || [],
            officialLosers: json.catalog.officialLosers || [],
            officialVolume: json.catalog.officialVolume || [],
            officialValue: json.catalog.officialValue || [],
            marketStatus: json.catalog.marketStatus || null
          });
          setLastUpdated(json.timestamp || new Date().toISOString());
        }
      }
    } catch (err) {
      console.error('Failed to sync live prices:', err);
    } finally {
      setIsRefreshing(false);
    }
  };

  // Handle clicking index in the top strip
  const handleSelectIndex = (idxName) => {
    const sectorMap = {
      'BANK': 'Banking',
      'IT': 'IT',
      'AUTO': 'Auto',
      'PHARMA': 'Pharma',
      'FMCG': 'FMCG',
      'METAL': 'Metals',
      'REALTY': 'Realty',
      'ENERGY': 'Energy',
      'OIL & GAS': 'Energy',
      'FIN': 'Banking',
      'MEDIA': 'Media',
      'CONSUMER': 'Retail',
      'HEALTHCARE': 'Pharma',
      'INFRA': 'Infra',
      'COMMODITIES': 'Metals'
    };

    const upper = (idxName || '').toUpperCase();
    let matchedSector = 'ALL';
    for (const [key, sec] of Object.entries(sectorMap)) {
      if (upper.includes(key)) {
        matchedSector = sec;
        break;
      }
    }

    setSelectedSector(matchedSector);
    setActiveTab('heatmaps');
  };

  const handleExportCSV = () => {
    if (!data.constituents || data.constituents.length === 0) return;
    const headers = ['Symbol', 'Security Name', 'Sector', 'Series', 'Open', 'High', 'Low', 'Close / LTP', 'Change %', 'Traded Volume', 'ISIN'];
    const rows = data.constituents.map(c => [
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
    link.setAttribute('download', `NSE_CM_Bhavcopy_Report_${new Date().toISOString().slice(0, 10)}.csv`);
    document.body.appendChild(link);
    link.click();
    document.body.removeChild(link);
  };

  const handleTabChange = (id) => {
    setActiveTab(id);
    setSelectedStock(null);
    if (id === 'compare') {
      window.location.hash = `compare?stocks=${comparisonSymbols.join(',')}`;
    } else {
      window.location.hash = id;
    }
    setIsMobileMenuOpen(false);
  };

  const renderTabContent = () => (
    <>
      {activeTab === 'live-market' && (
        <LiveMarketTab
          constituents={data.constituents}
          indices={data.indices}
          officialGainers={data.officialGainers}
          officialLosers={data.officialLosers}
          marketStatus={data.marketStatus}
          onSelectStock={handleSelectStock}
          recentTicks={recentTicks}
        />
      )}

      {activeTab === 'swing-scanner' && (
        <SwingScannerTab
          constituents={data.constituents}
          indices={data.indices}
          onSelectStock={handleSelectStock}
          recentTicks={recentTicks}
        />
      )}

      {activeTab === 'block-deals' && (
        <BlockDealsTab
          onSelectStock={handleSelectStock}
        />
      )}

      {activeTab === 'fii-dii' && (
        <FiiDiiTab />
      )}

      {activeTab === 'compare' && (
        <StockComparisonTab
          constituents={data.constituents}
          initialSymbols={comparisonSymbols}
          onSelectStock={handleSelectStock}
        />
      )}

      {activeTab === 'heatmaps' && (
        <HeatmapsTab
          constituents={data.constituents}
          indices={data.indices}
          initialSector={selectedSector}
          onSelectStock={handleSelectStock}
          recentTicks={recentTicks}
        />
      )}

      {activeTab === 'indices' && (
        <IndicesTab indices={data.indices} recentTicks={recentTicks} />
      )}

      {activeTab === 'bhavcopy' && (
        <BhavcopyTab
          constituents={data.constituents}
          onSelectStock={handleSelectStock}
          recentTicks={recentTicks}
        />
      )}

      {activeTab === 'gainers-losers' && (
        <GainersLosersTab
          constituents={data.constituents}
          officialGainers={data.officialGainers}
          officialLosers={data.officialLosers}
          onSelectStock={handleSelectStock}
          recentTicks={recentTicks}
        />
      )}

      {activeTab === 'volume-gainers' && (
        <MostActiveTab
          constituents={data.constituents}
          officialVolume={data.officialVolume}
          officialValue={data.officialValue}
          onSelectStock={handleSelectStock}
          recentTicks={recentTicks}
        />
      )}

      {activeTab === 'mcp-inspector' && (
        <McpInspectorTab onNavigateTab={handleTabChange} />
      )}
    </>
  );

  return (
    <div className="flex h-screen w-full overflow-hidden bg-background">
      {/* CRED NeoPOP Collapsible Sidebar with Mobile Drawer */}
      <Sidebar
        activeTab={selectedStock ? '' : activeTab}
        onTabChange={handleTabChange}
        isCollapsed={isSidebarCollapsed}
        onToggleCollapse={() => setIsSidebarCollapsed(!isSidebarCollapsed)}
        isMobileOpen={isMobileMenuOpen}
        onCloseMobile={() => setIsMobileMenuOpen(false)}
      />

      {/* Main App Content Area */}
      <div className="flex flex-1 flex-col overflow-hidden w-full">
        {/* CRED NeoPOP Top Header with Real-Time 1s Ticker & Controls */}
        <Header
          activeTabTitle={selectedStock ? `${selectedStock.symbol} • Stock Intelligence Terminal` : (TAB_TITLES[activeTab] || 'Overview')}
          selectedStock={selectedStock}
          onCloseStock={handleCloseStock}
          constituents={data.constituents}
          onSelectStock={handleSelectStock}
          onExportCSV={handleExportCSV}
          onRefreshLive={handleRefreshLive}
          isRefreshing={isRefreshing}
          lastUpdated={lastUpdated}
          isStreaming={isStreaming}
          ticksCount={ticksCount}
          isPaused={isPaused}
          onTogglePause={() => setIsPaused(p => !p)}
          marketStatus={data.marketStatus}
          onToggleMobileMenu={() => setIsMobileMenuOpen(!isMobileMenuOpen)}
        />

        {/* Major Indices Ticker Strip */}
        <IndicesStrip
          indices={data.indices}
          onSelectIndex={handleSelectIndex}
          recentTicks={recentTicks}
        />

        {/* Scrollable View Container */}
        <main className="flex-1 overflow-y-auto p-3 sm:p-4 md:p-6 scrollbar-thin">
          <div className="mx-auto max-w-7xl space-y-6">
            {loading && (
              <div className="flex flex-col items-center justify-center p-20 gap-3 text-muted-foreground">
                <div className="h-8 w-8 animate-spin rounded-full border-3 border-primary border-t-[#ED6C02]"></div>
                <div className="text-sm font-semibold">Connecting to official NSE Capital Market feeds...</div>
              </div>
            )}

            {error && (
              <div className="rounded-lg border border-destructive/30 bg-destructive/10 p-4 text-center text-sm text-destructive">
                Failed to load market feeds: {error}. Please verify the backend server status.
              </div>
            )}

            {!loading && !error && (
              selectedStock ? (
                /* Dedicated Full-Page Stock Intelligence Terminal */
                <StockModal
                  stock={selectedStock}
                  onClose={handleCloseStock}
                  parentTabName={TAB_TITLES[activeTab] || 'Market'}
                  allStocks={data.constituents}
                  onNavigateStock={handleNavigateStock}
                />
              ) : (
                renderTabContent()
              )
            )}

            <Footer />
          </div>
        </main>
      </div>
    </div>
  );
}
