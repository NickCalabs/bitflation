import { writeFileSync } from 'fs';
import { join, dirname } from 'path';
import { fileURLToPath } from 'url';

const __dirname = dirname(fileURLToPath(import.meta.url));

async function main() {
  console.log('Fetching Case-Shiller Home Price Index (CSUSHPINSA) from FRED...');

  const url =
    'https://fred.stlouisfed.org/graph/fredgraph.csv?id=CSUSHPINSA&cosd=2010-01-01&coed=2026-12-31&fq=Monthly';

  const res = await fetch(url);
  if (!res.ok) throw new Error(`HTTP ${res.status}: ${res.statusText}`);
  const csv = await res.text();

  const lines = csv.trim().split('\n');
  // First line is header: DATE,CSUSHPINSA
  const entries = [];
  for (let i = 1; i < lines.length; i++) {
    const [date, valueStr] = lines[i].split(',');
    if (!date || valueStr === '.' || valueStr === '') continue;
    const price = parseFloat(valueStr);
    if (isNaN(price)) continue;
    entries.push({ date, price });
  }

  entries.sort((a, b) => a.date.localeCompare(b.date));

  console.log(`\nTotal entries: ${entries.length}`);
  if (entries.length > 0) {
    console.log(`Date range: ${entries[0].date} to ${entries[entries.length - 1].date}`);
  }

  // Spot checks
  const spotChecks = [
    { date: '2013-01-01', expected: 152, label: 'Jan 2013' },
    { date: '2020-01-01', expected: 217, label: 'Jan 2020' },
    { date: '2024-01-01', expected: 312, label: 'Jan 2024' },
  ];

  console.log('\nSpot checks:');
  for (const { date, expected, label } of spotChecks) {
    const entry = entries.find((e) => e.date === date);
    if (entry) {
      const pctOff = Math.abs((entry.price - expected) / expected) * 100;
      const status = pctOff > 10 ? '  OFF BY >10%' : 'ok';
      console.log(
        `  ${date}: ${entry.price.toLocaleString()} (expected ~${expected.toLocaleString()}, ${pctOff.toFixed(1)}% off) ${status} -- ${label}`
      );
    } else {
      console.log(`  ${date}: NOT FOUND -- ${label}`);
    }
  }

  const outPath = join(__dirname, '..', 'src', 'data', 'housing-monthly.json');
  writeFileSync(outPath, JSON.stringify(entries));
  const sizeKB = (JSON.stringify(entries).length / 1024).toFixed(0);
  console.log(`\nWrote ${entries.length} entries to src/data/housing-monthly.json (${sizeKB}KB)`);
}

main().catch(console.error);
