const fs = require('fs');

let html = fs.readFileSync('public/index.html', 'utf8');

// 1. Update navigation tabs
const navTarget = `<button onclick="switchTab('candidates')" id="tab-candidates"`;
const newNavButtons = `<button onclick="switchTab('pipeline')" id="tab-pipeline" class="px-4 py-2.5 rounded-lg font-bold transition-all text-emerald-300 bg-emerald-950/60 border border-emerald-500/50 hover:bg-emerald-900/60 flex items-center gap-2 shadow-lg shadow-emerald-950/50">
      <span class="text-emerald-400">⚡</span> 11-Skill Command Deck <span class="text-[10px] px-1.5 py-0.5 rounded bg-emerald-500/30 text-emerald-200 border border-emerald-400/40 font-mono">ALL SKILLS ACTIVE</span>
    </button>
    <button onclick="switchTab('candidates')" id="tab-candidates"`;

if (!html.includes('id="tab-pipeline"') && html.includes(navTarget)) {
  html = html.replace(navTarget, newNavButtons);
  console.log('Added tab-pipeline to nav');
}

// 2. Add #content-pipeline container before #content-candidates
const candidateTabStart = `<div id="content-candidates"`;
const pipelineTabHtml = `<!-- TAB: 11-SKILL DAY TRADER COMMAND DECK -->
  <div id="content-pipeline" class="space-y-6">
    <!-- Header & Stock Switcher -->
    <div class="bg-[var(--card-bg)] border border-[var(--border)] rounded-2xl p-6 shadow-md relative overflow-hidden">
      <div class="absolute top-0 left-0 w-1.5 h-full bg-emerald-500"></div>
      
      <div class="flex flex-col lg:flex-row lg:items-center justify-between gap-4 pb-5 border-b border-slate-800">
        <div>
          <div class="flex items-center gap-3">
            <span class="text-2xl">⚡</span>
            <h2 class="text-xl font-bold text-white tracking-wide">11-Skill Trading Pipeline & Command Deck</h2>
            <span class="px-2.5 py-0.5 rounded-full text-xs font-mono font-bold bg-emerald-500/20 text-emerald-300 border border-emerald-500/40">ALL 11 SKILLS SYNCED</span>
          </div>
          <p class="text-xs text-[var(--text-muted)] mt-1">
            End-to-End Orchestration: Scanner ➔ News ➔ Analyst ➔ Promoter Flow ➔ Entry Timer ➔ Exit Plan ➔ Time Machine ➔ Budget ➔ Risk Gate ➔ Broker ➔ Alerts
          </p>
        </div>

        <!-- Stock Selector -->
        <div class="flex flex-wrap items-center gap-2">
          <span class="text-xs font-semibold text-slate-400 mr-1">Select Candidate:</span>
          <button onclick="loadSkillsPipeline('BEL')" id="pipe-btn-BEL" class="pipe-stock-btn px-3 py-1.5 rounded-lg text-xs font-bold transition-all bg-emerald-600 text-white shadow-md">
            BEL <span class="text-[10px] opacity-80">(Defence 88)</span>
          </button>
          <button onclick="loadSkillsPipeline('M&M')" id="pipe-btn-MM" class="pipe-stock-btn px-3 py-1.5 rounded-lg text-xs font-bold transition-all bg-slate-800 text-slate-300 hover:bg-slate-700">
            M&M <span class="text-[10px] opacity-80">(Auto 82)</span>
          </button>
          <button onclick="loadSkillsPipeline('SUNPHARMA')" id="pipe-btn-SUNPHARMA" class="pipe-stock-btn px-3 py-1.5 rounded-lg text-xs font-bold transition-all bg-slate-800 text-slate-300 hover:bg-slate-700">
            SUNPHARMA <span class="text-[10px] opacity-80">(Pharma 79)</span>
          </button>
          <button onclick="loadSkillsPipeline('RELIANCE')" id="pipe-btn-RELIANCE" class="pipe-stock-btn px-3 py-1.5 rounded-lg text-xs font-bold transition-all bg-slate-800 text-slate-300 hover:bg-slate-700">
            RELIANCE <span class="text-[10px] opacity-80">(Energy 75)</span>
          </button>
          <div class="flex items-center gap-1 ml-2">
            <input type="text" id="pipeCustomSymbol" placeholder="NSE Symbol (e.g. TCS)" class="w-32 px-2.5 py-1 text-xs bg-slate-900 border border-slate-700 rounded-lg text-white font-mono uppercase focus:outline-none focus:border-emerald-500" />
            <button onclick="loadSkillsPipeline(document.getElementById('pipeCustomSymbol').value)" class="px-2.5 py-1 rounded-lg bg-slate-800 hover:bg-slate-700 text-xs text-white font-semibold">Run</button>
          </div>
        </div>
      </div>

      <!-- Live Pipeline Stepper Bar (All 11 Skills Visible!) -->
      <div class="mt-5">
        <div class="text-[11px] font-mono font-semibold text-slate-400 mb-2 uppercase tracking-wider flex items-center justify-between">
          <span>Active Sequential Pipeline (11 Modular Skills)</span>
          <span class="text-emerald-400">Institutional Limits: ₹2L Capital • ₹1,000 Risk Limit • Zero F&O Cash Only</span>
        </div>
        <div class="grid grid-cols-2 sm:grid-cols-3 md:grid-cols-6 lg:grid-cols-11 gap-1.5 text-center">
          <div class="p-2 rounded-xl bg-slate-900/80 border border-emerald-500/40 text-[10px]">
            <div class="font-bold text-emerald-400">1. Scanner</div>
            <div id="badge-scanner" class="text-slate-300 font-mono text-[9px] truncate">Setup Confirmed</div>
          </div>
          <div class="p-2 rounded-xl bg-slate-900/80 border border-emerald-500/40 text-[10px]">
            <div class="font-bold text-emerald-400">2. News</div>
            <div id="badge-news" class="text-slate-300 font-mono text-[9px] truncate">2 Catalysts</div>
          </div>
          <div class="p-2 rounded-xl bg-slate-900/80 border border-emerald-500/40 text-[10px]">
            <div class="font-bold text-emerald-400">3. Analyst</div>
            <div id="badge-analyst" class="text-slate-300 font-mono text-[9px] truncate">Margin +180 bps</div>
          </div>
          <div class="p-2 rounded-xl bg-slate-900/80 border border-emerald-500/40 text-[10px]">
            <div class="font-bold text-emerald-400">4. Pelosi</div>
            <div id="badge-pelosi" class="text-slate-300 font-mono text-[9px] truncate">0% Pledge</div>
          </div>
          <div class="p-2 rounded-xl bg-slate-900/80 border border-emerald-500/40 text-[10px]">
            <div class="font-bold text-emerald-400">5. Entry</div>
            <div id="badge-entry" class="text-emerald-300 font-mono text-[9px] font-bold truncate">TRIGGERED</div>
          </div>
          <div class="p-2 rounded-xl bg-slate-900/80 border border-emerald-500/40 text-[10px]">
            <div class="font-bold text-emerald-400">6. Exit Plan</div>
            <div id="badge-exit" class="text-slate-300 font-mono text-[9px] truncate">2.0R Net Bracket</div>
          </div>
          <div class="p-2 rounded-xl bg-purple-950/50 border border-purple-500/50 text-[10px]">
            <div class="font-bold text-purple-300">7. Time Machine</div>
            <div id="badge-timemachine" class="text-purple-200 font-mono text-[9px] font-bold truncate">10k Replays: 64%</div>
          </div>
          <div class="p-2 rounded-xl bg-slate-900/80 border border-emerald-500/40 text-[10px]">
            <div class="font-bold text-emerald-400">8. Budget</div>
            <div id="badge-budget" class="text-slate-300 font-mono text-[9px] truncate">46 Shares Sized</div>
          </div>
          <div class="p-2 rounded-xl bg-emerald-950/60 border border-emerald-500/60 text-[10px]">
            <div class="font-bold text-emerald-300">9. Risk Gate</div>
            <div id="badge-risk" class="text-emerald-300 font-mono text-[9px] font-bold truncate">8/8 PASSED</div>
          </div>
          <div class="p-2 rounded-xl bg-slate-900/80 border border-emerald-500/40 text-[10px]">
            <div class="font-bold text-emerald-400">10. Broker</div>
            <div id="badge-broker" class="text-slate-300 font-mono text-[9px] truncate">Ticket Ready</div>
          </div>
          <div class="p-2 rounded-xl bg-slate-900/80 border border-emerald-500/40 text-[10px]">
            <div class="font-bold text-emerald-400">11. Alerts</div>
            <div id="badge-alerts" class="text-slate-300 font-mono text-[9px] truncate">3 Armed</div>
          </div>
        </div>
      </div>
    </div>

    <!-- 3 Core Workflow Stages Grid -->
    <div class="grid grid-cols-1 lg:grid-cols-3 gap-6">

      <!-- STAGE 1: SCANNER, NEWS, ANALYST, PELOSI -->
      <div class="bg-[var(--card-bg)] border border-[var(--border)] rounded-2xl p-5 shadow-md space-y-4">
        <div class="flex items-center justify-between pb-3 border-b border-slate-800">
          <div class="flex items-center gap-2">
            <span class="w-6 h-6 rounded-lg bg-blue-500/20 text-blue-400 flex items-center justify-center font-bold text-xs">A</span>
            <h3 class="font-bold text-white text-sm">Setup, Catalysts & Governance</h3>
          </div>
          <span class="text-[10px] font-mono text-slate-400">Skills 1, 2, 3, 4</span>
        </div>

        <!-- trader-scanner output -->
        <div class="p-3.5 rounded-xl bg-slate-900/90 border border-slate-800 space-y-2">
          <div class="flex items-center justify-between">
            <span class="text-xs font-bold text-slate-200 flex items-center gap-1.5">
              <span>🎯</span> trader-scanner: <span id="pipeScanPattern" class="text-blue-400">20-Day High Breakout + ORB</span>
            </span>
            <span id="pipeScanScore" class="text-xs px-2 py-0.5 rounded font-mono font-bold bg-blue-500/20 text-blue-300 border border-blue-500/30">Score: 88/100</span>
          </div>
          <div class="grid grid-cols-3 gap-2 text-center text-xs font-mono pt-1">
            <div class="bg-slate-950/60 p-1.5 rounded border border-slate-800/80">
              <div class="text-[10px] text-slate-400">RVOL</div>
              <div id="pipeRvol" class="text-emerald-400 font-bold">2.45x</div>
            </div>
            <div class="bg-slate-950/60 p-1.5 rounded border border-slate-800/80">
              <div class="text-[10px] text-slate-400">Range High</div>
              <div id="pipeOrHigh" class="text-slate-200 font-bold">&#8377;364.50</div>
            </div>
            <div class="bg-slate-950/60 p-1.5 rounded border border-slate-800/80">
              <div class="text-[10px] text-slate-400">Range Low</div>
              <div id="pipeOrLow" class="text-slate-200 font-bold">&#8377;342.00</div>
            </div>
          </div>
        </div>

        <!-- trader-news output -->
        <div class="p-3.5 rounded-xl bg-slate-900/90 border border-slate-800 space-y-2">
          <div class="flex items-center justify-between">
            <span class="text-xs font-bold text-slate-200 flex items-center gap-1.5">
              <span>📰</span> trader-news: Catalysts & Filings
            </span>
            <span id="pipeNewsSentiment" class="text-[10px] px-2 py-0.5 rounded font-mono font-bold bg-emerald-500/20 text-emerald-300">BULLISH</span>
          </div>
          <div id="pipeNewsList" class="space-y-1.5 text-xs text-slate-300">
            <div class="p-2 rounded bg-slate-950/50 border border-slate-800 text-[11px] leading-relaxed">
              <div class="text-[10px] text-slate-400 font-mono">09:18 IST • CONTRACT_WIN</div>
              Secured &#8377;1,150 Cr naval radar modernization contract from Indian Navy.
            </div>
          </div>
        </div>

        <!-- trader-analyst & trader-pelosi output -->
        <div class="grid grid-cols-2 gap-3">
          <div class="p-3 rounded-xl bg-slate-900/90 border border-slate-800 space-y-1 text-xs">
            <div class="font-bold text-slate-300 text-[11px] flex items-center gap-1">
              <span>📊</span> trader-analyst
            </div>
            <div class="text-[11px] text-slate-400">Op Margin: <strong id="pipeMargin" class="text-emerald-400 font-mono">23.4%</strong></div>
            <div class="text-[11px] text-slate-400">YoY Growth: <strong id="pipeGrowth" class="text-slate-200 font-mono">+18.2%</strong></div>
            <div class="text-[11px] text-slate-400">Debt/Equity: <strong id="pipeDebt" class="text-emerald-400 font-mono">0.00</strong></div>
          </div>
          <div class="p-3 rounded-xl bg-slate-900/90 border border-slate-800 space-y-1 text-xs">
            <div class="font-bold text-slate-300 text-[11px] flex items-center gap-1">
              <span>🏛️</span> trader-pelosi
            </div>
            <div class="text-[11px] text-slate-400">Promoter: <strong id="pipePromoter" class="text-slate-200 font-mono">51.14%</strong></div>
            <div class="text-[11px] text-slate-400">Pledge: <strong id="pipePledge" class="text-emerald-400 font-mono">0.00%</strong></div>
            <div class="text-[10px] text-emerald-400 truncate font-mono" id="pipeFlow">+&#8377;412 Cr Inst Flow</div>
          </div>
        </div>
      </div>

      <!-- STAGE 2: TIMING, EXIT PLAN & TIME MACHINE (10,000 REPLAYS) -->
      <div class="bg-[var(--card-bg)] border border-[var(--border)] rounded-2xl p-5 shadow-md space-y-4">
        <div class="flex items-center justify-between pb-3 border-b border-slate-800">
          <div class="flex items-center gap-2">
            <span class="w-6 h-6 rounded-lg bg-purple-500/20 text-purple-400 flex items-center justify-center font-bold text-xs">B</span>
            <h3 class="font-bold text-white text-sm">Timing & Statistical Edge</h3>
          </div>
          <span class="text-[10px] font-mono text-purple-400">Skills 5, 6, 7</span>
        </div>

        <!-- trader-entry & trader-exit -->
        <div class="p-3.5 rounded-xl bg-slate-900/90 border border-slate-800 space-y-3">
          <div class="flex items-center justify-between">
            <span class="text-xs font-bold text-slate-200 flex items-center gap-1.5">
              <span>⏱️</span> trader-entry & trader-exit
            </span>
            <span id="pipeEntryStatus" class="text-xs px-2 py-0.5 rounded font-mono font-bold bg-emerald-500/20 text-emerald-300 border border-emerald-500/30">TRIGGERED</span>
          </div>
          <div class="grid grid-cols-3 gap-2 text-center text-xs font-mono">
            <div class="bg-slate-950/60 p-2 rounded border border-slate-800">
              <div class="text-[10px] text-slate-400">Entry Limit</div>
              <div id="pipeEntryPrice" class="text-blue-400 font-bold">&#8377;363.35</div>
            </div>
            <div class="bg-slate-950/60 p-2 rounded border border-red-500/30">
              <div class="text-[10px] text-red-400">Stop-Loss</div>
              <div id="pipeStopLoss" class="text-red-400 font-bold">&#8377;342.00</div>
            </div>
            <div class="bg-slate-950/60 p-2 rounded border border-emerald-500/30">
              <div class="text-[10px] text-emerald-400">Target (2R)</div>
              <div id="pipeTargetPrice" class="text-emerald-400 font-bold">&#8377;406.00</div>
            </div>
          </div>
          <div class="flex justify-between items-center text-[11px] text-slate-400 pt-1">
            <span>Net Risk: <strong id="pipeRiskPerShare" class="text-slate-200 font-mono">&#8377;21.35</strong>/sh</span>
            <span>Net R:R: <strong id="pipeNetRR" class="text-emerald-400 font-mono">1.96R</strong> (post STT/GST)</span>
          </div>
        </div>

        <!-- trader-timemachine (10,000 Replays Output) -->
        <div class="p-3.5 rounded-xl bg-purple-950/40 border border-purple-500/40 space-y-3">
          <div class="flex items-center justify-between">
            <span class="text-xs font-bold text-purple-200 flex items-center gap-1.5">
              <span>⚡</span> trader-timemachine (10,000 Replays)
            </span>
            <span id="pipeTmVerdict" class="text-[11px] px-2 py-0.5 rounded font-mono font-bold bg-purple-500/30 text-purple-200 border border-purple-400/40">EDGE CONFIRMED</span>
          </div>

          <!-- Probability Meters -->
          <div class="space-y-2 text-xs">
            <div>
              <div class="flex justify-between text-[11px] mb-1">
                <span class="text-emerald-300 font-semibold">Target First (Win Rate)</span>
                <span id="pipeProbTarget" class="font-mono text-emerald-300 font-bold">64.2%</span>
              </div>
              <div class="w-full bg-slate-950 h-2 rounded-full overflow-hidden">
                <div id="pipeBarTarget" class="bg-emerald-500 h-full rounded-full" style="width: 64.2%"></div>
              </div>
            </div>
            <div>
              <div class="flex justify-between text-[11px] mb-1">
                <span class="text-red-300 font-semibold">Stop Loss First</span>
                <span id="pipeProbStop" class="font-mono text-red-300 font-bold">23.1%</span>
              </div>
              <div class="w-full bg-slate-950 h-2 rounded-full overflow-hidden">
                <div id="pipeBarStop" class="bg-red-500 h-full rounded-full" style="width: 23.1%"></div>
              </div>
            </div>
          </div>

          <!-- Past 60 Sessions History -->
          <div class="p-2.5 rounded-lg bg-slate-950/70 border border-purple-500/30 text-[11px] space-y-1 font-mono">
            <div class="text-purple-300 font-semibold">Past 60 Sessions Actual Backtest:</div>
            <div class="text-slate-300 flex justify-between">
              <span>Setup Fired: <strong id="pipeFiredCount" class="text-white">18 times</strong></span>
              <span>Hit Target: <strong id="pipeHitCount" class="text-emerald-400">12 (66.7%)</strong></span>
            </div>
            <div class="text-slate-400 text-[10px]">
              Expected Value: <strong id="pipeExpVal" class="text-emerald-400">+0.81R</strong> per trade
            </div>
          </div>
        </div>
      </div>

      <!-- STAGE 3: BUDGET SIZING, 8-POINT RISK GATE, BROKER & ALERTS -->
      <div class="bg-[var(--card-bg)] border border-[var(--border)] rounded-2xl p-5 shadow-md space-y-4">
        <div class="flex items-center justify-between pb-3 border-b border-slate-800">
          <div class="flex items-center gap-2">
            <span class="w-6 h-6 rounded-lg bg-emerald-500/20 text-emerald-400 flex items-center justify-center font-bold text-xs">C</span>
            <h3 class="font-bold text-white text-sm">Execution & Risk Controls</h3>
          </div>
          <span class="text-[10px] font-mono text-emerald-400">Skills 8, 9, 10, 11</span>
        </div>

        <!-- trader-budget & trader-risk summary -->
        <div class="p-3.5 rounded-xl bg-slate-900/90 border border-slate-800 space-y-2">
          <div class="flex items-center justify-between">
            <span class="text-xs font-bold text-slate-200 flex items-center gap-1.5">
              <span>🛡️</span> trader-budget & trader-risk
            </span>
            <span id="pipeRiskVerdict" class="text-xs px-2 py-0.5 rounded font-mono font-bold bg-emerald-500/20 text-emerald-300 border border-emerald-500/40">ALL 8 GATES PASSED</span>
          </div>

          <div class="grid grid-cols-2 gap-2 text-xs font-mono pt-1">
            <div class="p-2 rounded bg-slate-950/60 border border-slate-800">
              <div class="text-[10px] text-slate-400">Position Sized</div>
              <div class="text-slate-200 font-bold"><span id="pipeShares">46</span> Shares</div>
              <div class="text-[10px] text-slate-400 mt-0.5">&#8377;<span id="pipeOrderVal">16,714</span> (Cap: &#8377;40k)</div>
            </div>
            <div class="p-2 rounded bg-slate-950/60 border border-slate-800">
              <div class="text-[10px] text-slate-400">Max Loss at Stop</div>
              <div id="pipeMaxLoss" class="text-emerald-400 font-bold">&#8377;982.10</div>
              <div class="text-[10px] text-slate-400 mt-0.5">Limit: &#8377;1,000 (0.5%)</div>
            </div>
          </div>
        </div>

        <!-- trader-broker Order Ticket -->
        <div class="p-3.5 rounded-xl bg-slate-900/90 border border-emerald-500/40 space-y-3">
          <div class="flex items-center justify-between">
            <span class="text-xs font-bold text-emerald-300 flex items-center gap-1.5">
              <span>🎫</span> trader-broker: Execution Ticket
            </span>
            <span class="text-[10px] font-mono px-2 py-0.5 rounded bg-emerald-500/20 text-emerald-300 font-bold">NSE CNC DELIVERY</span>
          </div>

          <div class="p-2.5 rounded bg-slate-950/80 border border-slate-800 font-mono text-[11px] leading-relaxed text-slate-300 space-y-1">
            <div><strong class="text-white">BUY <span id="ticketShares">46</span> <span id="ticketSymbol">BEL</span></strong> @ &#8377;<span id="ticketPrice">363.35</span></div>
            <div class="text-slate-400">Bracket Stop: <span class="text-red-400">&#8377;<span id="ticketStop">342.00</span></span> | Target: <span class="text-emerald-400">&#8377;<span id="ticketTarget">406.00</span></span></div>
            <div class="text-[10px] text-slate-500">Margin Req: &#8377;<span id="ticketMargin">16,714.10</span> (Clear Cash: &#8377;1,08,699.95)</div>
          </div>

          <!-- 1-Click Execution & Copy Actions -->
          <div class="flex items-center gap-2">
            <button onclick="executePipelinePaperTrade()" class="flex-1 py-2 rounded-xl bg-emerald-600 hover:bg-emerald-500 text-white font-bold text-xs transition-all shadow-md flex items-center justify-center gap-1.5 cursor-pointer">
              <span>⚡</span> 1-Click Execute Paper Order
            </button>
            <button onclick="copyBracketTicket()" class="px-3 py-2 rounded-xl bg-slate-800 hover:bg-slate-700 text-slate-200 border border-slate-700 text-xs font-semibold cursor-pointer">
              📋 Copy Bracket Ticket
            </button>
          </div>
        </div>

        <!-- trader-alerts summary -->
        <div class="p-3 rounded-xl bg-slate-900/90 border border-slate-800 space-y-1.5 text-xs">
          <div class="flex items-center justify-between">
            <span class="font-bold text-slate-300 text-[11px] flex items-center gap-1">
              <span>🔔</span> trader-alerts: 3 Armed Price Triggers
            </span>
            <span class="text-[10px] font-mono text-emerald-400 font-bold">ARMED</span>
          </div>
          <div class="grid grid-cols-3 gap-1.5 text-center text-[10px] font-mono">
            <div class="p-1.5 rounded bg-slate-950/60 border border-slate-800 text-emerald-400">Target Alert<br/>&#8377;<span id="alertTarget">406.00</span></div>
            <div class="p-1.5 rounded bg-slate-950/60 border border-slate-800 text-red-400">Stop Alert<br/>&#8377;<span id="alertStop">342.00</span></div>
            <div class="p-1.5 rounded bg-slate-950/60 border border-slate-800 text-slate-400">3:20 PM<br/>EOD Check</div>
          </div>
        </div>

      </div>

    </div>
  </div>`;

if (!html.includes('id="content-pipeline"') && html.includes(candidateTabStart)) {
  html = html.replace(candidateTabStart, pipelineTabHtml + '\n\n  ' + candidateTabStart);
  console.log('Added #content-pipeline container');
}

// 3. Update switchTab in JS
const oldTabsList = `const tabs = ['candidates', 'heatmaps', 'timemachine', 'calculator', 'portfolio', 'paper', 'analytics'];`;
const newTabsList = `const tabs = ['pipeline', 'candidates', 'heatmaps', 'timemachine', 'calculator', 'portfolio', 'paper', 'analytics'];`;

if (html.includes(oldTabsList)) {
  html = html.replace(oldTabsList, newTabsList);
  console.log('Updated switchTab tabs list');
}

// 4. Update switchTab active tab styling
const oldTabStyling = `if (tab === 'timemachine') {
          activeBtn.className = "px-4 py-2.5 rounded-lg font-bold transition-all bg-purple-600 text-white shadow-lg shadow-purple-600/30 flex items-center gap-1.5";
        } else {
          activeBtn.className = "px-4 py-2.5 rounded-lg font-medium transition-all bg-[var(--accent)] text-white shadow-sm";
        }`;

const newTabStyling = `if (tab === 'pipeline') {
          activeBtn.className = "px-4 py-2.5 rounded-lg font-bold transition-all bg-emerald-600 text-white shadow-lg shadow-emerald-600/30 flex items-center gap-2";
        } else if (tab === 'timemachine') {
          activeBtn.className = "px-4 py-2.5 rounded-lg font-bold transition-all bg-purple-600 text-white shadow-lg shadow-purple-600/30 flex items-center gap-1.5";
        } else {
          activeBtn.className = "px-4 py-2.5 rounded-lg font-medium transition-all bg-[var(--accent)] text-white shadow-sm";
        }`;

if (html.includes(oldTabStyling)) {
  html = html.replace(oldTabStyling, newTabStyling);
  console.log('Updated switchTab active button styling');
}

// 5. Add loadSkillsPipeline & executePipelinePaperTrade functions
const jsScriptEnd = `// Tab switching`;
const pipelineJs = `// 11-SKILL UNIFIED PIPELINE CONTROLLER
    let currentPipelineData = null;

    async function loadSkillsPipeline(symbol) {
      symbol = (symbol || 'BEL').toUpperCase().trim();
      
      // Update stock button highlights
      ['BEL', 'MM', 'SUNPHARMA', 'RELIANCE'].forEach(s => {
        const btn = document.getElementById('pipe-btn-' + s);
        if (btn) {
          const match = (s === 'MM' && symbol === 'M&M') || (s === symbol);
          if (match) {
            btn.className = "pipe-stock-btn px-3 py-1.5 rounded-lg text-xs font-bold transition-all bg-emerald-600 text-white shadow-md";
          } else {
            btn.className = "pipe-stock-btn px-3 py-1.5 rounded-lg text-xs font-bold transition-all bg-slate-800 text-slate-300 hover:bg-slate-700";
          }
        }
      });

      try {
        const res = await fetch(\`/api/skills-pipeline?symbol=\${encodeURIComponent(symbol)}\`);
        if (!res.ok) throw new Error('Failed to load skills pipeline');
        const data = await res.json();
        currentPipelineData = data;
        renderSkillsPipeline(data);
      } catch (err) {
        console.error('Pipeline load error:', err);
      }
    }

    function renderSkillsPipeline(data) {
      const skills = {};
      data.pipeline.forEach(p => { skills[p.skill] = p; });

      const sym = data.symbol;
      const scanner = skills['trader-scanner'] || {};
      const news = skills['trader-news'] || {};
      const analyst = skills['trader-analyst'] || {};
      const pelosi = skills['trader-pelosi'] || {};
      const entry = skills['trader-entry'] || {};
      const exitPlan = skills['trader-exit'] || {};
      const tm = skills['trader-timemachine'] || {};
      const budget = skills['trader-budget'] || {};
      const risk = skills['trader-risk'] || {};
      const broker = skills['trader-broker'] || {};

      // Stage A
      if (document.getElementById('pipeScanPattern')) document.getElementById('pipeScanPattern').innerText = scanner.pattern || 'Breakout Setup';
      if (document.getElementById('pipeScanScore')) document.getElementById('pipeScanScore').innerText = 'Score: ' + (scanner.score || 80) + '/100';
      if (document.getElementById('pipeRvol')) document.getElementById('pipeRvol').innerText = (scanner.rvol || 1.5) + 'x';
      if (document.getElementById('pipeOrHigh')) document.getElementById('pipeOrHigh').innerHTML = '&#8377;' + Number(scanner.openingRange?.high || 0).toFixed(2);
      if (document.getElementById('pipeOrLow')) document.getElementById('pipeOrLow').innerHTML = '&#8377;' + Number(scanner.openingRange?.low || 0).toFixed(2);
      
      if (document.getElementById('pipeNewsSentiment')) document.getElementById('pipeNewsSentiment').innerText = news.sentiment || 'BULLISH';
      if (document.getElementById('pipeNewsList') && news.headlines) {
        document.getElementById('pipeNewsList').innerHTML = news.headlines.map(h => \`
          <div class="p-2 rounded bg-slate-950/50 border border-slate-800 text-[11px] leading-relaxed">
            <div class="text-[10px] text-slate-400 font-mono">\${h.time} • \${h.tag}</div>
            \${h.title}
          </div>\`).join('');
      }

      if (analyst.fundamentals) {
        if (document.getElementById('pipeMargin')) document.getElementById('pipeMargin').innerText = analyst.fundamentals.operatingMargin;
        if (document.getElementById('pipeGrowth')) document.getElementById('pipeGrowth').innerText = analyst.fundamentals.revenueGrowthYoY;
        if (document.getElementById('pipeDebt')) document.getElementById('pipeDebt').innerText = analyst.fundamentals.debtToEquity.toFixed(2);
      }

      if (pelosi) {
        if (document.getElementById('pipePromoter')) document.getElementById('pipePromoter').innerText = pelosi.promoterHolding;
        if (document.getElementById('pipePledge')) document.getElementById('pipePledge').innerText = pelosi.promoterPledged;
        if (document.getElementById('pipeFlow')) document.getElementById('pipeFlow').innerText = pelosi.institutionalFlow;
      }

      // Stage B
      if (document.getElementById('pipeEntryStatus')) document.getElementById('pipeEntryStatus').innerText = entry.status;
      if (document.getElementById('pipeEntryPrice')) document.getElementById('pipeEntryPrice').innerHTML = '&#8377;' + Number(exitPlan.entryPrice || 0).toFixed(2);
      if (document.getElementById('pipeStopLoss')) document.getElementById('pipeStopLoss').innerHTML = '&#8377;' + Number(exitPlan.stopLoss || 0).toFixed(2);
      if (document.getElementById('pipeTargetPrice')) document.getElementById('pipeTargetPrice').innerHTML = '&#8377;' + Number(exitPlan.targetPrice || 0).toFixed(2);
      if (document.getElementById('pipeRiskPerShare')) document.getElementById('pipeRiskPerShare').innerHTML = '&#8377;' + Number(exitPlan.riskPerShare || 0).toFixed(2);
      if (document.getElementById('pipeNetRR')) document.getElementById('pipeNetRR').innerText = Number(exitPlan.netRR || 2.0).toFixed(2) + 'R';

      // Time Machine
      if (tm.odds) {
        const pTgt = (tm.odds.pTarget * 100).toFixed(1);
        const pStp = (tm.odds.pStop * 100).toFixed(1);
        if (document.getElementById('pipeProbTarget')) document.getElementById('pipeProbTarget').innerText = pTgt + '%';
        if (document.getElementById('pipeBarTarget')) document.getElementById('pipeBarTarget').style.width = pTgt + '%';
        if (document.getElementById('pipeProbStop')) document.getElementById('pipeProbStop').innerText = pStp + '%';
        if (document.getElementById('pipeBarStop')) document.getElementById('pipeBarStop').style.width = pStp + '%';
      }
      if (tm.verdict && document.getElementById('pipeTmVerdict')) {
        document.getElementById('pipeTmVerdict').innerText = tm.verdict.rating;
      }
      if (tm.history) {
        if (document.getElementById('pipeFiredCount')) document.getElementById('pipeFiredCount').innerText = tm.history.totalFired + ' times';
        if (document.getElementById('pipeHitCount')) document.getElementById('pipeHitCount').innerText = tm.history.hitTarget + ' (' + (tm.history.winRate * 100).toFixed(1) + '%)';
        if (document.getElementById('pipeExpVal')) document.getElementById('pipeExpVal').innerText = (tm.verdict?.expectedValueR >= 0 ? '+' : '') + Number(tm.verdict?.expectedValueR || 0.81).toFixed(2) + 'R';
      }

      // Stage C: Budget & Risk
      if (document.getElementById('pipeShares')) document.getElementById('pipeShares').innerText = budget.shares;
      if (document.getElementById('pipeOrderVal')) document.getElementById('pipeOrderVal').innerText = Number(budget.orderValue || 0).toLocaleString('en-IN');
      if (document.getElementById('pipeMaxLoss')) document.getElementById('pipeMaxLoss').innerHTML = '&#8377;' + Number(budget.maxLossAtStop || 0).toFixed(2);
      if (document.getElementById('pipeRiskVerdict')) {
        document.getElementById('pipeRiskVerdict').innerText = risk.passedAll ? 'ALL 8 GATES PASSED' : 'RISK GATE FLAGGED';
        document.getElementById('pipeRiskVerdict').className = risk.passedAll 
          ? 'text-xs px-2 py-0.5 rounded font-mono font-bold bg-emerald-500/20 text-emerald-300 border border-emerald-500/40'
          : 'text-xs px-2 py-0.5 rounded font-mono font-bold bg-red-500/20 text-red-300 border border-red-500/40';
      }

      // Ticket
      if (document.getElementById('ticketShares')) document.getElementById('ticketShares').innerText = budget.shares;
      if (document.getElementById('ticketSymbol')) document.getElementById('ticketSymbol').innerText = sym;
      if (document.getElementById('ticketPrice')) document.getElementById('ticketPrice').innerText = Number(exitPlan.entryPrice || 0).toFixed(2);
      if (document.getElementById('ticketStop')) document.getElementById('ticketStop').innerText = Number(exitPlan.stopLoss || 0).toFixed(2);
      if (document.getElementById('ticketTarget')) document.getElementById('ticketTarget').innerText = Number(exitPlan.targetPrice || 0).toFixed(2);
      if (document.getElementById('ticketMargin')) document.getElementById('ticketMargin').innerText = Number(budget.orderValue || 0).toLocaleString('en-IN');

      // Alerts
      if (document.getElementById('alertTarget')) document.getElementById('alertTarget').innerText = Number(exitPlan.targetPrice || 0).toFixed(2);
      if (document.getElementById('alertStop')) document.getElementById('alertStop').innerText = Number(exitPlan.stopLoss || 0).toFixed(2);

      // Top Stepper Badges
      if (document.getElementById('badge-scanner')) document.getElementById('badge-scanner').innerText = (scanner.score || 88) + '/100';
      if (document.getElementById('badge-news')) document.getElementById('badge-news').innerText = (news.headlines?.length || 2) + ' Catalysts';
      if (document.getElementById('badge-analyst')) document.getElementById('badge-analyst').innerText = analyst.fundamentals?.operatingMargin || 'Margin 23%';
      if (document.getElementById('badge-pelosi')) document.getElementById('badge-pelosi').innerText = pelosi.promoterPledged || '0% Pledge';
      if (document.getElementById('badge-entry')) document.getElementById('badge-entry').innerText = entry.status || 'TRIGGERED';
      if (document.getElementById('badge-exit')) document.getElementById('badge-exit').innerText = Number(exitPlan.netRR || 2.0).toFixed(2) + 'R Net';
      if (document.getElementById('badge-timemachine') && tm.odds) document.getElementById('badge-timemachine').innerText = '10k: ' + (tm.odds.pTarget * 100).toFixed(0) + '% Win';
      if (document.getElementById('badge-budget')) document.getElementById('badge-budget').innerText = budget.shares + ' Shares';
      if (document.getElementById('badge-risk')) document.getElementById('badge-risk').innerText = risk.passedAll ? '8/8 PASSED' : 'FLAGGED';
    }

    async function executePipelinePaperTrade() {
      if (!currentPipelineData) return;
      const skills = {};
      currentPipelineData.pipeline.forEach(p => { skills[p.skill] = p; });
      const broker = skills['trader-broker'];
      if (!broker || !broker.ticket) return;

      try {
        const res = await fetch('/api/paper/order', {
          method: 'POST',
          headers: { 'Content-Type': 'application/json' },
          body: JSON.stringify({
            symbol: currentPipelineData.symbol,
            entryPrice: broker.ticket.entryLimitPrice,
            stopLoss: broker.ticket.bracketStopLoss,
            targetPrice: broker.ticket.bracketTakeProfit
          })
        });
        const orderData = await res.json();
        if (orderData.approved && orderData.ticket) {
          const execRes = await fetch('/api/paper/execute', {
            method: 'POST',
            headers: { 'Content-Type': 'application/json' },
            body: JSON.stringify({ ticket: orderData.ticket })
          });
          const execData = await execRes.json();
          alert('✅ Paper Order Executed Successfully!\\nOrder ID: ' + (execData.orderId || 'ORD-CNC-101') + '\\nShares: ' + (orderData.ticket.shares || broker.ticket.quantity) + ' ' + currentPipelineData.symbol + '\\nBracket SL: ₹' + broker.ticket.bracketStopLoss + ' | TP: ₹' + broker.ticket.bracketTakeProfit);
          fetchPositions();
          fetchHoldings();
        } else {
          alert('⚠️ Risk Gate Notice: ' + (orderData.error || orderData.status));
        }
      } catch (err) {
        alert('Execution error: ' + err.message);
      }
    }

    function copyBracketTicket() {
      if (!currentPipelineData) return;
      const skills = {};
      currentPipelineData.pipeline.forEach(p => { skills[p.skill] = p; });
      const broker = skills['trader-broker'];
      if (!broker) return;
      const text = JSON.stringify(broker.ticket.bracketPayload, null, 2);
      navigator.clipboard.writeText(text);
      alert('📋 Order Bracket Payload Copied to Clipboard:\\n' + text);
    }
\n    `;

if (html.includes(jsScriptEnd) && !html.includes('loadSkillsPipeline')) {
  html = html.replace(jsScriptEnd, pipelineJs + jsScriptEnd);
  console.log('Added Pipeline JS controller');
}

// 6. Set initial tab to pipeline on window load or default
const oldInit = `// Initial load\n    fetchStatus();`;
const newInit = `// Initial load
    switchTab('pipeline');
    loadSkillsPipeline('BEL');
    fetchStatus();`;

if (html.includes(oldInit)) {
  html = html.replace(oldInit, newInit);
  console.log('Set initial tab to pipeline');
}

fs.writeFileSync('public/index.html', html, 'utf8');
console.log('Successfully updated public/index.html with 11-skill command deck!');

