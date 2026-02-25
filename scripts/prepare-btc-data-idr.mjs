import { writeFileSync, mkdirSync } from 'fs';
import { join, dirname } from 'path';
import { fileURLToPath } from 'url';

const __dirname = dirname(fileURLToPath(import.meta.url));

function sleep(ms) {
  return new Promise(resolve => setTimeout(resolve, ms));
}

async function fetchChunk(toTs, limit = 2000) {
  const url = `https://min-api.cryptocompare.com/data/v2/histoday?fsym=BTC&tsym=IDR&limit=${limit}&toTs=${toTs}`;
  const res = await fetch(url);
  if (!res.ok) throw new Error(`HTTP ${res.status}`);
  const data = await res.json();
  if (data.Response !== 'Success') throw new Error(data.Message);
  return data.Data.Data;
}

async function main() {
  console.log('Fetching BTC/IDR daily price data from CryptoCompare...');

  const START_DATE = '2013-04-28';
  const END_DATE = new Date().toISOString().slice(0, 10);
  const startTs = new Date(START_DATE).getTime() / 1000;
  const endTs = new Date(END_DATE).getTime() / 1000;

  let allData = [];
  let cursor = endTs;

  while (cursor > startTs) {
    console.log(`  Fetching chunk ending ${new Date(cursor * 1000).toISOString().slice(0, 10)}...`);
    const chunk = await fetchChunk(cursor);
    const filtered = chunk.filter(d => d.time >= startTs && d.time <= endTs && d.close > 0);
    allData.push(...filtered);
    console.log(`    Got ${filtered.length} valid points`);

    const earliest = Math.min(...chunk.map(d => d.time));
    if (earliest >= cursor) break;
    cursor = earliest - 86400;

    await sleep(300);
  }

  const dateMap = new Map();
  for (const d of allData) {
    const date = new Date(d.time * 1000).toISOString().slice(0, 10);
    // IDR prices are large, round to whole numbers
    dateMap.set(date, Math.round(d.close));
  }

  const entries = [...dateMap.entries()]
    .sort(([a], [b]) => a.localeCompare(b))
    .map(([date, price]) => ({ date, price }));

  console.log(`\nTotal entries: ${entries.length}`);
  console.log(`Date range: ${entries[0]?.date} to ${entries[entries.length - 1]?.date}`);

  const outDir = join(__dirname, '..', 'src', 'data', 'idr');
  mkdirSync(outDir, { recursive: true });
  const outPath = join(outDir, 'btc-daily.json');
  writeFileSync(outPath, JSON.stringify(entries));
  const sizeKB = (JSON.stringify(entries).length / 1024).toFixed(0);
  console.log(`\nWrote ${entries.length} entries to src/data/idr/btc-daily.json (${sizeKB}KB)`);
}

main().catch(console.error);
