/**
 * Cloudflare Pages Function — proxies FRED API requests to avoid CORS.
 * Matches /api/fred/* and forwards to https://api.stlouisfed.org/*
 */
export const onRequest: PagesFunction = async ({ request }) => {
  const url = new URL(request.url);
  const fredPath = url.pathname.replace(/^\/api\/fred/, '');
  const fredUrl = `https://api.stlouisfed.org${fredPath}${url.search}`;

  const res = await fetch(fredUrl, {
    headers: { 'User-Agent': 'Bitflation/1.0' },
  });

  return new Response(res.body, {
    status: res.status,
    headers: {
      'Content-Type': res.headers.get('Content-Type') || 'application/json',
      'Access-Control-Allow-Origin': '*',
      'Cache-Control': 'public, max-age=3600',
    },
  });
};
