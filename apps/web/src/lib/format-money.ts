/**
 * Format a money amount in minor units (cents) to a display string.
 * e.g. formatMoney(2531) => "$25.31"
 *      formatMoney(323968) => "$3,239.68"
 */
export function formatMoney(minorUnits: number, currency = 'USD'): string {
  const major = minorUnits / 100;
  return new Intl.NumberFormat('en-US', {
    style: 'currency',
    currency,
    minimumFractionDigits: 2,
    maximumFractionDigits: 2,
  }).format(major);
}
