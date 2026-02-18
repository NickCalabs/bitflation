import { writeFileSync } from 'fs';
import { join, dirname } from 'path';
import { fileURLToPath } from 'url';

const __dirname = dirname(fileURLToPath(import.meta.url));

function forwardFill(entries) {
  if (entries.length === 0) return [];

  const sorted = [...entries].sort((a, b) => a.date.localeCompare(b.date));
  const result = [];
  const startDate = new Date(sorted[0].date);
  const endDate = new Date(sorted[sorted.length - 1].date);

  // Build lookup
  const lookup = new Map();
  for (const e of sorted) {
    lookup.set(e.date, e.price);
  }

  let lastPrice = sorted[0].price;
  const current = new Date(startDate);
  while (current <= endDate) {
    const dateStr = current.toISOString().slice(0, 10);
    if (lookup.has(dateStr)) {
      lastPrice = lookup.get(dateStr);
    }
    result.push({ date: dateStr, price: lastPrice });
    current.setDate(current.getDate() + 1);
  }

  return result;
}

async function main() {
  console.log('Fetching S&P 500 daily data from FRED...');

  const url =
    'https://fred.stlouisfed.org/graph/fredgraph.csv?id=SP500&cosd=2010-01-01&coed=2026-12-31&fq=Daily';

  const res = await fetch(url);
  if (!res.ok) throw new Error(`HTTP ${res.status}: ${res.statusText}`);
  const csv = await res.text();

  const lines = csv.trim().split('\n');
  // First line is header: DATE,SP500
  const rawEntries = [];
  for (let i = 1; i < lines.length; i++) {
    const [date, valueStr] = lines[i].split(',');
    if (!date || valueStr === '.' || valueStr === '') continue;
    const price = parseFloat(valueStr);
    if (isNaN(price)) continue;
    rawEntries.push({ date, price });
  }

  console.log(`Raw entries (trading days): ${rawEntries.length}`);

  // Forward-fill weekends/holidays
  const entries = forwardFill(rawEntries);

  console.log(`Total entries (with forward-fill): ${entries.length}`);
  if (entries.length > 0) {
    console.log(`Date range: ${entries[0].date} to ${entries[entries.length - 1].date}`);
  }

  // Spot checks
  const spotChecks = [
    { date: '2013-04-28', expected: 1580, label: 'SP500 ~1,580' },
    { date: '2020-03-23', expected: 2240, label: 'SP500 ~2,240' },
    { date: '2024-01-02', expected: 4740, label: 'SP500 ~4,740' },
  ];

  console.log('\nSpot checks:');
  for (const { date, expected, label } of spotChecks) {
    const entry = entries.find((e) => e.date === date);
    if (entry) {
      const pctOff = Math.abs((entry.price - expected) / expected) * 100;
      const status = pctOff > 15 ? '  OFF BY >15%' : 'ok';
      console.log(
        `  ${date}: ${entry.price.toLocaleString()} (expected ~${expected.toLocaleString()}, ${pctOff.toFixed(1)}% off) ${status} -- ${label}`
      );
    } else {
      console.log(`  ${date}: NOT FOUND -- ${label}`);
    }
  }

  const outPath = join(__dirname, '..', 'src', 'data', 'sp500-daily.json');
  writeFileSync(outPath, JSON.stringify(entries));
  const sizeKB = (JSON.stringify(entries).length / 1024).toFixed(0);
  console.log(`\nWrote ${entries.length} entries to src/data/sp500-daily.json (${sizeKB}KB)`);
}

main().catch(console.error);
