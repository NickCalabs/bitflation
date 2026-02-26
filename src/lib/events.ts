export interface ChartEvent {
  date: string;
  label: string;
  color: string;
}

export function filterEventsToRange(
  events: ChartEvent[],
  data: { date: string }[]
): ChartEvent[] {
  if (data.length === 0) return [];
  const start = data[0].date;
  const end = data[data.length - 1].date;
  return events.filter((e) => e.date >= start && e.date <= end);
}
