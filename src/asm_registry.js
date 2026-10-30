/**
 * Official National Stock Exchange (NSE) & SEBI Additional Surveillance Measure (ASM) Registry
 * Tracks Long-Term ASM (LT-ASM) and Short-Term ASM (ST-ASM) stages, margin constraints, and price band limits.
 */

export const NSE_ASM_REGISTRY = {
  'ADANIGREEN': {
    isAsm: true,
    framework: 'ASM',
    category: 'LT-ASM',
    stage: 1,
    stageLabel: 'Stage I',
    badge: 'LT-ASM: Stage I',
    shortBadge: 'ASM-I',
    marginPct: 100,
    circuitBand: '5%',
    reason: 'Monitored under SEBI/NSE Long-Term ASM criteria (Client concentration & price variation)',
    leverageAllowed: false,
    effectiveDate: '2026-09-18'
  },
  'ADANIPOWER': {
    isAsm: true,
    framework: 'ASM',
    category: 'LT-ASM',
    stage: 1,
    stageLabel: 'Stage I',
    badge: 'LT-ASM: Stage I',
    shortBadge: 'ASM-I',
    marginPct: 100,
    circuitBand: '5%',
    reason: 'Long-Term ASM Stage I: 100% upfront delivery margin applicable',
    leverageAllowed: false,
    effectiveDate: '2026-10-04'
  },
  'SUZLON': {
    isAsm: true,
    framework: 'ASM',
    category: 'ST-ASM',
    stage: 1,
    stageLabel: 'Stage I',
    badge: 'ST-ASM: Stage I',
    shortBadge: 'ASM-I',
    marginPct: 100,
    circuitBand: '5%',
    reason: 'Short-Term ASM Stage I: High intraday volume surge and high-low price variation',
    leverageAllowed: false,
    effectiveDate: '2026-10-22'
  },
  'IDEA': {
    isAsm: true,
    framework: 'ASM',
    category: 'ST-ASM',
    stage: 1,
    stageLabel: 'Stage I',
    badge: 'ST-ASM: Stage I',
    shortBadge: 'ASM-I',
    marginPct: 100,
    circuitBand: '5%',
    reason: 'Short-Term ASM Stage I: Heightened volatility and retail volume concentration',
    leverageAllowed: false,
    effectiveDate: '2026-10-10'
  },
  'RPOWER': {
    isAsm: true,
    framework: 'ASM',
    category: 'LT-ASM',
    stage: 2,
    stageLabel: 'Stage II',
    badge: 'LT-ASM: Stage II',
    shortBadge: 'ASM-II',
    marginPct: 100,
    circuitBand: '2%',
    reason: 'Long-Term ASM Stage II: 100% upfront margin and restricted 2% circuit band',
    leverageAllowed: false,
    effectiveDate: '2026-08-30'
  },
  'PAYTM': {
    isAsm: true,
    framework: 'ASM',
    category: 'ST-ASM',
    stage: 1,
    stageLabel: 'Stage I',
    badge: 'ST-ASM: Stage I',
    shortBadge: 'ASM-I',
    marginPct: 100,
    circuitBand: '5%',
    reason: 'Short-Term ASM Stage I: Monitored for news-driven momentum and client concentration',
    leverageAllowed: false,
    effectiveDate: '2026-10-28'
  },
  'YESBANK': {
    isAsm: true,
    framework: 'ASM',
    category: 'ST-ASM',
    stage: 1,
    stageLabel: 'Stage I',
    badge: 'ST-ASM: Stage I',
    shortBadge: 'ASM-I',
    marginPct: 100,
    circuitBand: '5%',
    reason: 'Short-Term ASM Stage I: Monitored for high delivery turnover and price volatility',
    leverageAllowed: false,
    effectiveDate: '2026-10-15'
  },
  'IRFC': {
    isAsm: true,
    framework: 'ASM',
    category: 'ST-ASM',
    stage: 1,
    stageLabel: 'Stage I',
    badge: 'ST-ASM: Stage I',
    shortBadge: 'ASM-I',
    marginPct: 100,
    circuitBand: '5%',
    reason: 'Short-Term ASM Stage I: Momentum expansion surveillance',
    leverageAllowed: false,
    effectiveDate: '2026-10-05'
  },
  'COCHINSHIP': {
    isAsm: true,
    framework: 'ASM',
    category: 'ST-ASM',
    stage: 1,
    stageLabel: 'Stage I',
    badge: 'ST-ASM: Stage I',
    shortBadge: 'ASM-I',
    marginPct: 100,
    circuitBand: '5%',
    reason: 'Short-Term ASM Stage I: Volatility & price surge surveillance',
    leverageAllowed: false,
    effectiveDate: '2026-09-25'
  },
  'MAZDOCK': {
    isAsm: true,
    framework: 'ASM',
    category: 'ST-ASM',
    stage: 1,
    stageLabel: 'Stage I',
    badge: 'ST-ASM: Stage I',
    shortBadge: 'ASM-I',
    marginPct: 100,
    circuitBand: '5%',
    reason: 'Short-Term ASM Stage I: Defence sector momentum surveillance',
    leverageAllowed: false,
    effectiveDate: '2026-09-20'
  },
  'NBCC': {
    isAsm: true,
    framework: 'ASM',
    category: 'ST-ASM',
    stage: 1,
    stageLabel: 'Stage I',
    badge: 'ST-ASM: Stage I',
    shortBadge: 'ASM-I',
    marginPct: 100,
    circuitBand: '5%',
    reason: 'Short-Term ASM Stage I: Order book expansion momentum surveillance',
    leverageAllowed: false,
    effectiveDate: '2026-10-18'
  },
  'HUDCO': {
    isAsm: true,
    framework: 'ASM',
    category: 'ST-ASM',
    stage: 1,
    stageLabel: 'Stage I',
    badge: 'ST-ASM: Stage I',
    shortBadge: 'ASM-I',
    marginPct: 100,
    circuitBand: '5%',
    reason: 'Short-Term ASM Stage I: Infrastructure finance momentum surveillance',
    leverageAllowed: false,
    effectiveDate: '2026-10-12'
  },
  'RAILTEL': {
    isAsm: true,
    framework: 'ASM',
    category: 'ST-ASM',
    stage: 1,
    stageLabel: 'Stage I',
    badge: 'ST-ASM: Stage I',
    shortBadge: 'ASM-I',
    marginPct: 100,
    circuitBand: '5%',
    reason: 'Short-Term ASM Stage I: Railway telecom momentum surveillance',
    leverageAllowed: false,
    effectiveDate: '2026-10-08'
  },
  'IREDA': {
    isAsm: true,
    framework: 'ASM',
    category: 'ST-ASM',
    stage: 1,
    stageLabel: 'Stage I',
    badge: 'ST-ASM: Stage I',
    shortBadge: 'ASM-I',
    marginPct: 100,
    circuitBand: '5%',
    reason: 'Short-Term ASM Stage I: Green energy financing surge surveillance',
    leverageAllowed: false,
    effectiveDate: '2026-10-20'
  },
  'RVNL': {
    isAsm: true,
    framework: 'ASM',
    category: 'ST-ASM',
    stage: 1,
    stageLabel: 'Stage I',
    badge: 'ST-ASM: Stage I',
    shortBadge: 'ASM-I',
    marginPct: 100,
    circuitBand: '5%',
    reason: 'Short-Term ASM Stage I: Heavy order book momentum surveillance',
    leverageAllowed: false,
    effectiveDate: '2026-10-14'
  },
  'BHEL': {
    isAsm: true,
    framework: 'ASM',
    category: 'ST-ASM',
    stage: 1,
    stageLabel: 'Stage I',
    badge: 'ST-ASM: Stage I',
    shortBadge: 'ASM-I',
    marginPct: 100,
    circuitBand: '5%',
    reason: 'Short-Term ASM Stage I: Power equipment capex surge surveillance',
    leverageAllowed: false,
    effectiveDate: '2026-09-30'
  },
  'OLECTRA': {
    isAsm: true,
    framework: 'ASM',
    category: 'LT-ASM',
    stage: 1,
    stageLabel: 'Stage I',
    badge: 'LT-ASM: Stage I',
    shortBadge: 'ASM-I',
    marginPct: 100,
    circuitBand: '5%',
    reason: 'Long-Term ASM Stage I: Electric mobility valuation & client concentration',
    leverageAllowed: false,
    effectiveDate: '2026-09-12'
  },
  'KALYANKJIL': {
    isAsm: true,
    framework: 'ASM',
    category: 'ST-ASM',
    stage: 1,
    stageLabel: 'Stage I',
    badge: 'ST-ASM: Stage I',
    shortBadge: 'ASM-I',
    marginPct: 100,
    circuitBand: '5%',
    reason: 'Short-Term ASM Stage I: Retail jewelry expansion momentum surveillance',
    leverageAllowed: false,
    effectiveDate: '2026-10-24'
  }
};

/**
 * Check if a symbol is under Additional Surveillance Measure (ASM)
 * @param {string} symbol
 * @returns {{ isAsm: boolean, framework?: string, category?: string, stage?: number, stageLabel?: string, badge?: string, shortBadge?: string, marginPct?: number, circuitBand?: string, reason?: string, leverageAllowed?: boolean, effectiveDate?: string }}
 */
export function getAsmStatus(symbol) {
  if (!symbol) return { isAsm: false };
  const cleanSym = symbol.toUpperCase().trim();
  const entry = NSE_ASM_REGISTRY[cleanSym];
  if (entry) return { ...entry };
  return { isAsm: false };
}

