import type { PricePoint } from './types';

/**
 * Fetches the last 365 days of Bitcoin prices from CoinGecko.
 * Returns [] if API key is missing or request fails.
 */
export async function fetchLivePrices(): Promise<PricePoint[]> {
  const apiKey = import.meta.env.VITE_COINGECKO_API_KEY;
  if (!apiKey) return [];

  try {
    const url =
      'https://api.coingecko.com/api/v3/coins/bitcoin/market_chart?vs_currency=usd&days=365&interval=daily';

    const res = await fetch(url, {
      headers: { 'x-cg-demo-api-key': apiKey },
    });

    if (!res.ok) return [];

    const data: { prices: [number, number][] } = await res.json();

    return data.prices.map(([timestamp, price]) => ({
      date: new Date(timestamp).toISOString().slice(0, 10),
      price: Math.round(price * 100) / 100,
    }));
  } catch {
    return [];
  }
}
