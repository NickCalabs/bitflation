import { useState, useEffect, useMemo } from 'react';
import type { Timeframe, InflationMetric, PricePoint, DeflatorPoint, AdjustedPricePoint, GoldPricePoint } from './lib/types';
import { interpolateMonthlyToDaily } from './lib/interpolateCpi';
import { adjustPrices } from './lib/adjustPrices';
import { convertToGold } from './lib/convertToGold';
import { fetchLivePrices } from './lib/fetchLivePrices';
import { stitchPrices } from './lib/stitchPrices';
import { filterByTimeframe } from './lib/filterByTimeframe';
import { Header } from './components/Header';
import { HeroPrice } from './components/HeroPrice';
import { Controls } from './components/Controls';
import { PriceChart } from './components/PriceChart';
import { Footer } from './components/Footer';

import staticBtcData from './data/btc-daily.json';
import staticCpiData from './data/cpi-monthly.json';
import staticM2Data from './data/m2-monthly.json';
import staticGoldData from './data/gold-monthly.json';
import staticDxyData from './data/dxy-daily.json';

const staticBtc = staticBtcData as PricePoint[];
const staticCpi = staticCpiData as DeflatorPoint[];
const staticM2 = staticM2Data as DeflatorPoint[];
const staticGold = staticGoldData as DeflatorPoint[];
const staticDxy = staticDxyData as DeflatorPoint[];

export default function App() {
  const [anchorYear, setAnchorYear] = useState(2015);
  const [timeframe, setTimeframe] = useState<Timeframe>('ALL');
  const [metric, setMetric] = useState<InflationMetric>('CPI');
  const [logScale, setLogScale] = useState(false);
  const [livePrices, setLivePrices] = useState<PricePoint[]>([]);
  const [hasLiveData, setHasLiveData] = useState(false);

  // 1. Fetch live prices on mount
  useEffect(() => {
    fetchLivePrices().then((prices) => {
      if (prices.length > 0) {
        setLivePrices(prices);
        setHasLiveData(true);
      }
    });
  }, []);

  // 2. Stitch static + live
  const stitchedPrices = useMemo(
    () => stitchPrices(staticBtc, livePrices),
    [livePrices]
  );

  // 3. Interpolate monthly data to daily (each runs once)
  const dailyCpi = useMemo(() => interpolateMonthlyToDaily(staticCpi), []);
  const dailyM2 = useMemo(() => interpolateMonthlyToDaily(staticM2), []);
  const dailyGold = useMemo(() => interpolateMonthlyToDaily(staticGold), []);
  // DXY is already daily — just build a Map
  const dailyDxy = useMemo(() => {
    const map = new Map<string, number>();
    for (const d of staticDxy) {
      map.set(d.date, d.value);
    }
    // Extend 90 days past last point
    if (staticDxy.length > 0) {
      const last = staticDxy[staticDxy.length - 1];
      const lastTime = new Date(last.date).getTime();
      for (let i = 1; i <= 90; i++) {
        const date = new Date(lastTime + i * 86_400_000);
        const dateStr = date.toISOString().slice(0, 10);
        if (!map.has(dateStr)) map.set(dateStr, last.value);
      }
    }
    return map;
  }, []);

  // 4. Compute adjusted/converted data based on metric
  const processedData = useMemo((): AdjustedPricePoint[] | GoldPricePoint[] => {
    if (metric === 'GOLD') {
      return convertToGold(stitchedPrices, dailyGold);
    }
    const deflator = metric === 'CPI' ? dailyCpi : metric === 'M2' ? dailyM2 : dailyDxy;
    return adjustPrices(stitchedPrices, deflator, anchorYear);
  }, [stitchedPrices, metric, anchorYear, dailyCpi, dailyM2, dailyGold, dailyDxy]);

  // 5. Filter by timeframe
  const filteredData = useMemo(
    () => filterByTimeframe(processedData as (AdjustedPricePoint | GoldPricePoint)[], timeframe),
    [processedData, timeframe]
  );

  // 6. Latest point for hero
  const latestPoint = filteredData.length > 0
    ? filteredData[filteredData.length - 1]
    : null;

  return (
    <>
      <Header />
      <HeroPrice latestPoint={latestPoint} anchorYear={anchorYear} metric={metric} />
      <Controls
        anchorYear={anchorYear}
        onAnchorYearChange={setAnchorYear}
        timeframe={timeframe}
        onTimeframeChange={setTimeframe}
        metric={metric}
        onMetricChange={setMetric}
        logScale={logScale}
        onLogScaleChange={setLogScale}
      />
      <PriceChart data={filteredData} metric={metric} logScale={logScale} />
      <Footer hasLiveData={hasLiveData} />
    </>
  );
}
