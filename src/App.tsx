import { useState, useEffect, useMemo } from 'react';
import type { Timeframe, InflationMetric, LiveDataStatus, PricePoint, DeflatorPoint, AdjustedPricePoint, GoldPricePoint } from './lib/types';
import { interpolateMonthlyToDaily } from './lib/interpolateCpi';
import { adjustPrices } from './lib/adjustPrices';
import { convertToGold } from './lib/convertToGold';
import { fetchLivePrices } from './lib/fetchLivePrices';
import { fetchFred } from './lib/fetchFred';
import { stitchPrices, stitchDeflators } from './lib/stitchPrices';
import { filterByTimeframe } from './lib/filterByTimeframe';
import { parseUrlState, writeUrlState } from './lib/urlState';
import { Header } from './components/Header';
import { HeroPrice } from './components/HeroPrice';
import { Controls } from './components/Controls';
import { PriceChart } from './components/PriceChart';
import { Calculator } from './components/Calculator';
import { Explainer } from './components/Explainer';
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

const initial = parseUrlState();

export default function App() {
  const [anchorYear, setAnchorYear] = useState(initial.anchor ?? 2015);
  const [timeframe, setTimeframe] = useState<Timeframe>(initial.tf ?? 'ALL');
  const [metric, setMetric] = useState<InflationMetric>(initial.metric ?? 'CPI');
  const [logScale, setLogScale] = useState(initial.log ?? false);
  const [livePrices, setLivePrices] = useState<PricePoint[]>([]);
  const [liveGold, setLiveGold] = useState<DeflatorPoint[]>([]);
  const [liveDxy, setLiveDxy] = useState<DeflatorPoint[]>([]);
  const [liveM2, setLiveM2] = useState<DeflatorPoint[]>([]);
  const [liveDataStatus, setLiveDataStatus] = useState<LiveDataStatus>('none');

  // 1. Fetch all live data on mount
  useEffect(() => {
    Promise.all([
      fetchLivePrices(),
      fetchFred('GOLDAMGBD228NLBM', '2025-01-01'),
      fetchFred('DTWEXBGS', '2025-06-01'),
      fetchFred('M2SL', '2025-06-01'),
    ]).then(([btcPrices, goldData, dxyData, m2Data]) => {
      if (btcPrices.length > 0) setLivePrices(btcPrices);
      if (goldData.length > 0) setLiveGold(goldData);
      if (dxyData.length > 0) setLiveDxy(dxyData);
      if (m2Data.length > 0) setLiveM2(m2Data);

      const successes = [btcPrices, goldData, dxyData, m2Data].filter(
        (d) => d.length > 0
      ).length;
      setLiveDataStatus(
        successes === 4 ? 'all' : successes > 0 ? 'partial' : 'none'
      );
    });
  }, []);

  // 2. Sync state → URL
  useEffect(() => {
    writeUrlState({ metric, anchor: anchorYear, tf: timeframe, log: logScale });
  }, [metric, anchorYear, timeframe, logScale]);

  // 3. Stitch static + live
  const stitchedPrices = useMemo(
    () => stitchPrices(staticBtc, livePrices),
    [livePrices]
  );
  const mergedGold = useMemo(
    () => stitchDeflators(staticGold, liveGold),
    [liveGold]
  );
  const mergedDxy = useMemo(
    () => stitchDeflators(staticDxy, liveDxy),
    [liveDxy]
  );
  const mergedM2 = useMemo(
    () => stitchDeflators(staticM2, liveM2),
    [liveM2]
  );

  // 4. Interpolate monthly data to daily
  const dailyCpi = useMemo(() => interpolateMonthlyToDaily(staticCpi), []);
  const dailyM2 = useMemo(() => interpolateMonthlyToDaily(mergedM2), [mergedM2]);
  const dailyGold = useMemo(() => interpolateMonthlyToDaily(mergedGold), [mergedGold]);
  // DXY is already daily — build a forward-filled Map
  const dailyDxy = useMemo(() => {
    const map = new Map<string, number>();
    for (const d of mergedDxy) {
      map.set(d.date, d.value);
    }
    // Extend 90 days past last point
    if (mergedDxy.length > 0) {
      const last = mergedDxy[mergedDxy.length - 1];
      const lastTime = new Date(last.date).getTime();
      for (let i = 1; i <= 90; i++) {
        const date = new Date(lastTime + i * 86_400_000);
        const dateStr = date.toISOString().slice(0, 10);
        if (!map.has(dateStr)) map.set(dateStr, last.value);
      }
    }
    return map;
  }, [mergedDxy]);

  // 5. Compute adjusted/converted data based on metric
  const processedData = useMemo((): AdjustedPricePoint[] | GoldPricePoint[] => {
    if (metric === 'GOLD') {
      return convertToGold(stitchedPrices, dailyGold);
    }
    const deflator = metric === 'CPI' ? dailyCpi : metric === 'M2' ? dailyM2 : dailyDxy;
    return adjustPrices(stitchedPrices, deflator, anchorYear);
  }, [stitchedPrices, metric, anchorYear, dailyCpi, dailyM2, dailyGold, dailyDxy]);

  // 6. Filter by timeframe
  const filteredData = useMemo(
    () => filterByTimeframe(processedData as (AdjustedPricePoint | GoldPricePoint)[], timeframe),
    [processedData, timeframe]
  );

  // 7. Latest point for hero
  const latestPoint = filteredData.length > 0
    ? filteredData[filteredData.length - 1]
    : null;

  // 8. Shock stats for explainer (since 2020-01-01)
  const shockStats = useMemo(() => {
    const ref = '2020-01-01';
    const today = stitchedPrices.length > 0 ? stitchedPrices[stitchedPrices.length - 1].date : null;

    // Dollar purchasing power loss via CPI
    const cpiRef = dailyCpi.get(ref);
    const cpiNow = today ? dailyCpi.get(today) : undefined;
    const dollarLoss = cpiRef && cpiNow ? 1 - cpiRef / cpiNow : null;

    // BTC nominal gain
    const btcRef = stitchedPrices.find((p) => p.date >= ref);
    const btcNow = stitchedPrices.length > 0 ? stitchedPrices[stitchedPrices.length - 1] : null;
    const btcNominalGain = btcRef && btcNow ? btcNow.price / btcRef.price : null;

    // BTC CPI-adjusted gain
    const btcRealGain =
      btcNominalGain !== null && cpiRef && cpiNow
        ? btcNominalGain * (cpiRef / cpiNow)
        : null;

    // M2 increase
    const m2Ref = dailyM2.get(ref);
    const m2Now = today ? dailyM2.get(today) : undefined;
    const m2Increase = m2Ref && m2Now ? (m2Now - m2Ref) / m2Ref : null;

    // BTC in gold terms change
    const goldRef = dailyGold.get(ref);
    const goldNow = today ? dailyGold.get(today) : undefined;
    const btcGoldChange =
      btcRef && btcNow && goldRef && goldNow
        ? (btcNow.price / goldNow) / (btcRef.price / goldRef)
        : null;

    return { dollarLoss, btcNominalGain, btcRealGain, m2Increase, btcGoldChange };
  }, [stitchedPrices, dailyCpi, dailyM2, dailyGold]);

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
      <Calculator prices={stitchedPrices} cpiMap={dailyCpi} m2Map={dailyM2} goldMap={dailyGold} />
      <Explainer stats={shockStats} />
      <Footer liveDataStatus={liveDataStatus} />
    </>
  );
}
