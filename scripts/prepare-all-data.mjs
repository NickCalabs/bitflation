import { execSync } from 'child_process';
import { dirname } from 'path';
import { fileURLToPath } from 'url';

const __dirname = dirname(fileURLToPath(import.meta.url));

const SCRIPTS = [
  // USD
  'prepare-btc-data.mjs',
  'prepare-cpi-data.mjs',
  'prepare-m2-data.mjs',
  'prepare-gold-data.mjs',
  'prepare-dxy-data.mjs',
  // EUR
  'prepare-btc-data-eur.mjs',
  'prepare-cpi-data-eur.mjs',
  'prepare-m2-data-eur.mjs',
  'prepare-gold-data-eur.mjs',
  // IDR
  'prepare-btc-data-idr.mjs',
  'prepare-cpi-data-idr.mjs',
  'prepare-m2-data-idr.mjs',
  'prepare-gold-data-idr.mjs',
];

let failed = false;

for (const script of SCRIPTS) {
  console.log(`\n${'='.repeat(60)}`);
  console.log(`Running: ${script}`);
  console.log('='.repeat(60));

  try {
    execSync(`node ${__dirname}/${script}`, { stdio: 'inherit' });
  } catch (err) {
    console.error(`\nFAILED: ${script}`);
    console.error(err.message);
    failed = true;
    break; // Fail-fast: stop on first failure
  }
}

if (failed) {
  console.error('\nData refresh FAILED. Fix the issue above and re-run.');
  process.exit(1);
} else {
  console.log('\n' + '='.repeat(60));
  console.log('All data scripts completed successfully!');
  console.log('='.repeat(60));
}
