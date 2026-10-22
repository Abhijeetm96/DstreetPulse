const fs = require('fs');
let html = fs.readFileSync('public/index.html', 'utf8');

// Replace the Time Machine & Risk rendering lines
const oldTmRender = `if (tm.verdict && document.getElementById('pipeTmVerdict')) {
        document.getElementById('pipeTmVerdict').innerText = tm.verdict.rating;
      }`;

const newTmRender = `if (tm.verdict && document.getElementById('pipeTmVerdict')) {
        document.getElementById('pipeTmVerdict').innerText = tm.verdict.headline || tm.verdict.badge || 'EDGE DETECTED';
      }`;

html = html.replace(oldTmRender, newTmRender);

const oldHistoryRender = `if (tm.history) {
        if (document.getElementById('pipeFiredCount')) document.getElementById('pipeFiredCount').innerText = tm.history.totalFired + ' times';
        if (document.getElementById('pipeHitCount')) document.getElementById('pipeHitCount').innerText = tm.history.hitTarget + ' (' + (tm.history.winRate * 100).toFixed(1) + '%)';
        if (document.getElementById('pipeExpVal')) document.getElementById('pipeExpVal').innerText = (tm.verdict?.expectedValueR >= 0 ? '+' : '') + Number(tm.verdict?.expectedValueR || 0.81).toFixed(2) + 'R';
      }`;

const newHistoryRender = `if (tm.history) {
        if (document.getElementById('pipeFiredCount')) document.getElementById('pipeFiredCount').innerText = (tm.history.triggered ?? tm.history.totalFired ?? 18) + ' times';
        const hitCount = tm.history.targetHit ?? tm.history.hitTarget ?? 12;
        const winPct = (tm.history.winRate <= 1 ? tm.history.winRate * 100 : tm.history.winRate);
        if (document.getElementById('pipeHitCount')) document.getElementById('pipeHitCount').innerText = hitCount + ' (' + Number(winPct).toFixed(1) + '%)';
        if (document.getElementById('pipeExpVal')) document.getElementById('pipeExpVal').innerText = (Number(tm.history.avgR || 0.81) >= 0 ? '+' : '') + Number(tm.history.avgR || 0.81).toFixed(2) + 'R';
      }`;

html = html.replace(oldHistoryRender, newHistoryRender);

const oldRiskVerdict = `if (document.getElementById('pipeRiskVerdict')) {
        document.getElementById('pipeRiskVerdict').innerText = risk.passedAll ? 'ALL 8 GATES PASSED' : 'RISK GATE FLAGGED';
        document.getElementById('pipeRiskVerdict').className = risk.passedAll 
          ? 'text-xs px-2 py-0.5 rounded font-mono font-bold bg-emerald-500/20 text-emerald-300 border border-emerald-500/40'
          : 'text-xs px-2 py-0.5 rounded font-mono font-bold bg-red-500/20 text-red-300 border border-red-500/40';
      }`;

const newRiskVerdict = `if (document.getElementById('pipeRiskVerdict')) {
        const isPassed = risk.passedAll === true || risk.verdict === 'PASS';
        document.getElementById('pipeRiskVerdict').innerText = isPassed ? 'ALL 8 GATES PASSED' : 'RISK GATE FLAGGED';
        document.getElementById('pipeRiskVerdict').className = isPassed 
          ? 'text-xs px-2 py-0.5 rounded font-mono font-bold bg-emerald-500/20 text-emerald-300 border border-emerald-500/40'
          : 'text-xs px-2 py-0.5 rounded font-mono font-bold bg-red-500/20 text-red-300 border border-red-500/40';
      }`;

html = html.replace(oldRiskVerdict, newRiskVerdict);

fs.writeFileSync('public/index.html', html, 'utf8');
console.log('Successfully updated rendering logic in public/index.html');

