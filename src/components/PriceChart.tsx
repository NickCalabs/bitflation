import {
  LineChart,
  Line,
  XAxis,
  YAxis,
  CartesianGrid,
  Tooltip,
  ReferenceLine,
  ResponsiveContainer,
} from 'recharts';
import type { AdjustedPricePoint, GoldPricePoint, InflationMetric } from '../lib/types';
import { formatUSDCompact, formatChartDate, formatGoldOz } from '../lib/formatters';
import { EVENTS, filterEventsToRange, type ChartEvent } from '../lib/events';
import { CustomTooltip } from './CustomTooltip';
import styles from './PriceChart.module.css';

type ChartPoint = AdjustedPricePoint | GoldPricePoint;

interface PriceChartProps {
  data: ChartPoint[];
  metric: InflationMetric;
  logScale: boolean;
  showEvents: boolean;
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

/**
 * Compute dy offsets for events that are close together (within 90 days)
 * to prevent label overlap. Alternates between 0 and 16.
 */
function computeLabelOffsets(events: ChartEvent[]): number[] {
  const offsets = events.map(() => 0);
  for (let i = 1; i < events.length; i++) {
    const prevDate = new Date(events[i - 1].date).getTime();
    const currDate = new Date(events[i].date).getTime();
    const daysDiff = (currDate - prevDate) / 86_400_000;
    if (daysDiff < 90) {
      offsets[i] = offsets[i - 1] === 0 ? 16 : 0;
    }
  }
  return offsets;
}

export function PriceChart({ data, metric, logScale, showEvents }: PriceChartProps) {
  if (data.length === 0) return null;

  const isGold = metric === 'GOLD';

  const visibleEvents = showEvents ? filterEventsToRange(EVENTS, data) : [];
  const labelOffsets = computeLabelOffsets(visibleEvents);

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

  const ticks = sampleTicks(chartData);

  const yAxisProps = {
    tick: { fill: '#71717a', fontSize: 11 } as const,
    axisLine: false as const,
    tickLine: false as const,
    ...(logScale ? { scale: 'log' as const, domain: [1, 'auto'] as [number, 'auto'] } : {}),
  };

  if (isGold) {
    return (
      <div className={styles.chartWrapper}>
        <div className={styles.chart}>
          <ResponsiveContainer width="100%" height="100%">
            <LineChart data={chartData} margin={{ top: 5, right: 10, left: 10, bottom: 5 }}>
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
                    position: 'insideTopRight',
                    fill: event.color,
                    fontSize: 10,
                    fontWeight: 500,
                    dy: labelOffsets[i],
                  }}
                />
              ))}
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
      <div className={styles.chart}>
        <ResponsiveContainer width="100%" height="100%">
          <LineChart data={chartData} margin={{ top: 5, right: 10, left: 10, bottom: 5 }}>
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
                  position: 'insideTopRight',
                  fill: event.color,
                  fontSize: 10,
                  fontWeight: 500,
                  dy: labelOffsets[i],
                }}
              />
            ))}
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
