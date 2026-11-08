/**
 * Formatting utilities for NSE India Capital Market Terminal
 */

export function formatIndianCurrency(num) {
  if (num === null || num === undefined || isNaN(num)) return '—';
  return '₹' + Number(num).toLocaleString('en-IN', {
    minimumFractionDigits: 2,
    maximumFractionDigits: 2
  });
}

export function formatVolume(vol) {
  if (!vol || isNaN(vol)) return '—';
  const v = Number(vol);
  if (v >= 10000000) return (v / 10000000).toFixed(2) + ' Cr';
  if (v >= 100000) return (v / 100000).toFixed(2) + ' L';
  if (v >= 1000) return (v / 1000).toFixed(0) + ' K';
  return v.toLocaleString('en-IN');
}

export function getHeatmapColorClass(change) {
  const c = Number(change) || 0;
  if (c >= 3.0) return 'hm-dark-green';
  if (c >= 1.5) return 'hm-mid-green';
  if (c >= 0.5) return 'hm-light-green';
  if (c > 0.0) return 'hm-pale-green';
  if (c === 0.0) return 'hm-neutral';
  if (c > -0.5) return 'hm-pale-red';
  if (c > -1.5) return 'hm-light-red';
  if (c > -3.0) return 'hm-mid-red';
  return 'hm-dark-red';
}

