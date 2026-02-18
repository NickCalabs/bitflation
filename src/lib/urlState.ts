import type { InflationMetric, Timeframe } from './types';

const VALID_METRICS: InflationMetric[] = ['CPI', 'M2', 'GOLD', 'DXY'];
const VALID_TIMEFRAMES: Timeframe[] = ['1Y', '5Y', 'ALL'];

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

  const search = params.toString();
  const url = search ? `${window.location.pathname}?${search}` : window.location.pathname;
  history.replaceState(null, '', url);
}
