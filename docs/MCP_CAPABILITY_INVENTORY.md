# Official NSE MCP Capability Inventory & Architecture

> **Generated:** November 2026 (IST)  
> **Environment:** Google Antigravity + Official NSE MCP Servers  
> **Connected Servers:**
> - `cm-market`: `https://mcp.nseindia.in/cmmkt/mcp`
> - `nse-bhavcopy`: `https://mcp.nseindia.in/bhavcopy/cm/mcp`
> **Transport:** Streamable HTTP over Stdio Bridge (`mcp-remote`)

---

## 1. Executive Summary

The trading terminal connects directly to the official National Stock Exchange of India (NSE) Model Context Protocol (MCP) endpoints. These servers expose real-time capital market valuations, market breadth, Bhavcopy archives, turnover leaders, and institutional bulk data.

### Key Finding on Execution:
**The NSE MCP servers provide authoritative, exchange-cleared read-only market data, technical screeners, historical candle data, and Bhavcopy archives. They do NOT expose any order routing tools.**

This design guarantees data integrity:
- All order execution is handled by the **Paper Trading Engine** with realistic slippage, brokerage, and statutory levies.
- A **Trade Proposal & Order Ticket Generator** formats structured orders (Zerodha Basket, NSE Bracket, Alpaca) for operator approval.
- A global **Kill Switch** immediately halts any automated scanning or execution proposals.

---

## 2. Tool Classification Matrix

### A. cm-market MCP Server (`https://mcp.nseindia.in/cmmkt/mcp`)
| Tool Name | Scope in System | Status & Verification |
| :--- | :--- | :--- |
| `cm_get_live_market_data` | Live order-book depth and tick snapshots | **VERIFIED LIVE** |
| `cm_get_live_indices` | Real-time valuations across all 43 benchmark indices | **VERIFIED LIVE** |
| `cm_get_stock_quote` | High-speed single stock quote with spread & VWAP | **VERIFIED LIVE** |
| `nse_get_gainers` | Exchange-computed top gainers table with volume rank | **VERIFIED LIVE** |
| `nse_get_losers` | Exchange-computed top losers table | **VERIFIED LIVE** |
| `cm_get_equity_stocks` | 501 constituent equity list with LTP and variations | **VERIFIED LIVE** |

### B. nse-bhavcopy MCP Server (`https://mcp.nseindia.in/bhavcopy/cm/mcp`)
| Tool Name | Scope in System | Status & Verification |
| :--- | :--- | :--- |
| `get_bulk_quote` | Queries official settlement quotes up to 50 symbols | **VERIFIED LIVE** |
| `get_stock_history` | Historical OHLCV daily bars with zero look-ahead bias | **VERIFIED LIVE** |
| `get_market_breadth` | Advances/declines ratio, new 52-week highs/lows | **VERIFIED LIVE** |
| `get_corporate_actions` | Ex-dates, bonus issues, splits, and dividend distributions | **VERIFIED LIVE** |
| `get_volume_analysis` | Institutional delivery volume and relative volume | **VERIFIED LIVE** |
| `get_top_by_volume` | Exchange most active stocks by volume & turnover | **VERIFIED LIVE** |
