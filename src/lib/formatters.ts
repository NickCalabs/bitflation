import type { CurrencyCode } from './types';

let currentLocale = 'en-US';
let currentCurrency: CurrencyCode = 'USD';

// Cached formatters — recreated when currency changes
let currencyFormatter: Intl.NumberFormat;
let currencyCompactFormatter: Intl.NumberFormat;

function buildFormatters() {
  currencyFormatter = new Intl.NumberFormat(currentLocale, {
    style: 'currency',
    currency: currentCurrency,
    minimumFractionDigits: 0,
    maximumFractionDigits: 0,
  });
  currencyCompactFormatter = new Intl.NumberFormat(currentLocale, {
    style: 'currency',
    currency: currentCurrency,
    notation: 'compact',
    minimumFractionDigits: 0,
    maximumFractionDigits: 1,
  });
}

// Initialize with defaults
buildFormatters();

const percentFormatter = new Intl.NumberFormat('en-US', {
  style: 'percent',
  minimumFractionDigits: 1,
  maximumFractionDigits: 1,
  signDisplay: 'exceptZero',
});

/**
 * Switch all currency formatters to a new currency.
 * Call this when the user changes currency — all subsequent
 * formatCurrency/formatCurrencyCompact calls use the new currency.
 */
export function setFormatterCurrency(locale: string, currency: CurrencyCode): void {
  if (locale === currentLocale && currency === currentCurrency) return;
  currentLocale = locale;
  currentCurrency = currency;
  buildFormatters();
}

export function formatCurrency(value: number): string {
  return currencyFormatter.format(value);
}

export function formatCurrencyCompact(value: number): string {
  return currencyCompactFormatter.format(value);
}

/** Backward-compatible alias */
export const formatUSD = formatCurrency;
export const formatUSDCompact = formatCurrencyCompact;

export function formatPercent(value: number): string {
  return percentFormatter.format(value);
}

export function formatDate(dateStr: string): string {
  const [year, month, day] = dateStr.split('-').map(Number);
  const date = new Date(year, month - 1, day);
  return new Intl.DateTimeFormat('en-US', {
    month: 'short',
    day: 'numeric',
    year: 'numeric',
  }).format(date);
}

export function formatGoldOz(value: number): string {
  if (value >= 100) return `${Math.round(value).toLocaleString('en-US')} oz`;
  if (value >= 10) return `${value.toFixed(1)} oz`;
  return `${value.toFixed(2)} oz`;
}

export function formatIndexed(value: number): string {
  return value.toFixed(0);
}

export function formatChartDate(dateStr: string): string {
  const [year, month] = dateStr.split('-').map(Number);
  const date = new Date(year, month - 1, 1);
  return new Intl.DateTimeFormat('en-US', {
    month: 'short',
    year: 'numeric',
  }).format(date);
}
