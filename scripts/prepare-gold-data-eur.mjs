import { writeFileSync, mkdirSync } from 'fs';
import { join, dirname } from 'path';
import { fileURLToPath } from 'url';

const __dirname = dirname(fileURLToPath(import.meta.url));

/**
 * Computes gold prices in EUR using:
 * 1. datahub.io USD gold prices (same source as USD gold script)
 * 2. ECB EUR/USD exchange rate (monthly)
 *
 * gold_eur = gold_usd / usd_per_eur
 */
async function main() {
  console.log('Computing gold prices in EUR (datahub USD gold × ECB EUR/USD rate)...');

  // Step 1: Fetch USD gold from datahub.io
  console.log('  Fetching USD gold prices from datahub.io...');
  const goldRes = await fetch('https://datahub.io/core/gold-prices/_r/-/data/monthly.csv');
  if (!goldRes.ok) throw new Error(`Gold HTTP ${goldRes.status}`);
  const goldCsv = await goldRes.text();

  const goldUsd = new Map();
  const goldLines = goldCsv.trim().split('\n');
  for (let i = 1; i < goldLines.length; i++) {
    const [dateRaw, valueStr] = goldLines[i].split(',');
    if (!dateRaw || !valueStr || dateRaw < '2010') continue;
    const value = parseFloat(valueStr);
    if (!isNaN(value)) goldUsd.set(dateRaw, value);
  }
  console.log(`  Got ${goldUsd.size} USD gold prices`);

  // Step 2: Fetch EUR/USD rate from ECB
  console.log('  Fetching ECB EUR/USD exchange rate...');
  const ecbUrl = 'https://data-api.ecb.europa.eu/service/data/EXR/M.USD.EUR.SP00.A?format=csvdata&startPeriod=2010-01';
  const ecbRes = await fetch(ecbUrl);
  if (!ecbRes.ok) throw new Error(`ECB HTTP ${ecbRes.status}`);
  const ecbCsv = await ecbRes.text();

  const fxRates = new Map();
  const ecbLines = ecbCsv.trim().split('\n');
  const header = ecbLines[0].split(',');
  const timeIdx = header.findIndex(h => h.includes('TIME_PERIOD'));
  const valueIdx = header.findIndex(h => h.includes('OBS_VALUE'));

  for (let i = 1; i < ecbLines.length; i++) {
    const cols = ecbLines[i].split(',');
    const period = cols[timeIdx];
    const value = parseFloat(cols[valueIdx]);
    if (period && !isNaN(value)) {
      fxRates.set(period, value);
    }
  }
  console.log(`  Got ${fxRates.size} EUR/USD rates`);

  // Step 3: Convert gold_usd / usd_per_eur = gold_eur
  // ECB series EXR/M.USD.EUR.SP00.A gives USD per 1 EUR (e.g. 1.09)
  const entries = [];
  for (const [period, usdPrice] of goldUsd) {
    const usdPerEur = fxRates.get(period);
    if (usdPerEur) {
      const date = period.length === 7 ? `${period}-01` : period;
      entries.push({ date, value: Math.round(usdPrice / usdPerEur * 100) / 100 });
    }
  }

  entries.sort((a, b) => a.date.localeCompare(b.date));

  console.log(`\nTotal entries: ${entries.length}`);
  if (entries.length > 0) {
    console.log(`Date range: ${entries[0].date} to ${entries[entries.length - 1].date}`);
    console.log(`Sample: ${entries[entries.length - 1].date} = €${entries[entries.length - 1].value.toLocaleString()}/oz`);
  }

  const outDir = join(__dirname, '..', 'src', 'data', 'eur');
  mkdirSync(outDir, { recursive: true });
  const outPath = join(outDir, 'gold-monthly.json');
  writeFileSync(outPath, JSON.stringify(entries));
  const sizeKB = (JSON.stringify(entries).length / 1024).toFixed(0);
  console.log(`\nWrote ${entries.length} entries to src/data/eur/gold-monthly.json (${sizeKB}KB)`);
}

main().catch(console.error);
