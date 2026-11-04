/** Sélection quotidienne « L'actualité de la profession » ; relance la mise à jour si la tâche planifiée n'a pas tourné depuis 24 h. */
import { after } from 'next/server';
import { fileAgeSec } from '@/lib/server/data';
import { readNews, updateNews } from '@/lib/server/news';
let busy = 0;
export async function GET() {
  if (fileAgeSec('news.json') > 86400 && Date.now() - busy > 1800e3) { busy = Date.now(); after(() => updateNews().then(() => undefined)); }
  const n = readNews();
  return Response.json(n, { status: n.items.length ? 200 : 503, headers: { 'cache-control': 'public, max-age=600' } });
}
