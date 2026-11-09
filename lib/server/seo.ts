/** Suivi quotidien du référencement : positions Google (Search Console), contrôles techniques, détection des baisses,
 *  propositions de Claude soumises à validation dans /admin (rien n'est modifié sur le site sans accord). */
import { claude, extractJSON } from './claude';
import { getConfig } from './config';
import { fileAgeSec, log, readJSON, todayTunis, writeJSON } from './data';
import { gscReady, searchAnalytics, sitemaps, type Row } from './gsc';
import { sendMail } from './mail';
import { LANGS, META, PAGES, SITE_URL, pagePath, type Lang, type PageId as Page } from '../pages';

export const DEFAULT_KEYWORDS = [
  'gem consult', 'expert comptable tunis', 'cabinet expertise comptable tunis', 'commissaire aux comptes tunis',
  'audit fiscal tunisie', 'conseil fiscal tunis', 'expert judiciaire fiscal tunis', 'conciliation pénale tunisie',
  'audit association tunisie', 'expert comptable montplaisir', 'chartered accountant tunisia', 'خبير محاسب تونس',
];
export const keywords = () => (getConfig().seoKeywords?.length ? getConfig().seoKeywords! : DEFAULT_KEYWORDS);

type Stat = { clicks: number; impressions: number; position: number | null };
export type KwLine = { q: string; tracked: boolean; cur: Stat; prev: Stat };
export type PageLine = { page: string; cur: Stat; prev: Stat };
export type Tech = { check: string; ok: boolean; detail: string };
export type Alert = { niveau: 'élevée' | 'moyenne' | 'faible'; texte: string };
export type Snapshot = { date: string; periode: string; gsc: boolean; totals?: { cur: Stat; prev: Stat }; keywords: KwLine[]; pages: PageLine[]; tech: Tech[]; alerts: Alert[]; sitemaps?: string };
export type Proposal = { id: string; date: string; type: 'meta' | 'article' | 'action'; statut: 'en attente' | 'validée' | 'rejetée';
  priorite: 'élevée' | 'moyenne' | 'faible'; raison: string; page?: Page; lang?: Lang; title?: string; description?: string; sujet?: string; requete?: string; texte?: string };
export type Override = { title: string; description: string; date: string; proposition: string };

/* ---------- surcharges validées des titres / descriptions ---------- */
export const overrides = () => readJSON<Record<string, Override>>('seo-overrides.json', {});
export function metaFor(lang: Lang, page: Page) {
  const o = overrides()[`${lang}:${page}`]; const m = META[lang][page];
  return o ? { ...m, title: o.title, description: o.description } : m;
}

/* ---------- utilitaires ---------- */
const day = (offset: number) => { const d = new Date(`${todayTunis()}T12:00:00Z`); d.setUTCDate(d.getUTCDate() + offset); return d.toISOString().slice(0, 10); };
const stat = (r?: Row): Stat => ({ clicks: r?.clicks || 0, impressions: r?.impressions || 0, position: r ? Math.round(r.position * 10) / 10 : null });
const norm = (s: string) => s.toLowerCase().normalize('NFD').replace(/[̀-ͯ]/g, '').replace(/[-’']/g, ' ').replace(/\s+/g, ' ').trim();
const hash = (s: string) => { let h = 0; for (const c of s) h = (h * 31 + c.charCodeAt(0)) | 0; return (h >>> 0).toString(16); };

/* ---------- contrôles techniques (site interrogé de l'intérieur du conteneur) ---------- */
async function techChecks(): Promise<Tech[]> {
  const base = `http://127.0.0.1:${process.env.PORT || 3000}`; const out: Tech[] = [];
  const get = async (p: string) => { const t0 = Date.now(); try { const r = await fetch(base + p, { headers: { 'user-agent': 'GEM-SEO-check' }, signal: AbortSignal.timeout(15000) }); return { status: r.status, body: await r.text(), ms: Date.now() - t0 }; } catch (e) { return { status: 0, body: String((e as Error).message), ms: Date.now() - t0 }; } };
  for (const [lang, page] of [['fr', 'accueil'], ['fr', 'services'], ['fr', 'contact'], ['en', 'accueil'], ['ar', 'accueil']] as [Lang, Page][]) {
    const p = pagePath(lang, page); const r = await get(p);
    const title = /<title>([^<]{10,})<\/title>/.exec(r.body)?.[1]; const canon = r.body.includes('rel="canonical"'); const lng = r.body.includes(`<html lang="${lang}"`);
    const ok = r.status === 200 && !!title && canon && lng && r.ms < 4000;
    out.push({ check: `Page ${p}`, ok, detail: r.status !== 200 ? `HTTP ${r.status}` : !title ? 'titre manquant' : !canon ? 'adresse canonique manquante' : !lng ? 'langue de page incorrecte' : r.ms >= 4000 ? `lente (${r.ms} ms)` : `OK (${r.ms} ms)` });
  }
  const sm = await get('/sitemap.xml'); const n = (sm.body.match(/<url>/g) || []).length;
  out.push({ check: 'Plan du site', ok: sm.status === 200 && n >= 24, detail: sm.status === 200 ? `${n} adresses` : `HTTP ${sm.status}` });
  const rb = await get('/robots.txt');
  out.push({ check: 'robots.txt', ok: rb.status === 200 && /Sitemap:\s*https:\/\/gemabm\.com\/sitemap\.xml/.test(rb.body) && !/Disallow:\s*\/\s*$/m.test(rb.body), detail: rb.status === 200 ? 'OK' : `HTTP ${rb.status}` });
  return out;
}

/* ---------- tâche quotidienne ---------- */
export async function taskSeo(): Promise<{ ok: boolean; msg: string }> {
  const tech = await techChecks(); const alerts: Alert[] = [];
  for (const t of tech) if (!t.ok) alerts.push({ niveau: 'élevée', texte: `${t.check} : ${t.detail}` });
  const snap: Snapshot = { date: todayTunis(), periode: '', gsc: false, keywords: [], pages: [], tech, alerts };

  if (gscReady()) {
    // Search Console publie les données avec ~2 jours de décalage : 7 derniers jours disponibles comparés aux 7 précédents.
    const end = day(-2), start = day(-8), pEnd = day(-9), pStart = day(-15);
    snap.periode = `${start} → ${end} (comparé à ${pStart} → ${pEnd})`; snap.gsc = true;
    const [qc, qp, pc, pp, tc, tp] = await Promise.all([
      searchAnalytics(start, end, ['query']), searchAnalytics(pStart, pEnd, ['query']),
      searchAnalytics(start, end, ['page'], 100), searchAnalytics(pStart, pEnd, ['page'], 100),
      searchAnalytics(start, end, [], 1), searchAnalytics(pStart, pEnd, [], 1)]);
    snap.totals = { cur: stat(tc[0]), prev: stat(tp[0]) };
    const find = (rows: Row[], q: string) => rows.find((r) => norm(r.keys[0]) === norm(q));
    const tracked = keywords();
    snap.keywords = tracked.map((q) => ({ q, tracked: true, cur: stat(find(qc, q)), prev: stat(find(qp, q)) }));
    for (const r of qc.slice(0, 25)) if (!tracked.some((q) => norm(q) === norm(r.keys[0]))) snap.keywords.push({ q: r.keys[0], tracked: false, cur: stat(r), prev: stat(find(qp, r.keys[0])) });
    snap.pages = pc.slice(0, 30).map((r) => ({ page: r.keys[0], cur: stat(r), prev: stat(pp.find((x) => x.keys[0] === r.keys[0])) }));
    for (const r of pp) if (!pc.some((x) => x.keys[0] === r.keys[0]) && r.impressions >= 30) snap.pages.push({ page: r.keys[0], cur: stat(), prev: stat(r) });

    // Détection des baisses
    for (const k of snap.keywords.filter((k) => k.tracked)) {
      const a = k.prev.position, b = k.cur.position;
      if (a !== null && b === null) alerts.push({ niveau: 'élevée', texte: `« ${k.q} » : n'apparaît plus dans Google (était en position ${a})` });
      else if (a !== null && b !== null && b - a >= 2) alerts.push({ niveau: b - a >= 5 || a <= 3 ? 'élevée' : 'moyenne', texte: `« ${k.q} » : position ${a} → ${b}` });
    }
    const T = snap.totals;
    if (T.prev.clicks >= 10 && T.cur.clicks < T.prev.clicks * 0.7) alerts.push({ niveau: 'élevée', texte: `Clics depuis Google : ${T.prev.clicks} → ${T.cur.clicks} (−${Math.round(100 - (T.cur.clicks / T.prev.clicks) * 100)} %)` });
    if (T.prev.impressions >= 100 && T.cur.impressions < T.prev.impressions * 0.7) alerts.push({ niveau: 'moyenne', texte: `Apparitions dans Google : ${T.prev.impressions} → ${T.cur.impressions}` });
    for (const p of snap.pages) if (p.prev.impressions >= 50 && p.cur.impressions < p.prev.impressions * 0.5) alerts.push({ niveau: 'moyenne', texte: `Page ${p.page.replace(SITE_URL, '') || '/'} : apparitions ${p.prev.impressions} → ${p.cur.impressions}` });
    try {
      const sm = await sitemaps(); snap.sitemaps = sm.map((s) => `${s.path} : ${s.isPending ? 'en attente' : `${s.contents?.[0]?.submitted || '?'} envoyées`}${Number(s.errors) ? `, ${s.errors} erreur(s)` : ''}`).join(' ; ');
      for (const s of sm) if (Number(s.errors) > 0) alerts.push({ niveau: 'élevée', texte: `Plan du site ${s.path} : ${s.errors} erreur(s) signalée(s) par Google` });
    } catch { /* non bloquant */ }
  }

  writeJSON('seo-latest.json', snap);
  const hist = readJSON<{ date: string; clicks?: number; impressions?: number; kw: Record<string, number | null> }[]>('seo-history.json', []);
  hist.unshift({ date: snap.date, clicks: snap.totals?.cur.clicks, impressions: snap.totals?.cur.impressions, kw: Object.fromEntries(snap.keywords.filter((k) => k.tracked).map((k) => [k.q, k.cur.position])) });
  writeJSON('seo-history.json', hist.filter((h, i, a) => a.findIndex((x) => x.date === h.date) === i).slice(0, 180));

  // Propositions : en cas de baisse, et chaque lundi pour l'amélioration continue (si la clé Claude est active).
  const monday = new Date(`${snap.date}T12:00:00Z`).getUTCDay() === 1; let nb = 0;
  if (getConfig().apiKey && (alerts.length || monday)) nb = await propose(snap).catch((e) => { log(`seo propositions : ${(e as Error).message}`); return 0; });

  // Rapport quotidien complet par e-mail (chaque matin ; désactivable dans /admin).
  if (getConfig().seoDaily !== false || alerts.length || nb) {
    const hier = day(-1); const forms = readJSON<Record<string, Record<string, number>>>('stats-formulaires.json', {})[hier] || {};
    const veille = readJSON<{ days: { date: string; items: { titre: { fr: string }; hidden: boolean }[] }[] }>('veille.json', { days: [] }).days[0];
    const ks = readJSON<{ ok: boolean; at: string } | null>('key-status.json', null);
    const age = (f: string) => { const h = fileAgeSec(f) / 3600; return !isFinite(h) ? 'jamais' : h < 30 ? 'à jour' : `il y a ${Math.round(h / 24)} j`; };
    const pend = readJSON<Proposal[]>('seo-propositions.json', []).filter((p) => p.statut === 'en attente').length;
    const L: string[] = [`RAPPORT QUOTIDIEN — gemabm.com — ${snap.date}`, ''];
    L.push('1. RÉFÉRENCEMENT GOOGLE', snap.gsc ? `   Période : ${snap.periode}` : '   Search Console non reliée (à configurer dans /admin).');
    if (snap.totals) L.push(`   Clics : ${snap.totals.cur.clicks} (avant ${snap.totals.prev.clicks}) · Apparitions : ${snap.totals.cur.impressions} (avant ${snap.totals.prev.impressions})`);
    for (const k of snap.keywords.filter((k) => k.tracked && (k.cur.position !== null || k.prev.position !== null)))
      L.push(`   « ${k.q} » : ${k.prev.position ?? '—'} → ${k.cur.position ?? 'non classé'}${k.cur.position !== null && k.prev.position !== null ? (k.cur.position < k.prev.position ? '  ▲' : k.cur.position > k.prev.position ? '  ▼' : '') : ''}`);
    const nc = snap.keywords.filter((k) => k.tracked && k.cur.position === null && k.prev.position === null).length;
    if (snap.gsc && nc) L.push(`   ${nc} recherche(s) suivie(s) encore non classée(s).`);
    const top = snap.keywords.filter((k) => !k.tracked).slice(0, 5); if (top.length) L.push(`   Autres recherches qui amènent des visiteurs : ${top.map((k) => `« ${k.q} » (${k.cur.clicks} clic(s))`).join(', ')}`);
    L.push('', '2. ALERTES', ...(alerts.length ? alerts.map((a) => `   [${a.niveau}] ${a.texte}`) : ['   Aucune baisse ni anomalie détectée.']));
    L.push('', '3. PROPOSITIONS À VALIDER', `   ${pend ? `${pend} proposition(s) en attente dans https://gemabm.com/admin (rubrique Référencement)` : 'Aucune.'}`);
    L.push('', '4. SANTÉ DU SITE', `   ${snap.tech.every((t) => t.ok) ? 'Toutes les pages contrôlées répondent correctement.' : snap.tech.filter((t) => !t.ok).map((t) => `${t.check} : ${t.detail}`).join(' ; ')}`,
      `   Intelligence artificielle : ${ks?.ok ? 'clé active' : getConfig().apiKey ? 'clé à vérifier' : 'clé absente'} · Veille : ${veille ? `${veille.date}, ${veille.items.filter((i) => !i.hidden).length} sujet(s)` : 'aucune'} · Repères fiscaux : ${age('params.json')} · Actualité : ${age('news.json')}`);
    L.push('', '5. DEMANDES REÇUES HIER', `   Contacts : ${forms.contact || 0} · Rendez-vous : ${forms.rdv || 0} · Inscriptions lettre : ${forms.newsletter || 0}`);
    L.push('', '— Rapport automatique du site gemabm.com. Pour l\'arrêter : /admin → Référencement → Réglages du suivi.');
    await sendMail(`${alerts.some((a) => a.niveau === 'élevée') ? 'ALERTE — ' : ''}Rapport quotidien gemabm.com — ${snap.date}`, L.join('\n'));
  }
  return { ok: true, msg: `${snap.gsc ? `${snap.keywords.filter((k) => k.tracked && k.cur.position !== null).length}/${keywords().length} mots-clés classés` : 'Search Console non reliée'} · ${alerts.length} alerte(s) · ${nb} proposition(s)` };
}

/* ---------- propositions de Claude ---------- */
async function propose(snap: Snapshot): Promise<number> {
  const pending = readJSON<Proposal[]>('seo-propositions.json', []);
  const metas = LANGS.flatMap((l) => PAGES.map((p) => { const m = metaFor(l, p); return `${l}:${p} | ${m.title} | ${m.description}`; })).join('\n');
  const kw = snap.keywords.map((k) => `${k.tracked ? '[suivi] ' : ''}${k.q} : position ${k.prev.position ?? '—'} → ${k.cur.position ?? 'absent'} ; clics ${k.cur.clicks} ; apparitions ${k.cur.impressions}`).join('\n');
  const pages = snap.pages.map((p) => `${p.page} : apparitions ${p.prev.impressions} → ${p.cur.impressions} ; position ${p.prev.position ?? '—'} → ${p.cur.position ?? '—'}`).join('\n');
  const already = pending.filter((p) => p.statut === 'en attente').map((p) => `- ${p.type} ${p.page ? `${p.lang}:${p.page}` : ''} ${p.sujet || p.texte || p.title || ''}`).join('\n');
  const prompt = `Site : ${SITE_URL} (GEM Consult, cabinet d'expertise comptable et de commissariat aux comptes à Tunis, Montplaisir ; pages en français, anglais, arabe).\nDate : ${snap.date}. ${snap.gsc ? `Données Google Search Console ${snap.periode}.` : 'Search Console non reliée.'}\n\n`
    + `ALERTES :\n${snap.alerts.map((a) => `- [${a.niveau}] ${a.texte}`).join('\n') || '(aucune)'}\n\nMOTS-CLÉS :\n${kw || '(pas de données)'}\n\nPAGES :\n${pages || '(pas de données)'}\n\nCONTRÔLES TECHNIQUES :\n${snap.tech.map((t) => `- ${t.check} : ${t.detail}`).join('\n')}\n\n`
    + `TITRES ET DESCRIPTIONS ACTUELS (langue:page | titre | description) :\n${metas}\n\nPROPOSITIONS DÉJÀ EN ATTENTE (ne pas répéter) :\n${already || '(aucune)'}\n\n`
    + "Mission : en expert du référencement local (Google, Tunisie), explique brièvement les causes probables des baisses et propose au plus 5 actions concrètes, classées par priorité, pour remonter dans les résultats. Tu peux utiliser la recherche web pour voir quels concurrents se classent sur les requêtes concernées. Types possibles :\n"
    + '1. "meta" : nouveau titre (30 à 65 caractères, contenant « GEM Consult ») et nouvelle description (80 à 158 caractères) pour une page donnée (page parmi accueil, cabinet, services, references, outils, ressources, veille, contact ; lang parmi fr, en, ar ; rédigés dans la langue de la page, fidèles à l\'activité réelle, sans promesse ni superlatif invérifiable — règles de l\'OECT) ;\n'
    + '2. "article" : sujet d\'analyse à publier dans la veille du cabinet pour répondre à une requête (sujet + requête visée) ;\n3. "action" : action hors site à mener par le cabinet (fiche Google, avis clients, lien depuis un annuaire professionnel…).\n'
    + 'Format : <json>{"propositions":[{"type":"meta","page":"services","lang":"fr","title":"…","description":"…","raison":"…","priorite":"élevée"},{"type":"article","sujet":"…","requete":"…","raison":"…","priorite":"moyenne"},{"type":"action","texte":"…","raison":"…","priorite":"faible"}]}</json>. Les raisons tiennent en une phrase, en français.';
  const r = extractJSON<{ propositions: Record<string, string>[] }>(await claude(
    'Tu es le consultant en référencement du cabinet GEM Consult. Tu ne modifies rien toi-même : tes propositions sont relues par l\'expert-comptable associé avant publication. Réponds uniquement par un objet JSON entre <json> et </json>.',
    [{ role: 'user', content: prompt }], { web: 3, tag: 'seo', maxTokens: 3000 }));
  if (!r || !Array.isArray(r.propositions)) return 0;
  let n = 0; const prio = (p: string): Proposal['priorite'] => (['élevée', 'moyenne', 'faible'].includes(p) ? p as Proposal['priorite'] : 'moyenne');
  for (const x of r.propositions.slice(0, 5)) {
    let p: Proposal | null = null; const base = { date: snap.date, statut: 'en attente' as const, priorite: prio(x.priorite), raison: String(x.raison || '').slice(0, 400) };
    if (x.type === 'meta' && (PAGES as readonly string[]).includes(x.page) && (LANGS as readonly string[]).includes(x.lang)) {
      const title = String(x.title || '').trim(), description = String(x.description || '').trim();
      if (title.length >= 25 && title.length <= 70 && /GEM Consult/i.test(title) && description.length >= 70 && description.length <= 165)
        p = { ...base, id: hash(`meta${x.lang}${x.page}${title}`), type: 'meta', page: x.page as Page, lang: x.lang as Lang, title, description };
    } else if (x.type === 'article' && x.sujet) p = { ...base, id: hash(`art${x.sujet}`), type: 'article', sujet: String(x.sujet).slice(0, 200), requete: String(x.requete || '').slice(0, 100) };
    else if (x.type === 'action' && x.texte) p = { ...base, id: hash(`act${x.texte}`), type: 'action', texte: String(x.texte).slice(0, 400) };
    if (p && !pending.some((q) => q.id === p!.id)) { pending.unshift(p); n++; }
  }
  writeJSON('seo-propositions.json', pending.slice(0, 60));
  return n;
}

/** Sujets validés à traiter en priorité par la veille (14 jours). */
export const seoFocus = () => readJSON<{ sujet: string; requete: string; jusqu: string }[]>('seo-focus.json', []).filter((f) => f.jusqu >= todayTunis());
