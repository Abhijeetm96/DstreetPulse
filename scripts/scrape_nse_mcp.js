import { scrapeAllNseMcpData } from '../src/nse_mcp_client.js';

console.log('================================================================');
console.log('   NATIONAL STOCK EXCHANGE OF INDIA (NSE) MCP DATA SCRAPER      ');
console.log('   Endpoints: https://mcp.nseindia.in/{cmmkt, bhavcopy/cm}/mcp   ');
console.log('================================================================\n');

scrapeAllNseMcpData()
  .then((result) => {
    console.log('\n✅ Scrape Completed Successfully!');
    console.log(`- Source: ${result.source}`);
    console.log(`- Scraped At: ${result.scrapedAt}`);
    console.log(`- Crawl Duration: ${result.crawlDurationMs}ms`);
    console.log(`- Indices Scraped: ${result.indices?.length || 0}`);
    console.log(`- Top Gainers Scraped: ${result.marketMovers?.gainers?.length || 0}`);
    console.log(`- Top Losers Scraped: ${result.marketMovers?.losers?.length || 0}`);
    console.log(`- Top Value Stocks Scraped: ${result.topValueStocks?.length || 0}`);
    console.log(`- Advances/Declines: ${result.breadth?.advances} / ${result.breadth?.declines} (Ratio: ${result.breadth?.ad_ratio})`);
    console.log(`- India VIX Level: ${result.mood?.india_vix?.level} (${result.mood?.india_vix?.change_1d_pct}%)`);
    console.log('\nSaved full snapshot to data/nse_scraped_live.json and synced catalog_data.json.');
    process.exit(0);
  })
  .catch((err) => {
    console.error('❌ Scrape Failed:', err);
    process.exit(1);
  });

