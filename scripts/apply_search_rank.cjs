const fs = require('fs');

let html = fs.readFileSync('public/index.html', 'utf8');

const targetStr = "let matchesSearch = true;\r\n        if (searchStk) {\r\n          const tokens = searchStk.split(/\\s+/).filter(Boolean);\r\n          const haystack = `${stk.symbol} ${stk.name} ${stk.industry || ''} ${stk.sector || ''}`.toLowerCase();\r\n          matchesSearch = tokens.every(tok => haystack.includes(tok));\r\n        }\r\n        return matchesSector && matchesSearch;\r\n      });\r\n\r\n      document.getElementById('constituentCountBadge').innerText = `${filteredStocks.length} of ${heatmapData.constituents.length} Stocks`;";

const replacementStr = `let matchesSearch = true;\r
        let score = 0;\r
        if (searchStk) {\r
          const tokens = searchStk.split(/\\s+/).filter(Boolean);\r
          const sym = (stk.symbol || '').toLowerCase();\r
          const name = (stk.name || '').toLowerCase();\r
          const ind = (stk.industry || '').toLowerCase();\r
          const sec = (stk.sector || '').toLowerCase();\r
          const haystack = \`\${sym} \${name} \${ind} \${sec}\`;\r
          matchesSearch = tokens.every(tok => haystack.includes(tok));\r
          if (matchesSearch) {\r
            if (sym === searchStk) score += 1000;\r
            else if (sym.startsWith(searchStk)) score += 500;\r
            else if (name.startsWith(searchStk)) score += 300;\r
            else if (sym.includes(searchStk)) score += 100;\r
            else score += 10;\r
          }\r
        }\r
        stk._searchScore = score;\r
        return matchesSector && matchesSearch;\r
      });\r
\r
      if (searchStk) {\r
        filteredStocks.sort((a, b) => (b._searchScore || 0) - (a._searchScore || 0));\r
      }\r
\r
      document.getElementById('constituentCountBadge').innerText = \`\${filteredStocks.length} of \${heatmapData.constituents.length} Stocks\`;`;

if (html.includes(targetStr)) {
  html = html.replace(targetStr, replacementStr);
  console.log('Successfully replaced search filter with ranked search!');
} else {
  console.warn('Target string not found');
}

fs.writeFileSync('public/index.html', html, 'utf8');

