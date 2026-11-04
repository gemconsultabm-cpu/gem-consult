/** Relais des cours de change (base TND), cache 6 h. */
let cache: { at: number; body: string } | null = null;
export async function GET() {
  if (!cache || Date.now() - cache.at > 6 * 3600e3) {
    try { const r = await fetch('https://open.er-api.com/v6/latest/TND', { signal: AbortSignal.timeout(8000) }); const j = await r.json(); if (j?.result === 'success') cache = { at: Date.now(), body: JSON.stringify(j) }; } catch { /* on garde l'ancien */ }
  }
  if (!cache) return new Response('', { status: 502 });
  return new Response(cache.body, { headers: { 'content-type': 'application/json', 'cache-control': 'public, max-age=3600' } });
}
