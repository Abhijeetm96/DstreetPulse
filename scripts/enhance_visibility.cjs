const fs = require('fs');

let html = fs.readFileSync('public/index.html', 'utf8');

// 1. Highlight tab-timemachine in nav
const oldNavTm = `<button onclick="switchTab('timemachine')" id="tab-timemachine" class="px-4 py-2.5 rounded-lg font-medium transition-all text-[var(--text-muted)] hover:text-white hover:bg-slate-800/50 flex items-center gap-1.5">
      <span>⚡</span> Quantum Time Machine
    </button>`;

const newNavTm = `<button onclick="switchTab('timemachine')" id="tab-timemachine" class="px-4 py-2.5 rounded-lg font-bold transition-all text-purple-300 bg-purple-950/50 border border-purple-500/40 hover:bg-purple-900/50 flex items-center gap-1.5 shadow-sm">
      <span class="text-purple-400">⚡</span> Quantum Time Machine
    </button>`;

html = html.replace(oldNavTm, newNavTm);

// 2. Add Time Machine button directly on BEL candidate card (First screen user sees!)
const oldBelAction = `<div class="flex items-center justify-between text-xs text-[var(--text-muted)]">
          <span>Status: <strong class="text-emerald-400">RESEARCH CANDIDATE</strong> (Not a direct order)</span>
          <button onclick="prefillCalculator('BEL', 363.35, 342.00, 406.00)" class="px-3.5 py-1.5 rounded-lg bg-blue-600 hover:bg-blue-700 text-white font-medium transition-all">
            Load in Sizing Calculator →
          </button>
        </div>`;

const newBelAction = `<div class="flex items-center justify-between text-xs text-[var(--text-muted)] flex-wrap gap-2">
          <span>Status: <strong class="text-emerald-400">RESEARCH CANDIDATE</strong> (Not a direct order)</span>
          <div class="flex items-center gap-2">
            <button type="button" onclick="runTimeMachine('BEL', 363.35, 342.00, 406.00)" class="px-3.5 py-1.5 rounded-lg bg-purple-600/40 hover:bg-purple-600/60 text-purple-300 border border-purple-500/50 font-bold transition-all flex items-center gap-1.5 shadow-md">
              <span>⚡</span> Time Machine (10,000 Replays)
            </button>
            <button type="button" onclick="prefillCalculator('BEL', 363.35, 342.00, 406.00)" class="px-3.5 py-1.5 rounded-lg bg-blue-600 hover:bg-blue-700 text-white font-medium transition-all">
              Load in Sizing Calculator →
            </button>
          </div>
        </div>`;

html = html.replace(oldBelAction, newBelAction);

// 3. Add Time Machine button to Runner Up M&M card
const oldMmCard = `<div class="flex justify-between text-xs text-[var(--text-muted)]">
                <span>Auto Leader • Score 82/100</span>
                <span>LTP: &#8377;2,869.90</span>
              </div>
            </div>`;

const newMmCard = `<div class="flex justify-between text-xs text-[var(--text-muted)]">
                <span>Auto Leader • Score 82/100</span>
                <span>LTP: &#8377;2,869.90</span>
              </div>
              <div class="flex items-center gap-2 mt-2 pt-2 border-t border-slate-800">
                <button type="button" onclick="event.stopPropagation(); runTimeMachine('M&M', 2869.90, 2710.00, 3180.00)" class="px-2.5 py-1 rounded-lg bg-purple-600/30 hover:bg-purple-600/50 text-purple-300 font-bold text-[11px] border border-purple-500/40">⚡ Time Machine</button>
                <button type="button" onclick="event.stopPropagation(); prefillCalculator('M&M', 2869.90, 2710.00, 3180.00)" class="px-2.5 py-1 rounded-lg bg-blue-600/40 hover:bg-blue-600/60 text-blue-300 font-semibold text-[11px]">Size & Plan →</button>
              </div>
            </div>`;

html = html.replace(oldMmCard, newMmCard);

// 4. Add Time Machine button to Runner Up SUNPHARMA card
const oldSunCard = `<div class="flex justify-between text-xs text-[var(--text-muted)]">
                <span>Pharma Leader • Score 79/100</span>
                <span>LTP: &#8377;1,757.50</span>
              </div>
            </div>`;

const newSunCard = `<div class="flex justify-between text-xs text-[var(--text-muted)]">
                <span>Pharma Leader • Score 79/100</span>
                <span>LTP: &#8377;1,757.50</span>
              </div>
              <div class="flex items-center gap-2 mt-2 pt-2 border-t border-slate-800">
                <button type="button" onclick="event.stopPropagation(); runTimeMachine('SUNPHARMA', 1850.40, 1785.00, 1980.00)" class="px-2.5 py-1 rounded-lg bg-purple-600/30 hover:bg-purple-600/50 text-purple-300 font-bold text-[11px] border border-purple-500/40">⚡ Time Machine</button>
                <button type="button" onclick="event.stopPropagation(); prefillCalculator('SUNPHARMA', 1850.40, 1785.00, 1980.00)" class="px-2.5 py-1 rounded-lg bg-blue-600/40 hover:bg-blue-600/60 text-blue-300 font-semibold text-[11px]">Size & Plan →</button>
              </div>
            </div>`;

html = html.replace(oldSunCard, newSunCard);

// 5. Add Time Machine button on Selected Stock card in Heatmaps tab
const oldSelStockAction = `<button onclick="sendStockToSizer()" class="px-4 py-2.5 rounded-xl bg-blue-600 hover:bg-blue-500 text-white font-semibold text-xs transition-all shadow-md flex items-center gap-1.5">
            <span></span> Send to Sizing Calculator
          </button>`;

const newSelStockAction = `<button type="button" onclick="openTimeMachineFromSelected()" class="px-4 py-2.5 rounded-xl bg-purple-600/30 hover:bg-purple-600/50 text-purple-300 font-bold text-xs border border-purple-500/40 transition-all shadow-md flex items-center gap-1.5">
            <span>⚡</span> Time Machine (10,000 Replays)
          </button>
          <button type="button" onclick="sendStockToSizer()" class="px-4 py-2.5 rounded-xl bg-blue-600 hover:bg-blue-500 text-white font-semibold text-xs transition-all shadow-md flex items-center gap-1.5">
            Send to Sizing Calculator →
          </button>`;

html = html.replace(oldSelStockAction, newSelStockAction);

// 6. Ensure openTimeMachineFromSelected exists
if (!html.includes('function openTimeMachineFromSelected()')) {
  html = html.replace(
    'function openTimeMachineFromModal() {',
    `function openTimeMachineFromSelected() {
      if (!selectedStock) return;
      const entry = selectedStock.ltp;
      const stop = +(entry * 0.965).toFixed(2);
      const target = +(entry + (entry - stop) * 2.0).toFixed(2);
      runTimeMachine(selectedStock.symbol, entry, stop, target);
    }\n\n    function openTimeMachineFromModal() {`
  );
}

// 7. Update title and cache-busting timestamp in title bar
html = html.replace(
  '<title>NSE Swing Trader</title>',
  '<title>NSE Swing Trader — Day-Trader-Skill Quantum Engine</title>'
);

fs.writeFileSync('public/index.html', html, 'utf8');
console.log('Successfully enhanced visibility across all tabs and candidate cards!');

