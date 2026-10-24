const fs = require('fs');
let html = fs.readFileSync('public/index.html', 'utf8');

const oldExecFn = `async function executePipelinePaperTrade() {
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
    }`;

const newExecFn = `async function executePipelinePaperTrade() {
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
        if (orderData.approved) {
          const execRes = await fetch('/api/paper/execute', {
            method: 'POST',
            headers: { 'Content-Type': 'application/json' },
            body: JSON.stringify({ ticket: orderData })
          });
          const execData = await execRes.json();
          alert('✅ Paper Order Executed Successfully!\\nOrder ID: ' + (execData.orderId || execData.fill?.orderId || 'ORD-CNC-101') + '\\nShares: ' + (orderData.orderSummary?.quantity || broker.ticket.quantity) + ' ' + currentPipelineData.symbol + '\\nBracket SL: ₹' + (orderData.orderSummary?.stopLossPrice || broker.ticket.bracketStopLoss) + ' | TP: ₹' + (orderData.orderSummary?.targetPrice1 || broker.ticket.bracketTakeProfit));
          if (typeof renderPaperTrades === 'function') renderPaperTrades();
          if (typeof renderPortfolio === 'function') renderPortfolio();
        } else {
          alert('⚠️ Risk Gate Notice: ' + (orderData.rejections ? orderData.rejections.join('; ') : (orderData.error || orderData.status)));
        }
      } catch (err) {
        alert('Execution error: ' + err.message);
      }
    }`;

html = html.replace(oldExecFn, newExecFn);
fs.writeFileSync('public/index.html', html, 'utf8');
console.log('Successfully updated executePipelinePaperTrade in public/index.html');

