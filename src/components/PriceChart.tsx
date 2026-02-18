import { useState, useCallback, useEffect, useRef } from 'react';
import {
  LineChart,
  Line,
  XAxis,
  YAxis,
  CartesianGrid,
  Tooltip,
  ReferenceLine,
  ReferenceArea,
  ResponsiveContainer,
} from 'recharts';
import type { AdjustedPricePoint, GoldPricePoint, InflationMetric, ComparisonAsset, ComparisonPoint } from '../lib/types';
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

interface PriceChartProps {
  data: ChartPoint[];
  metric: InflationMetric;
  logScale: boolean;
  showEvents: boolean;
  comparisonData?: ComparisonPoint[] | null;
  compareAssets?: ComparisonAsset[];
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

/**
 * Compute label layouts for events that are close together.
 * Close pairs get alternating positions (right/left) and staggered dy offsets
 * so labels fan out from the reference line instead of stacking.
 */
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
      // Flip to opposite side of the line
      layouts[i].position =
        layouts[i - 1].position === 'insideTopRight'
          ? 'insideTopLeft'
          : 'insideTopRight';
      // Stagger vertically if same side would still overlap
      layouts[i].dy = layouts[i - 1].dy === 0 ? 14 : 0;
    }
  }

  return layouts;
}

export function PriceChart({ data, metric, logScale, showEvents, comparisonData, compareAssets = [] }: PriceChartProps) {
  const isComparison = comparisonData != null && comparisonData.length > 0 && compareAssets.length > 0;

  // Zoom state
  const [zoomStart, setZoomStart] = useState<string | null>(null);
  const [zoomEnd, setZoomEnd] = useState<string | null>(null);
  const [isZoomed, setIsZoomed] = useState(false);
  const [zoomRange, setZoomRange] = useState<[string, string] | null>(null);

  // Track data reference to reset zoom when external data changes
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
      // Only zoom if the range spans at least a few data points
      const source = isComparison ? comparisonData! : data;
      const startIdx = source.findIndex(d => d.date >= lo);
      const endIdx = source.findIndex(d => d.date >= hi);
      if (startIdx >= 0 && endIdx >= 0 && Math.abs(endIdx - startIdx) >= 5) {
        setZoomRange([lo, hi]);
        setIsZoomed(true);
      }
    }
    setZoomStart(null);
    setZoomEnd(null);
  }, [zoomStart, zoomEnd, data, comparisonData, isComparison]);

  if (!isComparison && data.length === 0) return null;

  const isGold = metric === 'GOLD';

  const eventSource = isComparison ? comparisonData! : data;
  const visibleEvents = showEvents ? filterEventsToRange(EVENTS, eventSource) : [];
  const eventLayouts = computeEventLayouts(visibleEvents);

  // Filter out zero/negative values for log scale
  let chartData = data;
  if (logScale) {
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

  // Apply zoom filtering
  if (isZoomed && zoomRange) {
    chartData = chartData.filter(d => d.date >= zoomRange[0] && d.date <= zoomRange[1]);
  }

  let zoomedCompData = comparisonData;
  if (isComparison && isZoomed && zoomRange) {
    zoomedCompData = comparisonData!.filter(d => d.date >= zoomRange[0] && d.date <= zoomRange[1]);
  }

  const ticks = sampleTicks(isComparison ? zoomedCompData! : chartData);

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
            <LineChart
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
              <Tooltip content={<CustomTooltip metric={metric} compareAssets={compareAssets} />} />
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
            </LineChart>
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
            <LineChart
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
              <Tooltip content={<CustomTooltip metric={metric} />} />
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
                strokeWidth={1.5}
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
                strokeWidth={1.5}
                dot={false}
                isAnimationActive={true}
                animationDuration={600}
                animationEasing="ease-in-out"
                name="Gold (oz)"
              />
            </LineChart>
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

  return (
    <div className={styles.chartWrapper}>
      {resetButton}
      <div className={styles.chart}>
        <ResponsiveContainer width="100%" height="100%">
          <LineChart
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
              tickFormatter={(v: number) => formatUSDCompact(v)}
              width={55}
              {...yAxisProps}
            />
            <Tooltip content={<CustomTooltip metric={metric} />} />
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
              dataKey="nominalPrice"
              stroke="#818cf8"
              strokeWidth={1.5}
              dot={false}
              isAnimationActive={true}
              animationDuration={600}
              animationEasing="ease-in-out"
              name="Nominal"
            />
            <Line
              type="monotone"
              dataKey="adjustedPrice"
              stroke="#4ade80"
              strokeWidth={1.5}
              dot={false}
              isAnimationActive={true}
                animationDuration={600}
                animationEasing="ease-in-out"
              name="Adjusted"
            />
          </LineChart>
        </ResponsiveContainer>
      </div>
      <div className={styles.legend}>
        <div className={styles.legendItem}>
          <span className={`${styles.legendDot} ${styles.nominal}`} />
          Nominal USD
        </div>
        <div className={styles.legendItem}>
          <span className={`${styles.legendDot} ${styles.adjusted}`} />
          {metric}-adjusted
        </div>
      </div>
    </div>
  );
}
