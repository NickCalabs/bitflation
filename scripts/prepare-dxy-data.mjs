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
    lookup.set(e.date, e.value);
  }

  let lastValue = sorted[0].value;
  const current = new Date(startDate);
  while (current <= endDate) {
    const dateStr = current.toISOString().slice(0, 10);
    if (lookup.has(dateStr)) {
      lastValue = lookup.get(dateStr);
    }
    result.push({ date: dateStr, value: lastValue });
    current.setDate(current.getDate() + 1);
  }

  return result;
}

async function main() {
  console.log('Fetching DXY (Trade Weighted U.S. Dollar Index) data from FRED...');

  const url =
    'https://fred.stlouisfed.org/graph/fredgraph.csv?id=DTWEXBGS&cosd=2010-01-01&coed=2025-12-31&fq=Daily';

  const res = await fetch(url);
  if (!res.ok) throw new Error(`HTTP ${res.status}: ${res.statusText}`);
  const csv = await res.text();

  const lines = csv.trim().split('\n');
  // First line is header: DATE,DTWEXBGS
  const rawEntries = [];
  for (let i = 1; i < lines.length; i++) {
    const [date, valueStr] = lines[i].split(',');
    if (!date || valueStr === '.' || valueStr === '') continue;
    const value = parseFloat(valueStr);
    if (isNaN(value)) continue;
    rawEntries.push({ date, value });
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
    { date: '2015-01-02', expected: 113, label: 'DXY ~113' },
    { date: '2022-10-03', expected: 128, label: 'DXY ~128' },
  ];

  console.log('\nSpot checks:');
  for (const { date, expected, label } of spotChecks) {
    const entry = entries.find((e) => e.date === date);
    if (entry) {
      const pctOff = Math.abs((entry.value - expected) / expected) * 100;
      const status = pctOff > 10 ? '  OFF BY >10%' : 'ok';
      console.log(
        `  ${date}: ${entry.value.toLocaleString()} (expected ~${expected.toLocaleString()}, ${pctOff.toFixed(1)}% off) ${status} -- ${label}`
      );
    } else {
      console.log(`  ${date}: NOT FOUND -- ${label}`);
    }
  }

  const outPath = join(__dirname, '..', 'src', 'data', 'dxy-daily.json');
  writeFileSync(outPath, JSON.stringify(entries));
  const sizeKB = (JSON.stringify(entries).length / 1024).toFixed(0);
  console.log(`\nWrote ${entries.length} entries to src/data/dxy-daily.json (${sizeKB}KB)`);
}

main().catch(console.error);
