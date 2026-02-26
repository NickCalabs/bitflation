/**
 * Expand monthly gold/IDR to daily by forward-fill (for DCA weekly close lookup).
 * Reads src/data/idr/gold-monthly.json, writes src/data/idr-dca/gold-idr-daily.json.
 */
import { readFileSync, writeFileSync, mkdirSync } from 'fs';
import { join, dirname } from 'path';
import { fileURLToPath } from 'url';

const __dirname = dirname(fileURLToPath(import.meta.url));

function main() {
  console.log('Expanding gold/IDR monthly to daily (forward-fill)...');

  const goldPath = join(__dirname, '..', 'src', 'data', 'idr', 'gold-monthly.json');
  let monthly;
  try {
    monthly = JSON.parse(readFileSync(goldPath, 'utf8'));
  } catch (err) {
    throw new Error(`Read ${goldPath}: ${err.message}. Run prepare-gold-data-idr.mjs first.`);
  }

  if (monthly.length === 0) throw new Error('No monthly gold data');

  const daily = [];
  for (let i = 0; i < monthly.length; i++) {
    const { date: monthStart, value } = monthly[i];
    const [y, m] = monthStart.split('-').map(Number);
    const lastDay = new Date(y, m, 0).getDate();
    for (let d = 1; d <= lastDay; d++) {
      const date = `${y}-${String(m).padStart(2, '0')}-${String(d).padStart(2, '0')}`;
      daily.push({ date, price: value });
    }
  }

  daily.sort((a, b) => a.date.localeCompare(b.date));
  console.log(`  ${monthly.length} months → ${daily.length} days`);

  const outDir = join(__dirname, '..', 'src', 'data', 'idr-dca');
  mkdirSync(outDir, { recursive: true });
  const outPath = join(outDir, 'gold-idr-daily.json');
  writeFileSync(outPath, JSON.stringify(daily));
  const sizeKB = (JSON.stringify(daily).length / 1024).toFixed(0);
  console.log(`\nWrote src/data/idr-dca/gold-idr-daily.json (${sizeKB}KB)`);
}

main();
