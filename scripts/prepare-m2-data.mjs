import { writeFileSync } from 'fs';
import { join, dirname } from 'path';
import { fileURLToPath } from 'url';

const __dirname = dirname(fileURLToPath(import.meta.url));

async function main() {
  console.log('Fetching M2 money supply data from FRED...');

  const url =
    'https://fred.stlouisfed.org/graph/fredgraph.csv?id=M2SL&cosd=2010-01-01&coed=2025-12-31&fq=Monthly';

  const res = await fetch(url);
  if (!res.ok) throw new Error(`HTTP ${res.status}: ${res.statusText}`);
  const csv = await res.text();

  const lines = csv.trim().split('\n');
  // First line is header: DATE,M2SL
  const entries = [];
  for (let i = 1; i < lines.length; i++) {
    const [date, valueStr] = lines[i].split(',');
    if (!date || valueStr === '.' || valueStr === '') continue;
    const value = parseFloat(valueStr);
    if (isNaN(value)) continue;
    entries.push({ date, value });
  }

  entries.sort((a, b) => a.date.localeCompare(b.date));

  console.log(`\nTotal entries: ${entries.length}`);
  if (entries.length > 0) {
    console.log(`Date range: ${entries[0].date} to ${entries[entries.length - 1].date}`);
  }

  // Spot checks
  const spotChecks = [
    { date: '2010-01-01', expected: 8500, label: 'Jan 2010' },
    { date: '2015-01-01', expected: 11700, label: 'Jan 2015' },
    { date: '2020-01-01', expected: 15400, label: 'Jan 2020' },
    { date: '2022-04-01', expected: 21700, label: 'Apr 2022' },
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

  const outPath = join(__dirname, '..', 'src', 'data', 'm2-monthly.json');
  writeFileSync(outPath, JSON.stringify(entries));
  const sizeKB = (JSON.stringify(entries).length / 1024).toFixed(0);
  console.log(`\nWrote ${entries.length} entries to src/data/m2-monthly.json (${sizeKB}KB)`);
}

main().catch(console.error);
