import type { Metadata } from 'next';
import Script from 'next/script';
import { notFound } from 'next/navigation';
import jsonld from '@/content/jsonld.json';
import { analyseHtml, analysePath, veilleListHtml } from '@/lib/analyse';
import { LANGS, META, OG_LOCALE, PAGES, SITE_URL, pagePath, parseSlug, type Lang } from '@/lib/pages';
import { renderBody } from '@/lib/render';
import { getAnalyse, listVeille } from '@/lib/server/veille-pages';

/* 24 pages (8 rubriques × 3 langues), régénérées toutes les heures ; + une page par analyse de la veille, créée à la demande. */
export const revalidate = 3600;
export const dynamicParams = true;
export function generateStaticParams() {
  return LANGS.flatMap((l) => PAGES.map((p) => ({ slug: pagePath(l, p).split('/').filter(Boolean) })));
}
type Props = { params: Promise<{ slug?: string[] }> };
const langAlternates = (f: (l: Lang) => string) => ({ fr: f('fr'), en: f('en'), ar: f('ar'), 'x-default': f('fr') });

export async function generateMetadata({ params }: Props): Promise<Metadata> {
  const r = parseSlug((await params).slug); if (!r) return {};
  if (r.analyse) {
    const a = getAnalyse(r.analyse); if (!a) return {};
    const title = `${a.titre[r.lang]} | GEM Consult`; const description = a.resume[r.lang].slice(0, 300);
    return { title, description, alternates: { canonical: analysePath(r.lang, a.id), languages: langAlternates((l) => analysePath(l, a.id)) },
      openGraph: { title, description, url: analysePath(r.lang, a.id), type: 'article', publishedTime: a.date, locale: OG_LOCALE[r.lang], siteName: 'Cabinet GEM Consult', images: ['/og-image.png'] } };
  }
  const m = META[r.lang][r.page]; const path = pagePath(r.lang, r.page);
  return {
    title: m.title, description: m.description,
    alternates: { canonical: path, languages: langAlternates((l) => pagePath(l, r.page)) },
    openGraph: { title: m.title, description: m.description, url: path, locale: OG_LOCALE[r.lang], alternateLocale: LANGS.filter((l) => l !== r.lang).map((l) => OG_LOCALE[l]), siteName: 'Cabinet GEM Consult', type: 'website', images: ['/og-image.png'] },
    twitter: { card: 'summary_large_image', title: m.title, description: m.description, images: ['/og-image.png'] },
  };
}

export default async function Page({ params }: Props) {
  const r = parseSlug((await params).slug);
  if (!r) notFound();
  const { lang, page } = r;
  const [org, faq] = jsonld as Record<string, unknown>[];
  const crumb = (n: number, name: string, path: string) => ({ '@type': 'ListItem', position: n, name, item: SITE_URL + path });
  let html: string; const ld: unknown[] = [{ ...org, url: SITE_URL + pagePath(lang, 'accueil') }];
  if (r.analyse) {
    const a = getAnalyse(r.analyse); if (!a) notFound();
    html = renderBody(lang, null).replace('</main>', `${analyseHtml(a, lang)}</main>`);
    ld.push({ '@context': 'https://schema.org', '@type': 'NewsArticle', headline: a.titre[lang].slice(0, 110), description: a.resume[lang], datePublished: a.date, dateModified: a.date, inLanguage: lang,
      author: { '@type': 'Organization', name: 'Cabinet GEM Consult', url: SITE_URL }, publisher: { '@type': 'Organization', name: 'Cabinet GEM Consult', logo: { '@type': 'ImageObject', url: `${SITE_URL}/assets/img/icon-512.png` } },
      mainEntityOfPage: SITE_URL + analysePath(lang, a.id), image: `${SITE_URL}/og-image.png`, isBasedOn: a.source_url });
    ld.push({ '@context': 'https://schema.org', '@type': 'BreadcrumbList', itemListElement: [crumb(1, META[lang].accueil.crumb, pagePath(lang, 'accueil')), crumb(2, META[lang].veille.crumb, pagePath(lang, 'veille')), crumb(3, a.titre[lang].slice(0, 80), analysePath(lang, a.id))] });
  } else {
    html = renderBody(lang, page);
    if (page === 'veille') html = html.replace('<div id="veilleIA" class="via" hidden></div>', veilleListHtml(listVeille(), lang));
    ld.push({ '@context': 'https://schema.org', '@type': 'BreadcrumbList', itemListElement: [crumb(1, META[lang].accueil.crumb, pagePath(lang, 'accueil')), ...(page === 'accueil' ? [] : [crumb(2, META[lang][page].crumb, pagePath(lang, page))])] });
    if (page === 'ressources' && lang === 'fr') ld.push(faq);
  }
  return (
    <>
      {/* Langue et sens d'écriture appliqués avant l'affichage */}
      {ld.map((j, i) => <script key={i} type="application/ld+json" dangerouslySetInnerHTML={{ __html: JSON.stringify(j) }} />)}
      <div id="gem-root" data-initial-page={page} dangerouslySetInnerHTML={{ __html: html }} />
      <Script src="/js/site.js?v=3" strategy="afterInteractive" />
    </>
  );
}
