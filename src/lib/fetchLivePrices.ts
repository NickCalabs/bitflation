import type { PricePoint } from './types';

/**
 * Fetches the last 365 days of BTC prices from CoinGecko.
 * If CoinGecko fails (rate limit, network), falls back to Blockchain.com
 * for at least today's spot price so the latest data point is always fresh.
 */
export async function fetchLivePrices(): Promise<PricePoint[]> {
  // Try CoinGecko first (365 days of daily data)
  const apiKey = import.meta.env.VITE_COINGECKO_API_KEY;
  if (apiKey) {
    try {
      const res = await fetch(
        'https://api.coingecko.com/api/v3/coins/bitcoin/market_chart?vs_currency=usd&days=365&interval=daily',
        { headers: { 'x-cg-demo-api-key': apiKey } }
      );

      if (res.ok) {
        const data: { prices: [number, number][] } = await res.json();
        if (data.prices.length > 0) {
          return data.prices.map(([timestamp, price]) => ({
            date: new Date(timestamp).toISOString().slice(0, 10),
            price: Math.round(price * 100) / 100,
          }));
        }
      }
    } catch {
      // Fall through to Blockchain.com
    }
  }

  // Fallback: Blockchain.com ticker (today's price only)
  try {
    const res = await fetch('https://blockchain.info/ticker');
    if (!res.ok) return [];
    const data = await res.json() as { USD?: { last?: number } };
    const price = data.USD?.last;
    if (!price) return [];

    const today = new Date().toISOString().slice(0, 10);
    return [{ date: today, price }];
  } catch {
    return [];
  }
}
