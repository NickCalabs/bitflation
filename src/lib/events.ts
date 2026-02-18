export interface ChartEvent {
  date: string;
  label: string;
  color: string;
}

export const EVENTS: ChartEvent[] = [
  { date: '2013-12-04', label: '$1K',         color: '#4ade80' },
  { date: '2017-12-17', label: 'ATH $19.5K',  color: '#4ade80' },
  { date: '2020-03-12', label: 'COVID',        color: '#ef4444' },
  { date: '2020-03-23', label: 'QE',           color: '#f59e0b' },
  { date: '2021-11-10', label: 'ATH $69K',     color: '#4ade80' },
  { date: '2022-03-16', label: 'Rate hikes',   color: '#f59e0b' },
  { date: '2022-11-11', label: 'FTX',          color: '#ef4444' },
  { date: '2024-01-10', label: 'ETF',          color: '#4ade80' },
  { date: '2024-03-14', label: 'ATH $73K',     color: '#4ade80' },
];

export function filterEventsToRange(
  events: ChartEvent[],
  data: { date: string }[]
): ChartEvent[] {
  if (data.length === 0) return [];
  const start = data[0].date;
  const end = data[data.length - 1].date;
  return events.filter((e) => e.date >= start && e.date <= end);
}
