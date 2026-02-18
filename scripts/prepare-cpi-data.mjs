import { writeFileSync } from 'fs';
import { join, dirname } from 'path';
import { fileURLToPath } from 'url';

const __dirname = dirname(fileURLToPath(import.meta.url));

const SERIES_ID = 'CUUR0000SA0';

function sleep(ms) {
  return new Promise(resolve => setTimeout(resolve, ms));
}

async function fetchBLSRange(startYear, endYear) {
  // BLS v2 POST API (still works without registration for basic requests)
  const url = 'https://api.bls.gov/publicAPI/v2/timeseries/data/';
  const body = JSON.stringify({
    seriesid: [SERIES_ID],
    startyear: String(startYear),
    endyear: String(endYear),
  });

  console.log(`  Fetching ${startYear}-${endYear}...`);
  const res = await fetch(url, {
    method: 'POST',
    headers: { 'Content-Type': 'application/json' },
    body,
  });
  if (!res.ok) throw new Error(`HTTP ${res.status}: ${res.statusText}`);

  const data = await res.json();
  if (data.status !== 'REQUEST_SUCCEEDED') {
    throw new Error(`BLS API error: ${JSON.stringify(data.message)}`);
  }

  return data.Results.series[0].data;
}

async function main() {
  console.log('Fetching CPI data from BLS...');

  // BLS v2 without API key limits to 10-year spans and 25 requests/day
  const ranges = [
    [2010, 2019],
    [2020, 2026],
  ];

  const allRawEntries = [];
  for (const [start, end] of ranges) {
    try {
      const entries = await fetchBLSRange(start, end);
      allRawEntries.push(...entries);
      console.log(`    Got ${entries.length} data points`);
    } catch (err) {
      console.error(`    Error: ${err.message}`);
    }
    await sleep(500);
  }

  // Process entries
  const dateMap = new Map();
  for (const entry of allRawEntries) {
    // Skip annual average (M13)
    if (entry.period === 'M13') continue;
    // Skip entries with missing values
    if (entry.value === '-' || entry.value === '') continue;

    const month = entry.period.replace('M', '');
    const date = `${entry.year}-${month.padStart(2, '0')}-01`;
    const value = parseFloat(entry.value);

    if (!isNaN(value)) {
      dateMap.set(date, value);
    }
  }

  const entries = [...dateMap.entries()]
    .sort(([a], [b]) => a.localeCompare(b))
    .map(([date, value]) => ({ date, value }));

  console.log(`\nTotal entries: ${entries.length}`);
  if (entries.length > 0) {
    console.log(`Date range: ${entries[0].date} to ${entries[entries.length - 1].date}`);
  }

  // Spot checks
  const spotChecks = [
    { date: '2010-01-01', expected: 217.5, label: 'Jan 2010' },
    { date: '2015-01-01', expected: 233.7, label: 'Jan 2015' },
    { date: '2020-01-01', expected: 257.9, label: 'Jan 2020' },
    { date: '2023-01-01', expected: 299.2, label: 'Jan 2023' },
  ];

  console.log('\nSpot checks:');
  for (const { date, expected, label } of spotChecks) {
    const entry = entries.find((e) => e.date === date);
    if (entry) {
      const diff = Math.abs(entry.value - expected);
      const status = diff > 1 ? '⚠️  OFF BY >1pt' : '✓';
      console.log(`  ${date}: ${entry.value} (expected ~${expected}, diff ${diff.toFixed(1)}) ${status} — ${label}`);
    } else {
      console.log(`  ${date}: NOT FOUND — ${label}`);
    }
  }

  const outPath = join(__dirname, '..', 'src', 'data', 'cpi-monthly.json');
  writeFileSync(outPath, JSON.stringify(entries));
  console.log(`\nWrote ${entries.length} entries to src/data/cpi-monthly.json`);
}

main().catch(console.error);
