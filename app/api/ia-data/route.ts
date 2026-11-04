/** Contenus publiés par les tâches IA : ?type=params|veille|echeances */
import { readJSON } from '@/lib/server/data';
import { getParams } from '@/lib/server/params';
import type { Echeances, Veille } from '@/lib/server/tasks';
export async function GET(req: Request) {
  const t = new URL(req.url).searchParams.get('type');
  const h = { headers: { 'cache-control': 'public, max-age=600' } };
  if (t === 'params') return Response.json(getParams(), h);
  if (t === 'veille') {
    const v = readJSON<Veille>('veille.json', { days: [] });
    const items = v.days.flatMap((d) => d.items.filter((i) => !i.hidden).map((i) => ({ ...i, day: d.date }))).slice(0, 9);
    return Response.json({ updated: v.updated ?? null, items }, h);
  }
  if (t === 'echeances') {
    const e = readJSON<Echeances>('echeances.json', { mois: {} });
    const mois = Object.fromEntries(Object.entries(e.mois).filter(([, x]) => !x.hidden).map(([m, x]) => [m, { items: x.items, source: x.source }]));
    return Response.json({ mois }, h);
  }
  return Response.json({}, { status: 400 });
}
