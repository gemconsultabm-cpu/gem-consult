/** « L'actualité de la profession » : flux des médias tunisiens, filtrés pour la profession, actualisés 2 fois par jour. */
import { XMLParser } from 'fast-xml-parser';
import { readJSON, writeJSON } from './data';

export const FEEDS: [string, string][] = [
  ['https://www.webmanagercenter.com/feed/', 'Webmanager Center'],
  ['https://www.leconomistemaghrebin.com/feed/', "L'Économiste Maghrébin"],
  ['https://www.tunisienumerique.com/feed/', 'Tunisie Numérique'],
  ['https://www.lapresse.tn/feed/', 'La Presse'],
  ['https://managers.tn/feed/', 'Managers'],
  ['https://www.ilboursa.com/rss/rss.aspx', 'Ilboursa'],
  ['https://africanmanager.com/feed/', 'African Manager'],
];
const KW: [number, RegExp][] = [
  [4, /fiscal|impôt|impot|imposition|\btva\b|irpp|loi de finances|\blf ?20|\bdgi\b|contribuable|retenue à la source|douan/i],
  [4, /comptab|audit|commissaire aux comptes|expert[- ]comptable|\boect\b|ifrs|norme/i],
  [3, /cnss|cnam|cotisation|sécurité sociale|caisse sociale|droit du travail|salaire|smig/i],
  [3, /jort|décret|arrêté|circulaire|note commune|projet de loi|\barp\b|assemblée|réglementation|\brne\b|registre national/i],
  [2, /\bbct\b|banque centrale|taux directeur|inflation|\bcmf\b|bourse|bvmt|tunindex|dinar|change/i],
  [1, /entreprise|société|banque|crédit|investissement|budget|dette|bilan|résultats|chiffre d.affaires|export/i],
];
export type NewsItem = { t: string; l: string; d: string; s: string; desc: string; sc: number };
const strip = (s: unknown) => String(s ?? '').replace(/<[^>]*>/g, ' ').replace(/&#(\d+);/g, (_, n) => String.fromCharCode(+n)).replace(/&nbsp;/g, ' ').replace(/&amp;/g, '&').replace(/&quot;/g, '"').replace(/&#8217;|&rsquo;/g, '’').replace(/\s+/g, ' ').trim();
const asArr = <T,>(x: T | T[] | undefined): T[] => (x === undefined ? [] : Array.isArray(x) ? x : [x]);

export function parseFeed(xml: string, src: string): NewsItem[] {
  const p = new XMLParser({ ignoreAttributes: false, attributeNamePrefix: '@', processEntities: true, htmlEntities: true });
  let doc: Record<string, any>; try { doc = p.parse(xml); } catch { return []; }
  const nodes = asArr(doc?.rss?.channel?.item).length ? asArr(doc.rss.channel.item) : asArr(doc?.feed?.entry);
  return nodes.map((it: any) => {
    const link = typeof it.link === 'string' ? it.link : it.link?.['@href'] || asArr(it.link)[0]?.['@href'] || '';
    const d = new Date(it.pubDate || it.published || it.updated || it['dc:date'] || '');
    const desc = strip(it.description || it.summary || it['content:encoded'] || '');
    const t = strip(it.title?.['#text'] ?? it.title);
    const sc = KW.reduce((a, [w, re]) => a + (re.test(`${t} ${desc}`) ? w : 0), 0);
    return { t, l: String(link).trim(), d: isNaN(+d) ? '' : d.toISOString(), s: src, desc: desc.slice(0, 600), sc };
  }).filter((x) => x.t && /^https?:\/\//.test(x.l));
}

export async function fetchText(url: string, ms = 10000): Promise<string | null> {
  const ctrl = new AbortController(); const to = setTimeout(() => ctrl.abort(), ms);
  try { const r = await fetch(url, { signal: ctrl.signal, headers: { 'user-agent': 'Mozilla/5.0 (GEMConsult-Veille/2.0)' } }); return r.ok ? await r.text() : null; }
  catch { return null; } finally { clearTimeout(to); }
}

/** Mise à jour quotidienne : conserve la sélection précédente si les sources sont indisponibles. */
export async function updateNews(): Promise<{ ok: boolean; feeds: number; n: number }> {
  const limit = Date.now() - 8 * 86400e3; const seen = new Map<string, NewsItem>(); let ok = 0;
  await Promise.all(FEEDS.map(async ([u, s]) => {
    const x = await fetchText(u); if (!x) return; const items = parseFeed(x, s); if (items.length) ok++;
    for (const it of items) { if (it.sc < 2 || (it.d && +new Date(it.d) < limit)) continue; seen.set(it.t.toLowerCase(), it); }
  }));
  const items = [...seen.values()].sort((a, b) => (a.d.slice(0, 10) === b.d.slice(0, 10) ? b.sc - a.sc : b.d.localeCompare(a.d))).slice(0, 12);
  if (ok === 0 || items.length < 3) return { ok: false, feeds: ok, n: items.length };
  writeJSON('news.json', { updated: new Date().toISOString(), items });
  return { ok: true, feeds: ok, n: items.length };
}
export const readNews = () => readJSON<{ updated?: string; items: NewsItem[] }>('news.json', { items: [] });
