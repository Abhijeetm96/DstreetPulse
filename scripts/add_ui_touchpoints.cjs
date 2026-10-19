const fs = require('fs');

let html = fs.readFileSync('public/index.html', 'utf8');

// 1. Highlight tab-timemachine in nav
const oldNavTm = `<button onclick="switchTab('timemachine')" id="tab-timemachine" class="px-4 py-2.5 rounded-lg font-medium transition-all text-[var(--text-muted)] hover:text-white hover:bg-slate-800/50 flex items-center gap-1.5">
      <span>⚡</span> Quantum Time Machine
    </button>`;

const newNavTm = `<button onclick="switchTab('timemachine')" id="tab-timemachine" class="px-4 py-2.5 rounded-lg font-bold transition-all text-purple-300 bg-purple-950/60 border border-purple-500/50 hover:bg-purple-900/60 flex items-center gap-1.5 shadow-lg shadow-purple-950/50">
      <span class="text-purple-400">⚡</span> Quantum Time Machine <span class="ml-1 text-[10px] px-1.5 py-0.5 rounded bg-purple-500/30 text-purple-200 border border-purple-400/40 font-mono">10K REPLAYS</span>
    </button>`;

if (html.includes(oldNavTm)) {
  html = html.replace(oldNavTm, newNavTm);
  console.log('Updated nav tab-timemachine');
} else {
  console.log('oldNavTm not found, checking alternatives...');
}

// 2. Add an announcement bar right below the tabs in Research Candidates (TAB 1)
const candidateTabStart = `<div id="content-candidates" class="space-y-6">`;
const bannerHtml = `<div id="content-candidates" class="space-y-6">
    <!-- NEW Day Trader Skill Features Announcement Banner -->
    <div class="bg-gradient-to-r from-purple-950/70 via-slate-900 to-indigo-950/70 border border-purple-500/40 rounded-2xl p-4 shadow-xl flex flex-col md:flex-row items-center justify-between gap-4">
      <div class="flex items-center gap-3">
        <div class="w-10 h-10 rounded-xl bg-purple-600/30 border border-purple-500/50 flex items-center justify-center text-purple-300 text-xl font-bold">
          ⚡
        </div>
        <div>
          <div class="flex items-center gap-2">
            <h3 class="text-white font-bold text-sm">Day-Trader-Skill Suite Now Integrated</h3>
            <span class="px-2 py-0.5 rounded-full text-[10px] font-mono font-semibold bg-emerald-500/20 text-emerald-300 border border-emerald-500/30">ONLINE</span>
          </div>
          <p class="text-xs text-slate-300 mt-0.5">
            10,000-path Monte Carlo Time Machine, Statistical Exit Planner (OR-Mid/Low/ATR), and Institutional 8-Point Risk Gate.
          </p>
        </div>
      </div>
      <div class="flex items-center gap-2 w-full md:w-auto">
        <button onclick="switchTab('timemachine')" class="flex-1 md:flex-none px-4 py-2 rounded-xl bg-purple-600 hover:bg-purple-500 text-white font-bold text-xs shadow-md transition-all flex items-center justify-center gap-1.5">
          <span>⚡</span> Open Time Machine
        </button>
        <button onclick="switchTab('calculator')" class="flex-1 md:flex-none px-4 py-2 rounded-xl bg-slate-800 hover:bg-slate-700 text-slate-200 border border-slate-700 font-medium text-xs transition-all flex items-center justify-center gap-1.5">
          <span>🛡️</span> Risk Gate & Presets
        </button>
      </div>
    </div>`;

if (html.includes(candidateTabStart) && !html.includes('Day-Trader-Skill Suite Now Integrated')) {
  html = html.replace(candidateTabStart, bannerHtml);
  console.log('Added Announcement Banner to Research Candidates');
}

// 3. Add Time Machine button to BEL card
const oldBelBtn = `<button onclick="prefillCalculator('BEL', 363.35, 342.00, 406.00)" class="px-3.5 py-1.5 rounded-lg bg-blue-600 hover:bg-blue-700 text-white font-medium transition-all">
            Load in Sizing Calculator →
          </button>`;

const newBelBtns = `<div class="flex items-center gap-2">
            <button onclick="runTimeMachine('BEL', 363.35, 342.00, 406.00)" class="px-3.5 py-1.5 rounded-lg bg-purple-600 hover:bg-purple-500 text-white font-bold text-xs transition-all shadow-md flex items-center gap-1.5">
              <span>⚡</span> Time Machine (10,000 Replays)
            </button>
            <button onclick="prefillCalculator('BEL', 363.35, 342.00, 406.00)" class="px-3.5 py-1.5 rounded-lg bg-blue-600 hover:bg-blue-700 text-white font-medium text-xs transition-all">
              Load in Sizing Calculator →
            </button>
          </div>`;

if (html.includes(oldBelBtn)) {
  html = html.replace(oldBelBtn, newBelBtns);
  console.log('Added Time Machine button to BEL card');
} else {
  console.log('oldBelBtn not found');
}

// 4. Update switchTab so active state preserves purple theme for timemachine
const oldSwitchActive = `const activeBtn = document.getElementById(\`tab-\${tab}\`);
      if (activeBtn) {
        activeBtn.className = "px-4 py-2.5 rounded-lg font-medium transition-all bg-[var(--accent)] text-white shadow-sm";
      }`;

const newSwitchActive = `const activeBtn = document.getElementById(\`tab-\${tab}\`);
      if (activeBtn) {
        if (tab === 'timemachine') {
          activeBtn.className = "px-4 py-2.5 rounded-lg font-bold transition-all bg-purple-600 text-white shadow-lg shadow-purple-600/30 flex items-center gap-1.5";
        } else {
          activeBtn.className = "px-4 py-2.5 rounded-lg font-medium transition-all bg-[var(--accent)] text-white shadow-sm";
        }
      }`;

if (html.includes(oldSwitchActive)) {
  html = html.replace(oldSwitchActive, newSwitchActive);
  console.log('Updated switchTab active style');
}

fs.writeFileSync('public/index.html', html, 'utf8');
console.log('Successfully written public/index.html');

