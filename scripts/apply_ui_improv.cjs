const fs = require('fs');

let html = fs.readFileSync('public/index.html', 'utf8');

// 1. Add Exit Planner quick-pills in Sizing Calculator
const oldCalculatorInputs = `<div class="grid grid-cols-1 md:grid-cols-2 gap-4 mb-6">
        <div>
          <label class="block text-xs font-medium text-[var(--text-muted)] mb-1">TRADING SYMBOL (NSE)</label>
          <input type="text" id="calcSymbol" value="BEL" class="w-full px-3.5 py-2.5 rounded-xl bg-slate-900 border border-[var(--border)] text-white text-sm focus:outline-none focus:border-blue-500 font-bold" oninput="runLiveCalculation()">
        </div>
        <div>
          <label class="block text-xs font-medium text-[var(--text-muted)] mb-1">PLANNED ENTRY PRICE (&#8377;)</label>
          <input type="number" id="calcEntry" step="0.05" value="284.50" class="w-full px-3.5 py-2.5 rounded-xl bg-slate-900 border border-[var(--border)] text-white text-sm focus:outline-none focus:border-blue-500 font-bold" oninput="runLiveCalculation()">
        </div>
        <div>
          <label class="block text-xs font-medium text-[var(--text-muted)] mb-1">STOP-LOSS PRICE (&#8377;)</label>
          <input type="number" id="calcStop" step="0.05" value="268.00" class="w-full px-3.5 py-2.5 rounded-xl bg-slate-900 border border-[var(--border)] text-white text-sm focus:outline-none focus:border-blue-500 font-bold text-red-400" oninput="runLiveCalculation()">
        </div>
        <div>
          <label class="block text-xs font-medium text-[var(--text-muted)] mb-1">TARGET SCENARIO 1 (&#8377;)</label>
          <input type="number" id="calcTarget" step="0.05" value="317.50" class="w-full px-3.5 py-2.5 rounded-xl bg-slate-900 border border-[var(--border)] text-white text-sm focus:outline-none focus:border-blue-500 font-bold text-emerald-400" oninput="runLiveCalculation()">
        </div>
      </div>`;

const newCalculatorInputs = `<div class="grid grid-cols-1 md:grid-cols-2 gap-4 mb-3">
        <div>
          <label class="block text-xs font-medium text-[var(--text-muted)] mb-1">TRADING SYMBOL (NSE)</label>
          <input type="text" id="calcSymbol" value="BEL" class="w-full px-3.5 py-2.5 rounded-xl bg-slate-900 border border-[var(--border)] text-white text-sm focus:outline-none focus:border-blue-500 font-bold" oninput="runLiveCalculation()">
        </div>
        <div>
          <label class="block text-xs font-medium text-[var(--text-muted)] mb-1">PLANNED ENTRY PRICE (&#8377;)</label>
          <input type="number" id="calcEntry" step="0.05" value="284.50" class="w-full px-3.5 py-2.5 rounded-xl bg-slate-900 border border-[var(--border)] text-white text-sm focus:outline-none focus:border-blue-500 font-bold" oninput="applyExitPlannerPresets()">
        </div>
      </div>

      <!-- Day-Trader-Skill Exit Planner Strategy Presets -->
      <div class="mb-4 p-3 rounded-xl bg-slate-900/50 border border-[var(--border)]">
        <div class="flex items-center justify-between mb-2">
          <span class="text-[11px] font-bold text-blue-400 uppercase tracking-wider">Day-Trader Exit Planner Presets</span>
          <span class="text-[10px] text-[var(--text-muted)]">Mathematical Stops & Target Brackets</span>
        </div>
        <div class="flex flex-wrap gap-2 text-xs">
          <button type="button" onclick="setPresetStop('or-mid')" class="px-2.5 py-1 rounded-lg bg-slate-800 hover:bg-slate-700 text-slate-300 border border-slate-700 text-[11px] font-medium transition-all">ORB Midpoint Stop (-2.5%)</button>
          <button type="button" onclick="setPresetStop('pct:3.5')" class="px-2.5 py-1 rounded-lg bg-slate-800 hover:bg-slate-700 text-slate-300 border border-slate-700 text-[11px] font-medium transition-all">3.5% Swing Stop</button>
          <button type="button" onclick="setPresetStop('pct:5.0')" class="px-2.5 py-1 rounded-lg bg-slate-800 hover:bg-slate-700 text-slate-300 border border-slate-700 text-[11px] font-medium transition-all">5.0% Structure Stop</button>
          <span class="text-slate-600 self-center">|</span>
          <button type="button" onclick="setPresetTarget(1.5)" class="px-2.5 py-1 rounded-lg bg-slate-800 hover:bg-slate-700 text-emerald-400 border border-slate-700 text-[11px] font-medium transition-all">1.5R Target</button>
          <button type="button" onclick="setPresetTarget(2.0)" class="px-2.5 py-1 rounded-lg bg-emerald-950/40 hover:bg-emerald-900/40 text-emerald-300 border border-emerald-500/30 text-[11px] font-bold transition-all">2.0R Target (Std)</button>
          <button type="button" onclick="setPresetTarget(3.0)" class="px-2.5 py-1 rounded-lg bg-slate-800 hover:bg-slate-700 text-emerald-400 border border-slate-700 text-[11px] font-medium transition-all">3.0R Target</button>
        </div>
      </div>

      <div class="grid grid-cols-1 md:grid-cols-2 gap-4 mb-6">
        <div>
          <label class="block text-xs font-medium text-[var(--text-muted)] mb-1">STOP-LOSS PRICE (&#8377;)</label>
          <input type="number" id="calcStop" step="0.05" value="268.00" class="w-full px-3.5 py-2.5 rounded-xl bg-slate-900 border border-[var(--border)] text-white text-sm focus:outline-none focus:border-blue-500 font-bold text-red-400" oninput="runLiveCalculation()">
        </div>
        <div>
          <label class="block text-xs font-medium text-[var(--text-muted)] mb-1">TARGET SCENARIO (&#8377;)</label>
          <input type="number" id="calcTarget" step="0.05" value="317.50" class="w-full px-3.5 py-2.5 rounded-xl bg-slate-900 border border-[var(--border)] text-white text-sm focus:outline-none focus:border-blue-500 font-bold text-emerald-400" oninput="runLiveCalculation()">
        </div>
      </div>`;

html = html.replace(oldCalculatorInputs, newCalculatorInputs);

// 2. Add Time Machine button to calculator actions
const oldCalcButtons = `<div class="flex justify-end gap-3">
        <button onclick="runLiveCalculation()" class="px-4 py-2.5 rounded-xl bg-slate-800 hover:bg-slate-700 text-slate-200 text-xs font-semibold transition-all border border-[var(--border)]">
          Recalculate
        </button>
        <button onclick="stageCalculatedTicket()" class="px-5 py-2.5 rounded-xl bg-blue-600 hover:bg-blue-500 text-white text-xs font-bold transition-all shadow-md flex items-center gap-1.5">
          <span></span> Stage Order Ticket →
        </button>
      </div>`;

const newCalcButtons = `<div class="flex flex-wrap items-center justify-between gap-3">
        <div class="flex items-center gap-2">
          <button onclick="openTimeMachineFromCalc()" class="px-4 py-2.5 rounded-xl bg-purple-600/20 hover:bg-purple-600/30 text-purple-300 font-bold text-xs border border-purple-500/40 transition-all flex items-center gap-1.5 shadow-md">
            <span>⚡</span> Quantum Time Machine (10,000 Replays)
          </button>
          <button onclick="runPreFlightRiskCheck()" class="px-3.5 py-2.5 rounded-xl bg-slate-800 hover:bg-slate-700 text-slate-300 text-xs font-semibold transition-all border border-[var(--border)]">
            Verify 8 Risk Gates
          </button>
        </div>
        <div class="flex items-center gap-2">
          <button onclick="runLiveCalculation()" class="px-4 py-2.5 rounded-xl bg-slate-800 hover:bg-slate-700 text-slate-200 text-xs font-semibold transition-all border border-[var(--border)]">
            Recalculate
          </button>
          <button onclick="stageCalculatedTicket()" class="px-5 py-2.5 rounded-xl bg-blue-600 hover:bg-blue-500 text-white text-xs font-bold transition-all shadow-md flex items-center gap-1.5">
            Stage Order Ticket →
          </button>
        </div>
      </div>

      <!-- Pre-Flight 8-Point Risk Gate Display Card -->
      <div id="riskGateCheckResult" class="hidden mt-4 p-4 rounded-xl bg-slate-900 border border-[var(--border)] text-xs">
        <!-- Dynamically rendered -->
      </div>`;

html = html.replace(oldCalcButtons, newCalcButtons);

// 3. Add Time Machine button to Stock Detail Modal footer
const oldModalButtons = `<button onclick="refreshLiveModalStock()" class="px-3.5 py-2 rounded-xl bg-slate-900 hover:bg-slate-800 text-blue-400 font-semibold text-xs border border-blue-500/30 transition-all">
            Query Live Exchange Tick
          </button>`;

const newModalButtons = `<button onclick="openTimeMachineFromModal()" class="px-4 py-2 rounded-xl bg-purple-600/30 hover:bg-purple-600/40 text-purple-300 font-bold text-xs border border-purple-500/40 transition-all flex items-center gap-1.5">
            <span>⚡</span> Time Machine (10,000 Replays)
          </button>
          <button onclick="refreshLiveModalStock()" class="px-3.5 py-2 rounded-xl bg-slate-900 hover:bg-slate-800 text-blue-400 font-semibold text-xs border border-blue-500/30 transition-all">
            Query Live Exchange Tick
          </button>`;

html = html.replace(oldModalButtons, newModalButtons);

// 4. Inject Time Machine Modal before </body>
const timeMachineModalHtml = `
  <!-- QUANTUM TIME MACHINE REPLAY MODAL (10,000 Monte Carlo Bootstrap Paths) -->
  <div id="timeMachineModal" class="hidden fixed inset-0 z-50 overflow-y-auto bg-slate-950/85 backdrop-blur-md flex items-center justify-center p-4">
    <div class="relative w-full max-w-4xl bg-[var(--card-bg)] border border-purple-500/40 rounded-2xl shadow-2xl p-6 overflow-hidden my-8" onclick="event.stopPropagation()">
      
      <!-- Header -->
      <div class="flex items-start justify-between pb-4 border-b border-[var(--border)]">
        <div>
          <div class="flex items-center gap-2.5 flex-wrap">
            <span class="px-2.5 py-0.5 rounded-full bg-purple-500/20 text-purple-300 font-bold text-xs border border-purple-500/30">QUANTUM TIME MACHINE</span>
            <h2 id="tmSymbol" class="text-xl font-extrabold text-white tracking-wide">SYMBOL</h2>
            <span class="text-xs text-[var(--text-muted)]">10,000 Monte Carlo Replays</span>
          </div>
          <p class="text-xs text-[var(--text-muted)] mt-1">Replaying the remainder of the session 10,000 times from historical 5-minute bar distributions before risking capital.</p>
        </div>
        <button onclick="closeTimeMachineModal()" class="text-slate-400 hover:text-white p-2 rounded-lg hover:bg-slate-800 transition-colors">
          <svg class="w-5 h-5" fill="none" stroke="currentColor" viewBox="0 0 24 24"><path stroke-linecap="round" stroke-linejoin="round" stroke-width="2" d="M6 18L18 6M6 6l12 12"></path></svg>
        </button>
      </div>

      <!-- Trade Plan Bar -->
      <div class="grid grid-cols-2 sm:grid-cols-4 gap-3 bg-slate-900/70 p-3.5 rounded-xl border border-[var(--border)] my-4 text-xs">
        <div>
          <span class="text-[10px] text-[var(--text-muted)] uppercase block font-medium">Entry Price</span>
          <span id="tmEntry" class="text-base font-bold text-white mt-0.5 block">&#8377;0.00</span>
        </div>
        <div>
          <span class="text-[10px] text-[var(--text-muted)] uppercase block font-medium">Stop-Loss</span>
          <span id="tmStop" class="text-base font-bold text-rose-400 mt-0.5 block">&#8377;0.00</span>
        </div>
        <div>
          <span class="text-[10px] text-[var(--text-muted)] uppercase block font-medium">Target Price</span>
          <span id="tmTarget" class="text-base font-bold text-emerald-400 mt-0.5 block">&#8377;0.00</span>
        </div>
        <div>
          <span class="text-[10px] text-[var(--text-muted)] uppercase block font-medium">Target Multiple (R)</span>
          <span id="tmRMultiple" class="text-base font-extrabold text-purple-300 mt-0.5 block">2.00R</span>
        </div>
      </div>

      <!-- Simulation Verdict Alert -->
      <div id="tmVerdictCard" class="p-4 rounded-xl border mb-4">
        <div class="flex items-center justify-between mb-1">
          <span id="tmVerdictBadge" class="text-xs font-extrabold px-2 py-0.5 rounded">VERDICT</span>
          <span id="tmExpectedR" class="text-xs font-mono font-bold">Expectancy: +0.00 R</span>
        </div>
        <p id="tmVerdictSummary" class="text-xs font-medium text-slate-200 mt-1">Summary...</p>
      </div>

      <!-- Odds & Percentile Gauge -->
      <div class="grid grid-cols-1 md:grid-cols-3 gap-3 mb-4">
        <div class="p-3.5 rounded-xl bg-slate-900/60 border border-[var(--border)]">
          <div class="flex justify-between items-center text-xs mb-1">
            <span class="text-slate-400 font-semibold">Target First</span>
            <span id="tmPTarget" class="font-extrabold text-emerald-400 text-sm">0.0%</span>
          </div>
          <div class="w-full bg-slate-800 h-2 rounded-full overflow-hidden">
            <div id="tmPTargetBar" class="bg-emerald-500 h-full rounded-full" style="width: 0%"></div>
          </div>
          <span class="text-[10px] text-[var(--text-muted)] mt-1.5 block">Winner hits target before stop</span>
        </div>

        <div class="p-3.5 rounded-xl bg-slate-900/60 border border-[var(--border)]">
          <div class="flex justify-between items-center text-xs mb-1">
            <span class="text-slate-400 font-semibold">Stop First</span>
            <span id="tmPStop" class="font-extrabold text-rose-400 text-sm">0.0%</span>
          </div>
          <div class="w-full bg-slate-800 h-2 rounded-full overflow-hidden">
            <div id="tmPStopBar" class="bg-rose-500 h-full rounded-full" style="width: 0%"></div>
          </div>
          <span class="text-[10px] text-[var(--text-muted)] mt-1.5 block">Trade invalidates at stop loss</span>
        </div>

        <div class="p-3.5 rounded-xl bg-slate-900/60 border border-[var(--border)]">
          <div class="flex justify-between items-center text-xs mb-1">
            <span class="text-slate-400 font-semibold">In-Play at Close</span>
            <span id="tmPNeither" class="font-extrabold text-slate-300 text-sm">0.0%</span>
          </div>
          <div class="w-full bg-slate-800 h-2 rounded-full overflow-hidden">
            <div id="tmPNeitherBar" class="bg-blue-500 h-full rounded-full" style="width: 0%"></div>
          </div>
          <span class="text-[10px] text-[var(--text-muted)] mt-1.5 block">Neither hit; exit at 3:30 PM IST</span>
        </div>
      </div>

      <!-- Interactive SVG Fan Chart Container -->
      <div class="bg-slate-900/80 p-4 rounded-xl border border-[var(--border)] mb-4">
        <div class="flex items-center justify-between mb-2">
          <span class="text-xs font-bold text-slate-300 uppercase tracking-wider">Projected Price Trajectory Corridor (5th to 95th Percentile)</span>
          <span class="text-[11px] text-purple-400 font-medium">Median: &#8377;<span id="tmMedianClose">0.00</span></span>
        </div>
        <div id="tmFanChart" class="w-full h-44 flex items-center justify-center text-xs text-slate-500">
          <!-- Dynamically generated SVG Fan Chart -->
        </div>
      </div>

      <!-- Modal Footer -->
      <div class="pt-3 border-t border-[var(--border)] flex justify-between items-center">
        <span class="text-[11px] text-[var(--text-muted)]">Deterministic Seed: 19 | 10,000 Monte Carlo Iterations</span>
        <div class="flex gap-2">
          <button onclick="closeTimeMachineModal()" class="px-4 py-2 rounded-xl bg-slate-800 hover:bg-slate-700 text-slate-300 text-xs font-semibold">Close</button>
          <button onclick="sendTimeMachineToSizer()" class="px-5 py-2 rounded-xl bg-blue-600 hover:bg-blue-500 text-white text-xs font-bold shadow-md">Stage into Sizing Calculator</button>
        </div>
      </div>

    </div>
  </div>
`;

html = html.replace('<!-- Agentation Visual Feedback Integration -->', timeMachineModalHtml + '\n  <!-- Agentation Visual Feedback Integration -->');

// 5. Inject JavaScript functions for Time Machine, Exit Presets, and Risk Gate
const jsCodeToAdd = `
    // DAY-TRADER-SKILL INTEGRATIONS: Exit Planner Presets
    function setPresetStop(rule) {
      const entry = parseFloat(document.getElementById('calcEntry').value) || 0;
      if (entry <= 0) return;
      let stop = entry * 0.965;
      if (rule === 'or-mid') stop = entry * 0.975;
      else if (rule.startsWith('pct:')) {
        const p = parseFloat(rule.split(':')[1]) || 3.5;
        stop = entry * (1 - p/100);
      }
      document.getElementById('calcStop').value = stop.toFixed(2);
      runLiveCalculation();
    }

    function setPresetTarget(multiple) {
      const entry = parseFloat(document.getElementById('calcEntry').value) || 0;
      const stop = parseFloat(document.getElementById('calcStop').value) || 0;
      if (entry <= 0 || stop <= 0 || stop >= entry) return;
      const risk = entry - stop;
      const target = entry + (risk * multiple);
      document.getElementById('calcTarget').value = target.toFixed(2);
      runLiveCalculation();
    }

    function applyExitPlannerPresets() {
      runLiveCalculation();
    }

    // QUANTUM TIME MACHINE REPLAY ENGINE
    let currentTmPlan = null;

    async function runTimeMachine(symbol, entry, stop, target) {
      const modal = document.getElementById('timeMachineModal');
      modal.classList.remove('hidden');

      document.getElementById('tmSymbol').innerText = symbol;
      document.getElementById('tmEntry').innerHTML = '&#8377;' + Number(entry).toFixed(2);
      document.getElementById('tmStop').innerHTML = '&#8377;' + Number(stop).toFixed(2);
      document.getElementById('tmTarget').innerHTML = '&#8377;' + Number(target).toFixed(2);

      const risk = entry - stop;
      const rMult = risk > 0 ? (target - entry) / risk : 2.0;
      document.getElementById('tmRMultiple').innerText = rMult.toFixed(2) + 'R';

      currentTmPlan = { symbol, entry, stop, target, rMult };

      const chartEl = document.getElementById('tmFanChart');
      chartEl.innerHTML = '<span class="text-purple-400 animate-pulse font-medium">Running 10,000 Monte Carlo bootstrap simulations...</span>';

      try {
        const res = await fetch(\`/api/timemachine?symbol=\${encodeURIComponent(symbol)}&entry=\${entry}&stop=\${stop}&target=\${target}&replays=10000\`);
        if (!res.ok) throw new Error('Simulation failed');
        const data = await res.json();
        renderTimeMachineResults(data);
      } catch (err) {
        chartEl.innerHTML = \`<span class="text-red-400">Simulation error: \${err.message}</span>\`;
      }
    }

    function renderTimeMachineResults(data) {
      const odds = data.odds;
      const pTarget = (odds.pTarget * 100).toFixed(1);
      const pStop = (odds.pStop * 100).toFixed(1);
      const pNeither = (odds.pNeither * 100).toFixed(1);

      document.getElementById('tmPTarget').innerText = pTarget + '%';
      document.getElementById('tmPTargetBar').style.width = pTarget + '%';

      document.getElementById('tmPStop').innerText = pStop + '%';
      document.getElementById('tmPStopBar').style.width = pStop + '%';

      document.getElementById('tmPNeither').innerText = pNeither + '%';
      document.getElementById('tmPNeitherBar').style.width = pNeither + '%';

      document.getElementById('tmExpectedR').innerText = 'Expectancy: ' + (odds.avgR >= 0 ? '+' : '') + odds.avgR.toFixed(3) + ' R';
      document.getElementById('tmMedianClose').innerText = data.percentiles.median.toFixed(2);

      const verdictCard = document.getElementById('tmVerdictCard');
      const badgeEl = document.getElementById('tmVerdictBadge');
      const summaryEl = document.getElementById('tmVerdictSummary');

      summaryEl.innerText = data.verdict.summary;
      const v = data.verdict.badge;

      if (v === 'HIGH_EDGE') {
        verdictCard.className = 'p-4 rounded-xl border border-emerald-500/40 bg-emerald-950/30 mb-4';
        badgeEl.className = 'text-xs font-extrabold px-2 py-0.5 rounded bg-emerald-500/20 text-emerald-400 border border-emerald-500/30';
        badgeEl.innerText = 'HIGH STATISTICAL EDGE';
      } else if (v === 'POSITIVE_EDGE') {
        verdictCard.className = 'p-4 rounded-xl border border-emerald-500/30 bg-emerald-950/20 mb-4';
        badgeEl.className = 'text-xs font-extrabold px-2 py-0.5 rounded bg-emerald-500/20 text-emerald-300 border border-emerald-500/30';
        badgeEl.innerText = 'POSITIVE EDGE';
      } else if (v === 'COIN_FLIP') {
        verdictCard.className = 'p-4 rounded-xl border border-amber-500/40 bg-amber-950/30 mb-4';
        badgeEl.className = 'text-xs font-extrabold px-2 py-0.5 rounded bg-amber-500/20 text-amber-400 border border-amber-500/30';
        badgeEl.innerText = 'COIN FLIP / BREAK-EVEN';
      } else {
        verdictCard.className = 'p-4 rounded-xl border border-rose-500/40 bg-rose-950/30 mb-4';
        badgeEl.className = 'text-xs font-extrabold px-2 py-0.5 rounded bg-rose-500/20 text-rose-400 border border-rose-500/30';
        badgeEl.innerText = 'NEGATIVE EDGE / HIGH RISK';
      }

      renderSvgFanChart(data);
    }

    function renderSvgFanChart(data) {
      const bands = data.bands;
      if (!bands || !bands.length) return;

      const chartEl = document.getElementById('tmFanChart');
      const w = 780;
      const h = 170;
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

      // Build SVG paths for 5-95 corridor and 25-75 corridor
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

      const svg = \`
        <svg viewBox="0 0 \${w} \${h}" class="w-full h-full">
          <!-- 5-95% outer corridor -->
          <path d="\${dOuter}" fill="rgba(168, 85, 247, 0.15)" />
          <!-- 25-75% inner corridor -->
          <path d="\${dInner}" fill="rgba(168, 85, 247, 0.28)" />
          <!-- Median path -->
          <path d="\${dMedian}" fill="none" stroke="#c084fc" stroke-width="2.2" />

          <!-- Target Line -->
          <line x1="\${pad}" y1="\${yTarget}" x2="\${w - pad}" y2="\${yTarget}" stroke="#34d399" stroke-width="1.5" stroke-dasharray="4 3" />
          <text x="\${w - pad + 4}" y="\${yTarget + 3}" fill="#34d399" font-size="9" font-weight="bold">Target &#8377;\${data.target}</text>

          <!-- Entry Line -->
          <line x1="\${pad}" y1="\${yEntry}" x2="\${w - pad}" y2="\${yEntry}" stroke="#ffffff" stroke-width="1.2" />
          <text x="\${pad - 30}" y="\${yEntry + 3}" fill="#ffffff" font-size="9">Entry</text>

          <!-- Stop Line -->
          <line x1="\${pad}" y1="\${yStop}" x2="\${w - pad}" y2="\${yStop}" stroke="#f87171" stroke-width="1.5" stroke-dasharray="4 3" />
          <text x="\${w - pad + 4}" y="\${yStop + 3}" fill="#f87171" font-size="9" font-weight="bold">Stop &#8377;\${data.stop}</text>
        </svg>
      \`;

      chartEl.innerHTML = svg;
    }

    function closeTimeMachineModal() {
      const modal = document.getElementById('timeMachineModal');
      if (modal) modal.classList.add('hidden');
    }

    function openTimeMachineFromModal() {
      if (!currentModalStock) return;
      const entry = currentModalStock.ltp;
      const stop = +(entry * 0.965).toFixed(2);
      const target = +(entry + (entry - stop) * 2.0).toFixed(2);
      runTimeMachine(currentModalStock.symbol, entry, stop, target);
    }

    function openTimeMachineFromCalc() {
      const symbol = document.getElementById('calcSymbol').value || 'STOCK';
      const entry = parseFloat(document.getElementById('calcEntry').value) || 1000;
      const stop = parseFloat(document.getElementById('calcStop').value) || (entry * 0.96);
      const target = parseFloat(document.getElementById('calcTarget').value) || (entry * 1.08);
      runTimeMachine(symbol, entry, stop, target);
    }

    function sendTimeMachineToSizer() {
      if (!currentTmPlan) return;
      closeTimeMachineModal();
      prefillCalculator(currentTmPlan.symbol, currentTmPlan.entry, currentTmPlan.stop, currentTmPlan.target);
    }

    // INSTITUTIONAL 8-POINT RISK GATE
    async function runPreFlightRiskCheck() {
      const symbol = document.getElementById('calcSymbol').value;
      const entryPrice = parseFloat(document.getElementById('calcEntry').value);
      const stopLoss = parseFloat(document.getElementById('calcStop').value);
      const targetPrice = parseFloat(document.getElementById('calcTarget').value);

      const riskPerShare = entryPrice - stopLoss;
      const shares = Math.floor(Math.min(1000 / riskPerShare, 40000 / entryPrice));

      const card = document.getElementById('riskGateCheckResult');
      card.classList.remove('hidden');
      card.innerHTML = '<span class="text-blue-400 font-semibold animate-pulse">Running 8 pre-flight risk checks...</span>';

      try {
        const res = await fetch('/api/risk-check', {
          method: 'POST',
          headers: { 'Content-Type': 'application/json' },
          body: JSON.stringify({ symbol, entryPrice, stopLoss, targetPrice, shares })
        });
        const data = await res.json();
        
        const passedAll = data.passed;
        let htmlChecks = \`
          <div class="flex items-center justify-between pb-2 mb-3 border-b border-slate-800">
            <span class="font-extrabold text-sm \${passedAll ? 'text-emerald-400' : 'text-rose-400'}">
              Pre-Flight Risk Gate: \${data.verdict} (\${data.score})
            </span>
            <span class="text-[11px] text-[var(--text-muted)]">CNC Equity Rules</span>
          </div>
          <div class="grid grid-cols-1 sm:grid-cols-2 gap-2">
        \`;

        data.checks.forEach(c => {
          htmlChecks += \`
            <div class="flex items-start gap-2 p-2 rounded-lg bg-slate-950/60 border \${c.passed ? 'border-emerald-500/20' : 'border-rose-500/30'}">
              <span class="text-xs mt-0.5 \${c.passed ? 'text-emerald-400' : 'text-rose-400'} font-bold">\${c.passed ? '✓' : '✗'}</span>
              <div>
                <span class="font-semibold text-white block">\${c.name}</span>
                <span class="text-[10px] text-slate-400 block">\${c.detail}</span>
              </div>
            </div>
          \`;
        });
        htmlChecks += '</div>';

        card.innerHTML = htmlChecks;
      } catch (err) {
        card.innerHTML = \`<span class="text-red-400">Risk Check Error: \${err.message}</span>\`;
      }
    }
`;

html = html.replace('function openStockModal', jsCodeToAdd + '\n    function openStockModal');

fs.writeFileSync('public/index.html', html, 'utf8');
console.log('Successfully improvised public/index.html with Time Machine, Exit Presets, and Risk Gate!');

