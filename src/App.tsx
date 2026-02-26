import { useState, useEffect, useMemo, useCallback, useRef } from 'react';
import type { Timeframe, InflationMetric, DeflatorMetric, LiveDataStatus, PricePoint, DeflatorPoint, AdjustedPricePoint, GoldPricePoint, ComparisonAsset, ComparisonPoint, MultiMetricPoint, ViewMode, CurrencyCode } from './lib/types';
import { interpolateMonthlyToDaily } from './lib/interpolateCpi';
import { adjustPrices } from './lib/adjustPrices';
import { computeBitflationIndex } from './lib/computeBitflationIndex';
import { convertToGold } from './lib/convertToGold';
import { fetchLivePrices } from './lib/fetchLivePrices';
import { fetchFred } from './lib/fetchFred';
import { stitchPrices, stitchDeflators } from './lib/stitchPrices';
import { filterByTimeframe } from './lib/filterByTimeframe';
import { parseUrlState, writeUrlState } from './lib/urlState';
import { normalizeToIndex } from './lib/normalizeToIndex';
import { interpolatePricesToDaily } from './lib/interpolatePricesToDaily';
import { setFormatterCurrency } from './lib/formatters';
import { loadCurrencyData, type CurrencyData } from './lib/loadCurrencyData';
import { CURRENCIES, DEFAULT_CURRENCY } from './lib/currencies';
import { Header } from './components/Header';
import { HeroPrice } from './components/HeroPrice';
import { Controls } from './components/Controls';
import { PriceChart } from './components/PriceChart';
import { Calculator } from './components/Calculator';
import { Explainer } from './components/Explainer';
import { Footer } from './components/Footer';

const initial = parseUrlState();

export default function App() {
  const [currency, setCurrency] = useState<CurrencyCode>(initial.cur ?? DEFAULT_CURRENCY);
  const [anchorYear, setAnchorYear] = useState(initial.anchor ?? 2015);
  const [timeframe, setTimeframe] = useState<Timeframe>(initial.tf ?? 'ALL');
  const [selectedMetrics, setSelectedMetrics] = useState<InflationMetric[]>(initial.metrics ?? ['BFI']);
  const [logScale, setLogScale] = useState(initial.log ?? false);
  const [showEvents, setShowEvents] = useState(initial.events ?? false);
  const [showGap, setShowGap] = useState(initial.gap ?? true);
  const [compareAssets, setCompareAssets] = useState<ComparisonAsset[]>(initial.compare ?? []);
  const [viewMode, setViewMode] = useState<ViewMode>(initial.view ?? 'compare');
  const [staticData, setStaticData] = useState<CurrencyData | null>(null);
  const [livePrices, setLivePrices] = useState<PricePoint[]>([]);
  const [liveDxy, setLiveDxy] = useState<DeflatorPoint[]>([]);
  const [liveM2, setLiveM2] = useState<DeflatorPoint[]>([]);
  const [liveSp500, setLiveSp500] = useState<DeflatorPoint[]>([]);
  const [liveDataStatus, setLiveDataStatus] = useState<LiveDataStatus>('none');
  const [dataReady, setDataReady] = useState(false);

  const currencyConfig = CURRENCIES[currency];
  const prevCurrencyRef = useRef(currency);

  // Derived state
  const primaryMetric = selectedMetrics[0];
  const isGoldMode = selectedMetrics.length === 1 && selectedMetrics[0] === 'GOLD';
  const deflatorMetrics = selectedMetrics.filter((m): m is DeflatorMetric => m !== 'GOLD');

  // Validate metrics/compare when currency changes
  const handleCurrencyChange = useCallback((newCurrency: CurrencyCode) => {
    const config = CURRENCIES[newCurrency];

    // Filter selected metrics to only those available for the new currency
    setSelectedMetrics(prev => {
      const valid = prev.filter(m => config.availableMetrics.includes(m));
      return valid.length > 0 ? valid : ['BFI'];
    });

    // Filter compare assets to only those available
    setCompareAssets(prev => prev.filter(a => config.availableCompareAssets.includes(a)));

    setCurrency(newCurrency);
  }, []);

  // 1. Load static data + fetch live data — dataReady gates all rendering
  useEffect(() => {
    let cancelled = false;

    async function load() {
      setDataReady(false);

      // Update formatters for the new currency
      setFormatterCurrency(currencyConfig.locale, currency);

      // Load static data
      let data: CurrencyData;
      try {
        data = await loadCurrencyData(currency);
      } catch (err) {
        console.warn(`Failed to load static data for ${currency}, reverting`, err);
        // Revert to previous currency if static data fails
        if (prevCurrencyRef.current !== currency) {
          setCurrency(prevCurrencyRef.current);
        }
        setDataReady(true); // Unblock UI — user will see empty/previous state, not infinite skeleton
        return;
      }

      if (cancelled) return;

      // Reset live data
      setLivePrices([]);
      setLiveDxy([]);
      setLiveM2([]);
      setLiveSp500([]);

      setStaticData(data);
      prevCurrencyRef.current = currency;

      // Build live data fetch promises
      const fetches: Promise<unknown>[] = [
        fetchLivePrices(currencyConfig.coingeckoVsCurrency, currencyConfig.blockchainTickerKey),
      ];

      // Fetch live DXY if available
      const dxyFetch = currencyConfig.fredSeries.dxy
        ? fetchFred(currencyConfig.fredSeries.dxy, currencyConfig.fredLiveStartDate)
        : Promise.resolve([] as DeflatorPoint[]);
      fetches.push(dxyFetch);

      // Fetch live M2 if available
      const m2Fetch = currencyConfig.fredSeries.m2
        ? fetchFred(currencyConfig.fredSeries.m2, currencyConfig.fredLiveStartDate)
        : Promise.resolve([] as DeflatorPoint[]);
      fetches.push(m2Fetch);

      // Fetch live SP500 if available
      const sp500Fetch = currencyConfig.fredSeries.sp500
        ? fetchFred(currencyConfig.fredSeries.sp500, currencyConfig.fredLiveStartDate)
        : Promise.resolve([] as DeflatorPoint[]);
      fetches.push(sp500Fetch);

      Promise.all(fetches).then(([btcPrices, dxyData, m2Data, sp500Data]) => {
        if (cancelled) return;
        const btc = btcPrices as PricePoint[];
        const dxy = dxyData as DeflatorPoint[];
        const m2 = m2Data as DeflatorPoint[];
        const sp500 = sp500Data as DeflatorPoint[];

        if (btc.length > 0) setLivePrices(btc);
        if (dxy.length > 0) setLiveDxy(dxy);
        if (m2.length > 0) setLiveM2(m2);
        if (sp500.length > 0) setLiveSp500(sp500);

        // Count successes for live data status (BTC + relevant fetches)
        const relevantFetches: { length: number }[] = [btc];
        if (currencyConfig.fredSeries.dxy) relevantFetches.push(dxy);
        if (currencyConfig.fredSeries.m2) relevantFetches.push(m2);
        const successes = relevantFetches.filter(d => d.length > 0).length;
        setLiveDataStatus(
          successes === relevantFetches.length ? 'all' : successes > 0 ? 'partial' : 'none'
        );
        setDataReady(true);
      }, () => {
        if (cancelled) return;
        setDataReady(true);
      });
    }

    load();
    return () => { cancelled = true; };
  }, [currency, currencyConfig]);

  // 2. Sync state → URL
  useEffect(() => {
    writeUrlState({ metrics: selectedMetrics, anchor: anchorYear, tf: timeframe, log: logScale, events: showEvents, compare: compareAssets, gap: showGap, view: viewMode, cur: currency });
  }, [selectedMetrics, anchorYear, timeframe, logScale, showEvents, compareAssets, showGap, viewMode, currency]);

  // 3. Stitch static + live
  const stitchedPrices = useMemo(
    () => staticData ? stitchPrices(staticData.btc, livePrices) : [],
    [staticData, livePrices]
  );
  const mergedDxy = useMemo(
    () => staticData ? stitchDeflators(staticData.dxy, liveDxy) : [],
    [staticData, liveDxy]
  );
  const mergedM2 = useMemo(
    () => staticData ? stitchDeflators(staticData.m2, liveM2) : [],
    [staticData, liveM2]
  );

  // 4. Interpolate monthly data to daily
  const dailyCpi = useMemo(
    () => staticData ? interpolateMonthlyToDaily(staticData.cpi) : new Map<string, number>(),
    [staticData]
  );
  const dailyM2 = useMemo(() => interpolateMonthlyToDaily(mergedM2), [mergedM2]);
  const dailyGold = useMemo(
    () => staticData ? interpolateMonthlyToDaily(staticData.gold) : new Map<string, number>(),
    [staticData]
  );
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

  // 4a. Compute BFI deflator (depends on anchor year)
  const dailyBfi = useMemo(
    () => computeBitflationIndex(dailyCpi, dailyM2, anchorYear),
    [dailyCpi, dailyM2, anchorYear]
  );

  // 4b. Comparison asset data
  const stitchedSp500 = useMemo(() => {
    if (!staticData) return [];
    const liveSp500AsPrices: PricePoint[] = liveSp500.map((d) => ({
      date: d.date,
      price: d.value,
    }));
    return stitchPrices(staticData.sp500, liveSp500AsPrices);
  }, [staticData, liveSp500]);

  const dailyHousing = useMemo(
    () => staticData ? interpolatePricesToDaily(staticData.housing) : [],
    [staticData]
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
  const DEFLATOR_LOOKUP = useMemo((): Record<DeflatorMetric, Map<string, number>> => ({
    BFI: dailyBfi, CPI: dailyCpi, M2: dailyM2, DXY: dailyDxy,
  }), [dailyBfi, dailyCpi, dailyM2, dailyDxy]);

  const processedData = useMemo((): AdjustedPricePoint[] | GoldPricePoint[] => {
    if (primaryMetric === 'GOLD') {
      return convertToGold(stitchedPrices, dailyGold);
    }
    const deflator = DEFLATOR_LOOKUP[primaryMetric as DeflatorMetric];
    return adjustPrices(stitchedPrices, deflator, anchorYear);
  }, [stitchedPrices, primaryMetric, anchorYear, DEFLATOR_LOOKUP, dailyGold]);

  // 5b. Multi-metric data (for PriceChart when multiple deflators selected)
  const DEFLATOR_MAP_MEMO = useMemo((): Record<DeflatorMetric, Map<string, number>> => ({
    BFI: dailyBfi, CPI: dailyCpi, M2: dailyM2, DXY: dailyDxy,
  }), [dailyBfi, dailyCpi, dailyM2, dailyDxy]);

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

    // Currency purchasing power loss via CPI
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

    // BFI purchasing power loss (blended CPI + M2)
    const m2Ref = dailyM2.get(ref);
    const m2Now = today ? dailyM2.get(today) : undefined;
    const bfiGrowth2020 = cpiRef && cpiNow && m2Ref && m2Now
      ? 0.5 * (cpiNow / cpiRef) + 0.5 * (m2Now / m2Ref)
      : null;
    const bfiLoss = bfiGrowth2020 !== null ? 1 - (1 / bfiGrowth2020) : null;

    // BTC in gold terms change
    const goldRef = dailyGold.get(ref);
    const goldNow = today ? dailyGold.get(today) : undefined;
    const btcGoldChange =
      btcRef && btcNow && goldRef && goldNow
        ? (btcNow.price / goldNow) / (btcRef.price / goldRef)
        : null;

    return { dollarLoss, btcNominalGain, btcRealGain, bfiLoss, btcGoldChange };
  }, [stitchedPrices, dailyCpi, dailyM2, dailyGold]);

  // 9. Comparison data pipeline (normalized to index 100)
  const comparisonData = useMemo((): ComparisonPoint[] | null => {
    if (compareAssets.length === 0 || isGoldMode) return null;

    const deflator = DEFLATOR_LOOKUP[primaryMetric as DeflatorMetric];

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
  }, [compareAssets, primaryMetric, isGoldMode, anchorYear, timeframe, stitchedPrices, stitchedSp500, goldAsPrices, dailyHousing, DEFLATOR_LOOKUP]);

  return (
    <>
      <Header currency={currency} currencyConfig={currencyConfig} onCurrencyChange={handleCurrencyChange} />
      <HeroPrice latestPoint={dataReady ? latestPoint : null} anchorYear={anchorYear} metric={primaryMetric} secondaryMetrics={secondaryHeroMetrics} viewMode={viewMode} currencyCode={currency} />
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
        viewMode={viewMode}
        onViewModeChange={setViewMode}
        currencyConfig={currencyConfig}
      />
      {dataReady && (
        <>
          <PriceChart
            data={filteredData}
            selectedMetrics={selectedMetrics}
            logScale={logScale}
            showEvents={showEvents}
            showGap={showGap}
            multiMetricData={filteredMultiMetric}
            comparisonData={comparisonData}
            compareAssets={compareAssets}
            viewMode={viewMode}
            currencyConfig={currencyConfig}
          />
          <Calculator prices={stitchedPrices} cpiMap={dailyCpi} m2Map={dailyM2} goldMap={dailyGold} currencyCode={currency} />
          <Explainer stats={shockStats} currencyConfig={currencyConfig} />
        </>
      )}
      <Footer liveDataStatus={liveDataStatus} currencyConfig={currencyConfig} />
    </>
  );
}
