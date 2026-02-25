import { writeFileSync, mkdirSync } from 'fs';
import { join, dirname } from 'path';
import { fileURLToPath } from 'url';

const __dirname = dirname(fileURLToPath(import.meta.url));

/**
 * Computes gold prices in IDR using:
 * 1. LBMA gold prices in EUR (from DBnomics or datahub + EUR/USD)
 * 2. ECB EUR/IDR daily exchange rate → monthly average
 *
 * gold_idr = gold_eur × eur_idr_rate
 */
async function main() {
  console.log('Computing gold prices in IDR (LBMA EUR × ECB EUR/IDR)...');

  // Step 1: Get gold prices in EUR
  // Try to read the EUR gold data we already generated, or fetch USD and convert
  let goldEur;
  try {
    const eurGoldPath = join(__dirname, '..', 'src', 'data', 'eur', 'gold-monthly.json');
    const { readFileSync } = await import('fs');
    goldEur = JSON.parse(readFileSync(eurGoldPath, 'utf8'));
    console.log(`  Using existing EUR gold data: ${goldEur.length} entries`);
  } catch {
    console.log('  EUR gold data not found, fetching USD gold from datahub...');
    goldEur = await fetchGoldEur();
    console.log(`  Got ${goldEur.length} EUR gold entries via fallback`);
  }

  if (goldEur.length === 0) {
    console.error('ERROR: No EUR gold data available');
    process.exit(1);
  }

  // Step 2: Fetch ECB EUR/IDR exchange rates (monthly)
  console.log('  Fetching ECB EUR/IDR exchange rate...');
  const eurIdrRates = await fetchEcbEurIdr();
  console.log(`  Got ${eurIdrRates.size} EUR/IDR monthly rates`);

  // Step 3: Convert gold EUR → gold IDR
  const entries = [];
  for (const { date, value: goldEurPrice } of goldEur) {
    // Match by YYYY-MM
    const period = date.slice(0, 7);
    const eurIdr = eurIdrRates.get(period);
    if (eurIdr) {
      entries.push({
        date,
        value: Math.round(goldEurPrice * eurIdr),
      });
    }
  }

  entries.sort((a, b) => a.date.localeCompare(b.date));

  console.log(`\nTotal entries: ${entries.length}`);
  if (entries.length > 0) {
    console.log(`Date range: ${entries[0].date} to ${entries[entries.length - 1].date}`);
    console.log(`Sample: ${entries[entries.length - 1].date} = ${entries[entries.length - 1].value.toLocaleString()} IDR/oz`);
  }

  const outDir = join(__dirname, '..', 'src', 'data', 'idr');
  mkdirSync(outDir, { recursive: true });
  const outPath = join(outDir, 'gold-monthly.json');
  writeFileSync(outPath, JSON.stringify(entries));
  const sizeKB = (JSON.stringify(entries).length / 1024).toFixed(0);
  console.log(`\nWrote ${entries.length} entries to src/data/idr/gold-monthly.json (${sizeKB}KB)`);
}

async function fetchEcbEurIdr() {
  // ECB Statistical Data Warehouse - EUR/IDR exchange rate (monthly)
  const url = 'https://data-api.ecb.europa.eu/service/data/EXR/M.IDR.EUR.SP00.A?format=csvdata&startPeriod=2010-01';
  const res = await fetch(url);
  if (!res.ok) throw new Error(`ECB HTTP ${res.status}: ${res.statusText}`);
  const csv = await res.text();

  const rates = new Map();
  const lines = csv.trim().split('\n');
  // Parse CSV - find TIME_PERIOD and OBS_VALUE columns from header
  const header = lines[0].split(',');
  const timeIdx = header.findIndex(h => h.includes('TIME_PERIOD'));
  const valueIdx = header.findIndex(h => h.includes('OBS_VALUE'));

  for (let i = 1; i < lines.length; i++) {
    const cols = lines[i].split(',');
    const period = cols[timeIdx];
    const value = parseFloat(cols[valueIdx]);
    if (period && !isNaN(value)) {
      rates.set(period, value);
    }
  }

  return rates;
}

async function fetchGoldEur() {
  // Fallback: get USD gold and convert via ECB EUR/USD rate
  const goldRes = await fetch('https://datahub.io/core/gold-prices/_r/-/data/monthly.csv');
  if (!goldRes.ok) throw new Error(`Gold HTTP ${goldRes.status}`);
  const goldCsv = await goldRes.text();

  const goldUsd = new Map();
  const lines = goldCsv.trim().split('\n');
  for (let i = 1; i < lines.length; i++) {
    const [dateRaw, valueStr] = lines[i].split(',');
    if (!dateRaw || !valueStr || dateRaw < '2010') continue;
    const value = parseFloat(valueStr);
    if (!isNaN(value)) goldUsd.set(dateRaw, value);
  }

  // Get EUR/USD rate
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
    if (period && !isNaN(value)) fxRates.set(period, value);
  }

  // ECB series EXR/M.USD.EUR.SP00.A gives USD per 1 EUR (e.g. 1.09)
  const entries = [];
  for (const [period, usdPrice] of goldUsd) {
    const usdPerEur = fxRates.get(period);
    if (usdPerEur) {
      const date = period.length === 7 ? `${period}-01` : period;
      entries.push({ date, value: Math.round(usdPrice / usdPerEur * 100) / 100 });
    }
  }

  return entries.sort((a, b) => a.date.localeCompare(b.date));
}

main().catch(console.error);
