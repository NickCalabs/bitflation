import type { InflationMetric, Timeframe, ComparisonAsset } from './types';

const VALID_METRICS: InflationMetric[] = ['CPI', 'M2', 'GOLD', 'DXY'];
const VALID_TIMEFRAMES: Timeframe[] = ['1Y', '5Y', 'ALL'];
const VALID_COMPARE: ComparisonAsset[] = ['sp500', 'gold', 'housing'];

const DEFAULTS = {
  metric: 'CPI' as InflationMetric,
  anchor: 2015,
  tf: 'ALL' as Timeframe,
  log: false,
};

interface UrlState {
  metric: InflationMetric;
  anchor: number;
  tf: Timeframe;
  log: boolean;
  events: boolean;
  compare: ComparisonAsset[];
}

export function parseUrlState(): Partial<UrlState> {
  const params = new URLSearchParams(window.location.search);
  const result: Partial<UrlState> = {};

  const metric = params.get('metric')?.toUpperCase();
  if (metric && VALID_METRICS.includes(metric as InflationMetric)) {
    result.metric = metric as InflationMetric;
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

  return result;
}

export function writeUrlState(state: UrlState): void {
  const params = new URLSearchParams();

  if (state.metric !== DEFAULTS.metric) {
    params.set('metric', state.metric.toLowerCase());
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

  const search = params.toString();
  const url = search ? `${window.location.pathname}?${search}` : window.location.pathname;
  history.replaceState(null, '', url);
}
