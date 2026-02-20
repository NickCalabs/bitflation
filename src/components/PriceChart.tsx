import { useState, useCallback, useEffect, useRef } from 'react';
import {
  ComposedChart,
  Line,
  Area,
  XAxis,
  YAxis,
  CartesianGrid,
  Tooltip,
  ReferenceLine,
  ReferenceArea,
  ResponsiveContainer,
} from 'recharts';
import type { AdjustedPricePoint, GoldPricePoint, InflationMetric, DeflatorMetric, ComparisonAsset, ComparisonPoint, MultiMetricPoint, ViewMode } from '../lib/types';
import { formatUSDCompact, formatChartDate, formatGoldOz, formatIndexed } from '../lib/formatters';
import { EVENTS, filterEventsToRange, type ChartEvent } from '../lib/events';
import { CustomTooltip } from './CustomTooltip';
import styles from './PriceChart.module.css';

type ChartPoint = AdjustedPricePoint | GoldPricePoint;

const COMPARISON_COLORS: Record<ComparisonAsset, string> = {
  sp500: '#22d3ee',
  gold: '#facc15',
  housing: '#f97316',
};

const COMPARISON_LABELS: Record<ComparisonAsset, string> = {
  sp500: 'S&P 500',
  gold: 'Gold',
  housing: 'Housing (delayed)',
};

const METRIC_COLORS: Record<DeflatorMetric, string> = {
  BFI: '#e4e4e7',
  CPI: '#4ade80',
  M2: '#22d3ee',
  DXY: '#fb923c',
};

const METRIC_KEYS: Record<DeflatorMetric, string> = {
  BFI: 'bfiAdjusted',
  CPI: 'cpiAdjusted',
  M2: 'm2Adjusted',
  DXY: 'dxyAdjusted',
};

interface PriceChartProps {
  data: ChartPoint[];
  selectedMetrics: InflationMetric[];
  logScale: boolean;
  showEvents: boolean;
  showGap: boolean;
  multiMetricData?: MultiMetricPoint[] | null;
  comparisonData?: ComparisonPoint[] | null;
  compareAssets?: ComparisonAsset[];
  viewMode?: ViewMode;
}

function sampleTicks(data: { date: string }[]): string[] {
  if (data.length <= 8) return data.map((d) => d.date);
  const step = Math.floor(data.length / 6);
  const ticks: string[] = [];
  for (let i = 0; i < data.length; i += step) {
    ticks.push(data[i].date);
  }
  return ticks;
}

interface EventLayout {
  dy: number;
  position: 'insideTopRight' | 'insideTopLeft';
}

function computeEventLayouts(events: ChartEvent[]): EventLayout[] {
  const layouts: EventLayout[] = events.map(() => ({
    dy: 0,
    position: 'insideTopRight',
  }));

  for (let i = 1; i < events.length; i++) {
    const prevDate = new Date(events[i - 1].date).getTime();
    const currDate = new Date(events[i].date).getTime();
    const daysDiff = (currDate - prevDate) / 86_400_000;

    if (daysDiff < 120) {
      layouts[i].position =
        layouts[i - 1].position === 'insideTopRight'
          ? 'insideTopLeft'
          : 'insideTopRight';
      layouts[i].dy = layouts[i - 1].dy === 0 ? 14 : 0;
    }
  }

  return layouts;
}

export function PriceChart({ data, selectedMetrics, logScale, showEvents, showGap, multiMetricData, comparisonData, compareAssets = [], viewMode = 'compare' }: PriceChartProps) {
  const isComparison = comparisonData != null && comparisonData.length > 0 && compareAssets.length > 0;
  const isRealPrice = viewMode === 'realPrice' && !isComparison;
  const primaryMetric = selectedMetrics[0];
  const isGold = selectedMetrics.length === 1 && selectedMetrics[0] === 'GOLD';
  const deflatorMetrics = selectedMetrics.filter((m): m is DeflatorMetric => m !== 'GOLD');
  const useMultiMetric = multiMetricData != null && multiMetricData.length > 0 && !isComparison;

  // Determine the primary metric key for gap fill
  const primaryMetricKey = deflatorMetrics.length > 0 ? METRIC_KEYS[deflatorMetrics[0]] : 'adjustedPrice';

  // Zoom state
  const [zoomStart, setZoomStart] = useState<string | null>(null);
  const [zoomEnd, setZoomEnd] = useState<string | null>(null);
  const [isZoomed, setIsZoomed] = useState(false);
  const [zoomRange, setZoomRange] = useState<[string, string] | null>(null);

  const dataRef = useRef(data);
  const compDataRef = useRef(comparisonData);
  useEffect(() => {
    if (dataRef.current !== data || compDataRef.current !== comparisonData) {
      dataRef.current = data;
      compDataRef.current = comparisonData;
      setZoomRange(null);
      setIsZoomed(false);
      setZoomStart(null);
      setZoomEnd(null);
    }
  }, [data, comparisonData]);

  const resetZoom = useCallback(() => {
    setZoomRange(null);
    setIsZoomed(false);
    setZoomStart(null);
    setZoomEnd(null);
  }, []);

  const handleMouseDown = useCallback((e: { activeLabel?: string | number } | null) => {
    if (e?.activeLabel != null) setZoomStart(String(e.activeLabel));
  }, []);

  const handleMouseMove = useCallback((e: { activeLabel?: string | number } | null) => {
    if (zoomStart && e?.activeLabel != null) setZoomEnd(String(e.activeLabel));
  }, [zoomStart]);

  const handleMouseUp = useCallback(() => {
    if (zoomStart && zoomEnd) {
      const [lo, hi] = zoomStart < zoomEnd ? [zoomStart, zoomEnd] : [zoomEnd, zoomStart];
      const source = isComparison ? comparisonData! : (useMultiMetric ? multiMetricData! : data);
      const startIdx = source.findIndex(d => d.date >= lo);
      const endIdx = source.findIndex(d => d.date >= hi);
      if (startIdx >= 0 && endIdx >= 0 && Math.abs(endIdx - startIdx) >= 5) {
        setZoomRange([lo, hi]);
        setIsZoomed(true);
      }
    }
    setZoomStart(null);
    setZoomEnd(null);
  }, [zoomStart, zoomEnd, data, comparisonData, multiMetricData, isComparison, useMultiMetric]);

  if (!isComparison && data.length === 0 && !useMultiMetric) return null;

  const eventSource = isComparison ? comparisonData! : data;
  const visibleEvents = showEvents ? filterEventsToRange(EVENTS, eventSource) : [];
  const eventLayouts = computeEventLayouts(visibleEvents);

  // Filter out zero/negative values for log scale (single metric mode)
  let chartData = data;
  if (logScale && !useMultiMetric) {
    if (isGold) {
      chartData = (data as GoldPricePoint[]).filter(
        (d) => d.nominalPrice > 0 && d.goldOunces > 0
      );
    } else {
      chartData = (data as AdjustedPricePoint[]).filter(
        (d) => d.nominalPrice > 0 && d.adjustedPrice > 0
      );
    }
  }

  // Multi-metric chart data
  let multiChartData = multiMetricData ?? [];
  if (logScale && useMultiMetric) {
    multiChartData = multiChartData.filter(d => d.nominalPrice > 0);
  }

  // Apply zoom filtering
  if (isZoomed && zoomRange) {
    chartData = chartData.filter(d => d.date >= zoomRange[0] && d.date <= zoomRange[1]);
    multiChartData = multiChartData.filter(d => d.date >= zoomRange[0] && d.date <= zoomRange[1]);
  }

  let zoomedCompData = comparisonData;
  if (isComparison && isZoomed && zoomRange) {
    zoomedCompData = comparisonData!.filter(d => d.date >= zoomRange[0] && d.date <= zoomRange[1]);
  }

  const ticks = sampleTicks(isComparison ? zoomedCompData! : useMultiMetric ? multiChartData : chartData);

  const yAxisProps = {
    tick: { fill: '#71717a', fontSize: 11 } as const,
    axisLine: false as const,
    tickLine: false as const,
    ...(logScale ? { scale: 'log' as const, domain: [1, 'auto'] as [number, 'auto'] } : {}),
  };

  const zoomOverlay = zoomStart && zoomEnd && (
    <ReferenceArea
      x1={zoomStart}
      x2={zoomEnd}
      strokeOpacity={0.3}
      fill="rgba(129,140,248,0.2)"
    />
  );

  const resetButton = isZoomed && (
    <button className={styles.resetZoom} onClick={resetZoom}>Reset zoom</button>
  );

  // Whether to show gap fill (only in deflator mode, not gold or comparison)
  const renderGap = showGap && !isGold && !isComparison;

  // Comparison chart mode (indexed to 100)
  if (isComparison) {
    const compYAxisProps = {
      tick: { fill: '#71717a', fontSize: 11 } as const,
      axisLine: false as const,
      tickLine: false as const,
      ...(logScale ? { scale: 'log' as const, domain: [1, 'auto'] as [number, 'auto'] } : {}),
    };

    return (
      <div className={styles.chartWrapper}>
        {resetButton}
        <div className={styles.chart}>
          <ResponsiveContainer width="100%" height="100%">
            <ComposedChart
              data={zoomedCompData!}
              margin={{ top: 5, right: 10, left: 10, bottom: 5 }}
              onMouseDown={handleMouseDown}
              onMouseMove={handleMouseMove}
              onMouseUp={handleMouseUp}
            >
              <CartesianGrid stroke="#333" strokeDasharray="4 4" vertical={false} />
              <XAxis
                dataKey="date"
                tickFormatter={formatChartDate}
                ticks={ticks}
                tick={{ fill: '#71717a', fontSize: 11 }}
                axisLine={{ stroke: '#333' }}
                tickLine={false}
              />
              <YAxis
                tickFormatter={(v: number) => formatIndexed(v)}
                width={55}
                {...compYAxisProps}
              />
              <Tooltip content={<CustomTooltip selectedMetrics={selectedMetrics} compareAssets={compareAssets} />} />
              {visibleEvents.map((event, i) => (
                <ReferenceLine
                  key={event.date}
                  x={event.date}
                  stroke={event.color}
                  strokeDasharray="3 3"
                  strokeWidth={1}
                  label={{
                    value: event.label,
                    position: eventLayouts[i].position,
                    fill: event.color,
                    fontSize: 10,
                    fontWeight: 500,
                    dy: eventLayouts[i].dy,
                  }}
                />
              ))}
              {zoomOverlay}
              <Line
                type="monotone"
                dataKey="btc"
                stroke="#818cf8"
                strokeWidth={2}
                dot={false}
                isAnimationActive={true}
                animationDuration={600}
                animationEasing="ease-in-out"
                name="BTC"
              />
              {compareAssets.includes('sp500') && (
                <Line
                  type="monotone"
                  dataKey="sp500"
                  stroke="#22d3ee"
                  strokeWidth={1.5}
                  dot={false}
                  connectNulls
                  isAnimationActive={true}
                  animationDuration={600}
                  animationEasing="ease-in-out"
                  name="S&P 500"
                />
              )}
              {compareAssets.includes('gold') && (
                <Line
                  type="monotone"
                  dataKey="gold"
                  stroke="#facc15"
                  strokeWidth={1.5}
                  dot={false}
                  connectNulls
                  isAnimationActive={true}
                  animationDuration={600}
                  animationEasing="ease-in-out"
                  name="Gold"
                />
              )}
              {compareAssets.includes('housing') && (
                <Line
                  type="monotone"
                  dataKey="housing"
                  stroke="#f97316"
                  strokeWidth={1.5}
                  dot={false}
                  connectNulls
                  isAnimationActive={true}
                  animationDuration={600}
                  animationEasing="ease-in-out"
                  name="Housing"
                />
              )}
            </ComposedChart>
          </ResponsiveContainer>
        </div>
        <div className={styles.legend}>
          <div className={styles.legendItem}>
            <span className={`${styles.legendDot} ${styles.btc}`} />
            BTC
          </div>
          {compareAssets.map((asset) => (
            <div key={asset} className={styles.legendItem}>
              <span
                className={styles.legendDot}
                style={{ background: COMPARISON_COLORS[asset] }}
              />
              {COMPARISON_LABELS[asset]}
            </div>
          ))}
        </div>
      </div>
    );
  }

  if (isGold) {
    return (
      <div className={styles.chartWrapper}>
        {resetButton}
        <div className={styles.chart}>
          <ResponsiveContainer width="100%" height="100%">
            <ComposedChart
              data={chartData}
              margin={{ top: 5, right: 10, left: 10, bottom: 5 }}
              onMouseDown={handleMouseDown}
              onMouseMove={handleMouseMove}
              onMouseUp={handleMouseUp}
            >
              <CartesianGrid stroke="#333" strokeDasharray="4 4" vertical={false} />
              <XAxis
                dataKey="date"
                tickFormatter={formatChartDate}
                ticks={ticks}
                tick={{ fill: '#71717a', fontSize: 11 }}
                axisLine={{ stroke: '#333' }}
                tickLine={false}
              />
              <YAxis
                yAxisId="usd"
                tickFormatter={(v: number) => formatUSDCompact(v)}
                width={55}
                {...yAxisProps}
              />
              <YAxis
                yAxisId="gold"
                orientation="right"
                tickFormatter={(v: number) => formatGoldOz(v)}
                width={65}
                {...yAxisProps}
              />
              <Tooltip content={<CustomTooltip selectedMetrics={selectedMetrics} />} />
              {visibleEvents.map((event, i) => (
                <ReferenceLine
                  key={event.date}
                  x={event.date}
                  yAxisId="usd"
                  stroke={event.color}
                  strokeDasharray="3 3"
                  strokeWidth={1}
                  label={{
                    value: event.label,
                    position: eventLayouts[i].position,
                    fill: event.color,
                    fontSize: 10,
                    fontWeight: 500,
                    dy: eventLayouts[i].dy,
                  }}
                />
              ))}
              {zoomOverlay}
              <Line
                yAxisId="usd"
                type="monotone"
                dataKey="nominalPrice"
                stroke="#818cf8"
                strokeWidth={isRealPrice ? 1 : 1.5}
                strokeOpacity={isRealPrice ? 0.2 : 1}
                dot={false}
                isAnimationActive={true}
                animationDuration={600}
                animationEasing="ease-in-out"
                name="Nominal USD"
              />
              <Line
                yAxisId="gold"
                type="monotone"
                dataKey="goldOunces"
                stroke="#facc15"
                strokeWidth={isRealPrice ? 2.5 : 1.5}
                dot={false}
                isAnimationActive={true}
                animationDuration={600}
                animationEasing="ease-in-out"
                name="Gold (oz)"
              />
            </ComposedChart>
          </ResponsiveContainer>
        </div>
        <div className={styles.legend}>
          <div className={styles.legendItem}>
            <span className={`${styles.legendDot} ${styles.nominal}`} />
            Nominal USD
          </div>
          <div className={styles.legendItem}>
            <span className={`${styles.legendDot} ${styles.gold}`} />
            Gold (oz)
          </div>
        </div>
      </div>
    );
  }

  // Default: deflator mode (single or multi-metric)
  const chartSource = useMultiMetric ? multiChartData : chartData;

  return (
    <div className={styles.chartWrapper}>
      {resetButton}
      <div className={styles.chart}>
        <ResponsiveContainer width="100%" height="100%">
          <ComposedChart
            data={chartSource}
            margin={{ top: 5, right: 10, left: 10, bottom: 5 }}
            onMouseDown={handleMouseDown}
            onMouseMove={handleMouseMove}
            onMouseUp={handleMouseUp}
          >
            <CartesianGrid stroke="#333" strokeDasharray="4 4" vertical={false} />
            <XAxis
              dataKey="date"
              tickFormatter={formatChartDate}
              ticks={ticks}
              tick={{ fill: '#71717a', fontSize: 11 }}
              axisLine={{ stroke: '#333' }}
              tickLine={false}
            />
            <YAxis
              tickFormatter={(v: number) => formatUSDCompact(v)}
              width={55}
              {...yAxisProps}
            />
            <Tooltip content={<CustomTooltip selectedMetrics={selectedMetrics} />} />
            {visibleEvents.map((event, i) => (
              <ReferenceLine
                key={event.date}
                x={event.date}
                stroke={event.color}
                strokeDasharray="3 3"
                strokeWidth={1}
                label={{
                  value: event.label,
                  position: eventLayouts[i].position,
                  fill: event.color,
                  fontSize: 10,
                  fontWeight: 500,
                  dy: eventLayouts[i].dy,
                }}
              />
            ))}
            {renderGap && (
              <>
                <Area
                  type="monotone"
                  dataKey={primaryMetricKey}
                  stackId="gap"
                  fill="transparent"
                  stroke="none"
                  isAnimationActive={false}
                />
                <Area
                  type="monotone"
                  dataKey="inflationGap"
                  stackId="gap"
                  fill="rgba(239, 68, 68, 0.12)"
                  stroke="none"
                  isAnimationActive={false}
                />
              </>
            )}
            {zoomOverlay}
            <Line
              type="monotone"
              dataKey="nominalPrice"
              stroke="#818cf8"
              strokeWidth={isRealPrice ? 1 : 1.5}
              strokeOpacity={isRealPrice ? 0.2 : 1}
              dot={false}
              isAnimationActive={!useMultiMetric}
              animationDuration={600}
              animationEasing="ease-in-out"
              name="Nominal"
            />
            {useMultiMetric ? (
              deflatorMetrics.map(m => (
                <Line
                  key={m}
                  type="monotone"
                  dataKey={METRIC_KEYS[m]}
                  stroke={METRIC_COLORS[m]}
                  strokeWidth={isRealPrice ? 2.5 : 1.5}
                  dot={false}
                  isAnimationActive={false}
                  name={`${m}-adjusted`}
                />
              ))
            ) : (
              <Line
                type="monotone"
                dataKey="adjustedPrice"
                stroke={METRIC_COLORS[deflatorMetrics[0]] ?? '#4ade80'}
                strokeWidth={isRealPrice ? 2.5 : 1.5}
                dot={false}
                isAnimationActive={true}
                animationDuration={600}
                animationEasing="ease-in-out"
                name="Adjusted"
              />
            )}
          </ComposedChart>
        </ResponsiveContainer>
      </div>
      <div className={styles.legend}>
        <div className={styles.legendItem}>
          <span className={`${styles.legendDot} ${styles.nominal}`} />
          Nominal USD
        </div>
        {useMultiMetric ? (
          deflatorMetrics.map(m => (
            <div key={m} className={styles.legendItem}>
              <span className={styles.legendDot} style={{ background: METRIC_COLORS[m] }} />
              {m}-adjusted
            </div>
          ))
        ) : (
          <div className={styles.legendItem}>
            <span className={styles.legendDot} style={{ background: METRIC_COLORS[deflatorMetrics[0]] ?? '#4ade80' }} />
            {primaryMetric === 'BFI' ? 'Bitflation Index' : `${primaryMetric}-adjusted`}
          </div>
        )}
      </div>
    </div>
  );
}
