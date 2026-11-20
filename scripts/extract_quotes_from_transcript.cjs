const fs = require('fs');
const readline = require('readline');

const transcriptPath = 'C:/Users/abhij/.gemini/antigravity/brain/92ab32d3-0008-484e-b83a-09e26113ed64/.system_generated/logs/transcript_full.jsonl';
const fileStream = fs.createReadStream(transcriptPath);
const rl = readline.createInterface({ input: fileStream });

const allQuotes = new Map();

rl.on('line', (line) => {
  if (line.includes('quotes') && line.includes('pct_change')) {
    try {
      const obj = JSON.parse(line);
      let content = obj.content;
      if (typeof content === 'string') {
        const start = content.indexOf('{"count":');
        if (start !== -1) {
          const jsonStr = content.slice(start);
          const parsed = JSON.parse(jsonStr);
          if (Array.isArray(parsed.quotes)) {
            for (const q of parsed.quotes) {
              allQuotes.set(q.symbol, q);
            }
          }
        }
      }
    } catch (_) {}
  }
});

rl.on('close', () => {
  console.log(`Extracted ${allQuotes.size} unique quotes.`);
  const arr = Array.from(allQuotes.values());
  fs.writeFileSync('scripts/extracted_quotes.json', JSON.stringify(arr, null, 2), 'utf8');
});
