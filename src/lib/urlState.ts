import type { InflationMetric, Timeframe, ComparisonAsset, ViewMode } from './types';

const VALID_METRICS: InflationMetric[] = ['CPI', 'M2', 'GOLD', 'DXY'];
const VALID_TIMEFRAMES: Timeframe[] = ['1Y', '5Y', 'ALL'];
const VALID_COMPARE: ComparisonAsset[] = ['sp500', 'gold', 'housing'];

const DEFAULTS = {
  metrics: ['CPI'] as InflationMetric[],
  anchor: 2015,
  tf: 'ALL' as Timeframe,
  log: false,
  gap: true,
};

interface UrlState {
  metrics: InflationMetric[];
  anchor: number;
  tf: Timeframe;
  log: boolean;
  events: boolean;
  compare: ComparisonAsset[];
  gap: boolean;
  view: ViewMode;
}

export function parseUrlState(): Partial<UrlState> {
  const params = new URLSearchParams(window.location.search);
  const result: Partial<UrlState> = {};

  const metricParam = params.get('metric');
  if (metricParam) {
    const parsed = metricParam.split(',')
      .map(m => m.toUpperCase())
      .filter((m): m is InflationMetric => VALID_METRICS.includes(m as InflationMetric));
    if (parsed.length > 0) {
      result.metrics = parsed;
    }
  }

  const anchor = params.get('anchor');
  if (anchor) {
    const year = Number(anchor);
    if (!Number.isNaN(year) && year >= 2010 && year <= new Date().getFullYear()) {
      result.anchor = year;
    }
  }

  const tf = params.get('tf')?.toUpperCase();
  if (tf && VALID_TIMEFRAMES.includes(tf as Timeframe)) {
    result.tf = tf as Timeframe;
  }

  const log = params.get('log');
  if (log === '1') {
    result.log = true;
  }

  const events = params.get('events');
  if (events === '1') {
    result.events = true;
  }

  const compare = params.get('compare');
  if (compare) {
    const assets = compare.split(',').filter(
      (v): v is ComparisonAsset => VALID_COMPARE.includes(v as ComparisonAsset)
    );
    if (assets.length > 0) {
      result.compare = assets;
    }
  }

  const gap = params.get('gap');
  if (gap === '0') {
    result.gap = false;
  }

  const view = params.get('view');
  if (view === 'real') {
    result.view = 'realPrice';
  }

  return result;
}

export function writeUrlState(state: UrlState): void {
  const params = new URLSearchParams();

  const metricsKey = state.metrics.map(m => m.toLowerCase()).join(',');
  if (metricsKey !== DEFAULTS.metrics[0].toLowerCase()) {
    params.set('metric', metricsKey);
  }
  if (state.anchor !== DEFAULTS.anchor) {
    params.set('anchor', String(state.anchor));
  }
  if (state.tf !== DEFAULTS.tf) {
    params.set('tf', state.tf.toLowerCase());
  }
  if (state.log) {
    params.set('log', '1');
  }
  if (state.events) {
    params.set('events', '1');
  }
  if (state.compare.length > 0) {
    params.set('compare', state.compare.join(','));
  }
  if (!state.gap) {
    params.set('gap', '0');
  }
  if (state.view === 'realPrice') {
    params.set('view', 'real');
  }

  const search = params.toString();
  const url = search ? `${window.location.pathname}?${search}` : window.location.pathname;
  history.replaceState(null, '', url);
}
