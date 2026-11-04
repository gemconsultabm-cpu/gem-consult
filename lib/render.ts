/**
 * Prépare, au moment du build, le HTML d'UNE rubrique dans UNE langue à partir du balisage trilingue :
 * - seules les sections de la rubrique sont conservées (pas de contenu dupliqué entre les pages) ;
 * - seuls les textes de la langue demandée sont conservés (une langue par adresse, pour les moteurs) ;
 * - les libellés data-fr/data-en/data-ar et les liens internes sont résolus côté serveur.
 */
import { parse } from 'node-html-parser';
import { BODY } from '@/content/body';
import { LANGS, PAGES, pagePath, type Lang, type PageId } from '@/lib/pages';

const cache = new Map<string, string>();

export function renderBody(lang: Lang, page: PageId | null): string {
  const key = `${lang}:${page}`; const hit = cache.get(key); if (hit) return hit;
  const root = parse(BODY, { comment: false, voidTag: { closingSlash: false } });
  // Correspondance ancre → rubrique (avant suppression)
  const anchorPage = new Map<string, PageId>();
  for (const s of root.querySelectorAll('section[data-pg]')) { const id = s.getAttribute('id'); if (id) anchorPage.set(id, s.getAttribute('data-pg') as PageId); }
  // 1. Sections des autres rubriques
  for (const s of root.querySelectorAll('section[data-pg]')) if (s.getAttribute('data-pg') !== page) s.remove();
  // 2. Textes des autres langues
  for (const other of LANGS.filter((l) => l !== lang)) for (const e of root.querySelectorAll(`.${other}`)) e.remove();
  // 3. Libellés et textes indicatifs dans la langue de la page
  for (const e of root.querySelectorAll(`[data-${lang}]`)) { const v = e.getAttribute(`data-${lang}`); if (v != null) e.set_content(v); }
  for (const e of root.querySelectorAll(`[data-${lang}-ph]`)) { const v = e.getAttribute(`data-${lang}-ph`); if (v != null) e.setAttribute('placeholder', v); }
  // Un seul titre principal <h1> par page (Google) : le premier titre de section de la page devient <h1>.
  if (page && page !== 'accueil') { const h = root.querySelector('section[data-pg] .sec-head h2') || root.querySelector('section[data-pg] h2'); if (h) h.replaceWith(`<h1${h.rawAttrs ? ' ' + h.rawAttrs : ''}>${h.innerHTML}</h1>`); }
  // 4. Liens internes : rubrique dans la même langue ; ancre d'une autre rubrique → adresse complète
  for (const a of root.querySelectorAll('a[href]')) {
    const h = a.getAttribute('href') || '';
    const tool = a.getAttribute('data-tool');
    if (tool) { a.setAttribute('href', `${pagePath(lang, 'outils')}?outil=${encodeURIComponent(tool)}`); continue; }
    const m = h.match(/^\/([a-z]*)(#.*)?$/);
    if (m && (m[1] === '' || (PAGES as readonly string[]).includes(m[1]))) { a.setAttribute('href', pagePath(lang, (m[1] || 'accueil') as PageId) + (m[2] || '')); continue; }
    const an = h.match(/^#([\w-]+)$/);
    if (an && anchorPage.has(an[1]) && anchorPage.get(an[1]) !== page) a.setAttribute('href', `${pagePath(lang, anchorPage.get(an[1])!)}#${an[1]}`);
  }
  if (page === null) for (const a of root.querySelectorAll('a[href]')) { const h = a.getAttribute('href') || ''; const an = h.match(/^#([\w-]+)$/); if (an && anchorPage.has(an[1])) a.setAttribute('href', `${pagePath(lang, anchorPage.get(an[1])!)}#${an[1]}`); }
  const html = root.toString();
  cache.set(key, html);
  return html;
}
