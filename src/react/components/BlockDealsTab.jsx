import React, { useState, useEffect, useMemo } from 'react';
import {
  Landmark,
  Building2,
  Users,
  TrendingUp,
  TrendingDown,
  Search,
  Filter,
  ExternalLink,
  ShieldCheck,
  Zap,
  ArrowUpRight,
  ArrowDownRight,
  IndianRupee,
  Briefcase,
  Layers,
  Calendar,
  CheckCircle2,
  Clock,
  RefreshCw,
  GitCompare,
  PieChart,
  ChevronDown
} from 'lucide-react';
import { formatIndianCurrency, formatVolume } from '../utils/formatters.js';
import { getAsmStatus } from '../utils/asmRegistry.js';
import { getMarketCap, filterByMarketCap } from '../utils/mktCapRegistry.js';
import MarketCapFilter from './MarketCapFilter.jsx';

export default function BlockDealsTab({ onSelectStock }) {
  const [data, setData] = useState(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState(null);
  const [subView, setSubView] = useState('block'); // 'block' | 'bulk' | 'insider' | 'fii-dii' | 'reconciliation'
  const [filterAction, setFilterAction] = useState('ALL'); // 'ALL' | 'BUY' | 'SELL' | 'MEGA' | 'RECONCILED'
  const [selectedCap, setSelectedCap] = useState('ALL'); // 'ALL' | 'LARGE' | 'MID' | 'SMALL' | 'MICRO' | 'PENNY'
  const [searchQuery, setSearchQuery] = useState('');
  const [selectedDate, setSelectedDate] = useState('TODAY'); // 'TODAY' | 'ALL' | 'YYYY-MM-DD'
  const [selectedEntity, setSelectedEntity] = useState(null); // for entity drill-down
  const [recentlyAddedIds, setRecentlyAddedIds] = useState(new Set());
  const [latestLiveTrade, setLatestLiveTrade] = useState(null);
  const [liveTradeCount, setLiveTradeCount] = useState(0);

  // Fetch Institutional Deals Data from Server with Date & Query filters (with background polling)
  useEffect(() => {
    let isMounted = true;

    async function loadDeals(isInitial = false) {
      try {
        if (isInitial) setLoading(true);
        const params = new URLSearchParams();
        if (selectedDate) params.set('date', selectedDate);
        if (filterAction !== 'ALL') params.set('action', filterAction);
        if (searchQuery.trim()) params.set('q', searchQuery.trim());

        let res = null;
        try {
          const apiRes = await fetch(`./api/deals?${params.toString()}`);
          if (apiRes.ok) res = apiRes;
        } catch {
          // static fallback
        }
        if (!res) {
          res = await fetch('./data/deals.json');
        }
        if (!res.ok) throw new Error(`HTTP ${res.status}`);
        const json = await res.json();
        if (isMounted) {
          setData(json);
          setError(null);
        }
      } catch (err) {
        if (isMounted && isInitial) {
          console.error('Failed to load institutional deals:', err);
          setError(err.message);
        }
      } finally {
        if (isMounted && isInitial) {
          setLoading(false);
        }
      }
    }

    loadDeals(true);

    // Background auto-sync every 4 seconds to pull fresh deals in real-time
    const pollInterval = setInterval(() => {
      loadDeals(false);
    }, 4000);

    return () => {
      isMounted = false;
      clearInterval(pollInterval);
    };
  }, [selectedDate, filterAction, searchQuery]);

  // Real-Time SSE Stream Listener for Live Institutional Orders
  useEffect(() => {
    let evtSource;
    try {
      evtSource = new EventSource('./api/stream-ticks');
      evtSource.onerror = () => {
        if (evtSource) {
          evtSource.close();
          evtSource = null;
        }
      };
      evtSource.onmessage = (event) => {
        try {
          const payload = JSON.parse(event.data);
          if (payload.liveDeal) {
            const deal = payload.liveDeal;
            setRecentlyAddedIds(prev => new Set([...prev, deal.id]));
            setLatestLiveTrade(deal);
            setLiveTradeCount(prev => prev + 1);

            // Prepend new live deal into UI dataset
            setData(prev => {
              if (!prev) return prev;
              const type = deal.id.includes('BLOCK') ? 'blockDeals' : deal.id.includes('BULK') ? 'bulkDeals' : 'insiderTrades';
              const currentList = prev[type] || [];
              if (currentList.some(d => d.id === deal.id)) return prev;

              const updatedList = [deal, ...currentList].sort((a, b) => (b.timestamp || 0) - (a.timestamp || 0));
              return {
                ...prev,
                [type]: updatedList,
                summary: {
                  ...prev.summary,
                  blockDealsCount: type === 'blockDeals' ? (prev.summary?.blockDealsCount || 0) + 1 : prev.summary?.blockDealsCount,
                  totalBlockTurnoverCr: type === 'blockDeals' ? Number(((prev.summary?.totalBlockTurnoverCr || 0) + deal.dealValueCr).toFixed(1)) : prev.summary?.totalBlockTurnoverCr,
                  bulkDealsCount: type === 'bulkDeals' ? (prev.summary?.bulkDealsCount || 0) + 1 : prev.summary?.bulkDealsCount,
                  totalBulkTurnoverCr: type === 'bulkDeals' ? Number(((prev.summary?.totalBulkTurnoverCr || 0) + deal.dealValueCr).toFixed(1)) : prev.summary?.totalBulkTurnoverCr,
                  insiderFilingsCount: type === 'insiderTrades' ? (prev.summary?.insiderFilingsCount || 0) + 1 : prev.summary?.insiderFilingsCount
                }
              };
            });

            // Clear glow animation after 4 seconds
            setTimeout(() => {
              setRecentlyAddedIds(prev => {
                const next = new Set(prev);
                next.delete(deal.id);
                return next;
              });
            }, 4000);
          }
        } catch (_) {}
      };
    } catch (_) {}

    return () => {
      if (evtSource) evtSource.close();
    };
  }, []);

  const summary = data?.summary;
  const fiiDiiFlows = data?.fiiDiiFlows;
  const availableSessions = data?.availableSessions || [
    { date: '2026-11-09', label: '09 Nov 2026 (Latest)', isLatest: true },
    { date: '2026-11-06', label: '06 Nov 2026 (Friday)' },
    { date: '2026-11-05', label: '05 Nov 2026 (Thursday)' },
    { date: '2026-11-04', label: '04 Nov 2026 (Wednesday)' },
    { date: '2026-11-03', label: '03 Nov 2026 (Tuesday)' }
  ];

  // Filtered Block Deals
  const filteredBlockDeals = useMemo(() => {
    if (!data?.blockDeals) return [];
    let list = data.blockDeals;
    const q = searchQuery.trim().toLowerCase();
    if (q) {
      list = list.filter(d => 
        d.symbol.toLowerCase().includes(q) ||
        d.companyName.toLowerCase().includes(q) ||
        d.clientName.toLowerCase().includes(q) ||
        d.counterparty.toLowerCase().includes(q)
      );
    }
    if (filterAction === 'BUY') list = list.filter(d => d.dealType === 'BUY');
    if (filterAction === 'SELL') list = list.filter(d => d.dealType === 'SELL');
    if (filterAction === 'MEGA') list = list.filter(d => d.dealValueCr >= 300);
    if (filterAction === 'RECONCILED') list = list.filter(d => d.reconciliation?.status === 'RECONCILED_EXIT');
    if (selectedCap !== 'ALL') list = filterByMarketCap(list, selectedCap);
    return [...list].sort((a, b) => (b.timestamp || 0) - (a.timestamp || 0));
  }, [data?.blockDeals, searchQuery, filterAction, selectedCap]);

  // Filtered Bulk Deals
  const filteredBulkDeals = useMemo(() => {
    if (!data?.bulkDeals) return [];
    let list = data.bulkDeals;
    const q = searchQuery.trim().toLowerCase();
    if (q) {
      list = list.filter(d => 
        d.symbol.toLowerCase().includes(q) ||
        d.companyName.toLowerCase().includes(q) ||
        d.clientName.toLowerCase().includes(q)
      );
    }
    if (filterAction === 'BUY') list = list.filter(d => d.dealType === 'BUY');
    if (filterAction === 'SELL') list = list.filter(d => d.dealType === 'SELL');
    if (filterAction === 'MEGA') list = list.filter(d => d.dealValueCr >= 200);
    if (filterAction === 'RECONCILED') list = list.filter(d => d.reconciliation?.status === 'RECONCILED_EXIT');
    if (selectedCap !== 'ALL') list = filterByMarketCap(list, selectedCap);
    return [...list].sort((a, b) => (b.timestamp || 0) - (a.timestamp || 0));
  }, [data?.bulkDeals, searchQuery, filterAction, selectedCap]);

  // Filtered Insider & Promoter Filings
  const filteredInsiderTrades = useMemo(() => {
    if (!data?.insiderTrades) return [];
    let list = data.insiderTrades;
    const q = searchQuery.trim().toLowerCase();
    if (q) {
      list = list.filter(d => 
        d.symbol.toLowerCase().includes(q) ||
        d.companyName.toLowerCase().includes(q) ||
        d.personName.toLowerCase().includes(q) ||
        d.designation.toLowerCase().includes(q)
      );
    }
    if (filterAction === 'BUY') list = list.filter(d => d.action === 'BUY');
    if (filterAction === 'SELL') list = list.filter(d => d.action === 'SELL');
    if (filterAction === 'MEGA') list = list.filter(d => d.dealValueCr >= 200);
    if (filterAction === 'RECONCILED') list = list.filter(d => d.reconciliation?.status === 'PROMOTER_OFFLOADING');
    if (selectedCap !== 'ALL') list = filterByMarketCap(list, selectedCap);
    return [...list].sort((a, b) => (b.timestamp || 0) - (a.timestamp || 0));
  }, [data?.insiderTrades, searchQuery, filterAction, selectedCap]);

  // Reconciled Round-Trip Ledger Entries (Combining blocks & bulks)
  const reconciledLedger = useMemo(() => {
    const all = [...(data?.blockDeals || []), ...(data?.bulkDeals || [])];
    let mapped = all.map(d => ({
      ...d,
      reconciliation: d.reconciliation || {
        status: d.dealType === 'BUY' ? 'OPEN_HOLDING' : 'RECONCILED_EXIT',
        holdingDays: 1,
        pnlCr: 0,
        pnlPct: 0,
        entryDate: d.date,
        exitDate: d.dealType === 'SELL' ? d.date : null,
        notes: 'Standard trade execution'
      }
    }));
    if (selectedCap !== 'ALL') mapped = filterByMarketCap(mapped, selectedCap);
    return mapped;
  }, [data?.blockDeals, data?.bulkDeals, selectedCap]);

  // Market Cap counts for active subview
  const mktCapCounts = useMemo(() => {
    let sourceList = [];
    if (subView === 'block') sourceList = data?.blockDeals || [];
    else if (subView === 'bulk') sourceList = data?.bulkDeals || [];
    else if (subView === 'insider') sourceList = data?.insiderTrades || [];
    else if (subView === 'reconciliation') sourceList = [...(data?.blockDeals || []), ...(data?.bulkDeals || [])];
    else sourceList = [];

    const counts = { ALL: sourceList.length, LARGE: 0, MID: 0, SMALL: 0, MICRO: 0, PENNY: 0 };
    sourceList.forEach(item => {
      const mc = getMarketCap(item.symbol);
      if (counts[mc.category] !== undefined) counts[mc.category]++;
      if (mc.isPenny) counts.PENNY++;
    });
    return counts;
  }, [subView, data]);

  return (
    <div className="space-y-4 sm:space-y-6">
      {/* 1. Header & Institutional Apex Metrics Strip */}
      <div className="neopop-card p-4 sm:p-5 border-2 border-black bg-[#151515] rounded-[4px] shadow-[4px_4px_0px_#000000]">
        <div className="flex flex-wrap items-center justify-between gap-3 mb-4 pb-3 border-b-2 border-black">
          <div className="flex items-center gap-2.5">
            <span className="p-2 rounded-[3px] bg-[#111111] text-[#FEE360] border-2 border-black shadow-[2px_2px_0px_#000000]">
              <Landmark className="w-5 h-5 text-[#FEE360]" />
            </span>
            <div>
              <div className="flex items-center gap-2 flex-wrap">
                <span className="w-2.5 h-2.5 bg-[#00E887] border border-black shadow-[1px_1px_0px_#000]"></span>
                <h2 className="neopop-heading font-black text-lg sm:text-xl text-white tracking-tight uppercase">
                  Institutional Flow &amp; Smart Money Deals Radar
                </h2>
                <span className="neopop-tag bg-[#1E1E1E] text-[#00E887]">
                  NSE Windows &bull; SEBI SAST Filings
                </span>
                <span className="neopop-tag bg-[#3657FF] text-white font-mono font-bold">
                  Round-Trip Reconciliation Active
                </span>
              </div>
              <p className="neopop-body text-xs text-zinc-400 mt-1">
                Real-time tracking of Exchange Block Windows, Bulk Orders (&gt;0.5% Stake), Promoter Buy/Sell Disclosures, and Buy vs Sell Reconciliation.
              </p>
            </div>
          </div>

          {/* Session Date Selector Dropdown & Quick Badges */}
          <div className="flex items-center gap-2 flex-wrap">
            <div className="flex items-center gap-1.5 bg-[#101010] p-1.5 rounded-[3px] border-2 border-black shadow-[2px_2px_0px_#000]">
              <Calendar className="w-4 h-4 text-[#FEE360]" />
              <span className="text-[10px] font-mono text-zinc-400 uppercase font-bold mr-1">Session:</span>
              <select
                value={selectedDate}
                onChange={(e) => setSelectedDate(e.target.value)}
                className="bg-[#181818] text-[#FEE360] font-mono text-xs font-bold px-2 py-1 border border-black rounded-[2px] focus:outline-none cursor-pointer"
              >
                <option value="TODAY">TODAY (Live Session - Newest First)</option>
                <option value="ALL">ALL SESSIONS (Newest to Oldest)</option>
                {availableSessions.map(s => (
                  <option key={s.date} value={s.date}>
                    {s.label}
                  </option>
                ))}
              </select>
            </div>
          </div>
        </div>

        {/* Real-Time Live Institutional Execution Beacon Bar */}
        <div className="bg-[#101010] p-2.5 rounded-[3px] border-2 border-black shadow-[3px_3px_0px_#000] flex items-center justify-between gap-3 flex-wrap font-mono text-xs">
          <div className="flex items-center gap-2">
            <span className="relative flex h-3 w-3">
              <span className="animate-ping absolute inline-flex h-full w-full rounded-full bg-[#00E887] opacity-75"></span>
              <span className="relative inline-flex rounded-full h-3 w-3 bg-[#00E887] border border-black"></span>
            </span>
            <span className="text-[#00E887] font-black uppercase text-[11px] tracking-wider">
              REAL-TIME SMART MONEY FEED ACTIVE
            </span>
            <span className="text-zinc-500">•</span>
            <span className="text-zinc-300 text-[11px]">
              Session: <strong className="text-white">{data?.currentDate || 'Today'}</strong>
            </span>
            {liveTradeCount > 0 && (
              <span className="neopop-tag bg-[#00E887] text-black text-[9px] py-0 px-1 font-black animate-pulse">
                +{liveTradeCount} Live Executions
              </span>
            )}
          </div>

          <div className="flex items-center gap-3 text-[11px] flex-wrap">
            {latestLiveTrade ? (
              <div className="flex items-center gap-1.5 bg-[#00E887]/15 border border-[#00E887]/40 px-2 py-0.5 rounded-[2px] text-[#00E887] animate-pulse">
                <Zap className="w-3 h-3 text-[#00E887]" />
                <span className="font-bold">LATEST TRADE:</span>
                <span className="text-white font-black">{latestLiveTrade.symbol}</span>
                <span>₹{latestLiveTrade.dealValueCr} Cr {latestLiveTrade.dealType}</span>
                <span className="text-zinc-400">@{latestLiveTrade.time}</span>
              </div>
            ) : (
              <div className="flex items-center gap-1.5 text-zinc-400">
                <Clock className="w-3 h-3 text-[#FEE360]" />
                <span>Sort Order: <strong className="text-[#FEE360]">Today &amp; Newest Time First</strong></span>
              </div>
            )}
            <span className="neopop-tag bg-[#1E1E1E] text-zinc-300 border border-zinc-700 text-[9px] py-0.5 px-1.5 font-bold">
              ⚡ LIVE STREAMING
            </span>
          </div>
        </div>

        {/* 5 Apex Metric Plinths */}
        <div className="grid grid-cols-2 md:grid-cols-5 gap-3">
          {/* Block Deals Turnover */}
          <div
            onClick={() => setSubView('block')}
            className={`p-3 rounded-[3px] border-2 border-black cursor-pointer transition-all ${
              subView === 'block' ? 'bg-[#1F1F1F] shadow-[3px_3px_0px_#FEE360]' : 'bg-[#111111] shadow-[2px_2px_0px_#000000] hover:bg-[#1A1A1A]'
            }`}
          >
            <div className="flex items-center justify-between">
              <span className="text-[10px] font-mono text-[#FEE360] font-bold uppercase flex items-center gap-1">
                <Building2 className="w-3 h-3 text-[#FEE360]" /> Block Deals
              </span>
              <span className="neopop-tag bg-[#FEE360] text-black text-[9px] py-0 px-1 font-black">
                {summary?.blockDealsCount || filteredBlockDeals.length} Trades
              </span>
            </div>
            <div className="text-base sm:text-lg font-black font-mono text-white mt-1">
              ₹{(summary?.totalBlockTurnoverCr || 0).toLocaleString('en-IN', { minimumFractionDigits: 1 })} Cr
            </div>
            <div className="text-[10px] font-mono text-zinc-400 mt-0.5">
              Window: Morning &amp; Afternoon
            </div>
          </div>

          {/* Bulk Deals Turnover */}
          <div
            onClick={() => setSubView('bulk')}
            className={`p-3 rounded-[3px] border-2 border-black cursor-pointer transition-all ${
              subView === 'bulk' ? 'bg-[#1F1F1F] shadow-[3px_3px_0px_#FEE360]' : 'bg-[#111111] shadow-[2px_2px_0px_#000000] hover:bg-[#1A1A1A]'
            }`}
          >
            <div className="flex items-center justify-between">
              <span className="text-[10px] font-mono text-[#00E887] font-bold uppercase flex items-center gap-1">
                <Briefcase className="w-3 h-3 text-[#00E887]" /> Bulk Deals (&gt;0.5%)
              </span>
              <span className="neopop-tag bg-[#00E887] text-black text-[9px] py-0 px-1 font-black">
                {summary?.bulkDealsCount || filteredBulkDeals.length} Deals
              </span>
            </div>
            <div className="text-base sm:text-lg font-black font-mono text-white mt-1">
              ₹{(summary?.totalBulkTurnoverCr || 0).toLocaleString('en-IN', { minimumFractionDigits: 1 })} Cr
            </div>
            <div className="text-[10px] font-mono text-zinc-400 mt-0.5">
              Super-Investors &amp; Mutual Funds
            </div>
          </div>

          {/* Promoter Net Bias */}
          <div
            onClick={() => setSubView('insider')}
            className={`p-3 rounded-[3px] border-2 border-black cursor-pointer transition-all ${
              subView === 'insider' ? 'bg-[#1F1F1F] shadow-[3px_3px_0px_#FEE360]' : 'bg-[#111111] shadow-[2px_2px_0px_#000000] hover:bg-[#1A1A1A]'
            }`}
          >
            <div className="flex items-center justify-between">
              <span className="text-[10px] font-mono text-[#3657FF] font-bold uppercase flex items-center gap-1">
                <Users className="w-3 h-3 text-[#3657FF]" /> Promoter Net Flow
              </span>
              <span className="neopop-tag bg-[#3657FF] text-white text-[9px] py-0 px-1 font-black">
                {summary?.insiderFilingsCount || filteredInsiderTrades.length} Filings
              </span>
            </div>
            <div className="text-base sm:text-lg font-black font-mono text-[#00E887] mt-1">
              {(summary?.netPromoterCr || 0) >= 0 ? '+' : ''}₹{(summary?.netPromoterCr || 0).toFixed(1)} Cr
            </div>
            <div className="text-[10px] font-mono text-zinc-400 mt-0.5">
              Buy: ₹{summary?.promoterBuyCr || 0} Cr &bull; Sell: ₹{summary?.promoterSellCr || 0} Cr
            </div>
          </div>

          {/* FII/DII Net Flow */}
          <div
            onClick={() => setSubView('fii-dii')}
            className={`p-3 rounded-[3px] border-2 border-black cursor-pointer transition-all ${
              subView === 'fii-dii' ? 'bg-[#1F1F1F] shadow-[3px_3px_0px_#FEE360]' : 'bg-[#111111] shadow-[2px_2px_0px_#000000] hover:bg-[#1A1A1A]'
            }`}
          >
            <div className="flex items-center justify-between">
              <span className="text-[10px] font-mono text-[#00E887] font-bold uppercase flex items-center gap-1">
                <IndianRupee className="w-3 h-3 text-[#00E887]" /> Net Institutional
              </span>
              <span className="neopop-tag bg-[#00E887] text-black text-[9px] py-0 px-1 font-black">
                Cash Inflow
              </span>
            </div>
            <div className="text-base sm:text-lg font-black font-mono text-white mt-1">
              +₹{(summary?.totalNetInstitutionalCr || 0).toLocaleString('en-IN', { minimumFractionDigits: 1 })} Cr
            </div>
            <div className="text-[10px] font-mono text-zinc-400 mt-0.5">
              FII: +₹{summary?.fiiNetFlowCr || 0} Cr &bull; DII: +₹{summary?.diiNetFlowCr || 0} Cr
            </div>
          </div>

          {/* Reconciled Round-Trips */}
          <div
            onClick={() => setSubView('reconciliation')}
            className={`p-3 rounded-[3px] border-2 border-black cursor-pointer transition-all col-span-2 md:col-span-1 ${
              subView === 'reconciliation' ? 'bg-[#1F1F1F] shadow-[3px_3px_0px_#FEE360]' : 'bg-[#111111] shadow-[2px_2px_0px_#000000] hover:bg-[#1A1A1A]'
            }`}
          >
            <div className="flex items-center justify-between">
              <span className="text-[10px] font-mono text-[#FEE360] font-bold uppercase flex items-center gap-1">
                <GitCompare className="w-3 h-3 text-[#FEE360]" /> Reconciliation
              </span>
              <span className="neopop-tag bg-[#00E887] text-black text-[9px] py-0 px-1 font-black">
                Active Audit
              </span>
            </div>
            <div className="text-base sm:text-lg font-black font-mono text-white mt-1">
              {summary?.reconciledCount || 4} Round-Trips
            </div>
            <div className="text-[10px] font-mono text-[#00E887] mt-0.5 font-bold">
              Buy vs Sell Reconciled
            </div>
          </div>
        </div>
      </div>

      {/* 2. Control Toolbar (Sub-Views & Date/Action Filters) */}
      <div className="neopop-card p-3 sm:p-4 border-2 border-black bg-[#171717] rounded-[4px] shadow-[4px_4px_0px_#000000] flex flex-wrap items-center justify-between gap-3">
        {/* Sub-View Mode Selector */}
        <div className="flex flex-wrap items-center gap-1.5 sm:gap-2">
          <button
            onClick={() => setSubView('block')}
            className={`neopop-btn text-xs px-2.5 sm:px-3 py-1 flex items-center gap-1.5 ${
              subView === 'block' ? 'neopop-btn-primary' : 'neopop-btn-dark'
            }`}
          >
            <Building2 className="w-3 h-3" />
            <span>Block Deals Window</span>
          </button>
          <button
            onClick={() => setSubView('bulk')}
            className={`neopop-btn text-xs px-2.5 sm:px-3 py-1 flex items-center gap-1.5 ${
              subView === 'bulk' ? 'neopop-btn-primary' : 'neopop-btn-dark'
            }`}
          >
            <Briefcase className="w-3 h-3" />
            <span>Bulk Deals (&gt;0.5%)</span>
          </button>
          <button
            onClick={() => setSubView('insider')}
            className={`neopop-btn text-xs px-2.5 sm:px-3 py-1 flex items-center gap-1.5 ${
              subView === 'insider' ? 'neopop-btn-primary' : 'neopop-btn-dark'
            }`}
          >
            <Users className="w-3 h-3" />
            <span>Promoter &amp; Insider Filings</span>
          </button>
          <button
            onClick={() => setSubView('reconciliation')}
            className={`neopop-btn text-xs px-2.5 sm:px-3 py-1 flex items-center gap-1.5 ${
              subView === 'reconciliation' ? 'neopop-btn-primary' : 'neopop-btn-dark'
            }`}
          >
            <GitCompare className="w-3 h-3 text-[#FEE360]" />
            <span>Buy vs Sell Reconciled</span>
          </button>
          <button
            onClick={() => setSubView('fii-dii')}
            className={`neopop-btn text-xs px-2.5 sm:px-3 py-1 flex items-center gap-1.5 ${
              subView === 'fii-dii' ? 'neopop-btn-primary' : 'neopop-btn-dark'
            }`}
          >
            <IndianRupee className="w-3 h-3" />
            <span>FII &amp; DII Trend</span>
          </button>
        </div>

        {/* Action Filters & Search */}
        <div className="flex flex-wrap items-center gap-2">
          {subView !== 'fii-dii' && (
            <div className="flex items-center gap-1">
              <button
                onClick={() => setFilterAction('ALL')}
                className={`neopop-btn text-[11px] px-2.5 py-1 ${
                  filterAction === 'ALL' ? 'neopop-btn-secondary' : 'neopop-btn-dark'
                }`}
              >
                All Actions
              </button>
              <button
                onClick={() => setFilterAction('BUY')}
                className={`neopop-btn text-[11px] px-2.5 py-1 ${
                  filterAction === 'BUY' ? 'neopop-btn-success' : 'neopop-btn-dark'
                }`}
              >
                Buys Only
              </button>
              <button
                onClick={() => setFilterAction('SELL')}
                className={`neopop-btn text-[11px] px-2.5 py-1 ${
                  filterAction === 'SELL' ? 'neopop-btn-danger' : 'neopop-btn-dark'
                }`}
              >
                Sells Only
              </button>
              <button
                onClick={() => setFilterAction('RECONCILED')}
                className={`neopop-btn text-[11px] px-2.5 py-1 ${
                  filterAction === 'RECONCILED' ? 'neopop-btn-primary' : 'neopop-btn-dark'
                }`}
              >
                Reconciled Exits
              </button>
            </div>
          )}

          {/* Search Box */}
          <div className="relative">
            <Search className="w-3.5 h-3.5 text-zinc-400 absolute left-2.5 top-2.5" />
            <input
              type="text"
              placeholder="Search ticker, fund, promoter..."
              value={searchQuery}
              onChange={(e) => setSearchQuery(e.target.value)}
              className="bg-[#111111] text-xs text-white pl-8 pr-3 py-1.5 rounded-[3px] border border-black focus:outline-none focus:border-[#FEE360] w-48 sm:w-60 font-mono"
            />
          </div>
        </div>

        {/* Market Cap Filter Pill Row */}
        {subView !== 'fii-dii' && (
          <div className="w-full pt-2.5 border-t border-black/40 flex items-center justify-between flex-wrap gap-2">
            <div className="flex items-center gap-2 flex-wrap">
              <span className="text-[10px] font-mono text-zinc-400 font-bold uppercase tracking-wider flex items-center gap-1">
                <Layers className="w-3 h-3 text-[#FEE360]" /> Market Cap:
              </span>
              <MarketCapFilter
                selectedCap={selectedCap}
                onSelectCap={setSelectedCap}
                counts={mktCapCounts}
              />
            </div>
            {selectedCap !== 'ALL' && (
              <span className="text-[10px] font-mono text-[#FEE360]">
                Filtered by {selectedCap} Cap
              </span>
            )}
          </div>
        )}
      </div>

      {/* 3. SUB-VIEW: Block Deals Table */}
      {subView === 'block' && (
        <div className="neopop-card overflow-hidden border-2 border-black bg-[#171717] rounded-[4px] shadow-[4px_4px_0px_#000000]">
          <div className="px-4 py-3 border-b-2 border-black flex items-center justify-between bg-[#1A1A1A]">
            <div className="flex items-center gap-2">
              <Building2 className="w-4 h-4 text-[#FEE360]" />
              <h3 className="neopop-heading font-black text-white text-xs sm:text-sm tracking-tight uppercase">
                NSE Block Deal Window Executions {selectedDate !== 'ALL' && `(${selectedDate})`}
              </h3>
              <span className="neopop-tag bg-[#1E1E1E] text-zinc-300">
                {filteredBlockDeals.length} Deals Displayed
              </span>
            </div>
            <span className="text-[11px] font-mono text-zinc-400 hidden sm:inline">
              Minimum Threshold: ₹10 Cr or 5,00,000 Equity Shares &bull; Reconciled holding metrics enabled
            </span>
          </div>

          <div className="overflow-x-auto">
            <table className="w-full text-xs text-left border-collapse table-auto">
              <thead>
                <tr className="border-b-2 border-black text-zinc-400 text-[10px] uppercase tracking-wider font-mono font-bold bg-[#141414]">
                  <th className="py-2.5 px-3">Date &amp; Execution Time</th>
                  <th className="py-2.5 px-3">Symbol &amp; Company</th>
                  <th className="py-2.5 px-3">Purchaser (Client Name)</th>
                  <th className="py-2.5 px-3">Seller (Counterparty)</th>
                  <th className="py-2.5 px-3 text-center">Type</th>
                  <th className="py-2.5 px-3 text-right font-mono">Qty</th>
                  <th className="py-2.5 px-3 text-right font-mono">Price (₹)</th>
                  <th className="py-2.5 px-3 text-right font-mono">Value (₹ Cr)</th>
                  <th className="py-2.5 px-3 text-center font-mono">Reconciliation / Holding P&amp;L</th>
                </tr>
              </thead>
              <tbody className="divide-y divide-[#222222] font-medium">
                {filteredBlockDeals.map((d) => {
                  const rec = d.reconciliation;
                  const isExit = rec?.status === 'RECONCILED_EXIT';

                  return (
                    <tr
                      key={d.id}
                      onClick={() => onSelectStock && onSelectStock({ symbol: d.symbol, ltp: d.cmp })}
                      className={`hover:bg-[#1E1E1E] transition-all cursor-pointer group ${
                        recentlyAddedIds.has(d.id) ? 'bg-[#00E887]/20 border-l-4 border-l-[#00E887]' : ''
                      }`}
                    >
                      <td className="py-2.5 px-3 font-mono text-zinc-400 text-[11px]">
                        <div className="flex items-center gap-1.5 flex-wrap">
                          <span className="text-white font-bold">{d.date}</span>
                          <span className="text-[#FEE360] font-black">{d.time || '14:15:00'}</span>
                          {d.isLive && (
                            <span className="neopop-tag bg-[#00E887] text-black text-[8px] py-0 px-1 font-black animate-pulse">
                              ⚡ LIVE
                            </span>
                          )}
                        </div>
                        <div className="text-[9px] text-zinc-400 mt-0.5">{d.window}</div>
                      </td>
                      <td className="py-2.5 px-3 font-bold text-white">
                        <div className="flex items-center gap-1.5 flex-wrap">
                          <span className="group-hover:text-[#FEE360] group-hover:underline transition-colors text-xs font-black font-mono flex items-center gap-1">
                            {d.symbol}
                            <ExternalLink className="w-2.5 h-2.5 text-zinc-500 group-hover:text-[#FEE360] opacity-0 group-hover:opacity-100 transition-opacity" />
                          </span>
                          <span
                            className="neopop-tag text-[9px] py-0 px-1 font-black border"
                            style={{
                              backgroundColor: `${getMarketCap(d.symbol).color}15`,
                              color: getMarketCap(d.symbol).color,
                              borderColor: `${getMarketCap(d.symbol).color}40`
                            }}
                            title={`Market Cap: ₹${getMarketCap(d.symbol).mkt_cap_cr.toLocaleString('en-IN')} Cr (${getMarketCap(d.symbol).label})`}
                          >
                            {getMarketCap(d.symbol).category}
                          </span>
                          {getMarketCap(d.symbol).isPenny && (
                            <span className="neopop-tag bg-[#FF5959]/20 text-[#FF5959] border border-[#FF5959]/40 text-[8px] py-0 px-1 font-black">
                              PENNY
                            </span>
                          )}
                          {getAsmStatus(d.symbol).isAsm && (
                            <span className="neopop-tag bg-[#FF5959]/20 text-[#FF5959] border border-[#FF5959]/40 text-[9px] py-0 px-1 font-black" title="SEBI / NSE ASM Surveillance">
                              ASM
                            </span>
                          )}
                          <span className="neopop-tag bg-[#1E1E1E] text-zinc-300 text-[9px] py-0 px-1 border-black">
                            {d.category}
                          </span>
                        </div>
                        <div className="text-[10px] text-zinc-400 font-normal truncate max-w-[140px]">
                          {d.companyName}
                        </div>
                      </td>
                      <td className="py-2.5 px-3 text-white font-bold text-xs truncate max-w-[200px]" title={d.clientName}>
                        {d.clientName}
                      </td>
                      <td className="py-2.5 px-3 text-zinc-400 text-[11px] truncate max-w-[180px]" title={d.counterparty}>
                        {d.counterparty}
                      </td>
                      <td className="py-2.5 px-3 text-center font-mono">
                        <span className={`neopop-tag text-[10px] font-black ${
                          d.dealType === 'BUY' ? 'bg-[#00E887] text-black' : 'bg-[#FF5959] text-white'
                        }`}>
                          {d.dealType}
                        </span>
                      </td>
                      <td className="py-2.5 px-3 text-right font-mono text-white text-xs">
                        {d.quantity.toLocaleString('en-IN')}
                      </td>
                      <td className="py-2.5 px-3 text-right font-mono text-white text-xs">
                        ₹{d.tradePrice.toLocaleString('en-IN', { minimumFractionDigits: 2 })}
                      </td>
                      <td className="py-2.5 px-3 text-right font-mono font-black text-[#FEE360] text-xs">
                        ₹{d.dealValueCr.toFixed(2)} Cr
                      </td>
                      {/* Reconciliation Column */}
                      <td className="py-2.5 px-3 text-center font-mono">
                        {isExit ? (
                          <div className="inline-flex flex-col items-center">
                            <span className="neopop-tag bg-[#00E887] text-black text-[9px] py-0 px-1.5 font-black">
                              RECONCILED EXIT (+₹{rec.pnlCr} Cr)
                            </span>
                            <span className="text-[9px] text-zinc-400 mt-0.5">
                              Bought: {rec.entryDate} &bull; Held {rec.holdingDays}d
                            </span>
                          </div>
                        ) : (
                          <div className="inline-flex flex-col items-center">
                            <span className="neopop-tag bg-[#1E1E1E] text-[#00E887] border border-black text-[9px] py-0 px-1.5 font-bold">
                              OPEN HOLDING ({rec?.pnlPct >= 0 ? '+' : ''}{rec?.pnlPct || 0}%)
                            </span>
                            <span className="text-[9px] text-zinc-500 mt-0.5">
                              Accumulated: {rec?.entryDate || d.date}
                            </span>
                          </div>
                        )}
                      </td>
                    </tr>
                  );
                })}
              </tbody>
            </table>
          </div>
        </div>
      )}

      {/* 4. SUB-VIEW: Bulk Deals Table */}
      {subView === 'bulk' && (
        <div className="neopop-card overflow-hidden border-2 border-black bg-[#171717] rounded-[4px] shadow-[4px_4px_0px_#000000]">
          <div className="px-4 py-3 border-b-2 border-black flex items-center justify-between bg-[#1A1A1A]">
            <div className="flex items-center gap-2">
              <Briefcase className="w-4 h-4 text-[#00E887]" />
              <h3 className="neopop-heading font-black text-white text-xs sm:text-sm tracking-tight uppercase">
                Exchange Bulk Deals (&gt;0.5% Total Listed Equity) {selectedDate !== 'ALL' && `(${selectedDate})`}
              </h3>
              <span className="neopop-tag bg-[#1E1E1E] text-zinc-300">
                {filteredBulkDeals.length} Deals Displayed
              </span>
            </div>
            <span className="text-[11px] font-mono text-zinc-400 hidden sm:inline">
              Regulatory Disclosure Threshold: Single Trade &gt; 0.5% of Equity Base
            </span>
          </div>

          <div className="overflow-x-auto">
            <table className="w-full text-xs text-left border-collapse table-auto">
              <thead>
                <tr className="border-b-2 border-black text-zinc-400 text-[10px] uppercase tracking-wider font-mono font-bold bg-[#141414]">
                  <th className="py-2.5 px-3">Date &amp; Execution Time</th>
                  <th className="py-2.5 px-3">Symbol &amp; Company</th>
                  <th className="py-2.5 px-3">Client Entity / Investor</th>
                  <th className="py-2.5 px-3 text-center">Category</th>
                  <th className="py-2.5 px-3 text-center">Type</th>
                  <th className="py-2.5 px-3 text-right font-mono">Qty</th>
                  <th className="py-2.5 px-3 text-right font-mono">Price (₹)</th>
                  <th className="py-2.5 px-3 text-right font-mono">Value (₹ Cr)</th>
                  <th className="py-2.5 px-3 text-right font-mono">Stake %</th>
                  <th className="py-2.5 px-3 text-center font-mono">Reconciliation / Round-Trip</th>
                </tr>
              </thead>
              <tbody className="divide-y divide-[#222222] font-medium">
                {filteredBulkDeals.map((d) => {
                  const rec = d.reconciliation;
                  const isExit = rec?.status === 'RECONCILED_EXIT';

                  return (
                    <tr
                      key={d.id}
                      onClick={() => onSelectStock && onSelectStock({ symbol: d.symbol, ltp: d.cmp })}
                      className={`hover:bg-[#1E1E1E] transition-all cursor-pointer group ${
                        recentlyAddedIds.has(d.id) ? 'bg-[#00E887]/20 border-l-4 border-l-[#00E887]' : ''
                      }`}
                    >
                      <td className="py-2.5 px-3 font-mono text-zinc-400 text-[11px]">
                        <div className="flex items-center gap-1.5 flex-wrap">
                          <span className="text-white font-bold">{d.date}</span>
                          <span className="text-[#00E887] font-black">{d.time || '11:30:00'}</span>
                          {d.isLive && (
                            <span className="neopop-tag bg-[#00E887] text-black text-[8px] py-0 px-1 font-black animate-pulse">
                              ⚡ LIVE
                            </span>
                          )}
                        </div>
                        <div className="text-[9px] text-zinc-400 mt-0.5">Intraday Normal Market</div>
                      </td>
                      <td className="py-2.5 px-3 font-bold text-white">
                        <div className="flex items-center gap-1.5 flex-wrap">
                          <span className="group-hover:text-[#FEE360] group-hover:underline transition-colors text-xs font-black font-mono flex items-center gap-1">
                            {d.symbol}
                            <ExternalLink className="w-2.5 h-2.5 text-zinc-500 group-hover:text-[#FEE360] opacity-0 group-hover:opacity-100 transition-opacity" />
                          </span>
                          <span
                            className="neopop-tag text-[9px] py-0 px-1 font-black border"
                            style={{
                              backgroundColor: `${getMarketCap(d.symbol).color}15`,
                              color: getMarketCap(d.symbol).color,
                              borderColor: `${getMarketCap(d.symbol).color}40`
                            }}
                            title={`Market Cap: ₹${getMarketCap(d.symbol).mkt_cap_cr.toLocaleString('en-IN')} Cr (${getMarketCap(d.symbol).label})`}
                          >
                            {getMarketCap(d.symbol).category}
                          </span>
                          {getMarketCap(d.symbol).isPenny && (
                            <span className="neopop-tag bg-[#FF5959]/20 text-[#FF5959] border border-[#FF5959]/40 text-[8px] py-0 px-1 font-black">
                              PENNY
                            </span>
                          )}
                          {getAsmStatus(d.symbol).isAsm && (
                            <span className="neopop-tag bg-[#FF5959]/20 text-[#FF5959] border border-[#FF5959]/40 text-[9px] py-0 px-1 font-black">
                              ASM
                            </span>
                          )}
                        </div>
                        <div className="text-[10px] text-zinc-400 font-normal truncate max-w-[140px]">
                          {d.companyName}
                        </div>
                      </td>
                      <td className="py-2.5 px-3 text-white font-bold text-xs truncate max-w-[220px]" title={d.clientName}>
                        {d.clientName}
                      </td>
                      <td className="py-2.5 px-3 text-center font-mono">
                        <span className={`neopop-tag text-[9px] py-0 px-1 font-bold ${
                          d.category === 'SUPER_INVESTOR' ? 'bg-[#FEE360] text-black' : 'bg-[#1E1E1E] text-zinc-300'
                        }`}>
                          {d.category}
                        </span>
                      </td>
                      <td className="py-2.5 px-3 text-center font-mono">
                        <span className={`neopop-tag text-[10px] font-black ${
                          d.dealType === 'BUY' ? 'bg-[#00E887] text-black' : 'bg-[#FF5959] text-white'
                        }`}>
                          {d.dealType}
                        </span>
                      </td>
                      <td className="py-2.5 px-3 text-right font-mono text-white text-xs">
                        {d.quantity.toLocaleString('en-IN')}
                      </td>
                      <td className="py-2.5 px-3 text-right font-mono text-white text-xs">
                        ₹{d.tradePrice.toLocaleString('en-IN', { minimumFractionDigits: 2 })}
                      </td>
                      <td className="py-2.5 px-3 text-right font-mono font-black text-[#00E887] text-xs">
                        ₹{d.dealValueCr.toFixed(2)} Cr
                      </td>
                      <td className="py-2.5 px-3 text-right font-mono font-black text-[#FEE360] text-xs">
                        {d.stakePct}%
                      </td>
                      {/* Reconciliation Column */}
                      <td className="py-2.5 px-3 text-center font-mono">
                        {isExit ? (
                          <div className="inline-flex flex-col items-center">
                            <span className="neopop-tag bg-[#FF5959] text-white text-[9px] py-0 px-1.5 font-black">
                              RECONCILED DISPOSAL ({rec.pnlPct >= 0 ? '+' : ''}{rec.pnlPct}%)
                            </span>
                            <span className="text-[9px] text-zinc-400 mt-0.5">
                              Acquired: {rec.entryDate} &bull; Held {rec.holdingDays}d
                            </span>
                          </div>
                        ) : (
                          <div className="inline-flex flex-col items-center">
                            <span className="neopop-tag bg-[#1E1E1E] text-[#00E887] border border-black text-[9px] py-0 px-1.5 font-bold">
                              OPEN STAKE ({rec?.pnlPct >= 0 ? '+' : ''}{rec?.pnlPct || 0}%)
                            </span>
                            <span className="text-[9px] text-zinc-500 mt-0.5">
                              Purchased: {rec?.entryDate || d.date}
                            </span>
                          </div>
                        )}
                      </td>
                    </tr>
                  );
                })}
              </tbody>
            </table>
          </div>
        </div>
      )}

      {/* 5. SUB-VIEW: Reconciled Buy vs Sell Round-Trip Audit Ledger */}
      {subView === 'reconciliation' && (
        <div className="neopop-card overflow-hidden border-2 border-black bg-[#171717] rounded-[4px] shadow-[4px_4px_0px_#000000]">
          <div className="px-4 py-3 border-b-2 border-black flex items-center justify-between bg-[#1A1A1A]">
            <div className="flex items-center gap-2">
              <GitCompare className="w-4 h-4 text-[#FEE360]" />
              <h3 className="neopop-heading font-black text-white text-xs sm:text-sm tracking-tight uppercase">
                Institutional Round-Trip Reconciliation &amp; Holding Audit
              </h3>
              <span className="neopop-tag bg-[#FEE360] text-black font-black">
                Smart Money Tracking
              </span>
            </div>
            <span className="text-[11px] font-mono text-zinc-400 hidden sm:inline">
              Audits when positions were entered, when sold, holding periods, and net realized P&amp;L
            </span>
          </div>

          <div className="overflow-x-auto">
            <table className="w-full text-xs text-left border-collapse table-auto">
              <thead>
                <tr className="border-b-2 border-black text-zinc-400 text-[10px] uppercase tracking-wider font-mono font-bold bg-[#141414]">
                  <th className="py-2.5 px-3">Symbol &amp; Company</th>
                  <th className="py-2.5 px-3">Institutional Client</th>
                  <th className="py-2.5 px-3 text-center">Lifecycle Status</th>
                  <th className="py-2.5 px-3 text-right font-mono">Bought Date &amp; Price</th>
                  <th className="py-2.5 px-3 text-right font-mono">Sold Date &amp; Price</th>
                  <th className="py-2.5 px-3 text-center font-mono">Holding Duration</th>
                  <th className="py-2.5 px-3 text-right font-mono">Net Realized / MTM P&amp;L</th>
                  <th className="py-2.5 px-3">Reconciliation Audit Notes</th>
                </tr>
              </thead>
              <tbody className="divide-y divide-[#222222] font-medium font-mono">
                {reconciledLedger.map((d) => {
                  const rec = d.reconciliation;
                  const isExit = rec.status === 'RECONCILED_EXIT';
                  const isProfit = (rec.pnlCr || 0) >= 0;

                  return (
                    <tr
                      key={d.id}
                      onClick={() => onSelectStock && onSelectStock({ symbol: d.symbol, ltp: d.cmp })}
                      className="hover:bg-[#1E1E1E] transition-colors cursor-pointer group"
                    >
                      <td className="py-2.5 px-3 font-bold text-white">
                        <div className="flex items-center gap-1.5 flex-wrap">
                          <span className="group-hover:text-[#FEE360] group-hover:underline transition-colors text-xs font-black flex items-center gap-1">
                            {d.symbol}
                            <ExternalLink className="w-2.5 h-2.5 text-zinc-500 group-hover:text-[#FEE360] opacity-0 group-hover:opacity-100 transition-opacity" />
                          </span>
                          <span
                            className="neopop-tag text-[9px] py-0 px-1 font-black border"
                            style={{
                              backgroundColor: `${getMarketCap(d.symbol).color}15`,
                              color: getMarketCap(d.symbol).color,
                              borderColor: `${getMarketCap(d.symbol).color}40`
                            }}
                            title={`Market Cap: ₹${getMarketCap(d.symbol).mkt_cap_cr.toLocaleString('en-IN')} Cr (${getMarketCap(d.symbol).label})`}
                          >
                            {getMarketCap(d.symbol).category}
                          </span>
                          {getMarketCap(d.symbol).isPenny && (
                            <span className="neopop-tag bg-[#FF5959]/20 text-[#FF5959] border border-[#FF5959]/40 text-[8px] py-0 px-1 font-black">
                              PENNY
                            </span>
                          )}
                          {getAsmStatus(d.symbol).isAsm && (
                            <span className="neopop-tag bg-[#FF5959]/20 text-[#FF5959] border border-[#FF5959]/40 text-[9px] py-0 px-1 font-black">
                              ASM
                            </span>
                          )}
                        </div>
                        <div className="text-[10px] text-zinc-400 font-sans truncate max-w-[140px]">
                          {d.companyName}
                        </div>
                      </td>
                      <td className="py-2.5 px-3 text-white font-sans font-bold text-xs truncate max-w-[180px]" title={d.clientName}>
                        {d.clientName}
                      </td>
                      <td className="py-2.5 px-3 text-center">
                        <span className={`neopop-tag text-[9px] py-0 px-1.5 font-black ${
                          isExit ? 'bg-[#00E887] text-black' : 'bg-[#3657FF] text-white'
                        }`}>
                          {isExit ? 'FULLY EXITED' : 'ACTIVE HOLDING'}
                        </span>
                      </td>
                      <td className="py-2.5 px-3 text-right text-xs">
                        <div className="text-white font-bold">{rec.entryDate || d.date}</div>
                        <div className="text-[10px] text-zinc-400">@ ₹{(rec.entryPrice || d.tradePrice).toLocaleString('en-IN')}</div>
                      </td>
                      <td className="py-2.5 px-3 text-right text-xs">
                        {isExit ? (
                          <>
                            <div className="text-[#FEE360] font-bold">{rec.exitDate || d.date}</div>
                            <div className="text-[10px] text-zinc-400">@ ₹{(rec.exitPrice || d.tradePrice).toLocaleString('en-IN')}</div>
                          </>
                        ) : (
                          <div className="text-zinc-500 font-sans italic text-[11px]">Still Holding (CMP ₹{d.cmp})</div>
                        )}
                      </td>
                      <td className="py-2.5 px-3 text-center text-xs text-zinc-300">
                        {rec.holdingDays} Days
                      </td>
                      <td className="py-2.5 px-3 text-right font-black text-xs">
                        <span className={isProfit ? 'text-[#00E887]' : 'text-[#FF5959]'}>
                          {isProfit ? '+' : ''}₹{rec.pnlCr} Cr ({isProfit ? '+' : ''}{rec.pnlPct}%)
                        </span>
                      </td>
                      <td className="py-2.5 px-3 text-[11px] text-zinc-300 font-sans max-w-[220px]">
                        {rec.notes}
                      </td>
                    </tr>
                  );
                })}
              </tbody>
            </table>
          </div>
        </div>
      )}

      {/* 6. SUB-VIEW: Promoter & Insider Filings Table */}
      {subView === 'insider' && (
        <div className="neopop-card overflow-hidden border-2 border-black bg-[#171717] rounded-[4px] shadow-[4px_4px_0px_#000000]">
          <div className="px-4 py-3 border-b-2 border-black flex items-center justify-between bg-[#1A1A1A]">
            <div className="flex items-center gap-2">
              <Users className="w-4 h-4 text-[#3657FF]" />
              <h3 className="neopop-heading font-black text-white text-xs sm:text-sm tracking-tight uppercase">
                SEBI SAST &amp; PIT Disclosures (Promoters &amp; Key Insiders) {selectedDate !== 'ALL' && `(${selectedDate})`}
              </h3>
              <span className="neopop-tag bg-[#1E1E1E] text-zinc-300">
                {filteredInsiderTrades.length} Filings
              </span>
            </div>
            <span className="text-[11px] font-mono text-zinc-400 hidden sm:inline">
              Mandatory Regulatory Filings under SEBI (SAST) &amp; SEBI (PIT)
            </span>
          </div>

          <div className="overflow-x-auto">
            <table className="w-full text-xs text-left border-collapse table-auto">
              <thead>
                <tr className="border-b-2 border-black text-zinc-400 text-[10px] uppercase tracking-wider font-mono font-bold bg-[#141414]">
                  <th className="py-2.5 px-3">Date &amp; Filing Time</th>
                  <th className="py-2.5 px-3">Symbol &amp; Company</th>
                  <th className="py-2.5 px-3">Promoter / Insider Entity</th>
                  <th className="py-2.5 px-3">Designation</th>
                  <th className="py-2.5 px-3 text-center">Type</th>
                  <th className="py-2.5 px-3 text-right font-mono">Qty</th>
                  <th className="py-2.5 px-3 text-right font-mono">Price (₹)</th>
                  <th className="py-2.5 px-3 text-right font-mono">Value (₹ Cr)</th>
                  <th className="py-2.5 px-3 text-right font-mono">Stake (Pre &rarr; Post)</th>
                  <th className="py-2.5 px-3 text-center font-mono">Tranche Reconciliation</th>
                  <th className="py-2.5 px-3 text-center font-mono">Signal</th>
                </tr>
              </thead>
              <tbody className="divide-y divide-[#222222] font-medium">
                {filteredInsiderTrades.map((d) => (
                  <tr
                    key={d.id}
                    onClick={() => onSelectStock && onSelectStock({ symbol: d.symbol })}
                    className={`hover:bg-[#1E1E1E] transition-all cursor-pointer group ${
                      recentlyAddedIds.has(d.id) ? 'bg-[#00E887]/20 border-l-4 border-l-[#00E887]' : ''
                    }`}
                  >
                    <td className="py-2.5 px-3 font-mono text-zinc-400 text-[11px]">
                      <div className="flex items-center gap-1.5 flex-wrap">
                        <span className="text-white font-bold">{d.date}</span>
                        <span className="text-[#3657FF] font-black">{d.time || '16:00:00'}</span>
                        {d.isLive && (
                          <span className="neopop-tag bg-[#00E887] text-black text-[8px] py-0 px-1 font-black animate-pulse">
                            ⚡ LIVE
                          </span>
                        )}
                      </div>
                      <div className="text-[9px] text-zinc-400 mt-0.5">{d.regulation}</div>
                    </td>
                    <td className="py-2.5 px-3 font-bold text-white">
                      <div className="flex items-center gap-1.5 flex-wrap">
                        <span className="group-hover:text-[#FEE360] group-hover:underline transition-colors text-xs font-black font-mono flex items-center gap-1">
                          {d.symbol}
                          <ExternalLink className="w-2.5 h-2.5 text-zinc-500 group-hover:text-[#FEE360] opacity-0 group-hover:opacity-100 transition-opacity" />
                        </span>
                        <span
                          className="neopop-tag text-[9px] py-0 px-1 font-black border"
                          style={{
                            backgroundColor: `${getMarketCap(d.symbol).color}15`,
                            color: getMarketCap(d.symbol).color,
                            borderColor: `${getMarketCap(d.symbol).color}40`
                          }}
                          title={`Market Cap: ₹${getMarketCap(d.symbol).mkt_cap_cr.toLocaleString('en-IN')} Cr (${getMarketCap(d.symbol).label})`}
                        >
                          {getMarketCap(d.symbol).category}
                        </span>
                        {getMarketCap(d.symbol).isPenny && (
                          <span className="neopop-tag bg-[#FF5959]/20 text-[#FF5959] border border-[#FF5959]/40 text-[8px] py-0 px-1 font-black">
                            PENNY
                          </span>
                        )}
                        {getAsmStatus(d.symbol).isAsm && (
                          <span className="neopop-tag bg-[#FF5959]/20 text-[#FF5959] border border-[#FF5959]/40 text-[9px] py-0 px-1 font-black">
                            ASM
                          </span>
                        )}
                      </div>
                      <div className="text-[10px] text-zinc-400 font-normal truncate max-w-[140px]">
                        {d.companyName}
                      </div>
                    </td>
                    <td className="py-2.5 px-3 text-white font-bold text-xs truncate max-w-[200px]" title={d.personName}>
                      {d.personName}
                    </td>
                    <td className="py-2.5 px-3 text-zinc-400 text-[11px] truncate max-w-[150px]">
                      {d.designation}
                    </td>
                    <td className="py-2.5 px-3 text-center font-mono">
                      <span className={`neopop-tag text-[10px] font-black ${
                        d.action === 'BUY' ? 'bg-[#00E887] text-black' : d.action === 'SELL' ? 'bg-[#FF5959] text-white' : 'bg-[#FEE360] text-black'
                      }`}>
                        {d.action}
                      </span>
                    </td>
                    <td className="py-2.5 px-3 text-right font-mono text-white text-xs">
                      {d.quantity.toLocaleString('en-IN')}
                    </td>
                    <td className="py-2.5 px-3 text-right font-mono text-white text-xs">
                      ₹{d.tradePrice.toLocaleString('en-IN', { minimumFractionDigits: 2 })}
                    </td>
                    <td className="py-2.5 px-3 text-right font-mono font-black text-[#FEE360] text-xs">
                      ₹{d.dealValueCr.toFixed(2)} Cr
                    </td>
                    <td className="py-2.5 px-3 text-right font-mono text-xs">
                      <span className="text-zinc-400">{d.preStakePct}%</span>
                      <span className="text-zinc-600 mx-1">&rarr;</span>
                      <span className="font-bold text-white">{d.postStakePct}%</span>
                    </td>
                    {/* Tranche Reconciliation */}
                    <td className="py-2.5 px-3 text-center font-mono">
                      <div className="inline-flex flex-col items-center">
                        <span className="neopop-tag bg-[#1E1E1E] text-[#FEE360] border border-black text-[9px] py-0 px-1 font-bold">
                          {d.reconciliation?.roundTripTranche || 'Tranche Verified'}
                        </span>
                        <span className="text-[9px] text-zinc-400 mt-0.5">
                          {d.reconciliation?.holdingStatus || 'Holding Verified'}
                        </span>
                      </div>
                    </td>
                    <td className="py-2.5 px-3 text-center font-mono">
                      <span className={`neopop-tag text-[10px] font-black ${
                        d.action === 'BUY' ? 'bg-[#00E887] text-black' : d.action === 'SELL' ? 'bg-[#FF5959] text-white' : 'bg-[#FEE360] text-black'
                      }`}>
                        {d.signal.replace(/_/g, ' ')}
                      </span>
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        </div>
      )}

      {/* 7. SUB-VIEW: FII & DII Cash Market Trend */}
      {subView === 'fii-dii' && (
        <div className="space-y-4">
          <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
            {/* FII Card */}
            <div className="neopop-card p-5 border-2 border-black bg-[#171717] rounded-[4px] shadow-[4px_4px_0px_#000000]">
              <div className="flex items-center justify-between pb-3 border-b-2 border-black">
                <div className="flex items-center gap-2">
                  <span className="w-2.5 h-2.5 bg-[#3657FF] border border-black shadow-[1px_1px_0px_#000]"></span>
                  <h3 className="neopop-heading font-black text-white text-sm uppercase">Foreign Institutional Investors (FII)</h3>
                </div>
                <span className="neopop-tag bg-[#00E887] text-black font-black">NET BUYER</span>
              </div>
              <div className="grid grid-cols-3 gap-3 mt-4 text-center font-mono">
                <div className="p-2.5 bg-[#111111] border border-black rounded-[3px]">
                  <div className="text-[10px] text-zinc-400 uppercase">Gross Purchase</div>
                  <div className="text-sm font-black text-[#00E887] mt-1">₹{fiiDiiFlows?.fii.buyValueCr.toLocaleString('en-IN')} Cr</div>
                </div>
                <div className="p-2.5 bg-[#111111] border border-black rounded-[3px]">
                  <div className="text-[10px] text-zinc-400 uppercase">Gross Sales</div>
                  <div className="text-sm font-black text-[#FF5959] mt-1">₹{fiiDiiFlows?.fii.sellValueCr.toLocaleString('en-IN')} Cr</div>
                </div>
                <div className="p-2.5 bg-[#111111] border-2 border-black rounded-[3px] shadow-[2px_2px_0px_#000]">
                  <div className="text-[10px] text-zinc-300 uppercase font-black">Net Cash Inflow</div>
                  <div className="text-base font-black text-[#00E887] mt-1">+₹{fiiDiiFlows?.fii.netValueCr.toLocaleString('en-IN')} Cr</div>
                </div>
              </div>
            </div>

            {/* DII Card */}
            <div className="neopop-card p-5 border-2 border-black bg-[#171717] rounded-[4px] shadow-[4px_4px_0px_#000000]">
              <div className="flex items-center justify-between pb-3 border-b-2 border-black">
                <div className="flex items-center gap-2">
                  <span className="w-2.5 h-2.5 bg-[#00E887] border border-black shadow-[1px_1px_0px_#000]"></span>
                  <h3 className="neopop-heading font-black text-white text-sm uppercase">Domestic Institutional Investors (DII)</h3>
                </div>
                <span className="neopop-tag bg-[#00E887] text-black font-black">NET BUYER</span>
              </div>
              <div className="grid grid-cols-3 gap-3 mt-4 text-center font-mono">
                <div className="p-2.5 bg-[#111111] border border-black rounded-[3px]">
                  <div className="text-[10px] text-zinc-400 uppercase">Gross Purchase</div>
                  <div className="text-sm font-black text-[#00E887] mt-1">₹{fiiDiiFlows?.dii.buyValueCr.toLocaleString('en-IN')} Cr</div>
                </div>
                <div className="p-2.5 bg-[#111111] border border-black rounded-[3px]">
                  <div className="text-[10px] text-zinc-400 uppercase">Gross Sales</div>
                  <div className="text-sm font-black text-[#FF5959] mt-1">₹{fiiDiiFlows?.dii.sellValueCr.toLocaleString('en-IN')} Cr</div>
                </div>
                <div className="p-2.5 bg-[#111111] border-2 border-black rounded-[3px] shadow-[2px_2px_0px_#000]">
                  <div className="text-[10px] text-zinc-300 uppercase font-black">Net Cash Inflow</div>
                  <div className="text-base font-black text-[#00E887] mt-1">+₹{fiiDiiFlows?.dii.netValueCr.toLocaleString('en-IN')} Cr</div>
                </div>
              </div>
            </div>
          </div>

          {/* Historical Trend Table */}
          <div className="neopop-card overflow-hidden border-2 border-black bg-[#171717] rounded-[4px] shadow-[4px_4px_0px_#000000]">
            <div className="px-4 py-3 border-b-2 border-black flex items-center justify-between bg-[#1A1A1A]">
              <h3 className="neopop-heading font-black text-white text-xs sm:text-sm uppercase">
                Provisional FII &amp; DII Daily Net Flow History (₹ Cr)
              </h3>
              <span className="neopop-tag bg-[#1E1E1E] text-zinc-300">
                Official Exchange Settlement
              </span>
            </div>
            <div className="overflow-x-auto">
              <table className="w-full text-xs text-left border-collapse table-auto">
                <thead>
                  <tr className="border-b-2 border-black text-zinc-400 text-[10px] uppercase tracking-wider font-mono font-bold bg-[#141414]">
                    <th className="py-2.5 px-3">Session Date</th>
                    <th className="py-2.5 px-3 text-right font-mono">FII Net Flow (₹ Cr)</th>
                    <th className="py-2.5 px-3 text-right font-mono">DII Net Flow (₹ Cr)</th>
                    <th className="py-2.5 px-3 text-right font-mono">Combined Institutional Net</th>
                    <th className="py-2.5 px-3 text-center">Market Bias</th>
                  </tr>
                </thead>
                <tbody className="divide-y divide-[#222222] font-mono">
                  {fiiDiiFlows?.historicalTrend30d.map((h) => {
                    const totalIsUp = h.total >= 0;
                    const fiiIsUp = h.fiiNet >= 0;
                    const diiIsUp = h.diiNet >= 0;

                    return (
                      <tr key={h.date} className="hover:bg-[#1E1E1E] transition-colors">
                        <td className="py-2.5 px-3 text-white font-bold">
                          <div className="flex items-center gap-1.5 flex-wrap">
                            <span>{h.date}</span>
                            {h.date === data?.currentDate && (
                              <span className="neopop-tag bg-[#00E887] text-black text-[8px] py-0 px-1 font-black animate-pulse">
                                TODAY • PROVISIONAL
                              </span>
                            )}
                          </div>
                        </td>
                        <td className={`py-2.5 px-3 text-right font-bold ${fiiIsUp ? 'text-[#00E887]' : 'text-[#FF5959]'}`}>
                          {fiiIsUp ? '+' : ''}₹{h.fiiNet.toFixed(2)} Cr
                        </td>
                        <td className={`py-2.5 px-3 text-right font-bold ${diiIsUp ? 'text-[#00E887]' : 'text-[#FF5959]'}`}>
                          {diiIsUp ? '+' : ''}₹{h.diiNet.toFixed(2)} Cr
                        </td>
                        <td className={`py-2.5 px-3 text-right font-black text-sm ${totalIsUp ? 'text-[#00E887]' : 'text-[#FF5959]'}`}>
                          {totalIsUp ? '+' : ''}₹{h.total.toFixed(2)} Cr
                        </td>
                        <td className="py-2.5 px-3 text-center">
                          <span className={`neopop-tag text-[10px] font-black ${
                            totalIsUp ? 'bg-[#00E887] text-black' : 'bg-[#FF5959] text-white'
                          }`}>
                            {totalIsUp ? '🟢 STRONG ACCUMULATION' : '🔴 NET DISTRIBUTION'}
                          </span>
                        </td>
                      </tr>
                    );
                  })}
                </tbody>
              </table>
            </div>
          </div>
        </div>
      )}
    </div>
  );
}
