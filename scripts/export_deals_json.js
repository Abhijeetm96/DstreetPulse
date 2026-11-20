import fs from 'fs';
import path from 'path';
import { fileURLToPath } from 'url';
import {
  CURRENT_SESSION_DATE,
  AVAILABLE_SESSIONS,
  FII_DII_FLOW_DATA,
  getFilteredDeals,
  getInstitutionalSummary
} from '../src/institutional_deals.js';

const __dirname = path.dirname(fileURLToPath(import.meta.url));

const summary = getInstitutionalSummary('TODAY');
const { blocks, bulks, insiders } = getFilteredDeals({ sessionDate: 'TODAY' });

const dealsPayload = {
  summary,
  sessionDate: CURRENT_SESSION_DATE,
  currentDate: CURRENT_SESSION_DATE,
  availableSessions: AVAILABLE_SESSIONS,
  fiiDiiFlows: FII_DII_FLOW_DATA,
  blockDeals: blocks,
  bulkDeals: bulks,
  insiderTrades: insiders
};

const jsonStr = JSON.stringify(dealsPayload, null, 2);

const publicDir = path.resolve(__dirname, '../public/data');
const docsDir = path.resolve(__dirname, '../docs/data');

if (!fs.existsSync(publicDir)) fs.mkdirSync(publicDir, { recursive: true });
if (!fs.existsSync(docsDir)) fs.mkdirSync(docsDir, { recursive: true });

fs.writeFileSync(path.join(publicDir, 'deals.json'), jsonStr, 'utf8');
fs.writeFileSync(path.join(docsDir, 'deals.json'), jsonStr, 'utf8');

console.log(`Exported deals.json with official FII DII flows (Date: ${CURRENT_SESSION_DATE}, FII Net: ₹${FII_DII_FLOW_DATA.fii.netValueCr} Cr, DII Net: ₹${FII_DII_FLOW_DATA.dii.netValueCr} Cr).`);
