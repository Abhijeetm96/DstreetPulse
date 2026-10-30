/**
 * Data Validation and Hygiene Module
 * 
 * Enforces strict data integrity:
 * - Timezone validation (IST)
 * - Look-ahead bias prevention (incomplete candle pruning)
 * - Candle sanity (Low <= Open, Close <= High, Volume >= 0)
 * - Liquidity & bid-ask spread verification
 * - Clear classification of LIVE, DELAYED, HISTORICAL, and ESTIMATED data
 */

export const DataClassification = {
  LIVE: 'LIVE',
  DELAYED: 'DELAYED',
  HISTORICAL: 'HISTORICAL',
  ESTIMATED: 'ESTIMATED'
};

export class DataValidator {
  /**
   * @param {Object} config - System and liquidity config
   */
  constructor(config = {}) {
    this.config = config;
    this.minTurnover = config.scanner?.liquidity?.min_daily_turnover_inr ?? 50000000;
    this.maxSpreadPct = config.scanner?.liquidity?.max_bid_ask_spread_pct ?? 0.35;
    this.minPrice = config.scanner?.liquidity?.min_price_inr ?? 20.0;
    this.maxPrice = config.scanner?.liquidity?.max_price_inr ?? 50000.0;
  }

  /**
   * Validate a single OHLCV bar
   * @param {Object} bar - { timestamp, open, high, low, close, volume }
   * @returns {{ valid: boolean, errors: string[] }}
   */
  validateBar(bar) {
    const errors = [];
    if (!bar) {
      return { valid: false, errors: ['Bar is null or undefined'] };
    }

    const { open, high, low, close, volume, timestamp } = bar;

    if (!timestamp) {
      errors.push('Missing timestamp');
    }

    if (typeof open !== 'number' || open <= 0) errors.push(`Invalid open price: ${open}`);
    if (typeof high !== 'number' || high <= 0) errors.push(`Invalid high price: ${high}`);
    if (typeof low !== 'number' || low <= 0) errors.push(`Invalid low price: ${low}`);
    if (typeof close !== 'number' || close <= 0) errors.push(`Invalid close price: ${close}`);
    if (typeof volume !== 'number' || volume < 0) errors.push(`Invalid volume: ${volume}`);

    // OHLC consistency checks
    if (high < low) errors.push(`High (${high}) cannot be lower than Low (${low})`);
    if (high < open) errors.push(`High (${high}) cannot be lower than Open (${open})`);
    if (high < close) errors.push(`High (${high}) cannot be lower than Close (${close})`);
    if (low > open) errors.push(`Low (${low}) cannot be greater than Open (${open})`);
    if (low > close) errors.push(`Low (${low}) cannot be greater than Close (${close})`);

    return {
      valid: errors.length === 0,
      errors
    };
  }

  /**
   * Validates and cleans a time-series of daily candles, stripping incomplete candles if market is open.
   * Prevents look-ahead bias in End-Of-Day swing strategies.
   * 
   * @param {Array<Object>} candles - Array of OHLCV bars sorted chronologically
   * @param {Object} marketStatus - Output from resolve_market_time_and_calendar
   * @returns {{ valid: boolean, cleanedCandles: Array<Object>, warnings: string[], excludedIncompleteBar: Object|null }}
   */
  validateCandleSeries(candles, marketStatus = null) {
    const warnings = [];
    if (!Array.isArray(candles) || candles.length === 0) {
      return { valid: false, cleanedCandles: [], warnings: ['Candle series is empty or not an array'], excludedIncompleteBar: null };
    }

    const cleaned = [];
    for (let i = 0; i < candles.length; i++) {
      const check = this.validateBar(candles[i]);
      if (!check.valid) {
        warnings.push(`Bar #${i} (${candles[i]?.timestamp}) invalid: ${check.errors.join('; ')}`);
        continue;
      }
      cleaned.push(candles[i]);
    }

    if (cleaned.length === 0) {
      return { valid: false, cleanedCandles: [], warnings, excludedIncompleteBar: null };
    }

    let excludedIncompleteBar = null;

    // Check if the final candle is from today while the market is still open
    if (marketStatus && marketStatus.current_time_market_status?.equity_non_fno === 'open') {
      const lastCandle = cleaned[cleaned.length - 1];
      const candleDateStr = lastCandle.timestamp.split('T')[0];
      const now = new Date();
      // Formatted date in IST
      const istDateStr = new Intl.DateTimeFormat('en-CA', { timeZone: 'Asia/Kolkata' }).format(now);

      if (candleDateStr === istDateStr) {
        excludedIncompleteBar = cleaned.pop();
        warnings.push(`Excluded incomplete ongoing intraday candle for ${candleDateStr} to prevent look-ahead bias.`);
      }
    }

    return {
      valid: cleaned.length > 0,
      cleanedCandles: cleaned,
      warnings,
      excludedIncompleteBar
    };
  }

  /**
   * Validate liquidity and spread constraints
   * @param {Object} params - { ltp, volume, bid, ask }
   * @returns {{ passes: boolean, turnoverInr: number, spreadPct: number, reasons: string[] }}
   */
  validateLiquidity({ ltp, volume, bid = null, ask = null }) {
    const reasons = [];
    const turnoverInr = (ltp ?? 0) * (volume ?? 0);

    if (ltp < this.minPrice) {
      reasons.push(`Price ₹${ltp} is below minimum allowed price of ₹${this.minPrice} (penny stock guard).`);
    }
    if (ltp > this.maxPrice) {
      reasons.push(`Price ₹${ltp} exceeds maximum allowed price of ₹${this.maxPrice}.`);
    }

    if (turnoverInr < this.minTurnover) {
      const cr = (turnoverInr / 10000000).toFixed(2);
      const minCr = (this.minTurnover / 10000000).toFixed(2);
      reasons.push(`Turnover ₹${cr} Cr fails minimum liquidity filter of ₹${minCr} Cr.`);
    }

    let spreadPct = 0;
    if (bid !== null && ask !== null && ask > 0) {
      spreadPct = ((ask - bid) / ask) * 100;
      if (spreadPct > this.maxSpreadPct) {
        reasons.push(`Bid-ask spread ${spreadPct.toFixed(3)}% exceeds maximum allowable threshold of ${this.maxSpreadPct}%.`);
      }
    }

    return {
      passes: reasons.length === 0,
      turnoverInr,
      spreadPct,
      reasons
    };
  }

  /**
   * Standardize and format timestamps into IST with proper ISO 8601 offset
   * @param {string|number|Date} rawTime 
   * @returns {string} ISO string with +05:30 IST offset
   */
  formatToIST(rawTime) {
    if (!rawTime) return new Date().toISOString();
    const date = new Date(rawTime);
    if (isNaN(date.getTime())) return String(rawTime);

    // Format in IST (+05:30)
    const formatter = new Intl.DateTimeFormat('en-IN', {
      timeZone: 'Asia/Kolkata',
      year: 'numeric',
      month: '2-digit',
      day: '2-digit',
      hour: '2-digit',
      minute: '2-digit',
      second: '2-digit',
      hour12: false
    });

    const parts = formatter.formatToParts(date);
    const map = {};
    for (const p of parts) {
      map[p.type] = p.value;
    }
    return `${map.year}-${map.month}-${map.day}T${map.hour}:${map.minute}:${map.second}+05:30`;
  }
}

