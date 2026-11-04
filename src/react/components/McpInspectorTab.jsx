import React, { useState } from 'react';
import {
  BookOpen,
  Target,
  TrendingUp,
  ShieldCheck,
  Landmark,
  PieChart,
  Flame,
  Zap,
  Sparkles,
  CheckCircle2,
  ArrowRight,
  Clock,
  Compass,
  Activity,
  ChevronDown,
  ChevronUp,
  Copy,
  Check,
  Cpu,
  Network,
  Scale,
  IndianRupee,
  Lightbulb,
  FileSpreadsheet
} from 'lucide-react';

export default function McpInspectorTab({ onNavigateTab }) {
  const [copied, setCopied] = useState(false);
  const [showTechnicalDetails, setShowTechnicalDetails] = useState(false);
  const [activeStrategyTab, setActiveStrategyTab] = useState('breakout');

  const mcpConfigJson = `{
  "mcpServers": {
    "nse-bhavcopy": {
      "command": "npx",
      "args": [
        "-y",
        "mcp-remote",
        "https://mcp.nseindia.in/bhavcopy/cm/mcp"
      ]
    },
    "cm-market": {
      "command": "npx",
      "args": [
        "-y",
        "mcp-remote",
        "https://mcp.nseindia.in/cmmkt/mcp"
      ]
    }
  }
}`;

  const copyConfig = () => {
    navigator.clipboard?.writeText(mcpConfigJson);
    setCopied(true);
    setTimeout(() => setCopied(false), 2000);
  };

  const handleJump = (tabId) => {
    if (onNavigateTab) {
      onNavigateTab(tabId);
    } else {
      window.location.hash = tabId;
    }
  };

  const CORE_TOOLS = [
    {
      id: 'live-market',
      title: 'Live Market Terminal',
      badge: 'Microstructure Tape',
      badgeColor: '#00E887',
      textColor: '#000000',
      icon: Activity,
      summary: 'Real-time 1-second price & volume tick stream across all 501 NSE equities and 43 benchmark indices.',
      investorBenefits: [
        'Watch live orderflow discovery and price ticks as they hit the exchange.',
        'Track 52-week high & low breakouts and instant relative volume surges.',
        'Identify institutional cash turnover concentration and delivery accumulation.'
      ],
      keyMetrics: 'LTP, Day % Chg, Volume, RVOL, 52W High/Low Proximity',
      actionLabel: 'Open Live Terminal'
    },
    {
      id: 'swing-scanner',
      title: '3-Layer Breakout Radar',
      badge: 'Algorithmic Scanner',
      badgeColor: '#FEE360',
      textColor: '#000000',
      icon: Target,
      summary: 'Automated 6-category quantitative scanner that filters 500 stocks into actionable swing trade candidates.',
      investorBenefits: [
        'Classifies setups into Layer 1 (Accumulation), Layer 2 (Pre-Breakout Coil), and Layer 3 (Execution Day).',
        'Penalizes false breakouts with an automated Bull Trap detector (rejects high upper wicks >20%).',
        'Computes dynamic Breakout Quality Scores (0–100) and pre-calculated Stop-Loss/Target levels.'
      ],
      keyMetrics: 'Quality Score, Bar Close Location (BCL), Upper Wick %, R:R Ratio',
      actionLabel: 'Launch Breakout Radar'
    },
    {
      id: 'block-deals',
      title: 'Block & Bulk Deals (Smart Money)',
      badge: 'Institutional Tape',
      badgeColor: '#3657FF',
      textColor: '#FFFFFF',
      icon: Landmark,
      summary: 'Tracks large institutional footprint trades, SEBI SAST filings, and insider transactions in real time.',
      investorBenefits: [
        'Detects when mutual funds, LIC, sovereign wealth funds, and FIIs take large positions.',
        'Filters between Block Window executions (min ₹10 Cr) and Bulk market orders (>0.5% equity).',
        'Surfaces promoter buy/sell filings under SEBI PIT regulations before retail discovers them.'
      ],
      keyMetrics: 'Deal Value (₹ Cr), Stake % Bought/Sold, Client Name, Counterparty',
      actionLabel: 'View Smart Money Tape'
    },
    {
      id: 'fii-dii',
      title: 'FII & DII Cash Flow Analytics',
      badge: 'Macro Liquidity',
      badgeColor: '#00E887',
      textColor: '#000000',
      icon: IndianRupee,
      summary: 'Daily institutional cash market & derivative flow trends comparing foreign vs domestic institutional investors.',
      investorBenefits: [
        'Understand macro institutional liquidity driving the broader NIFTY trend.',
        'Spot divergence: when retail is selling but DII mutual funds are aggressively absorbing supply.',
        'Review 30-day cumulative flow trajectories to gauge market support.'
      ],
      keyMetrics: 'FII Net Buy/Sell, DII Net Buy/Sell, 30d Cumulative Flow',
      actionLabel: 'Inspect Flow Tracker'
    },
    {
      id: 'gainers-losers',
      title: 'Multi-Horizon Top Movers',
      badge: 'Momentum Rankings',
      badgeColor: '#FEE360',
      textColor: '#000000',
      icon: Flame,
      summary: 'Ranks leaders and laggards across 6 distinct timeframes: 1 Day, 1 Week, 1 Month, 3 Months, 6 Months, and 1 Year.',
      investorBenefits: [
        'Switch between daily momentum and intermediate/long-term trend leaders with one click.',
        'Apply quick strategy presets (High RVOL >2x, Near 52W High, Near 52W Low, Explosive >3%).',
        'View both the active horizon return and today’s intraday action in dual-pill badges.'
      ],
      keyMetrics: '1D / 1W / 1M / 3M / 6M / 1Y Return, Sector, Traded Volume',
      actionLabel: 'View Top Movers'
    },
    {
      id: 'heatmaps',
      title: 'Sector Heatmaps & Treemaps',
      badge: 'Sector Rotation',
      badgeColor: '#00E887',
      textColor: '#000000',
      icon: PieChart,
      summary: 'Visual representation of all 18 market sectors and a high-density 500-constituent market treemap.',
      investorBenefits: [
        'Identify institutional sector rotation: see which industries are attracting fresh capital.',
        'Compare advance/decline breadth within each individual sector.',
        'Click any sector tile to filter constituents by volume, performance, or market cap.'
      ],
      keyMetrics: 'Sector Avg Return, Advances/Declines, Traded Volume Weight',
      actionLabel: 'Explore Heatmaps'
    },
    {
      id: 'compare',
      title: 'Multi-Stock Comparative Engine',
      badge: 'Peer Intelligence',
      badgeColor: '#3657FF',
      textColor: '#FFFFFF',
      icon: Scale,
      summary: 'Rebases multiple stocks on a unified % return scale over any timeline from 1 Day up to 20 Years.',
      investorBenefits: [
        'Directly compare peers (e.g. TCS vs INFY vs WIPRO) to find the relative strength leader.',
        'Benchmark any stock against NIFTY 50 and NIFTY 500 to evaluate alpha generation.',
        'Examine rolling volatility, maximum drawdown, and correlation metrics.'
      ],
      keyMetrics: 'Rebased % Return, Alpha vs Nifty, Beta, Max Drawdown',
      actionLabel: 'Compare Stocks'
    },
    {
      id: 'bhavcopy',
      title: 'Official CM Bhavcopy',
      badge: 'Official Settlement',
      badgeColor: '#FFFFFF',
      textColor: '#000000',
      icon: FileSpreadsheet,
      summary: 'Official NSE Capital Market closing settlement figures, delivery percentages, and security masters.',
      investorBenefits: [
        '100% verified official exchange settlement data with zero slippage or synthetic distortion.',
        'High-density searchable table of all 501 equities with 1-click CSV export for offline research.',
        'Filter by market capitalization tiers (Large, Mid, Small, Micro, Penny).'
      ],
      keyMetrics: 'Official LTP, Prev Close, Avg Price, Delivery %, 52W Range',
      actionLabel: 'View Bhavcopy Table'
    }
  ];

  const STRATEGIES = [
    {
      id: 'breakout',
      title: 'Strategy 1: Breakout Rider (Swing Trading)',
      icon: Zap,
      objective: 'Capture 5% to 15% momentum expansions over 3 to 10 trading sessions while risking ≤0.5% of capital.',
      steps: [
        {
          step: '1. Scan Layer 2 Coils',
          desc: 'Open the Swing Radar tab. Filter for Layer 2: Pre-Breakout Coil stocks. These are stocks consolidating tightly near 20-day highs with range tightness <3.5%.'
        },
        {
          step: '2. Confirm Volume Expansion (RVOL)',
          desc: 'Verify that relative volume (RVOL) is >1.8x. High volume indicates institutional accumulation, not retail speculation.'
        },
        {
          step: '3. Verify Bull Trap Absence',
          desc: 'Check the Upper Wick Rejection % in the Trade Doctor. If upper wick >20%, large sellers rejected higher prices; avoid the trade.'
        },
        {
          step: '4. Bracket Order Execution',
          desc: 'Click on the stock to open the Intelligence Terminal. Review the pre-calculated entry trigger, stop-loss below prior support, and 2R/3R take-profit targets.'
        }
      ]
    },
    {
      id: 'smart-money',
      title: 'Strategy 2: Smart Money Coattails (Institutional Deals)',
      icon: Landmark,
      objective: 'Follow confirmed footprints of institutional giants (LIC, SBI Mutual Fund, Vanguard) before retail media catches on.',
      steps: [
        {
          step: '1. Monitor Real-Time Inflow',
          desc: 'Open the Block & Bulk Deals tab. Look for new transactions marked with the glowing ⚡ LIVE badge.'
        },
        {
          step: '2. Check Transaction Magnitude',
          desc: 'Focus on Block Deals above ₹25 Cr. Large blocks require institutional approval and cannot easily be dumped back on the market.'
        },
        {
          step: '3. Validate Net Direction',
          desc: 'Examine the Institutional Flow Summary. If DIIs are net buyers (>₹500 Cr) while the stock is near structural support, accumulation is underway.'
        },
        {
          step: '4. Align with Technical Breakout',
          desc: 'Cross-reference the symbol with the Swing Radar. When a block deal aligns with a Layer 2 or Layer 3 breakout, the probability of continuation increases significantly.'
        }
      ]
    },
    {
      id: 'sector-rotation',
      title: 'Strategy 3: Top-Down Sector Momentum',
      icon: PieChart,
      objective: 'Ride the strongest sector waves by moving capital into outperforming industries and avoiding laggards.',
      steps: [
        {
          step: '1. Inspect Sector Heatmaps',
          desc: 'Open the Sector Heatmaps tab. Identify the top 2 green sectors with the highest average daily return and positive advance/decline ratios.'
        },
        {
          step: '2. Drill Down into Sector Constituents',
          desc: 'Click on the winning sector tile. Sort constituents by traded volume and % change to find the frontline leaders driving the move.'
        },
        {
          step: '3. Multi-Horizon Confirmation',
          desc: 'Switch to the Top Movers tab. Verify if the stock also ranks near the top over 1W and 1M horizons, ensuring the move is part of an ongoing trend.'
        },
        {
          step: '4. Enter with Tight Risk',
          desc: 'Enter on minor intraday pullbacks toward the 20 EMA rather than chasing extended green candles.'
        }
      ]
    },
    {
      id: 'risk-management',
      title: 'Strategy 4: Defensive Capital Preservation',
      icon: ShieldCheck,
      objective: 'Protect your portfolio against catastrophic drawdowns using non-negotiable quantitative risk gates.',
      steps: [
        {
          step: '1. The 0.5% Maximum Risk Rule',
          desc: 'Never risk more than 0.5% of total account equity on any single trade. The Risk Manager automatically sizes position quantities to fit this ceiling.'
        },
        {
          step: '2. Minimum 2.0x Reward-to-Risk (R:R)',
          desc: 'Every trade must offer at least ₹2 of potential gain for every ₹1 of capital risked. The terminal automatically rejects sub-2R proposals.'
        },
        {
          step: '3. Strict Prohibition of Averaging Down',
          desc: 'Never add to a losing position. If a trade reaches its structural stop-loss, exit immediately. The paper trading gate enforces this strictly.'
        },
        {
          step: '4. ASM & Surveillance Awareness',
          desc: 'Always check the ASM tag. Stocks under SEBI Additional Surveillance require 100% cash margin and carry elevated liquidity risk.'
        }
      ]
    }
  ];

  return (
    <div className="space-y-6">
      
      {/* Hero Header */}
      <div className="neopop-card p-5 sm:p-6 border-2 border-black bg-[#171717] rounded-[4px] shadow-[4px_4px_0px_#000000]">
        <div className="flex flex-wrap items-center justify-between gap-4">
          <div className="flex items-center gap-3">
            <span className="p-2.5 rounded-[3px] bg-[#111111] text-[#FEE360] border-2 border-black shadow-[2px_2px_0px_#000000]">
              <Compass className="w-6 h-6 text-[#FEE360]" />
            </span>
            <div>
              <div className="flex items-center gap-2 flex-wrap">
                <span className="w-2.5 h-2.5 bg-[#00E887] border border-black shadow-[1px_1px_0px_#000]"></span>
                <h2 className="neopop-heading font-black text-lg sm:text-2xl text-white tracking-tight">
                  DstreetPulse Terminal Guide &amp; Investor Playbook
                </h2>
                <span className="neopop-tag bg-[#FEE360] text-black text-[10px] font-black uppercase">
                  Complete Capabilities
                </span>
              </div>
              <p className="neopop-body text-xs sm:text-sm text-zinc-400 mt-1 max-w-3xl leading-relaxed">
                A quantitative decision-support system for Indian equity investors and swing traders. Discover what each tool does, how the quantitative engines work, and practical playbooks to capture alpha while defending capital.
              </p>
            </div>
          </div>

          <div className="flex flex-wrap items-center gap-2">
            <span className="neopop-tag bg-[#00E887] text-black font-black text-xs flex items-center gap-1.5 shadow-[2px_2px_0px_#000000]">
              <CheckCircle2 className="w-3.5 h-3.5 text-black" />
              <span>501 NSE Equities</span>
            </span>
            <span className="neopop-tag bg-[#3657FF] text-white font-black text-xs flex items-center gap-1.5 shadow-[2px_2px_0px_#000000]">
              <Activity className="w-3.5 h-3.5 text-white" />
              <span>43 Indices</span>
            </span>
          </div>
        </div>

        {/* Quick Highlights Bar */}
        <div className="grid grid-cols-2 sm:grid-cols-4 gap-3 mt-5 pt-4 border-t-2 border-black">
          <div className="bg-[#121212] p-2.5 rounded border border-black shadow-[2px_2px_0px_#000]">
            <div className="text-[10px] font-mono text-zinc-400 uppercase font-bold">Execution Engine</div>
            <div className="text-xs sm:text-sm font-black text-[#00E887] font-mono mt-0.5">1-Sec Live Stream</div>
          </div>
          <div className="bg-[#121212] p-2.5 rounded border border-black shadow-[2px_2px_0px_#000]">
            <div className="text-[10px] font-mono text-zinc-400 uppercase font-bold">Scanning Precision</div>
            <div className="text-xs sm:text-sm font-black text-[#FEE360] font-mono mt-0.5">3-Layer Radar</div>
          </div>
          <div className="bg-[#121212] p-2.5 rounded border border-black shadow-[2px_2px_0px_#000]">
            <div className="text-[10px] font-mono text-zinc-400 uppercase font-bold">Smart Money</div>
            <div className="text-xs sm:text-sm font-black text-[#3657FF] font-mono mt-0.5">Block/Bulk Tape</div>
          </div>
          <div className="bg-[#121212] p-2.5 rounded border border-black shadow-[2px_2px_0px_#000]">
            <div className="text-[10px] font-mono text-zinc-400 uppercase font-bold">Capital Defense</div>
            <div className="text-xs sm:text-sm font-black text-white font-mono mt-0.5">0.5% Risk Gate</div>
          </div>
        </div>
      </div>

      {/* SECTION 1: Core Platform Capabilities Matrix */}
      <div>
        <div className="flex items-center justify-between mb-3">
          <div className="flex items-center gap-2">
            <span className="w-2.5 h-2.5 bg-[#FEE360] border border-black shadow-[1px_1px_0px_#000]"></span>
            <h3 className="neopop-heading font-black text-white text-base sm:text-lg uppercase tracking-tight">
              Platform Tools &amp; What They Do
            </h3>
          </div>
          <span className="text-xs text-zinc-400 font-mono hidden sm:inline">
            Click any card to launch that tool directly
          </span>
        </div>

        <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-4">
          {CORE_TOOLS.map((tool) => {
            const Icon = tool.icon;
            return (
              <div
                key={tool.id}
                onClick={() => handleJump(tool.id)}
                className="neopop-card p-4 border-2 border-black bg-[#151515] rounded-[4px] shadow-[4px_4px_0px_#000000] hover:bg-[#1A1A1A] transition-all cursor-pointer flex flex-col justify-between group"
              >
                <div>
                  <div className="flex items-start justify-between gap-2 mb-2.5">
                    <span className="p-2 rounded bg-[#0A0A0A] border border-black text-[#FEE360] group-hover:scale-105 transition-transform">
                      <Icon className="w-4 h-4 text-[#FEE360]" />
                    </span>
                    <span
                      className="neopop-tag text-[9px] py-0.5 px-1.5 font-black uppercase"
                      style={{ backgroundColor: tool.badgeColor, color: tool.textColor }}
                    >
                      {tool.badge}
                    </span>
                  </div>

                  <h4 className="font-black text-white text-sm group-hover:text-[#FEE360] transition-colors flex items-center gap-1.5">
                    {tool.title}
                    <ArrowRight className="w-3.5 h-3.5 opacity-0 group-hover:opacity-100 transition-opacity text-[#FEE360]" />
                  </h4>
                  <p className="text-[11px] text-zinc-400 mt-1 leading-relaxed">
                    {tool.summary}
                  </p>

                  <div className="mt-3 pt-3 border-t border-zinc-800 space-y-1.5">
                    <div className="text-[10px] font-mono font-bold text-zinc-400 uppercase">How It Helps You:</div>
                    <ul className="space-y-1">
                      {tool.investorBenefits.map((benefit, i) => (
                        <li key={i} className="text-[10px] text-zinc-300 flex items-start gap-1.5 leading-snug">
                          <span className="text-[#00E887] font-bold shrink-0">✓</span>
                          <span>{benefit}</span>
                        </li>
                      ))}
                    </ul>
                  </div>
                </div>

                <div className="mt-4 pt-3 border-t border-zinc-800 flex items-center justify-between text-[10px] font-mono">
                  <span className="text-zinc-400 truncate max-w-[140px]" title={tool.keyMetrics}>
                    Key: <b className="text-zinc-200">{tool.keyMetrics.split(',')[0]}</b>
                  </span>
                  <span className="text-[#FEE360] font-black group-hover:underline flex items-center gap-0.5">
                    {tool.actionLabel} &rarr;
                  </span>
                </div>
              </div>
            );
          })}
        </div>
      </div>

      {/* SECTION 2: Actionable Investor Strategies & Playbooks */}
      <div className="neopop-card p-5 sm:p-6 border-2 border-black bg-[#161616] rounded-[4px] shadow-[4px_4px_0px_#000000]">
        <div className="flex flex-wrap items-center justify-between gap-3 mb-4 pb-3 border-b-2 border-black">
          <div className="flex items-center gap-2">
            <span className="p-1.5 bg-[#FEE360] rounded-[2px] border border-black">
              <Lightbulb className="w-4 h-4 text-black" />
            </span>
            <div>
              <h3 className="neopop-heading font-black text-white text-base sm:text-lg uppercase tracking-tight">
                Actionable Trading Playbooks
              </h3>
              <p className="text-xs text-zinc-400">
                Step-by-step institutional workflows you can execute directly within this terminal.
              </p>
            </div>
          </div>

          {/* Strategy Tabs Switcher */}
          <div className="flex flex-wrap items-center gap-1.5 bg-[#0D0D0D] p-1 rounded border border-black">
            {STRATEGIES.map(s => (
              <button
                key={s.id}
                onClick={() => setActiveStrategyTab(s.id)}
                className={`text-xs font-mono font-bold px-2.5 py-1 rounded transition-all cursor-pointer ${
                  activeStrategyTab === s.id
                    ? 'bg-[#FEE360] text-black border border-black shadow-[1px_1px_0px_#000]'
                    : 'text-zinc-400 hover:text-white hover:bg-[#1A1A1A]'
                }`}
              >
                {s.title.split(':')[0]}
              </button>
            ))}
          </div>
        </div>

        {/* Active Strategy Content */}
        {(() => {
          const activeStrat = STRATEGIES.find(s => s.id === activeStrategyTab) || STRATEGIES[0];
          const Icon = activeStrat.icon;
          return (
            <div className="space-y-4">
              <div className="flex flex-wrap items-center justify-between gap-2 bg-[#121212] p-3 rounded border border-black">
                <div className="flex items-center gap-2">
                  <Icon className="w-4 h-4 text-[#FEE360]" />
                  <span className="font-black text-white text-sm">{activeStrat.title}</span>
                </div>
                <div className="text-xs text-[#00E887] font-mono font-bold">
                  Target: {activeStrat.objective}
                </div>
              </div>

              <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-3">
                {activeStrat.steps.map((step, idx) => (
                  <div key={idx} className="bg-[#121212] p-3.5 rounded border border-black shadow-[2px_2px_0px_#000] space-y-1.5">
                    <div className="text-[10px] font-mono font-black text-[#FEE360] uppercase">
                      Step {idx + 1}
                    </div>
                    <div className="font-bold text-white text-xs">{step.step}</div>
                    <div className="text-[11px] text-zinc-400 leading-relaxed">{step.desc}</div>
                  </div>
                ))}
              </div>
            </div>
          );
        })()}
      </div>

      {/* SECTION 3: Dalal Street Quantitative Metric Glossary */}
      <div className="neopop-card p-5 border-2 border-black bg-[#151515] rounded-[4px] shadow-[4px_4px_0px_#000000]">
        <div className="flex items-center gap-2 mb-3 pb-2 border-b-2 border-black">
          <BookOpen className="w-4 h-4 text-[#FEE360]" />
          <h3 className="neopop-heading font-black text-white text-sm sm:text-base uppercase tracking-tight">
            Key Metric Glossary for Smart Investing
          </h3>
        </div>

        <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-3 text-xs">
          <div className="bg-[#101010] p-3 rounded border border-black shadow-[2px_2px_0px_#000]">
            <div className="font-black text-[#FEE360] font-mono flex items-center justify-between">
              <span>RVOL (Relative Volume)</span>
              <span className="text-[10px] text-zinc-400">Volume Surge</span>
            </div>
            <p className="text-zinc-400 text-[11px] mt-1 leading-relaxed">
              Ratio of current volume against its 20-day historical average. <b>RVOL &gt; 2.0x</b> means volume is double normal activity, confirming institutional interest rather than noise.
            </p>
          </div>

          <div className="bg-[#101010] p-3 rounded border border-black shadow-[2px_2px_0px_#000]">
            <div className="font-black text-[#00E887] font-mono flex items-center justify-between">
              <span>BCL (Bar Close Location)</span>
              <span className="text-[10px] text-zinc-400">Candle Strength</span>
            </div>
            <p className="text-zinc-400 text-[11px] mt-1 leading-relaxed">
              Where the price closed within its high-low range on a 0–100% scale. <b>BCL &gt; 80%</b> means buyers dominated until the closing bell, signaling continuation.
            </p>
          </div>

          <div className="bg-[#101010] p-3 rounded border border-black shadow-[2px_2px_0px_#000]">
            <div className="font-black text-[#FF5959] font-mono flex items-center justify-between">
              <span>Upper Wick Rejection %</span>
              <span className="text-[10px] text-zinc-400">Bull Trap Detector</span>
            </div>
            <p className="text-zinc-400 text-[11px] mt-1 leading-relaxed">
              Measures the upper tail of the candle. <b>Upper wick &gt; 20%</b> flags selling into strength (a bull trap). The terminal automatically penalizes traps to protect your entries.
            </p>
          </div>

          <div className="bg-[#101010] p-3 rounded border border-black shadow-[2px_2px_0px_#000]">
            <div className="font-black text-[#3657FF] font-mono flex items-center justify-between">
              <span>ASM (Surveillance Measure)</span>
              <span className="text-[10px] text-zinc-400">Regulatory Risk</span>
            </div>
            <p className="text-zinc-400 text-[11px] mt-1 leading-relaxed">
              SEBI surveillance categorization. Stocks in ASM require <b>100% upfront cash margin</b>, restricting intraday leverage and alerting you to heightened volatility.
            </p>
          </div>

          <div className="bg-[#101010] p-3 rounded border border-black shadow-[2px_2px_0px_#000]">
            <div className="font-black text-white font-mono flex items-center justify-between">
              <span>Block Deals vs Bulk Deals</span>
              <span className="text-[10px] text-zinc-400">Trade Mechanics</span>
            </div>
            <p className="text-zinc-400 text-[11px] mt-1 leading-relaxed">
              <b>Block Deals</b> execute in a separate 15-minute exchange window (min ₹10 Cr or 5L shares). <b>Bulk Deals</b> execute in open market when trade exceeds 0.5% of total shares.
            </p>
          </div>

          <div className="bg-[#101010] p-3 rounded border border-black shadow-[2px_2px_0px_#000]">
            <div className="font-black text-[#FEE360] font-mono flex items-center justify-between">
              <span>0.5% Risk Gate &amp; 2R Target</span>
              <span className="text-[10px] text-zinc-400">Math of Sizing</span>
            </div>
            <p className="text-zinc-400 text-[11px] mt-1 leading-relaxed">
              Limits potential loss to 0.5% of total equity. At 2.0x Reward:Risk, winning just 40% of trades results in consistent positive mathematical expectancy.
            </p>
          </div>
        </div>
      </div>

      {/* SECTION 4: Advanced Technical MCP Infrastructure (Collapsible) */}
      <div className="neopop-card p-4 sm:p-5 border-2 border-black bg-[#121212] rounded-[4px] shadow-[4px_4px_0px_#000000]">
        <div
          onClick={() => setShowTechnicalDetails(!showTechnicalDetails)}
          className="flex items-center justify-between cursor-pointer select-none"
        >
          <div className="flex items-center gap-2">
            <Cpu className="w-4 h-4 text-[#FEE360]" />
            <span className="font-black text-white text-sm uppercase">
              Advanced: Official NSE Model Context Protocol (MCP) Backend
            </span>
            <span className="neopop-tag bg-[#1E1E1E] text-zinc-400 text-[10px] py-0 px-1 border-black hidden sm:inline">
              Developer &amp; AI Integration
            </span>
          </div>
          <button className="text-zinc-400 hover:text-white flex items-center gap-1 text-xs font-mono">
            <span>{showTechnicalDetails ? 'Collapse Specs' : 'Expand Specs'}</span>
            {showTechnicalDetails ? <ChevronUp className="w-4 h-4" /> : <ChevronDown className="w-4 h-4" />}
          </button>
        </div>

        {showTechnicalDetails && (
          <div className="mt-4 pt-4 border-t-2 border-black space-y-4 animate-in fade-in duration-200">
            <p className="text-xs text-zinc-400 leading-relaxed">
              DstreetPulse connects directly to the official National Stock Exchange Model Context Protocol (MCP) remote tool servers, exposing real-time orderflow, bhavcopy settlements, and live index calculations via standardized JSON-RPC 2.0 protocols.
            </p>

            <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
              <div className="bg-[#090909] p-3.5 rounded border border-black shadow-[2px_2px_0px_#000]">
                <div className="text-xs font-mono font-bold text-[#FEE360]">nse-bhavcopy MCP Server</div>
                <div className="text-[10px] font-mono text-zinc-400 break-all mt-1">https://mcp.nseindia.in/bhavcopy/cm/mcp</div>
                <div className="text-[11px] text-zinc-300 mt-2">
                  Exposes: <code className="text-[#00E887]">get_bulk_quote</code>, <code className="text-[#00E887]">get_stock_history</code>, <code className="text-[#00E887]">get_market_breadth</code>, <code className="text-[#00E887]">get_volume_analysis</code>.
                </div>
              </div>

              <div className="bg-[#090909] p-3.5 rounded border border-black shadow-[2px_2px_0px_#000]">
                <div className="text-xs font-mono font-bold text-[#FEE360]">cm-market MCP Server</div>
                <div className="text-[10px] font-mono text-zinc-400 break-all mt-1">https://mcp.nseindia.in/cmmkt/mcp</div>
                <div className="text-[11px] text-zinc-300 mt-2">
                  Exposes: <code className="text-[#00E887]">cm_get_live_market_data</code>, <code className="text-[#00E887]">cm_get_live_indices</code>, <code className="text-[#00E887]">cm_get_stock_quote</code>.
                </div>
              </div>
            </div>

            <div className="bg-[#090909] p-3 rounded border border-black">
              <div className="flex items-center justify-between mb-2">
                <span className="text-[11px] font-mono text-zinc-400 font-bold uppercase">mcp_config.json Declaration</span>
                <button
                  onClick={copyConfig}
                  className="neopop-btn neopop-btn-primary px-2.5 py-0.5 text-xs font-bold flex items-center gap-1"
                >
                  {copied ? <Check className="w-3 h-3 text-black" /> : <Copy className="w-3 h-3" />}
                  <span>{copied ? 'Copied!' : 'Copy'}</span>
                </button>
              </div>
              <pre className="text-[#FEE360] text-[11px] font-mono overflow-x-auto p-2 bg-[#050505] rounded border border-zinc-800">
                {mcpConfigJson}
              </pre>
            </div>
          </div>
        )}
      </div>

    </div>
  );
}
