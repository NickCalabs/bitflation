/**
 * IHSG (Jakarta Composite Index) ^JKSE daily close from Yahoo Finance CSV.
 * Output: [{ date, price }] in IDR (index points — same as IDR for comparison).
 */
import { writeFileSync, mkdirSync } from 'fs';
import { join, dirname } from 'path';
import { fileURLToPath } from 'url';

const __dirname = dirname(fileURLToPath(import.meta.url));

const START_DATE = '2015-01-01'; // Yahoo often has 2015+ for ^JKSE
const END_DATE = new Date();

async function main() {
  console.log('Fetching IHSG (^JKSE) daily data from Yahoo Finance...');

  const period1 = Math.floor(new Date(START_DATE).getTime() / 1000);
  const period2 = Math.floor(END_DATE.getTime() / 1000);
  const url = `https://query1.finance.yahoo.com/v7/finance/download/%5EJKSE?period1=${period1}&period2=${period2}&interval=1d&events=history`;

  const res = await fetch(url, {
    headers: { 'User-Agent': 'Mozilla/5.0 (compatible; Bitflation/1.0)' },
  });

  if (!res.ok) {
    throw new Error(`Yahoo Finance HTTP ${res.status}: ${res.statusText}`);
  }

  const csv = await res.text();
  const lines = csv.trim().split('\n');
  if (lines.length < 2) {
    throw new Error('No data rows in CSV');
  }

  const entries = [];
  const header = lines[0].split(',');
  const dateIdx = header.findIndex((h) => h.toLowerCase() === 'date');
  const closeIdx = header.findIndex((h) => h.toLowerCase() === 'close');

  if (dateIdx === -1 || closeIdx === -1) {
    throw new Error('CSV missing Date or Close column');
  }

  for (let i = 1; i < lines.length; i++) {
    const cols = lines[i].split(',');
    const date = cols[dateIdx]?.trim();
    const closeStr = cols[closeIdx]?.trim();
    if (!date || !closeStr || closeStr === 'null') continue;
    const price = parseFloat(closeStr);
    if (!Number.isFinite(price) || price <= 0) continue;
    entries.push({ date, price: Math.round(price) });
  }

  entries.sort((a, b) => a.date.localeCompare(b.date));
  console.log(`  Got ${entries.length} daily closes`);
  if (entries.length > 0) {
    console.log(`  Date range: ${entries[0].date} to ${entries[entries.length - 1].date}`);
  }

  const outDir = join(__dirname, '..', 'src', 'data', 'idr-dca');
  mkdirSync(outDir, { recursive: true });
  const outPath = join(outDir, 'ihsg-daily.json');
  writeFileSync(outPath, JSON.stringify(entries));
  const sizeKB = (JSON.stringify(entries).length / 1024).toFixed(0);
  console.log(`\nWrote ${entries.length} entries to src/data/idr-dca/ihsg-daily.json (${sizeKB}KB)`);
}

main().catch((err) => {
  console.error(err);
  process.exit(1);
});
