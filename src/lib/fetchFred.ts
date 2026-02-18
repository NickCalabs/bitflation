import type { DeflatorPoint } from './types';

/**
 * Fetches observations from the FRED JSON API.
 * Returns [] on any failure (missing key, network, parse).
 */
export async function fetchFred(
  seriesId: string,
  startDate: string
): Promise<DeflatorPoint[]> {
  const apiKey = import.meta.env.VITE_FRED_API_KEY;
  if (!apiKey) return [];

  try {
    const url =
      `https://api.stlouisfed.org/fred/series/observations` +
      `?series_id=${seriesId}` +
      `&api_key=${apiKey}` +
      `&file_type=json` +
      `&observation_start=${startDate}`;

    const res = await fetch(url);
    if (!res.ok) return [];

    const data: { observations: { date: string; value: string }[] } = await res.json();

    return data.observations
      .filter((obs) => obs.value !== '.')
      .map((obs) => ({
        date: obs.date,
        value: Number(obs.value),
      }));
  } catch {
    return [];
  }
}
