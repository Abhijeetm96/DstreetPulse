import React from 'react';
import {
  LayoutDashboard,
  Target,
  Landmark,
  Map,
  TrendingUp,
  FileSpreadsheet,
  Flame,
  Zap,
  BookOpen,
  Cpu,
  ChevronLeft,
  ChevronRight,
  ShieldCheck,
  Radio,
  Layers,
  IndianRupee,
  Scale,
  X
} from 'lucide-react';
import { cn } from '../../lib/utils.js';
import Logo from '../Logo.jsx';

export default function Sidebar({
  activeTab,
  onTabChange,
  isCollapsed,
  onToggleCollapse,
  isMobileOpen = false,
  onCloseMobile
}) {
  const navGroups = [
    {
      title: 'Market Intelligence',
      items: [
        {
          id: 'live-market',
          label: 'Live Terminal',
          icon: LayoutDashboard,
          badge: 'Live'
        },
        {
          id: 'swing-scanner',
          label: 'Swing Radar',
          icon: Target,
          badge: 'Signals'
        },
        {
          id: 'block-deals',
          label: 'Block & Bulk Deals',
          icon: Landmark,
          badge: 'Smart Money'
        },
        {
          id: 'fii-dii',
          label: 'FII & DII Activity',
          icon: IndianRupee,
          badge: 'Institutional'
        },
        {
          id: 'compare',
          label: 'Stock Comparison',
          icon: Scale,
          badge: 'Peers'
        },
        {
          id: 'heatmaps',
          label: 'Sector Heatmaps',
          icon: Map,
          badge: '18 Sectors'
        },
        {
          id: 'indices',
          label: 'All Indices',
          icon: TrendingUp,
          badge: '43'
        }
      ]
    },
    {
      title: 'Capital Market (CM)',
      items: [
        {
          id: 'bhavcopy',
          label: 'CM Bhavcopy',
          icon: FileSpreadsheet,
          badge: '501 EQ'
        },
        {
          id: 'gainers-losers',
          label: 'Top Movers',
          icon: Flame
        },
        {
          id: 'volume-gainers',
          label: 'Most Active',
          icon: Zap
        }
      ]
    },
    {
      title: 'Guide & Playbook',
      items: [
        {
          id: 'mcp-inspector',
          label: 'Investor Guide',
          icon: BookOpen,
          badge: 'Playbook'
        }
      ]
    }
  ];

  return (
    <>
      {/* Mobile Backdrop Overlay */}
      {isMobileOpen && (
        <div
          className="fixed inset-0 z-40 bg-black/75 backdrop-blur-sm md:hidden animate-in fade-in duration-200"
          onClick={onCloseMobile}
        />
      )}

      <aside
        className={cn(
          'fixed md:relative inset-y-0 left-0 z-50 flex flex-col border-r-2 border-black bg-[#0E0E0E] transition-all duration-200 select-none shadow-[4px_0px_0px_#000]',
          isCollapsed ? 'md:w-[68px]' : 'md:w-64',
          'w-72 max-w-[85vw]',
          isMobileOpen ? 'translate-x-0' : '-translate-x-full md:translate-x-0'
        )}
      >
        {/* Brand Header */}
        <div className="flex h-16 items-center justify-between px-4 border-b-2 border-black bg-[#0A0A0A]">
          <div
            onClick={() => onTabChange('live-market')}
            className="flex items-center gap-3 overflow-hidden cursor-pointer group"
            title="Return to Live Terminal"
          >
            <Logo size={36} />
            {(!isCollapsed || isMobileOpen) && (
              <div className="flex flex-col overflow-hidden">
                <div className="flex items-center gap-1.5">
                  <span className="font-black text-sm tracking-wider text-white uppercase font-sans group-hover:text-[#FEE360] transition-colors">
                    DSTREET<span className="text-[#FEE360]">PULSE</span>
                  </span>
                  <span className="text-[9px] font-black tracking-widest px-1 py-0.2 rounded bg-[#FEE360] text-black border border-black shadow-[1px_1px_0px_#000]">
                    PRO
                  </span>
                </div>
                <span className="text-[10px] text-slate-400 font-mono tracking-wide truncate">
                  INTELLIGENCE TERMINAL
                </span>
              </div>
            )}
          </div>

          {/* Desktop Collapse Toggle / Mobile Close Button */}
          <div className="flex items-center gap-1">
            <button
              onClick={onCloseMobile}
              className="md:hidden text-slate-400 hover:text-white p-1.5 rounded border border-[#262626] bg-[#141414] transition cursor-pointer"
              title="Close Navigation"
            >
              <X className="w-5 h-5" />
            </button>
            <button
              onClick={onToggleCollapse}
              className="hidden md:flex text-slate-300 hover:text-white p-1.5 rounded border border-black bg-[#181818] hover:bg-[#222222] shadow-[2px_2px_0px_#000] active:translate-x-[1px] active:translate-y-[1px] active:shadow-none transition cursor-pointer"
              title={isCollapsed ? 'Expand Sidebar' : 'Collapse Sidebar'}
            >
              {isCollapsed ? <ChevronRight className="w-4 h-4 text-[#FEE360]" /> : <ChevronLeft className="w-4 h-4 text-[#FEE360]" />}
            </button>
          </div>
        </div>

      {/* Navigation Groups */}
      <div className="flex-1 overflow-y-auto py-4 px-2.5 space-y-6 scrollbar-thin">
        {navGroups.map((group) => (
          <div key={group.title} className="space-y-1">
            {!isCollapsed && (
              <div className="px-3 text-[10px] font-black text-slate-500 uppercase tracking-widest mb-2 font-mono">
                {group.title}
              </div>
            )}
            {group.items.map((item) => {
              const Icon = item.icon;
              const isActive = activeTab === item.id;
              return (
                <button
                  key={item.id}
                  data-tab={item.id}
                  onClick={() => onTabChange(item.id)}
                  title={isCollapsed ? item.label : undefined}
                  className={cn(
                    'w-full flex items-center gap-3 px-3 py-2 rounded text-xs font-bold transition-all group relative cursor-pointer border',
                    isActive
                      ? 'bg-[#1C1C1C] text-white border-black border-l-4 border-l-[#FEE360] shadow-[3px_3px_0px_#000]'
                      : 'border-transparent text-slate-400 hover:bg-[#161616] hover:text-white hover:border-[#262626]',
                    isCollapsed && 'justify-center px-2'
                  )}
                >
                  <Icon
                    className={cn(
                      'w-4 h-4 flex-shrink-0 transition-colors',
                      isActive ? 'text-[#FEE360]' : 'text-slate-500 group-hover:text-slate-300'
                    )}
                  />
                  {!isCollapsed && (
                    <span className="truncate flex-1 text-left font-bold tracking-tight">{item.label}</span>
                  )}
                  {!isCollapsed && item.badge && (
                    <span
                      className={cn(
                        'text-[10px] font-black px-1.5 py-0.2 rounded border font-mono',
                        isActive
                          ? 'bg-[#FEE360] text-black border-black shadow-[1px_1px_0px_#000]'
                          : 'bg-[#181818] text-slate-400 border-black'
                      )}
                    >
                      {item.badge}
                    </span>
                  )}
                </button>
              );
            })}
          </div>
        ))}
      </div>

      {/* Bottom Node Card */}
      <div className="p-3 border-t-2 border-black bg-[#0A0A0A]">
        {!isCollapsed ? (
          <div className="rounded border-2 border-black bg-[#141414] p-3 shadow-[3px_3px_0px_#000] space-y-1.5">
            <div className="flex items-center justify-between">
              <span className="text-[10px] font-black text-slate-400 uppercase tracking-wider font-mono">
                DATA ENGINE
              </span>
              <span className="inline-flex items-center gap-1.5 text-[9px] font-black text-black bg-[#00E887] px-1.5 py-0.2 rounded border border-black shadow-[1px_1px_0px_#000]">
                ACTIVE
              </span>
            </div>
            <div className="text-[10px] text-slate-400 flex items-center gap-1 font-mono">
              <ShieldCheck className="w-3.5 h-3.5 text-[#00E887]" />
              <span>Capital Market &amp; Bhavcopy</span>
            </div>
          </div>
        ) : (
          <div className="flex justify-center py-1" title="Data Engine: Active">
            <div className="w-2.5 h-2.5 rounded-full bg-[#00E887] shadow-[0_0_8px_#00E887]"></div>
          </div>
        )}
      </div>
    </aside>
    </>
  );
}
