/** Relais des flux d'actualité (liste blanche, cache 30 min) pour la lecture en direct dans le navigateur. */
import { FEEDS, fetchText } from '@/lib/server/news';
const cache = new Map<string, { at: number; xml: string }>();
export async function GET(req: Request) {
  const u = new URL(req.url).searchParams.get('u') || '';
  if (!FEEDS.some(([f]) => f === u)) return new Response('', { status: 400 });
  const c = cache.get(u);
  if (!c || Date.now() - c.at > 1800e3) { const x = await fetchText(u, 8000); if (x && x.length > 200) cache.set(u, { at: Date.now(), xml: x }); }
  const r = cache.get(u); if (!r) return new Response('', { status: 502 });
  return new Response(r.xml, { headers: { 'content-type': 'application/xml; charset=utf-8', 'cache-control': 'public, max-age=900' } });
}
