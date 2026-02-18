import { useState, useEffect, useMemo } from 'react';
import type { Timeframe, InflationMetric, DeflatorMetric, LiveDataStatus, PricePoint, DeflatorPoint, AdjustedPricePoint, GoldPricePoint, ComparisonAsset, ComparisonPoint, MultiMetricPoint } from './lib/types';
import { interpolateMonthlyToDaily } from './lib/interpolateCpi';
import { adjustPrices } from './lib/adjustPrices';
import { convertToGold } from './lib/convertToGold';
import { fetchLivePrices } from './lib/fetchLivePrices';
import { fetchFred } from './lib/fetchFred';
import { stitchPrices, stitchDeflators } from './lib/stitchPrices';
import { filterByTimeframe } from './lib/filterByTimeframe';
import { parseUrlState, writeUrlState } from './lib/urlState';
import { normalizeToIndex } from './lib/normalizeToIndex';
import { interpolatePricesToDaily } from './lib/interpolatePricesToDaily';
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
import staticSp500Data from './data/sp500-daily.json';
import staticHousingData from './data/housing-monthly.json';

const staticBtc = staticBtcData as PricePoint[];
const staticCpi = staticCpiData as DeflatorPoint[];
const staticM2 = staticM2Data as DeflatorPoint[];
const staticGold = staticGoldData as DeflatorPoint[];
const staticDxy = staticDxyData as DeflatorPoint[];
const staticSp500 = staticSp500Data as PricePoint[];
const staticHousing = staticHousingData as PricePoint[];

const initial = parseUrlState();

export default function App() {
  const [anchorYear, setAnchorYear] = useState(initial.anchor ?? 2015);
  const [timeframe, setTimeframe] = useState<Timeframe>(initial.tf ?? 'ALL');
  const [selectedMetrics, setSelectedMetrics] = useState<InflationMetric[]>(initial.metrics ?? ['CPI']);
  const [logScale, setLogScale] = useState(initial.log ?? false);
  const [showEvents, setShowEvents] = useState(initial.events ?? false);
  const [showGap, setShowGap] = useState(initial.gap ?? true);
  const [compareAssets, setCompareAssets] = useState<ComparisonAsset[]>(initial.compare ?? []);
  const [livePrices, setLivePrices] = useState<PricePoint[]>([]);
  const [liveDxy, setLiveDxy] = useState<DeflatorPoint[]>([]);
  const [liveM2, setLiveM2] = useState<DeflatorPoint[]>([]);
  const [liveSp500, setLiveSp500] = useState<DeflatorPoint[]>([]);
  const [liveDataStatus, setLiveDataStatus] = useState<LiveDataStatus>('none');

  // Derived state
  const primaryMetric = selectedMetrics[0];
  const isGoldMode = selectedMetrics.length === 1 && selectedMetrics[0] === 'GOLD';
  const deflatorMetrics = selectedMetrics.filter((m): m is DeflatorMetric => m !== 'GOLD');

  // 1. Fetch all live data on mount
  useEffect(() => {
    Promise.all([
      fetchLivePrices(),
      fetchFred('DTWEXBGS', '2025-06-01'),
      fetchFred('M2SL', '2025-06-01'),
      fetchFred('SP500', '2025-06-01'),
    ]).then(([btcPrices, dxyData, m2Data, sp500Data]) => {
      if (btcPrices.length > 0) setLivePrices(btcPrices);
      if (dxyData.length > 0) setLiveDxy(dxyData);
      if (m2Data.length > 0) setLiveM2(m2Data);
      if (sp500Data.length > 0) setLiveSp500(sp500Data);

      const successes = [btcPrices, dxyData, m2Data].filter(
        (d) => d.length > 0
      ).length;
      setLiveDataStatus(
        successes === 3 ? 'all' : successes > 0 ? 'partial' : 'none'
      );
    });
  }, []);

  // 2. Sync state → URL
  useEffect(() => {
    writeUrlState({ metrics: selectedMetrics, anchor: anchorYear, tf: timeframe, log: logScale, events: showEvents, compare: compareAssets, gap: showGap });
  }, [selectedMetrics, anchorYear, timeframe, logScale, showEvents, compareAssets, showGap]);

  // 3. Stitch static + live
  const stitchedPrices = useMemo(
    () => stitchPrices(staticBtc, livePrices),
    [livePrices]
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
  const dailyGold = useMemo(() => interpolateMonthlyToDaily(staticGold), []);
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

  // 4b. Comparison asset data
  const stitchedSp500 = useMemo(() => {
    const liveSp500AsPrices: PricePoint[] = liveSp500.map((d) => ({
      date: d.date,
      price: d.value,
    }));
    return stitchPrices(staticSp500, liveSp500AsPrices);
  }, [liveSp500]);

  const dailyHousing = useMemo(
    () => interpolatePricesToDaily(staticHousing),
    []
  );

  // Convert dailyGold Map → PricePoint[] for use as comparison asset
  const goldAsPrices = useMemo((): PricePoint[] => {
    const result: PricePoint[] = [];
    for (const [date, price] of dailyGold) {
      result.push({ date, price });
    }
    result.sort((a, b) => a.date.localeCompare(b.date));
    return result;
  }, [dailyGold]);

  // 5. Compute adjusted/converted data based on primary metric (for HeroPrice)
  const processedData = useMemo((): AdjustedPricePoint[] | GoldPricePoint[] => {
    if (primaryMetric === 'GOLD') {
      return convertToGold(stitchedPrices, dailyGold);
    }
    const deflator = primaryMetric === 'CPI' ? dailyCpi : primaryMetric === 'M2' ? dailyM2 : dailyDxy;
    return adjustPrices(stitchedPrices, deflator, anchorYear);
  }, [stitchedPrices, primaryMetric, anchorYear, dailyCpi, dailyM2, dailyGold, dailyDxy]);

  // 5b. Multi-metric data (for PriceChart when multiple deflators selected)
  const DEFLATOR_MAP_MEMO = useMemo((): Record<DeflatorMetric, Map<string, number>> => ({
    CPI: dailyCpi, M2: dailyM2, DXY: dailyDxy,
  }), [dailyCpi, dailyM2, dailyDxy]);

  const multiMetricData = useMemo((): MultiMetricPoint[] | null => {
    if (isGoldMode || deflatorMetrics.length === 0) return null;

    // Run adjustPrices for each selected deflator
    const series = deflatorMetrics.map(m => ({
      metric: m,
      data: new Map(adjustPrices(stitchedPrices, DEFLATOR_MAP_MEMO[m], anchorYear).map(p => [p.date, p])),
    }));

    // Primary series drives the date list
    const primarySeries = series[0];
    const result: MultiMetricPoint[] = [];

    for (const [date, point] of primarySeries.data) {
      const mp: MultiMetricPoint = { date, nominalPrice: point.nominalPrice };

      for (const { metric: m, data } of series) {
        const adjusted = data.get(date);
        if (!adjusted) continue;
        const key = `${m.toLowerCase()}Adjusted` as keyof MultiMetricPoint;
        (mp as unknown as Record<string, number>)[key] = adjusted.adjustedPrice;
      }

      // Inflation gap = nominal - primary adjusted
      const primaryKey = `${deflatorMetrics[0].toLowerCase()}Adjusted` as keyof MultiMetricPoint;
      const primaryVal = mp[primaryKey] as number | undefined;
      if (primaryVal !== undefined) {
        mp.inflationGap = mp.nominalPrice - primaryVal;
      }

      result.push(mp);
    }

    return result;
  }, [isGoldMode, deflatorMetrics, stitchedPrices, anchorYear, DEFLATOR_MAP_MEMO]);

  // 6. Filter by timeframe
  const filteredData = useMemo(
    () => filterByTimeframe(processedData as (AdjustedPricePoint | GoldPricePoint)[], timeframe),
    [processedData, timeframe]
  );

  const filteredMultiMetric = useMemo(() => {
    if (!multiMetricData) return null;
    return filterByTimeframe(multiMetricData, timeframe);
  }, [multiMetricData, timeframe]);

  // 7. Latest point for hero
  const latestPoint = filteredData.length > 0
    ? filteredData[filteredData.length - 1]
    : null;

  // 7b. Secondary hero metrics
  const secondaryHeroMetrics = useMemo(() => {
    if (!filteredMultiMetric || deflatorMetrics.length <= 1) return undefined;
    const last = filteredMultiMetric[filteredMultiMetric.length - 1];
    if (!last) return undefined;
    return deflatorMetrics.slice(1).map(m => {
      const key = `${m.toLowerCase()}Adjusted` as keyof MultiMetricPoint;
      const val = last[key] as number;
      return { label: m, adjustedPrice: val, diff: (val - last.nominalPrice) / last.nominalPrice };
    }).filter(s => s.adjustedPrice !== undefined);
  }, [filteredMultiMetric, deflatorMetrics]);

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

  // 9. Comparison data pipeline (normalized to index 100)
  const comparisonData = useMemo((): ComparisonPoint[] | null => {
    if (compareAssets.length === 0 || isGoldMode) return null;

    const deflator = primaryMetric === 'CPI' ? dailyCpi : primaryMetric === 'M2' ? dailyM2 : dailyDxy;

    // BTC adjusted + filtered
    const btcAdjusted = adjustPrices(stitchedPrices, deflator, anchorYear);
    const btcFiltered = filterByTimeframe(btcAdjusted, timeframe);

    // Build each comparison asset's adjusted series
    const assetSeries: { key: ComparisonAsset; data: AdjustedPricePoint[] }[] = [];

    for (const asset of compareAssets) {
      let prices: PricePoint[];
      if (asset === 'sp500') {
        prices = stitchedSp500;
      } else if (asset === 'gold') {
        prices = goldAsPrices;
      } else {
        prices = dailyHousing;
      }

      const adjusted = adjustPrices(prices, deflator, anchorYear);
      const filtered = filterByTimeframe(adjusted, timeframe);
      assetSeries.push({ key: asset, data: filtered });
    }

    return normalizeToIndex(btcFiltered, assetSeries);
  }, [compareAssets, primaryMetric, isGoldMode, anchorYear, timeframe, stitchedPrices, stitchedSp500, goldAsPrices, dailyHousing, dailyCpi, dailyM2, dailyDxy]);

  return (
    <>
      <Header />
      <HeroPrice latestPoint={latestPoint} anchorYear={anchorYear} metric={primaryMetric} secondaryMetrics={secondaryHeroMetrics} />
      <Controls
        anchorYear={anchorYear}
        onAnchorYearChange={setAnchorYear}
        timeframe={timeframe}
        onTimeframeChange={setTimeframe}
        selectedMetrics={selectedMetrics}
        onSelectedMetricsChange={setSelectedMetrics}
        logScale={logScale}
        onLogScaleChange={setLogScale}
        showEvents={showEvents}
        onShowEventsChange={setShowEvents}
        showGap={showGap}
        onShowGapChange={setShowGap}
        compareAssets={compareAssets}
        onCompareAssetsChange={setCompareAssets}
      />
      <PriceChart
        data={filteredData}
        selectedMetrics={selectedMetrics}
        logScale={logScale}
        showEvents={showEvents}
        showGap={showGap}
        multiMetricData={filteredMultiMetric}
        comparisonData={comparisonData}
        compareAssets={compareAssets}
      />
      <Calculator prices={stitchedPrices} cpiMap={dailyCpi} m2Map={dailyM2} goldMap={dailyGold} />
      <Explainer stats={shockStats} />
      <Footer liveDataStatus={liveDataStatus} />
    </>
  );
}
