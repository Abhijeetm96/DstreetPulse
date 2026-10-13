# Official NSE MCP Capability & Architecture Verification
**Project:** AI-Powered NSE Breakout Radar & Swing Trading Intelligence  
**Date of Audit:** November 2026 (IST)  
**Host Environment:** Windows 11, Google Antigravity, Node.js v24.20.0  
**Connected MCP Servers:** Official NSE MCP (`cm-market` & `nse-bhavcopy` via `mcp-remote`)  
**Endpoints:**
- `https://mcp.nseindia.in/cmmkt/mcp`
- `https://mcp.nseindia.in/bhavcopy/cm/mcp`

---

## 1. Environment & Stack Inspection

* **Programming Languages & Runtimes:**
  - **Node.js:** v24.20.0 / npm 11.19.0 with native ESM and SQLite (`node:sqlite`)
  - **Core Libraries Installed:** `react` 19, `vite` 8, `lucide-react`, `tailwindcss`
* **Persistent Storage / Database:** Relational SQLite 3 (`data/trading_journal.db`)
* **Web UI Framework:** CRED NeoPOP Financial Intelligence Terminal, with bidirectional REST/JSON APIs and Server-Sent Events (SSE).

---

## 2. Remote MCP Tool Matrix

### Category A: cm-market MCP (`https://mcp.nseindia.in/cmmkt/mcp`)
1. **`cm_get_live_indices`**: Real-time valuations for all 43 broad, sectoral, and thematic indices.
2. **`nse_get_market_movers`**: Top gainers and losers computed directly by the exchange.
3. **`cm_get_stock_quote`**: Live tick data with bid/ask depth and day ranges.

### Category B: nse-bhavcopy MCP (`https://mcp.nseindia.in/bhavcopy/cm/mcp`)
1. **`get_market_breadth`**: Market mood, advances/declines, and 52-week extremes.
2. **`get_top_by_volume`**: Top traded volume and cash turnover leaders.
3. **`get_stock_history`**: Daily OHLCV bars without look-ahead bias.
