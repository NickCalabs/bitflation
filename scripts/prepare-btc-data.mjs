import { writeFileSync } from 'fs';
import { join, dirname } from 'path';
import { fileURLToPath } from 'url';

const __dirname = dirname(fileURLToPath(import.meta.url));

function sleep(ms) {
  return new Promise(resolve => setTimeout(resolve, ms));
}

async function fetchChunk(toTs, limit = 2000) {
  const url = `https://min-api.cryptocompare.com/data/v2/histoday?fsym=BTC&tsym=USD&limit=${limit}&toTs=${toTs}`;
  const res = await fetch(url);
  if (!res.ok) throw new Error(`HTTP ${res.status}`);
  const data = await res.json();
  if (data.Response !== 'Success') throw new Error(data.Message);
  return data.Data.Data;
}

async function main() {
  console.log('Fetching BTC daily price data from CryptoCompare...');

  const START_DATE = '2013-04-28';
  const END_DATE = new Date().toISOString().slice(0, 10);
  const startTs = new Date(START_DATE).getTime() / 1000;
  const endTs = new Date(END_DATE).getTime() / 1000;

  // Fetch in chunks of 2000 days, walking backwards from END_DATE
  let allData = [];
  let cursor = endTs;

  while (cursor > startTs) {
    console.log(`  Fetching chunk ending ${new Date(cursor * 1000).toISOString().slice(0, 10)}...`);
    const chunk = await fetchChunk(cursor);
    const filtered = chunk.filter(d => d.time >= startTs && d.time <= endTs && d.close > 0);
    allData.push(...filtered);
    console.log(`    Got ${filtered.length} valid points`);

    // Move cursor back by 2000 days
    const earliest = Math.min(...chunk.map(d => d.time));
    if (earliest >= cursor) break; // No progress
    cursor = earliest - 86400;

    await sleep(300);
  }

  // Deduplicate and sort
  const dateMap = new Map();
  for (const d of allData) {
    const date = new Date(d.time * 1000).toISOString().slice(0, 10);
    dateMap.set(date, Math.round(d.close * 100) / 100);
  }

  const entries = [...dateMap.entries()]
    .sort(([a], [b]) => a.localeCompare(b))
    .map(([date, price]) => ({ date, price }));

  console.log(`\nTotal entries: ${entries.length}`);
  console.log(`Date range: ${entries[0]?.date} to ${entries[entries.length - 1]?.date}`);

  // Spot checks
  const spotChecks = [
    { date: '2013-12-04', expected: 1100, label: 'BTC first spike to $1K' },
    { date: '2017-12-17', expected: 19500, label: '2017 ATH' },
    { date: '2021-04-15', expected: 63000, label: 'Mid-2021 peak' },
    { date: '2024-03-14', expected: 73000, label: '2024 new ATH' },
  ];

  console.log('\nSpot checks:');
  for (const { date, expected, label } of spotChecks) {
    const entry = entries.find((e) => e.date === date);
    if (entry) {
      const pctOff = Math.abs((entry.price - expected) / expected) * 100;
      const status = pctOff > 10 ? '⚠️  OFF BY >10%' : '✓';
      console.log(`  ${date}: $${entry.price.toLocaleString()} (expected ~$${expected.toLocaleString()}, ${pctOff.toFixed(1)}% off) ${status} — ${label}`);
    } else {
      console.log(`  ${date}: NOT FOUND — ${label}`);
    }
  }

  const outPath = join(__dirname, '..', 'src', 'data', 'btc-daily.json');
  writeFileSync(outPath, JSON.stringify(entries));
  const sizeKB = (JSON.stringify(entries).length / 1024).toFixed(0);
  console.log(`\nWrote ${entries.length} entries to src/data/btc-daily.json (${sizeKB}KB)`);
}

main().catch(console.error);
