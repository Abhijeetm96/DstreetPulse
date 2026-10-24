const fs = require('fs');
let html = fs.readFileSync('public/index.html', 'utf8');

// Replace BEL button
const target = "onclick=\"prefillCalculator('BEL', 363.35, 342.00, 406.00)\"";
const startIdx = html.indexOf('<button ' + target);
if (startIdx !== -1) {
  const endIdx = html.indexOf('</button>', startIdx) + 9;
  const original = html.substring(startIdx, endIdx);
  const replacement = `<div class="flex items-center gap-2">
            <button onclick="runTimeMachine('BEL', 363.35, 342.00, 406.00)" class="px-3.5 py-1.5 rounded-lg bg-purple-600 hover:bg-purple-500 text-white font-bold text-xs transition-all shadow-md flex items-center gap-1.5 cursor-pointer">
              <span>⚡</span> Time Machine (10,000 Replays)
            </button>
            <button onclick="prefillCalculator('BEL', 363.35, 342.00, 406.00)" class="px-3.5 py-1.5 rounded-lg bg-blue-600 hover:bg-blue-700 text-white font-medium text-xs transition-all cursor-pointer">
              Load in Sizing Calculator →
            </button>
          </div>`;
  html = html.substring(0, startIdx) + replacement + html.substring(endIdx);
  console.log('Successfully replaced BEL button');
} else {
  console.log('Target BEL button not found');
}

// Check Runner Up M&M
const mmTarget = "Auto Leader";
const mmIdx = html.indexOf(mmTarget);
if (mmIdx !== -1 && !html.includes("runTimeMachine('M&M'")) {
  const containerEnd = html.indexOf('</div>', mmIdx + 100);
  const mmBtn = `\n              <div class="flex items-center gap-2 mt-2 pt-2 border-t border-slate-800">
                <button onclick="event.stopPropagation(); runTimeMachine('M&M', 2869.90, 2710.00, 3180.00)" class="px-2.5 py-1 rounded-lg bg-purple-600/30 hover:bg-purple-600/50 text-purple-300 font-bold text-[11px] border border-purple-500/40">⚡ Time Machine (10K Replays)</button>
              </div>`;
  html = html.substring(0, containerEnd + 6) + mmBtn + html.substring(containerEnd + 6);
  console.log('Added Time Machine to M&M card');
}

fs.writeFileSync('public/index.html', html, 'utf8');

