import { writeFileSync, mkdirSync } from 'fs';
import { join, dirname } from 'path';
import { fileURLToPath } from 'url';

const __dirname = dirname(fileURLToPath(import.meta.url));

// FRED series: Eurozone HICP (Harmonised Index of Consumer Prices)
const SERIES_ID = 'CP0000EZ19M086NEST';

async function main() {
  console.log('Fetching Eurozone HICP data from FRED...');

  const url =
    `https://fred.stlouisfed.org/graph/fredgraph.csv?id=${SERIES_ID}&cosd=2010-01-01&coed=2026-12-31&fq=Monthly`;

  const res = await fetch(url);
  if (!res.ok) throw new Error(`HTTP ${res.status}: ${res.statusText}`);
  const csv = await res.text();

  const lines = csv.trim().split('\n');
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

  const outDir = join(__dirname, '..', 'src', 'data', 'eur');
  mkdirSync(outDir, { recursive: true });
  const outPath = join(outDir, 'cpi-monthly.json');
  writeFileSync(outPath, JSON.stringify(entries));
  console.log(`\nWrote ${entries.length} entries to src/data/eur/cpi-monthly.json`);
}

main().catch(console.error);
