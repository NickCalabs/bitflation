import { writeFileSync } from 'fs';
import { join, dirname } from 'path';
import { fileURLToPath } from 'url';

const __dirname = dirname(fileURLToPath(import.meta.url));

async function main() {
  console.log('Fetching gold price data from datahub.io (LBMA monthly)...');

  const url = 'https://datahub.io/core/gold-prices/_r/-/data/monthly.csv';
  const res = await fetch(url);
  if (!res.ok) throw new Error(`HTTP ${res.status}: ${res.statusText}`);
  const csv = await res.text();

  const lines = csv.trim().split('\n');
  // Header: Date,Price — dates are YYYY-MM format
  const entries = [];
  for (let i = 1; i < lines.length; i++) {
    const [dateRaw, valueStr] = lines[i].split(',');
    if (!dateRaw || !valueStr) continue;
    // Only keep 2010+
    if (dateRaw < '2010') continue;
    const value = parseFloat(valueStr);
    if (isNaN(value)) continue;
    // Normalize date to YYYY-MM-01
    const date = dateRaw.length === 7 ? `${dateRaw}-01` : dateRaw;
    entries.push({ date, value });
  }

  entries.sort((a, b) => a.date.localeCompare(b.date));

  console.log(`\nTotal entries: ${entries.length}`);
  if (entries.length > 0) {
    console.log(`Date range: ${entries[0].date} to ${entries[entries.length - 1].date}`);
  }

  // Spot checks (monthly averages)
  const spotChecks = [
    { date: '2013-04-01', expected: 1485, label: 'Apr 2013 gold ~$1485' },
    { date: '2020-08-01', expected: 1970, label: 'Aug 2020 gold ~$1970' },
    { date: '2024-10-01', expected: 2660, label: 'Oct 2024 gold ~$2660' },
  ];

  console.log('\nSpot checks:');
  for (const { date, expected, label } of spotChecks) {
    const entry = entries.find((e) => e.date === date);
    if (entry) {
      const pctOff = Math.abs((entry.value - expected) / expected) * 100;
      const status = pctOff > 15 ? '  OFF BY >15%' : 'ok';
      console.log(
        `  ${date}: ${entry.value.toLocaleString()} (expected ~${expected.toLocaleString()}, ${pctOff.toFixed(1)}% off) ${status} -- ${label}`
      );
    } else {
      console.log(`  ${date}: NOT FOUND -- ${label}`);
    }
  }

  const outPath = join(__dirname, '..', 'src', 'data', 'gold-monthly.json');
  writeFileSync(outPath, JSON.stringify(entries));
  const sizeKB = (JSON.stringify(entries).length / 1024).toFixed(0);
  console.log(`\nWrote ${entries.length} entries to src/data/gold-monthly.json (${sizeKB}KB)`);
}

main().catch(console.error);
