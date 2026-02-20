import { ImageResponse } from "@cloudflare/pages-plugin-vercel-og/api";
import React from "react";

// Hardcoded constants for BFI computation (update quarterly)
const CPI_ANCHOR_2015 = 237.017;
const CPI_CURRENT = 325.252; // Jan 2026
const M2_ANCHOR_2015 = 12055.6; // billions, 2015 avg
const M2_CURRENT = 22411; // billions, late 2025

interface Env {
  ASSETS: Fetcher;
}

interface PriceResult {
  price: number;
  source: string;
  errors: string[];
}

async function fetchBtcPrice(): Promise<PriceResult | null> {
  const errors: string[] = [];

  // Source 1: CoinGecko
  try {
    const res = await fetch(
      "https://api.coingecko.com/api/v3/simple/price?ids=bitcoin&vs_currencies=usd",
      {
        headers: {
          Accept: "application/json",
          "User-Agent": "Bitflation/1.0",
        },
      }
    );
    if (!res.ok) {
      errors.push(`coingecko:${res.status} ${res.statusText}`);
    } else {
      const data = (await res.json()) as { bitcoin?: { usd?: number } };
      const price = data.bitcoin?.usd;
      if (price) return { price, source: "coingecko", errors };
      errors.push("coingecko:missing bitcoin.usd in response");
    }
  } catch (e) {
    errors.push(`coingecko:${e instanceof Error ? e.message : String(e)}`);
  }

  // Source 2: Blockchain.com ticker
  try {
    const res = await fetch("https://blockchain.info/ticker", {
      headers: {
        Accept: "application/json",
        "User-Agent": "Bitflation/1.0",
      },
    });
    if (!res.ok) {
      errors.push(`blockchain:${res.status} ${res.statusText}`);
    } else {
      const data = (await res.json()) as { USD?: { last?: number } };
      const price = data.USD?.last;
      if (price) return { price, source: "blockchain", errors };
      errors.push("blockchain:missing USD.last in response");
    }
  } catch (e) {
    errors.push(`blockchain:${e instanceof Error ? e.message : String(e)}`);
  }

  return { price: 0, source: "none", errors };
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

function logoToBase64(buffer: ArrayBuffer): string {
  const bytes = new Uint8Array(buffer);
  let binary = "";
  for (let i = 0; i < bytes.length; i++) {
    binary += String.fromCharCode(bytes[i]);
  }
  return `data:image/png;base64,${btoa(binary)}`;
}

export const onRequest: PagesFunction<Env> = async (context) => {
  const url = new URL(context.request.url);

  // Check cache
  const cache = caches.default;
  const cacheKey = new Request(url.toString(), context.request);
  const cached = await cache.match(cacheKey);
  if (cached) return cached;

  // Fetch live BTC price + load assets in parallel
  const [priceResult, jetBrainsBold, interRegular, interBold, logoBuffer] =
    await Promise.all([
      fetchBtcPrice(),
      loadAsset(context.env, "/fonts/JetBrainsMono-Bold.ttf"),
      loadAsset(context.env, "/fonts/Inter-Regular.ttf"),
      loadAsset(context.env, "/fonts/Inter-Bold.ttf"),
      loadAsset(context.env, "/og/bitflation-logo.png"),
    ]);

  const nominalPrice = priceResult?.price || 0;
  const priceSource = priceResult?.source ?? "none";
  const debugErrors = priceResult?.errors ?? [];

  const logoBase64 = logoToBase64(logoBuffer);

  // Branch: brand-only image if no live price, full image if we have one
  let imageContent: React.JSX.Element;

  if (!nominalPrice) {
    // Brand-only fallback — no dollar amounts
    imageContent = (
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
        <img
          src={logoBase64}
          width={300}
          height={168}
          style={{ marginBottom: "32px" }}
        />
        <div
          style={{
            display: "flex",
            fontFamily: "Inter",
            fontSize: "36px",
            fontWeight: 700,
            color: "#e4e4e7",
          }}
        >
          What is your Bitcoin actually worth?
        </div>
        <div
          style={{
            display: "flex",
            fontFamily: "Inter",
            fontSize: "24px",
            color: "#a1a1aa",
            marginTop: "16px",
          }}
        >
          Inflation-adjusted BTC price — CPI, M2, Gold, DXY
        </div>
        <div
          style={{
            display: "flex",
            fontFamily: "Inter",
            fontSize: "22px",
            marginTop: "40px",
          }}
        >
          <span style={{ color: "#818cf8" }}>bitflation.io</span>
          <span style={{ color: "#71717a", marginLeft: "12px" }}>
            {" · Bitcoin in real $"}
          </span>
        </div>
      </div>
    );
  } else {
    // Full image with live price data
    const bfiGrowth = 0.5 * (CPI_CURRENT / CPI_ANCHOR_2015) + 0.5 * (M2_CURRENT / M2_ANCHOR_2015);
    const adjustedPrice = Math.round(nominalPrice / bfiGrowth);
    const lossPercent = (
      ((nominalPrice - adjustedPrice) / nominalPrice) * 100
    ).toFixed(1);

    imageContent = (
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
        <img
          src={logoBase64}
          width={250}
          height={140}
          style={{ marginBottom: "24px" }}
        />
        <div
          style={{
            display: "flex",
            alignItems: "baseline",
            fontFamily: "JetBrains Mono",
            fontSize: "96px",
            fontWeight: 700,
            color: "#e4e4e7",
            lineHeight: 1,
          }}
        >
          {"₿ "}
          {formatUsd(adjustedPrice)}
        </div>
        <div
          style={{
            display: "flex",
            fontFamily: "Inter",
            fontSize: "28px",
            color: "#a1a1aa",
            marginTop: "12px",
          }}
        >
          in 2015 dollars (Bitflation Index)
        </div>
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
    );
  }

  const response = new ImageResponse(imageContent, {
    width: 1200,
    height: 630,
    fonts: [
      { name: "JetBrains Mono", data: jetBrainsBold, weight: 700 },
      { name: "Inter", data: interRegular, weight: 400 },
      { name: "Inter", data: interBold, weight: 700 },
    ],
  });

  // Clone response with cache + debug headers
  const res = new Response(response.body, response);
  res.headers.set(
    "Cache-Control",
    "public, s-maxage=3600, max-age=3600, stale-while-revalidate=600"
  );
  res.headers.set("Content-Type", "image/png");
  res.headers.set("X-Price-Source", priceSource);
  if (debugErrors.length > 0) {
    res.headers.set("X-Debug-Error", debugErrors.join("; "));
  }

  // Store in cache
  context.waitUntil(cache.put(cacheKey, res.clone()));

  return res;
};
