import { ImageResponse } from "@cloudflare/pages-plugin-vercel-og/api";
import React from "react";

// Hardcoded CPI constants (update quarterly)
const CPI_ANCHOR_2015 = 237.017;
const CPI_CURRENT = 325.252; // Jan 2026
const FALLBACK_BTC_PRICE = 97000;

interface Env {
  ASSETS: Fetcher;
}

async function fetchBtcPrice(): Promise<number> {
  try {
    const res = await fetch(
      "https://api.coingecko.com/api/v3/simple/price?ids=bitcoin&vs_currencies=usd",
      { headers: { Accept: "application/json" } }
    );
    if (!res.ok) return FALLBACK_BTC_PRICE;
    const data = (await res.json()) as { bitcoin?: { usd?: number } };
    return data.bitcoin?.usd ?? FALLBACK_BTC_PRICE;
  } catch {
    return FALLBACK_BTC_PRICE;
  }
}

async function loadAsset(
  env: Env,
  path: string
): Promise<ArrayBuffer> {
  const res = await env.ASSETS.fetch(new URL(path, "https://placeholder.com"));
  return res.arrayBuffer();
}

function formatUsd(value: number): string {
  return new Intl.NumberFormat("en-US", {
    style: "currency",
    currency: "USD",
    maximumFractionDigits: 0,
  }).format(value);
}

export const onRequest: PagesFunction<Env> = async (context) => {
  const url = new URL(context.request.url);

  // Check cache
  const cache = caches.default;
  const cacheKey = new Request(url.toString(), context.request);
  const cached = await cache.match(cacheKey);
  if (cached) return cached;

  // Fetch live BTC price
  const nominalPrice = await fetchBtcPrice();
  const adjustedPrice = Math.round(
    nominalPrice * (CPI_ANCHOR_2015 / CPI_CURRENT)
  );
  const lossPercent = (
    ((nominalPrice - adjustedPrice) / nominalPrice) *
    100
  ).toFixed(1);

  // Load fonts + logo in parallel
  const [jetBrainsBold, interRegular, interBold, logoBuffer] =
    await Promise.all([
      loadAsset(context.env, "/fonts/JetBrainsMono-Bold.ttf"),
      loadAsset(context.env, "/fonts/Inter-Regular.ttf"),
      loadAsset(context.env, "/fonts/Inter-Bold.ttf"),
      loadAsset(context.env, "/og/bitflation-logo.png"),
    ]);

  // Convert logo to base64 data URI
  const logoBytes = new Uint8Array(logoBuffer);
  let logoBinary = "";
  for (let i = 0; i < logoBytes.length; i++) {
    logoBinary += String.fromCharCode(logoBytes[i]);
  }
  const logoBase64 = `data:image/png;base64,${btoa(logoBinary)}`;

  const response = new ImageResponse(
    (
      <div
        style={{
          display: "flex",
          flexDirection: "column",
          alignItems: "center",
          justifyContent: "center",
          width: "1200px",
          height: "630px",
          backgroundColor: "#0a0a0f",
          padding: "40px",
        }}
      >
        {/* Logo */}
        <img
          src={logoBase64}
          width={250}
          height={140}
          style={{ marginBottom: "24px" }}
        />

        {/* Adjusted price */}
        <div
          style={{
            display: "flex",
            alignItems: "baseline",
            fontFamily: "JetBrains Mono",
            fontSize: "96px",
            fontWeight: 700,
            color: "#4ade80",
            lineHeight: 1,
          }}
        >
          {"₿ "}
          {formatUsd(adjustedPrice)}
        </div>

        {/* Subtitle */}
        <div
          style={{
            display: "flex",
            fontFamily: "Inter",
            fontSize: "28px",
            color: "#a1a1aa",
            marginTop: "12px",
          }}
        >
          in 2015 dollars (CPI-adjusted)
        </div>

        {/* Nominal price */}
        <div
          style={{
            display: "flex",
            fontFamily: "Inter",
            fontSize: "24px",
            color: "#71717a",
            marginTop: "24px",
          }}
        >
          Nominal: {formatUsd(nominalPrice)}
        </div>

        {/* Loss percentage */}
        <div
          style={{
            display: "flex",
            fontFamily: "Inter",
            fontSize: "28px",
            fontWeight: 700,
            color: "#f87171",
            marginTop: "8px",
          }}
        >
          {lossPercent}% purchasing power loss
        </div>

        {/* Footer */}
        <div
          style={{
            display: "flex",
            fontFamily: "Inter",
            fontSize: "22px",
            marginTop: "32px",
          }}
        >
          <span style={{ color: "#818cf8" }}>bitflation.io</span>
          <span style={{ color: "#71717a", marginLeft: "12px" }}>
            {" · Bitcoin in real $"}
          </span>
        </div>
      </div>
    ),
    {
      width: 1200,
      height: 630,
      fonts: [
        { name: "JetBrains Mono", data: jetBrainsBold, weight: 700 },
        { name: "Inter", data: interRegular, weight: 400 },
        { name: "Inter", data: interBold, weight: 700 },
      ],
    }
  );

  // Clone response with cache headers
  const res = new Response(response.body, response);
  res.headers.set(
    "Cache-Control",
    "public, s-maxage=3600, max-age=3600, stale-while-revalidate=600"
  );
  res.headers.set("Content-Type", "image/png");

  // Store in cache
  context.waitUntil(cache.put(cacheKey, res.clone()));

  return res;
};
