const fs = require('fs');

let html = fs.readFileSync('public/index.html', 'utf8');

// 1. Add Quantum Time Machine tab button to navigation
const navTarget = `<button onclick="switchTab('heatmaps')" id="tab-heatmaps" class="px-4 py-2.5 rounded-lg font-medium transition-all text-[var(--text-muted)] hover:text-white hover:bg-slate-800/50">Heatmap</button>`;
const navReplacement = `<button onclick="switchTab('heatmaps')" id="tab-heatmaps" class="px-4 py-2.5 rounded-lg font-medium transition-all text-[var(--text-muted)] hover:text-white hover:bg-slate-800/50">Heatmap</button>
    <button onclick="switchTab('timemachine')" id="tab-timemachine" class="px-4 py-2.5 rounded-lg font-medium transition-all text-[var(--text-muted)] hover:text-white hover:bg-slate-800/50 flex items-center gap-1.5">
      <span>⚡</span> Quantum Time Machine
    </button>`;

if (html.includes(navTarget) && !html.includes('id="tab-timemachine"')) {
  html = html.replace(navTarget, navReplacement);
  console.log('Added tab-timemachine to nav bar');
}

// 2. Update switchTab function to include 'timemachine'
html = html.replace(
  "const tabs = ['candidates', 'heatmaps', 'calculator', 'portfolio', 'paper', 'analytics'];",
  "const tabs = ['candidates', 'heatmaps', 'timemachine', 'calculator', 'portfolio', 'paper', 'analytics'];"
);

// 3. Create content-timemachine tab content
const timeMachineTabContent = `
  <!-- TAB: QUANTUM TIME MACHINE & MONTE CARLO STRATEGY REPLAY -->
  <div id="content-timemachine" class="hidden space-y-6">
    
    <!-- Top Overview Header -->
    <div class="bg-[var(--card-bg)] border border-[var(--border)] rounded-2xl p-6 shadow-md relative overflow-hidden">
      <div class="flex flex-col md:flex-row md:items-center justify-between gap-4 pb-4 border-b border-[var(--border)]">
        <div>
          <div class="flex items-center gap-2.5 flex-wrap">
            <span class="px-2.5 py-0.5 rounded-full bg-purple-500/20 text-purple-300 font-bold text-xs border border-purple-500/30">QUANTUM TIME MACHINE</span>
            <h2 class="text-xl font-black text-white">Monte Carlo Setup Simulator & Historical Replay</h2>
          </div>
          <p class="text-xs text-[var(--text-muted)] mt-1">Replays the remainder of the session 10,000 times using empirical 5-minute volatility ratios, plus re-running the exact rule across past 60 real market sessions before risking a single rupee.</p>
        </div>
        <div class="flex items-center gap-2">
          <span class="text-xs px-3 py-1.5 rounded-xl bg-purple-950/40 border border-purple-500/30 text-purple-300 font-mono font-bold">10,000 Iterations</span>
          <span class="text-xs px-3 py-1.5 rounded-xl bg-slate-900 border border-[var(--border)] text-slate-300 font-mono">Seed: 19</span>
        </div>
      </div>

      <!-- Main Dual Grid: Setup Form (Left) & Results HUD (Right) -->
      <div class="grid grid-cols-1 lg:grid-cols-12 gap-6 mt-6">
        
        <!-- Left: Configuration & Exit Planning (5 cols) -->
        <div class="lg:col-span-5 space-y-4">
          <div class="bg-slate-900/60 p-4 rounded-xl border border-[var(--border)]">
            <div class="flex items-center justify-between mb-3">
              <span class="text-xs font-bold text-slate-300 uppercase tracking-wider">Trade Setup & Levels</span>
              <span class="text-[10px] text-blue-400 font-medium cursor-pointer" onclick="loadSelectedStockIntoTm()">Load Selected Stock</span>
            </div>
            
            <div class="space-y-3 text-xs">
              <div>
                <label class="block text-[11px] text-[var(--text-muted)] mb-1 font-semibold">STOCK SYMBOL (NSE)</label>
                <div class="flex gap-2">
                  <input type="text" id="tmTabSymbol" value="ATHERENERG" class="flex-1 px-3 py-2 rounded-xl bg-slate-950 border border-[var(--border)] text-white font-bold text-sm focus:outline-none focus:border-purple-500">
                  <button type="button" onclick="syncTmSymbolPrice()" class="px-3 py-2 rounded-xl bg-slate-800 hover:bg-slate-700 text-slate-200 font-semibold text-xs border border-[var(--border)]">Fetch LTP</button>
                </div>
              </div>

              <div class="grid grid-cols-3 gap-2">
                <div>
                  <label class="block text-[10px] text-[var(--text-muted)] mb-1 font-medium">ENTRY PRICE (&#8377;)</label>
                  <input type="number" step="0.05" id="tmTabEntry" value="1650.00" class="w-full px-2.5 py-1.5 rounded-lg bg-slate-950 border border-[var(--border)] text-white font-bold text-xs focus:outline-none focus:border-purple-500" oninput="recalcTmPresets()">
                </div>
                <div>
                  <label class="block text-[10px] text-[var(--text-muted)] mb-1 font-medium">STOP-LOSS (&#8377;)</label>
                  <input type="number" step="0.05" id="tmTabStop" value="1630.00" class="w-full px-2.5 py-1.5 rounded-lg bg-slate-950 border border-[var(--border)] text-rose-400 font-bold text-xs focus:outline-none focus:border-purple-500" oninput="recalcTmTargetR()">
                </div>
                <div>
                  <label class="block text-[10px] text-[var(--text-muted)] mb-1 font-medium">TARGET (&#8377;)</label>
                  <input type="number" step="0.05" id="tmTabTarget" value="1690.00" class="w-full px-2.5 py-1.5 rounded-lg bg-slate-950 border border-[var(--border)] text-emerald-400 font-bold text-xs focus:outline-none focus:border-purple-500" oninput="recalcTmTargetR()">
                </div>
              </div>
            </div>

            <!-- Mathematical Stop-Loss Presets -->
            <div class="mt-4 pt-3 border-t border-slate-800">
              <span class="text-[10px] text-[var(--text-muted)] uppercase block font-semibold mb-1.5">Exit Planner Stop Rules</span>
              <div class="flex flex-wrap gap-1.5">
                <button type="button" onclick="setTmPresetStop('or-mid')" class="px-2 py-1 rounded bg-slate-800 hover:bg-slate-700 text-slate-300 text-[10px] font-medium border border-slate-700">ORB Midpoint (-1.5%)</button>
                <button type="button" onclick="setTmPresetStop('or-low')" class="px-2 py-1 rounded bg-slate-800 hover:bg-slate-700 text-slate-300 text-[10px] font-medium border border-slate-700">ORB Low (-2.5%)</button>
                <button type="button" onclick="setTmPresetStop('atr:1.5')" class="px-2 py-1 rounded bg-slate-800 hover:bg-slate-700 text-slate-300 text-[10px] font-medium border border-slate-700">1.5x ATR</button>
                <button type="button" onclick="setTmPresetStop('pct:3.5')" class="px-2 py-1 rounded bg-slate-800 hover:bg-slate-700 text-slate-300 text-[10px] font-medium border border-slate-700">3.5% Swing</button>
              </div>
            </div>

            <!-- Profit Target Multiples -->
            <div class="mt-3">
              <span class="text-[10px] text-[var(--text-muted)] uppercase block font-semibold mb-1.5">Target Multiples (Reward:Risk)</span>
              <div class="flex flex-wrap gap-1.5">
                <button type="button" onclick="setTmPresetTarget(1.0)" class="px-2 py-1 rounded bg-slate-800 hover:bg-slate-700 text-emerald-400 text-[10px] font-medium border border-slate-700">1.0R</button>
                <button type="button" onclick="setTmPresetTarget(1.5)" class="px-2 py-1 rounded bg-slate-800 hover:bg-slate-700 text-emerald-400 text-[10px] font-medium border border-slate-700">1.5R</button>
                <button type="button" onclick="setTmPresetTarget(2.0)" class="px-2 py-1 rounded bg-purple-900/40 hover:bg-purple-800/40 text-purple-300 text-[10px] font-bold border border-purple-500/40">2.0R (Standard)</button>
                <button type="button" onclick="setTmPresetTarget(3.0)" class="px-2 py-1 rounded bg-slate-800 hover:bg-slate-700 text-emerald-400 text-[10px] font-medium border border-slate-700">3.0R Stretch</button>
              </div>
            </div>

            <button type="button" onclick="runTmTabSimulation()" class="w-full mt-4 py-2.5 rounded-xl bg-purple-600 hover:bg-purple-500 text-white font-extrabold text-xs shadow-lg transition-all flex items-center justify-center gap-1.5">
              <span>⚡</span> EXECUTE 10,000 MONTE CARLO REPLAYS
            </button>
          </div>

          <!-- Quick Action Bridge to Sizer & Order Gate -->
          <div class="p-4 rounded-xl bg-slate-900/40 border border-[var(--border)] flex flex-col gap-2">
            <span class="text-xs font-bold text-slate-400">Institutional Execution Bridge</span>
            <div class="flex gap-2">
              <button type="button" onclick="sendTmTabToSizer()" class="flex-1 py-2 rounded-xl bg-blue-600 hover:bg-blue-500 text-white font-bold text-xs transition-all shadow-md">
                Send to Sizer & Calculator →
              </button>
              <button type="button" onclick="verifyTmTabRiskGate()" class="px-3 py-2 rounded-xl bg-slate-800 hover:bg-slate-700 text-slate-200 font-semibold text-xs border border-[var(--border)]">
                Check 8 Risk Gates
              </button>
            </div>
            <div id="tmTabRiskGateResult" class="hidden mt-2 p-3 rounded-lg bg-slate-950 border text-[11px]">
              <!-- Dynamic check output -->
            </div>
          </div>
        </div>

        <!-- Right: Statistical HUD & Interactive Fan Chart (7 cols) -->
        <div class="lg:col-span-7 space-y-4">
          
          <!-- Verdict Card -->
          <div id="tmTabVerdictCard" class="p-4 rounded-xl border border-purple-500/30 bg-purple-950/20">
            <div class="flex items-center justify-between mb-1">
              <span id="tmTabVerdictBadge" class="text-xs font-extrabold px-2.5 py-0.5 rounded bg-purple-500/20 text-purple-300 border border-purple-500/30">MONTE CARLO VERDICT</span>
              <span id="tmTabExpectedR" class="text-xs font-mono font-bold text-slate-300">Expectancy: +0.000 R</span>
            </div>
            <p id="tmTabVerdictSummary" class="text-xs font-medium text-slate-200 mt-1">Run simulation to evaluate target vs stop mathematical odds.</p>
          </div>

          <!-- Odds Distribution Tri-Gauges -->
          <div class="grid grid-cols-3 gap-3 text-xs">
            <div class="p-3 rounded-xl bg-slate-900/60 border border-[var(--border)]">
              <div class="flex justify-between items-center mb-1">
                <span class="text-slate-400 font-medium">Target First</span>
                <span id="tmTabPTarget" class="font-extrabold text-emerald-400 text-sm">--%</span>
              </div>
              <div class="w-full bg-slate-800 h-2 rounded-full overflow-hidden">
                <div id="tmTabPTargetBar" class="bg-emerald-500 h-full rounded-full" style="width: 0%"></div>
              </div>
              <span class="text-[9px] text-[var(--text-muted)] mt-1 block">Full Target Reached</span>
            </div>

            <div class="p-3 rounded-xl bg-slate-900/60 border border-[var(--border)]">
              <div class="flex justify-between items-center mb-1">
                <span class="text-slate-400 font-medium">Stop First</span>
                <span id="tmTabPStop" class="font-extrabold text-rose-400 text-sm">--%</span>
              </div>
              <div class="w-full bg-slate-800 h-2 rounded-full overflow-hidden">
                <div id="tmTabPStopBar" class="bg-rose-500 h-full rounded-full" style="width: 0%"></div>
              </div>
              <span class="text-[9px] text-[var(--text-muted)] mt-1 block">Stop Invalidation</span>
            </div>

            <div class="p-3 rounded-xl bg-slate-900/60 border border-[var(--border)]">
              <div class="flex justify-between items-center mb-1">
                <span class="text-slate-400 font-medium">In-Play</span>
                <span id="tmTabPNeither" class="font-extrabold text-slate-300 text-sm">--%</span>
              </div>
              <div class="w-full bg-slate-800 h-2 rounded-full overflow-hidden">
                <div id="tmTabPNeitherBar" class="bg-blue-500 h-full rounded-full" style="width: 0%"></div>
              </div>
              <span class="text-[9px] text-[var(--text-muted)] mt-1 block">Exits at 3:30 Close</span>
            </div>
          </div>

          <!-- Interactive High-Resolution SVG Fan Chart -->
          <div class="bg-slate-900/80 p-4 rounded-xl border border-[var(--border)]">
            <div class="flex items-center justify-between mb-2">
              <span class="text-xs font-bold text-slate-300 uppercase tracking-wider">Projected Trajectory Corridor (5th to 95th Percentile)</span>
              <span class="text-[11px] text-purple-400 font-medium">Median Close: &#8377;<span id="tmTabMedianClose">0.00</span></span>
            </div>
            <div id="tmTabFanChart" class="w-full h-48 flex items-center justify-center text-xs text-slate-500 bg-slate-950/40 rounded-lg p-2">
              <span class="text-slate-500">Click Execute to render 10,000-path trajectory fan chart</span>
            </div>
          </div>

          <!-- Past 60 Sessions Real Historical Performance Record -->
          <div class="p-4 rounded-xl bg-slate-900/50 border border-[var(--border)]">
            <div class="flex items-center justify-between mb-2">
              <span class="text-xs font-bold text-slate-300 uppercase tracking-wider">Past 60 Sessions Real Setup Record</span>
              <span id="tmTabHistWinRate" class="text-xs font-extrabold text-emerald-400">Win Rate: --%</span>
            </div>
            <div class="grid grid-cols-4 gap-2 text-center text-xs">
              <div class="p-2 rounded bg-slate-950 border border-slate-800">
                <span class="text-[10px] text-[var(--text-muted)] block">Triggered</span>
                <span id="tmTabHistTrig" class="font-bold text-white text-sm">--</span>
              </div>
              <div class="p-2 rounded bg-slate-950 border border-slate-800">
                <span class="text-[10px] text-emerald-400 block">Target Hits</span>
                <span id="tmTabHistTarget" class="font-bold text-emerald-400 text-sm">--</span>
              </div>
              <div class="p-2 rounded bg-slate-950 border border-slate-800">
                <span class="text-[10px] text-rose-400 block">Stop Hits</span>
                <span id="tmTabHistStop" class="font-bold text-rose-400 text-sm">--</span>
              </div>
              <div class="p-2 rounded bg-slate-950 border border-slate-800">
                <span class="text-[10px] text-purple-400 block">Realized R</span>
                <span id="tmTabHistAvgR" class="font-bold text-purple-300 text-sm">-- R</span>
              </div>
            </div>
          </div>

        </div>
      </div>
    </div>
  </div>
`;

// Insert content-timemachine right after content-heatmaps
const heatmapsEndMarker = '<!-- TAB 3: SIZING & RISK CALCULATOR -->';
if (html.includes(heatmapsEndMarker) && !html.includes('id="content-timemachine"')) {
  html = html.replace(heatmapsEndMarker, timeMachineTabContent + '\n  ' + heatmapsEndMarker);
  console.log('Inserted content-timemachine tab content into page');
}

// 4. Add Tab Helper Functions to JS
const tmTabJs = `
    // QUANTUM TIME MACHINE TAB LOGIC
    function loadSelectedStockIntoTm() {
      if (selectedStock) {
        document.getElementById('tmTabSymbol').value = selectedStock.symbol;
        document.getElementById('tmTabEntry').value = selectedStock.ltp.toFixed(2);
        recalcTmPresets();
      }
    }

    async function syncTmSymbolPrice() {
      const sym = (document.getElementById('tmTabSymbol').value || '').trim().toUpperCase();
      if (!sym) return;
      try {
        const res = await fetch('/api/live-quote?symbol=' + encodeURIComponent(sym));
        if (res.ok) {
          const live = await res.json();
          document.getElementById('tmTabEntry').value = live.ltp.toFixed(2);
          recalcTmPresets();
        }
      } catch (_) {}
    }

    function recalcTmPresets() {
      const entry = parseFloat(document.getElementById('tmTabEntry').value) || 0;
      if (entry <= 0) return;
      const stop = +(entry * 0.985).toFixed(2);
      const target = +(entry + (entry - stop) * 2.0).toFixed(2);
      document.getElementById('tmTabStop').value = stop;
      document.getElementById('tmTabTarget').value = target;
    }

    function setTmPresetStop(rule) {
      const entry = parseFloat(document.getElementById('tmTabEntry').value) || 0;
      if (entry <= 0) return;
      let stop = entry * 0.965;
      if (rule === 'or-mid') stop = entry * 0.985;
      else if (rule === 'or-low') stop = entry * 0.975;
      else if (rule.startsWith('pct:')) {
        const p = parseFloat(rule.split(':')[1]) || 3.5;
        stop = entry * (1 - p/100);
      }
      document.getElementById('tmTabStop').value = stop.toFixed(2);
      recalcTmTargetR();
    }

    function setTmPresetTarget(multiple) {
      const entry = parseFloat(document.getElementById('tmTabEntry').value) || 0;
      const stop = parseFloat(document.getElementById('tmTabStop').value) || 0;
      if (entry <= 0 || stop <= 0 || stop >= entry) return;
      const risk = entry - stop;
      const target = entry + (risk * multiple);
      document.getElementById('tmTabTarget').value = target.toFixed(2);
    }

    function recalcTmTargetR() {
      // Automatic trigger on manual inputs
    }

    async function runTmTabSimulation() {
      const symbol = (document.getElementById('tmTabSymbol').value || 'STOCK').trim().toUpperCase();
      const entry = parseFloat(document.getElementById('tmTabEntry').value) || 1000;
      const stop = parseFloat(document.getElementById('tmTabStop').value) || (entry * 0.97);
      const target = parseFloat(document.getElementById('tmTabTarget').value) || (entry * 1.06);

      const chartEl = document.getElementById('tmTabFanChart');
      chartEl.innerHTML = '<span class="text-purple-400 font-bold animate-pulse">Running 10,000 Monte Carlo Replays & Back-Testing Past 60 Sessions...</span>';

      try {
        const res = await fetch(\`/api/timemachine?symbol=\${encodeURIComponent(symbol)}&entry=\${entry}&stop=\${stop}&target=\${target}&replays=10000\`);
        if (!res.ok) throw new Error('Simulation failed');
        const data = await res.json();
        renderTmTabResults(data);
      } catch (err) {
        chartEl.innerHTML = \`<span class="text-red-400">Error: \${err.message}</span>\`;
      }
    }

    function renderTmTabResults(data) {
      const odds = data.odds;
      const pTarget = (odds.pTarget * 100).toFixed(1);
      const pStop = (odds.pStop * 100).toFixed(1);
      const pNeither = (odds.pNeither * 100).toFixed(1);

      document.getElementById('tmTabPTarget').innerText = pTarget + '%';
      document.getElementById('tmTabPTargetBar').style.width = pTarget + '%';

      document.getElementById('tmTabPStop').innerText = pStop + '%';
      document.getElementById('tmTabPStopBar').style.width = pStop + '%';

      document.getElementById('tmTabPNeither').innerText = pNeither + '%';
      document.getElementById('tmTabPNeitherBar').style.width = pNeither + '%';

      document.getElementById('tmTabExpectedR').innerText = 'Expectancy: ' + (odds.avgR >= 0 ? '+' : '') + odds.avgR.toFixed(3) + ' R';
      document.getElementById('tmTabMedianClose').innerText = data.percentiles.median.toFixed(2);

      const verdictCard = document.getElementById('tmTabVerdictCard');
      const badgeEl = document.getElementById('tmTabVerdictBadge');
      const summaryEl = document.getElementById('tmTabVerdictSummary');

      summaryEl.innerText = data.verdict.summary;
      const v = data.verdict.badge;

      if (v === 'HIGH_EDGE') {
        verdictCard.className = 'p-4 rounded-xl border border-emerald-500/40 bg-emerald-950/30';
        badgeEl.className = 'text-xs font-extrabold px-2.5 py-0.5 rounded bg-emerald-500/20 text-emerald-400 border border-emerald-500/30';
        badgeEl.innerText = 'HIGH STATISTICAL EDGE';
      } else if (v === 'POSITIVE_EDGE') {
        verdictCard.className = 'p-4 rounded-xl border border-emerald-500/30 bg-emerald-950/20';
        badgeEl.className = 'text-xs font-extrabold px-2.5 py-0.5 rounded bg-emerald-500/20 text-emerald-300 border border-emerald-500/30';
        badgeEl.innerText = 'POSITIVE EDGE';
      } else if (v === 'COIN_FLIP') {
        verdictCard.className = 'p-4 rounded-xl border border-amber-500/40 bg-amber-950/30';
        badgeEl.className = 'text-xs font-extrabold px-2.5 py-0.5 rounded bg-amber-500/20 text-amber-400 border border-amber-500/30';
        badgeEl.innerText = 'COIN FLIP / BREAK-EVEN';
      } else {
        verdictCard.className = 'p-4 rounded-xl border border-rose-500/40 bg-rose-950/30';
        badgeEl.className = 'text-xs font-extrabold px-2.5 py-0.5 rounded bg-rose-500/20 text-rose-400 border border-rose-500/30';
        badgeEl.innerText = 'NEGATIVE EDGE / HIGH RISK';
      }

      // Past 60 Sessions Record
      if (data.history) {
        document.getElementById('tmTabHistWinRate').innerText = 'Historical Win Rate: ' + data.history.winRate + '%';
        document.getElementById('tmTabHistTrig').innerText = data.history.triggered + ' / ' + data.history.totalSessions;
        document.getElementById('tmTabHistTarget').innerText = data.history.targetHit;
        document.getElementById('tmTabHistStop').innerText = data.history.stopHit;
        document.getElementById('tmTabHistAvgR').innerText = (data.history.avgR >= 0 ? '+' : '') + data.history.avgR + ' R';
      }

      renderSvgFanChartGeneric('tmTabFanChart', data);
    }

    function renderSvgFanChartGeneric(containerId, data) {
      const bands = data.bands;
      if (!bands || !bands.length) return;

      const chartEl = document.getElementById(containerId);
      const w = 780;
      const h = 180;
      const pad = 35;

      const allVals = [data.entry, data.stop, data.target, ...bands.map(b => b.p5), ...bands.map(b => b.p95)];
      const minP = Math.min(...allVals) * 0.995;
      const maxP = Math.max(...allVals) * 1.005;

      function scaleX(step) {
        return pad + (step / (bands.length - 1)) * (w - 2 * pad);
      }
      function scaleY(val) {
        return h - pad - ((val - minP) / (maxP - minP)) * (h - 2 * pad);
      }

      let dOuter = 'M ' + scaleX(0) + ' ' + scaleY(bands[0].p95);
      for (let i = 1; i < bands.length; i++) dOuter += ' L ' + scaleX(i) + ' ' + scaleY(bands[i].p95);
      for (let i = bands.length - 1; i >= 0; i--) dOuter += ' L ' + scaleX(i) + ' ' + scaleY(bands[i].p5);
      dOuter += ' Z';

      let dInner = 'M ' + scaleX(0) + ' ' + scaleY(bands[0].p75);
      for (let i = 1; i < bands.length; i++) dInner += ' L ' + scaleX(i) + ' ' + scaleY(bands[i].p75);
      for (let i = bands.length - 1; i >= 0; i--) dInner += ' L ' + scaleX(i) + ' ' + scaleY(bands[i].p25);
      dInner += ' Z';

      let dMedian = 'M ' + scaleX(0) + ' ' + scaleY(bands[0].p50);
      for (let i = 1; i < bands.length; i++) dMedian += ' L ' + scaleX(i) + ' ' + scaleY(bands[i].p50);

      const yEntry = scaleY(data.entry);
      const yStop = scaleY(data.stop);
      const yTarget = scaleY(data.target);

      chartEl.innerHTML = \`
        <svg viewBox="0 0 \${w} \${h}" class="w-full h-full">
          <path d="\${dOuter}" fill="rgba(168, 85, 247, 0.15)" />
          <path d="\${dInner}" fill="rgba(168, 85, 247, 0.28)" />
          <path d="\${dMedian}" fill="none" stroke="#c084fc" stroke-width="2.2" />

          <!-- Target Line -->
          <line x1="\${pad}" y1="\${yTarget}" x2="\${w - pad}" y2="\${yTarget}" stroke="#34d399" stroke-width="1.5" stroke-dasharray="4 3" />
          <text x="\${w - pad - 60}" y="\${yTarget - 4}" fill="#34d399" font-size="10" font-weight="bold">Target &#8377;\${data.target}</text>

          <!-- Entry Line -->
          <line x1="\${pad}" y1="\${yEntry}" x2="\${w - pad}" y2="\${yEntry}" stroke="#ffffff" stroke-width="1.2" />
          <text x="\${pad + 5}" y="\${yEntry - 4}" fill="#ffffff" font-size="10">Entry &#8377;\${data.entry}</text>

          <!-- Stop Line -->
          <line x1="\${pad}" y1="\${yStop}" x2="\${w - pad}" y2="\${yStop}" stroke="#f87171" stroke-width="1.5" stroke-dasharray="4 3" />
          <text x="\${w - pad - 50}" y="\${yStop + 12}" fill="#f87171" font-size="10" font-weight="bold">Stop &#8377;\${data.stop}</text>
        </svg>
      \`;
    }

    function sendTmTabToSizer() {
      const sym = document.getElementById('tmTabSymbol').value;
      const entry = parseFloat(document.getElementById('tmTabEntry').value);
      const stop = parseFloat(document.getElementById('tmTabStop').value);
      const target = parseFloat(document.getElementById('tmTabTarget').value);
      prefillCalculator(sym, entry, stop, target);
    }

    async function verifyTmTabRiskGate() {
      const symbol = document.getElementById('tmTabSymbol').value;
      const entryPrice = parseFloat(document.getElementById('tmTabEntry').value);
      const stopLoss = parseFloat(document.getElementById('tmTabStop').value);
      const targetPrice = parseFloat(document.getElementById('tmTabTarget').value);

      const riskPerShare = entryPrice - stopLoss;
      const shares = Math.floor(Math.min(1000 / riskPerShare, 40000 / entryPrice));

      const card = document.getElementById('tmTabRiskGateResult');
      card.classList.remove('hidden');
      card.innerHTML = '<span class="text-blue-400 font-semibold animate-pulse">Running 8 pre-flight risk checks...</span>';

      try {
        const res = await fetch('/api/risk-check', {
          method: 'POST',
          headers: { 'Content-Type': 'application/json' },
          body: JSON.stringify({ symbol, entryPrice, stopLoss, targetPrice, shares })
        });
        const data = await res.json();
        
        let out = \`<span class="font-bold \${data.passed ? 'text-emerald-400' : 'text-rose-400'} block mb-1">Pre-Flight Risk Gate: \${data.verdict} (\${data.score})</span>\`;
        data.checks.forEach(c => {
          out += \`<div class="flex items-center gap-1.5 text-[10px] text-slate-300">
            <span class="\${c.passed ? 'text-emerald-400' : 'text-rose-400'} font-bold">\${c.passed ? '✓' : '✗'}</span>
            <span>\${c.name}: \${c.detail}</span>
          </div>\`;
        });
        card.innerHTML = out;
      } catch (e) {
        card.innerHTML = '<span class="text-red-400">Error: ' + e.message + '</span>';
      }
    }
`;

html = html.replace('// QUANTUM TIME MACHINE REPLAY ENGINE', tmTabJs + '\n    // QUANTUM TIME MACHINE REPLAY ENGINE');

fs.writeFileSync('public/index.html', html, 'utf8');
console.log('Successfully injected Quantum Time Machine Tab into public/index.html!');

