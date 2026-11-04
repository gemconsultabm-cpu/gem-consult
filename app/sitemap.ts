import type { MetadataRoute } from 'next';
import { LANGS, PAGES, SITE_URL, pagePath } from '@/lib/pages';
import { listVeille } from '@/lib/server/veille-pages';

/* Plan du site multilingue : 24 rubriques (avec leurs équivalents dans les autres langues) + analyses de la veille du cabinet. */
export const revalidate = 3600;
export default function sitemap(): MetadataRoute.Sitemap {
  const rubriques = LANGS.flatMap((l) => PAGES.map((p) => ({
    url: SITE_URL + pagePath(l, p),
    changeFrequency: (p === 'veille' || p === 'outils' || p === 'accueil' ? 'daily' : 'monthly') as 'daily' | 'monthly',
    priority: p === 'accueil' ? 1 : p === 'services' || p === 'outils' ? 0.9 : 0.7,
    alternates: { languages: Object.fromEntries(LANGS.map((x) => [x, SITE_URL + pagePath(x, p)])) },
  })));
  const analyses = listVeille().flatMap((it) => LANGS.map((l) => ({
    url: `${SITE_URL}${l === 'fr' ? '' : `/${l}`}/veille/analyse/${it.id}`, lastModified: it.date, changeFrequency: 'monthly' as const, priority: 0.6,
  })));
  return [...rubriques, ...analyses];
}
