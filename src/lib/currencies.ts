import type { CurrencyCode, InflationMetric, ComparisonAsset } from './types';
import type { ChartEvent } from './events';

export interface CurrencyConfig {
  code: CurrencyCode;
  symbol: string;
  flag: string;
  locale: string;
  currencyName: string;           // plural: "dollars", "euros", "rupiah"
  currencyNameSingular: string;   // "Dollar", "Euro", "Rupiah"
  coingeckoVsCurrency: string;
  blockchainTickerKey: string;    // key in Blockchain.com ticker response
  availableMetrics: InflationMetric[];
  availableCompareAssets: ComparisonAsset[];
  metricLabels: Partial<Record<InflationMetric, string>>;  // overrides default labels
  moneySupplyLabel: string;       // "M2" or "M3"
  cpiLabel: string;               // "CPI" or "HICP"
  fredSeries: {
    dxy?: string;
    m2?: string;
    sp500?: string;
  };
  fredLiveStartDate: string;      // observation_start for live FRED fetches
  dataDir: string;                // "usd", "eur", "idr"
  hasStaticDxy: boolean;
  hasStaticSp500: boolean;
  hasStaticHousing: boolean;
  footerAttribution: string;
  events: ChartEvent[];
}

/** ATH events with raw BTC prices — formatted dynamically per currency */
interface AthEvent {
  date: string;
  btcPrice: number;
  color: string;
}

const ATH_EVENTS: AthEvent[] = [
  { date: '2013-12-04', btcPrice: 1000,   color: '#4ade80' },
  { date: '2017-12-17', btcPrice: 19500,  color: '#4ade80' },
  { date: '2021-11-10', btcPrice: 69000,  color: '#4ade80' },
  { date: '2024-03-14', btcPrice: 73000,  color: '#4ade80' },
];

/** Universal events (shown for all currencies) */
const UNIVERSAL_EVENTS: ChartEvent[] = [
  { date: '2020-03-12', label: 'COVID',       color: '#ef4444' },
  { date: '2020-03-23', label: 'QE',          color: '#f59e0b' },
  { date: '2022-03-16', label: 'Rate hikes',  color: '#f59e0b' },
  { date: '2022-11-11', label: 'FTX',         color: '#ef4444' },
  { date: '2024-01-10', label: 'ETF',         color: '#4ade80' },
];

/** Format ATH events using compact currency notation */
function buildAthEvents(locale: string, currency: string): ChartEvent[] {
  const fmt = new Intl.NumberFormat(locale, {
    style: 'currency',
    currency,
    notation: 'compact',
    minimumFractionDigits: 0,
    maximumFractionDigits: 1,
  });

  return ATH_EVENTS.map(({ date, btcPrice, color }) => ({
    date,
    label: `ATH ${fmt.format(btcPrice)}`,
    color,
  }));
}

function buildEvents(locale: string, currency: string): ChartEvent[] {
  const athEvents = buildAthEvents(locale, currency);
  // Merge and sort by date
  return [...UNIVERSAL_EVENTS, ...athEvents].sort((a, b) => a.date.localeCompare(b.date));
}

export const CURRENCIES: Record<CurrencyCode, CurrencyConfig> = {
  USD: {
    code: 'USD',
    symbol: '$',
    flag: '🇺🇸',
    locale: 'en-US',
    currencyName: 'dollars',
    currencyNameSingular: 'Dollar',
    coingeckoVsCurrency: 'usd',
    blockchainTickerKey: 'USD',
    availableMetrics: ['BFI', 'CPI', 'M2', 'GOLD', 'DXY'],
    availableCompareAssets: ['sp500', 'gold', 'housing'],
    metricLabels: {},
    moneySupplyLabel: 'M2',
    cpiLabel: 'CPI',
    fredSeries: { dxy: 'DTWEXBGS', m2: 'M2SL', sp500: 'SP500' },
    fredLiveStartDate: '2025-06-01',
    dataDir: 'usd',
    hasStaticDxy: true,
    hasStaticSp500: true,
    hasStaticHousing: true,
    footerAttribution: 'BLS CPI-U · FRED M2 · FRED DXY · LBMA Gold · CryptoCompare BTC',
    events: buildEvents('en-US', 'USD'),
  },
  EUR: {
    code: 'EUR',
    symbol: '€',
    flag: '🇪🇺',
    locale: 'de-DE',
    currencyName: 'euros',
    currencyNameSingular: 'Euro',
    coingeckoVsCurrency: 'eur',
    blockchainTickerKey: 'EUR',
    availableMetrics: ['BFI', 'CPI', 'M2', 'GOLD'],
    availableCompareAssets: ['gold'],
    metricLabels: { CPI: 'HICP', M2: 'M3' },
    moneySupplyLabel: 'M3',
    cpiLabel: 'HICP',
    fredSeries: { m2: 'MABMM301EZM189S' },
    fredLiveStartDate: '2025-01-01',
    dataDir: 'eur',
    hasStaticDxy: false,
    hasStaticSp500: false,
    hasStaticHousing: false,
    footerAttribution: 'Eurostat HICP · FRED M3 · LBMA Gold (EUR) · CryptoCompare BTC',
    events: buildEvents('de-DE', 'EUR'),
  },
  IDR: {
    code: 'IDR',
    symbol: 'Rp',
    flag: '🇮🇩',
    locale: 'id-ID',
    currencyName: 'rupiah',
    currencyNameSingular: 'Rupiah',
    coingeckoVsCurrency: 'idr',
    blockchainTickerKey: 'IDR',
    availableMetrics: ['BFI', 'CPI', 'M2', 'GOLD'],
    availableCompareAssets: ['gold'],
    metricLabels: {},
    moneySupplyLabel: 'M2',
    cpiLabel: 'CPI',
    fredSeries: { m2: 'MYAGM2IDM189N' },
    fredLiveStartDate: '2025-01-01',
    dataDir: 'idr',
    hasStaticDxy: false,
    hasStaticSp500: false,
    hasStaticHousing: false,
    footerAttribution: 'OECD CPI · FRED M2 · LBMA Gold (IDR) · CryptoCompare BTC',
    events: buildEvents('id-ID', 'IDR'),
  },
};

export const DEFAULT_CURRENCY: CurrencyCode = 'USD';
export const CURRENCY_CODES = Object.keys(CURRENCIES) as CurrencyCode[];
