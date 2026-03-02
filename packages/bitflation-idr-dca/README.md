# @predator_757/bitflation-idr-dca

IDR DCA (dollar-cost averaging) simulator: React component and logic for comparing regular savings into a time deposit, IHSG (Indonesian stock index), gold, and Bitcoin. Includes bundled historical JSON data.

## Install

```bash
npm install @predator_757/bitflation-idr-dca
```

Peer dependencies: `react`, `react-dom`, `recharts`. Your app must provide them.

## Usage

### Drop-in component

```tsx
import { IdrDcaCalculator } from '@predator_757/bitflation-idr-dca';

function App() {
  return <IdrDcaCalculator />;
}
```

The component loads its own data (BTC, IHSG, gold, deposito rates, CPI) from the package. Ensure your bundler can resolve JSON and CSS modules from `node_modules` (Vite, Webpack, Parcel do by default).

### Theming

The UI uses CSS variables. Your app should define at least:

- `--border`, `--text-primary`, `--text-secondary`, `--text-muted`
- `--bg-card`, `--bg-control`
- `--accent-indigo`, `--accent-green`, `--accent-red`
- `--radius`, `--font-mono`

A dark theme that sets these will work out of the box.

### Use simulation only

```ts
import {
  runDcaBtc,
  runDcaIhsg,
  runDcaGold,
  runDcaDeposito,
  type DcaInputs,
  type DcaResult,
  type DcaFrequency,
  type DailyPoint,
} from '@predator_757/bitflation-idr-dca';

// Load your own data or use the bundled data (see package dist/data/)
const inputs: DcaInputs = {
  amountPerPeriodIdr: 100_000,
  frequency: 'monthly',
  yearsAgo: 5,
  btcDaily: [...],
  ihsgDaily: [...],
  goldDaily: [...],
  depositoRates: [...],
};

const btcResult = runDcaBtc(inputs);
const ihsgResult = runDcaIhsg(inputs);
// ...
```

## Data

The package ships with historical JSON in `dist/data/`:

- `btc-daily.json` — daily BTC prices (IDR)
- `ihsg-daily.json` — IHSG (^JKSE) daily
- `gold-idr-daily.json` — gold IDR per gram (daily)
- `deposito-rates.json` — BI time-deposit rate ranges
- `cpi-monthly.json` — Indonesian CPI for inflation note

To refresh data, use the scripts from the [bitflation](https://github.com/your-org/bitflation) repo and copy the generated files into your app or a fork of this package.

## License

MIT
