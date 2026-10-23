const fs = require('fs');

let html = fs.readFileSync('public/index.html', 'utf8');

const controllerJs = `
    // =========================================================================
    // 11-SKILL DAY TRADER PIPELINE CONTROLLER
    // =========================================================================
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
        const res = await fetch('/api/skills-pipeline?symbol=' + encodeURIComponent(symbol));
        if (!res.ok) throw new Error('Failed to load skills pipeline');
        const data = await res.json();
        currentPipelineData = data;
        renderSkillsPipeline(data);
      } catch (err) {
        console.error('Pipeline load error:', err);
      }
    }

    function renderSkillsPipeline(data) {
      if (!data || !data.pipeline) return;
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
        if (document.getElementById('pipeDebt')) document.getElementById('pipeDebt').innerText = Number(analyst.fundamentals.debtToEquity || 0).toFixed(2);
      }

      if (pelosi) {
        if (document.getElementById('pipePromoter')) document.getElementById('pipePromoter').innerText = pelosi.promoterHolding;
        if (document.getElementById('pipePledge')) document.getElementById('pipePledge').innerText = pelosi.promoterPledged;
        if (document.getElementById('pipeFlow')) document.getElementById('pipeFlow').innerText = pelosi.institutionalFlow;
      }

      // Stage B
      if (document.getElementById('pipeEntryStatus')) document.getElementById('pipeEntryStatus').innerText = entry.status || 'TRIGGERED';
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
          if (typeof renderPaperTrades === 'function') renderPaperTrades();
          if (typeof renderPortfolio === 'function') renderPortfolio();
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
      if (navigator.clipboard) {
        navigator.clipboard.writeText(text);
      }
      alert('📋 Order Bracket Payload Copied to Clipboard:\\n' + text);
    }
`;

const initMarker = '// Init';
const initIdx = html.indexOf(initMarker);
if (initIdx !== -1) {
  html = html.substring(0, initIdx) + controllerJs + '\n    ' + html.substring(initIdx);
  fs.writeFileSync('public/index.html', html, 'utf8');
  console.log('Successfully injected pipeline controller functions before // Init');
} else {
  console.error('Marker // Init not found!');
  process.exit(1);
}

