# Indian Equity Swing Trading Intelligence System

An AI-assisted, evidence-based swing trading research system built on Google Antigravity and the connected Official NSE Model Context Protocol (MCP) servers (`cm-market` and `nse-bhavcopy`).

Designed with strict adherence to **capital preservation**, **repeatable processes**, **transparent mathematical calculations**, and **zero look-ahead bias**.

---

## 1. System Architecture

```mermaid
flowchart TD
    subgraph NSE_MCP["Official NSE MCP Servers (Streamable HTTP / stdio)"]
        A1[cm_get_live_market_data]
        A2[cm_get_live_indices]
        A3[cm_get_stock_quote]
        A4[get_bulk_quote]
        A5[get_stock_history]
        A6[get_market_breadth]
        A7[get_top_by_volume]
    end

    subgraph Core_Engine["Core Intelligence Engine"]
        B1["Data Validator & Hygiene<br/>(Prunes incomplete bars, validates OHLC, checks turnover)"]
        B2["Configurable Stock Scanner<br/>(50/200 SMA, 20/50D Breakout, 1.2x Volume, RS vs Nifty 50)"]
        B3["Risk Manager & Sizing<br/>(0.5% trade risk, 2% portfolio ceiling, statutory tax model)"]
        B4["Paper Trading Gatekeeper<br/>(Order tickets, drift check, Kill Switch)"]
        B5["Trade Journal & Analytics<br/>(SQLite ledger, expectancy, P&L reconciliation)"]
        B6["Event-Driven Backtester<br/>(Bar-by-bar simulation, benchmark comparison)"]
    end

    subgraph Outputs["Operator Interface & Reports"]
        C1["Daily Market & Portfolio Report"]
        C2["Trade Research Candidate Briefings"]
        C3["Unified CLI & Automated Tests"]
    end

    A1 & A4 & A5 & A6 --> B1
    B1 --> B2
    A2 & A3 & A7 --> B3
    B2 & B3 --> B4
    B4 --> B5
    B2 & B3 --> B6
    B2 & B3 & B5 --> C1 & C2
```

---

## 2. Constraints & Safety Rules

- **Segment:** NSE Cash Equity (CNC Delivery) exclusively. Strictly **No Futures and Options (F&O)**.
- **Holding Period:** Several days to several weeks.
- **No Guaranteed Returns:** Hypotheses are subjected to empirical backtesting and risk budgeting.
- **No Invented Data:** All prices, candles, volumes, balances, and fills are fetched directly from Official NSE MCP or tagged `ESTIMATED`.
- **Look-Ahead Bias Elimination:** Incomplete daily bars during market hours are stripped. Breakout resistance levels are computed strictly using bars prior to the evaluated candle.
- **No Averaging Down:** The system automatically locks and rejects new buy proposals for any symbol currently showing an unrealized loss in the live portfolio.
- **Capital Preservation:** Single trade risk is capped at **0.5%** of equity; aggregate open risk is capped at **2.0%**; max **5** simultaneous positions.
- **Execution Safety:** Official NSE MCP is strictly read-only. Live broker execution is locked behind a human confirmation gate with a global emergency **Kill Switch**.

---

## 3. Directory Layout

```
├── config/
│   └── trading_config.json        # Configurable scanner thresholds, risk limits, fees
├── src/
│   ├── data_validator.js          # Incomplete candle pruning, OHLC sanity, turnover checks
│   ├── scanner.js                 # 50/200 MA trend, breakout resistance, volume surge, RS
│   ├── risk_manager.js            # Dynamic position sizing & statutory tax calculator
│   ├── journal.js                 # SQLite persistent trade ledger & performance analytics
│   ├── backtester.js              # Bar-by-bar backtesting with realistic slippage/fees
│   ├── paper_trader.js            # Paper trading engine, quote verification, Kill Switch
│   ├── report_generator.js        # Markdown report generator (Daily & Candidate cards)
│   └── cli.js                     # Unified Command Line Interface
├── tests/
│   ├── data_validator.test.js     # Tests for bar sanity, liquidity, incomplete candle pruning
│   ├── scanner.test.js            # Tests for trend, breakout lookahead guard, RS
│   ├── risk_manager.test.js       # Tests for 0.5% risk cap, 2% aggregate ceiling, fees
│   ├── journal.test.js            # Tests for SQLite ledger, metrics, portfolio reconciliation
│   ├── backtester.test.js         # Tests for simulation, exits, fee accounting
│   └── paper_trader.test.js       # Tests for order tickets, drift check, Kill Switch
├── reports/
│   └── DAILY_REPORT_2026-10-29.md # Sample generated live market and portfolio audit
├── docs/
│   └── MCP_CAPABILITY_INVENTORY.md# Exhaustive documentation of NSE MCP tools
├── package.json
└── mcp_config.json
```

---

## 4. Quick Start & CLI Usage

### Prerequisites
- Node.js v20+ (Tested on Node.js v24.20.0 with native ESM and SQLite support)
- Official NSE MCP servers (`cm-market`, `nse-bhavcopy`) configured in `mcp_config.json`

### Run Automated Tests
```bash
node --test tests/*.test.js
```
Runs the full 21-test suite verifying data hygiene, mathematical sizing, tax models, and safety switches.

### Generate Daily Market & Portfolio Report
```bash
node src/cli.js report
```

### Run Candidate Scanner
```bash
node src/cli.js scan
```

### Inspect Trade Journal & Performance Analytics
```bash
node src/cli.js journal
```

### Emergency Kill Switch
```bash
# Immediately halt any automated simulation or order ticket preparation
node src/cli.js kill

# Reset back to operational mode
node src/cli.js reset-kill
```

---

## 5. Mathematical Models

### Position Sizing Formula
$$\text{Quantity} = \left\lfloor \min\left( \frac{\text{Risk Budget}}{\text{Effective Risk Per Share}}, \frac{\text{Capital Allocation Ceiling}}{\text{Entry Price}} \right) \right\rfloor$$

Where:
- $\text{Risk Budget} = \text{Trading Equity} \times 0.005$ (0.5%)
- $\text{Effective Risk Per Share} = (\text{Entry Price} - \text{Stop Loss}) + 2 \times (\text{Entry Price} \times \text{Slippage Pct})$
- $\text{Capital Allocation Ceiling} = \text{Trading Equity} \times 0.20$ (20% maximum per stock)

### Realistic Indian Statutory Charges (Cash Delivery)
1. **Brokerage:** $0.05\%$ capped at ₹20 per executed order.
2. **STT (Securities Transaction Tax):** $0.1\%$ on Buy turnover and $0.1\%$ on Sell turnover.
3. **Exchange Transaction Charge (NSE):** $0.00297\%$ on total turnover.
4. **SEBI Turnover Fee:** ₹10 / Crore ($0.0001\%$).
5. **Stamp Duty:** $0.015\%$ on Buy turnover only.
6. **Depository Participant (DP) Charge:** ₹13.50 + 18% GST = ₹15.93 per scrip on Sell.
7. **GST:** $18\%$ on (Brokerage + Exchange Txn Charges + SEBI Charges).
8. **Estimated Slippage:** $0.1\%$ buffer on entry and exit executions.

