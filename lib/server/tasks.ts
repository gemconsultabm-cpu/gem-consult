/** Tâches quotidiennes « site intelligent » : veille commentée, vérification des repères fiscaux, échéances du mois. Publication automatique avec garde-fous. */
import { claude, extractJSON, tri, txt, urlOk, type Tri } from './claude';
import { log, readJSON, todayTunis, writeJSON, nowTunis } from './data';
import { sendMail } from './mail';
import { revalidatePath } from 'next/cache';
import { getParams, paramsText, validParams, type Change, type Params } from './params';
import { readNews, updateNews } from './news';
import { seoFocus, taskSeo } from './seo';

const TRI_RULE = 'Chaque texte est fourni en trois langues dans un objet {"fr":…,"en":…,"ar":…} : français professionnel, anglais, arabe juridique standard (usage tunisien : « الأداء على القيمة المضافة », « مجلة الحقوق والإجراءات الجبائية », « الرائد الرسمي »).';
const SYS = "Tu travailles pour le Cabinet GEM Consult, cabinet d'expertise comptable et de commissariat aux comptes à Tunis. Ton travail est publié automatiquement sur le site du cabinet : n'écris QUE des faits que tu as lus dans une source datée et vérifiable, n'invente jamais de chiffre, d'article ou de lien, et signale ce qui n'est qu'un projet (projet de loi, annonce) plutôt qu'un texte en vigueur. Réponds uniquement par un objet JSON placé entre <json> et </json>.";

export type VeilleItem = { id: string; theme: string; titre: Tri; resume: Tri; impact: Tri; source_nom: string; source_url: string; date: string; hidden: boolean };
export type Veille = { updated?: string; days: { date: string; generated: string; items: VeilleItem[] }[] };
export type Echeances = { updated?: string; mois: Record<string, { items: { date: string; libelle: Tri }[]; source: string; generated: string; hidden: boolean }> };
type Result = { ok: boolean; msg: string };
const hash = (s: string) => { let h = 0; for (const c of s) h = (h * 31 + c.charCodeAt(0)) | 0; return (h >>> 0).toString(16); };

export async function taskVeille(): Promise<Result> {
  const news = readNews(); const prev = readJSON<Veille>('veille.json', { days: [] }); const today = todayTunis();
  const seen = prev.days.slice(0, 10).flatMap((d) => d.items.map((i) => i.titre.fr));
  const heads = news.items.slice(0, 15).map((i) => `- ${i.t} (${i.s}, ${i.d}) ${i.l}\n   ${i.desc.slice(0, 300)}`).join('\n');
  const focus = seoFocus().map((f) => `- ${f.sujet} (requête Google visée : « ${f.requete} »)`).join('\n');
  const prompt = `Date du jour : ${today} (Tunis).\n\nTitres du jour sélectionnés par le site :\n${heads || '(aucun)'}\n\nSujets déjà traités ces derniers jours (ne pas les répéter sauf fait nouveau) :\n- ${seen.join('\n- ')}\n\n`
    + (focus ? `Sujets validés par le cabinet pour le référencement (en traiter un s'il existe une source officielle récente et fiable ; sinon l'ignorer) :\n${focus}\n\n` : '')
    + "Mission : rédige la veille quotidienne du cabinet. Utilise la recherche web pour vérifier les faits et pour repérer les annonces officielles des dernières 48 heures (Direction générale des impôts, JORT, ministère des Finances, CNSS, OECT, BCT, CMF, RNE, Assemblée des représentants du peuple). "
    + "Retiens de 3 à 6 sujets réellement utiles aux entreprises, associations et organismes publics clients d'un cabinet comptable tunisien (fiscalité, comptabilité et audit, social, réglementation, financement). "
    + "Pour chacun : un titre (12 mots max), un résumé factuel (60 mots max), « ce que cela change pour vos clients » (50 mots max, concret, prudent), le thème (fiscalité, social, comptabilité-audit, réglementation, banque-marchés, sociétés), la source (nom + URL exacte de l'article lu) et sa date. "
    + `${TRI_RULE}\nFormat : <json>{"items":[{"theme":"fiscalité","titre":{…},"resume":{…},"impact":{…},"source_nom":"…","source_url":"https://…","date":"YYYY-MM-DD"}]}</json>. S'il n'y a rien de fiable et utile aujourd'hui, renvoie {"items":[]}.`;
  const r = extractJSON<{ items: Record<string, unknown>[] }>(await claude(SYS, [{ role: 'user', content: prompt }], { web: 6, tag: 'veille', maxTokens: 4000 }));
  if (!r || !Array.isArray(r.items)) return { ok: false, msg: 'réponse illisible' };
  const items: VeilleItem[] = [];
  for (const it of r.items) {
    const t = tri(it.titre, 140), re = tri(it.resume, 600), im = tri(it.impact, 500), u = String(it.source_url || '');
    if (!t || !re || !im || !urlOk(u)) continue;
    items.push({ id: hash(u + t.fr), theme: txt(it.theme, 40), titre: t, resume: re, impact: im, source_nom: txt(it.source_nom, 80), source_url: u,
      date: /^\d{4}-\d{2}-\d{2}$/.test(String(it.date)) ? String(it.date) : today, hidden: false });
    if (items.length >= 6) break;
  }
  if (!items.length) return { ok: true, msg: "rien de nouveau aujourd'hui" };
  const days = [{ date: today, generated: nowTunis(), items }, ...prev.days.filter((d) => d.date !== today)].slice(0, 30);
  writeJSON('veille.json', { updated: nowTunis(), days });
  return { ok: true, msg: `${items.length} sujet(s) publiés` };
}

export async function taskReperes(): Promise<Result> {
  const p = getParams(); const { changes: _c, ...cur } = p;
  const prompt = `Date du jour : ${todayTunis()}.\nRepères actuellement utilisés par le site (JSON) :\n${JSON.stringify(cur)}\n\nEn clair :\n${paramsText(p)}\n\n`
    + "Mission : vérifie, par la recherche web, si l'un de ces repères a été MODIFIÉ par un texte publié ou définitivement adopté (loi de finances publiée au JORT, décret, arrêté, note commune de la DGI, décision de la CNSS). "
    + "Priorité : la loi de finances pour l'année prochaine (barème IRPP, contribution sociale de solidarité, taux d'IS, TVA, forfait, pénalités, déductions). "
    + 'Un simple projet de loi ou une annonce ne suffit PAS : dans ce cas, ne change rien et mentionne-le dans "a_surveiller". '
    + 'Si un changement est en vigueur ou entrera en vigueur à une date certaine, renvoie le jeu COMPLET de repères mis à jour (mêmes clés, même format ; "irpp" = liste [plafond_tranche, taux], dernière tranche avec plafond null) '
    + `et la liste des changements avec la source officielle ou de presse fiable (URL exacte) et la date d'effet. ${TRI_RULE}\nFormat : <json>{"change":true|false,"params":{…},"changes":[{"cle":"irpp|css_points|…","description":{…},"date_effet":"YYYY-MM-DD","source":"https://…"}],"a_surveiller":{…}}</json>`;
  const r = extractJSON<Record<string, any>>(await claude(SYS, [{ role: 'user', content: prompt }], { web: 8, tag: 'reperes', maxTokens: 3500 }));
  if (!r) return { ok: false, msg: 'réponse illisible' };
  const next: Params = { ...p, verified: new Date().toISOString() };
  const w = tri(r.a_surveiller, 600); if (w) next.a_surveiller = { ...w, date: todayTunis() };
  if (!r.change) { writeJSON('params.json', next); return { ok: true, msg: 'aucun changement' }; }
  const cand = { ...cur, ...(r.params || {}) } as Params;
  const chg: Change[] = (Array.isArray(r.changes) ? r.changes : []).flatMap((c: Record<string, unknown>) => {
    const d = tri(c.description, 500); const src = String(c.source || '');
    return d && urlOk(src, true) ? [{ date: todayTunis(), cle: txt(c.cle, 40), description: d, date_effet: txt(c.date_effet, 10), source: src }] : [];
  });
  const why = chg.length ? validParams(cand) : 'source non fiable ou absente';
  if (why) {
    writeJSON('params.json', next);
    await sendMail('Repères fiscaux : changement détecté mais NON appliqué', `Claude a signalé un changement, refusé par les contrôles automatiques (${why}).\n\nRéponse reçue :\n${JSON.stringify(r, null, 2)}`);
    return { ok: false, msg: `changement refusé : ${why}` };
  }
  writeJSON(`params-${nowTunis().replace(/[-: ]/g, '').replace(/^(\d{8})(\d{6})$/, '$1-$2')}.json`, p);   // historique
  writeJSON('params.json', { ...cand, verified: new Date().toISOString(), updated: todayTunis(), a_surveiller: next.a_surveiller, changes: [...chg, ...(p.changes || [])].slice(0, 30) });
  await sendMail('Repères fiscaux mis à jour automatiquement sur le site', `Les repères suivants ont été modifiés et publiés sur gemabm.com :\n\n${chg.map((c) => `- ${c.description.fr} (effet : ${c.date_effet})\n  Source : ${c.source}`).join('\n')}\n\nPour annuler : https://gemabm.com/admin → « Rétablir » une version précédente.`);
  return { ok: true, msg: `${chg.length} changement(s) appliqué(s)` };
}

export async function taskEcheances(): Promise<Result> {
  const today = todayTunis(); const day = +today.slice(8, 10);
  const d = new Date(`${today}T12:00:00Z`); if (day >= 20) d.setUTCMonth(d.getUTCMonth() + 1, 1);
  const m = d.toISOString().slice(0, 7);
  const prompt = `Mois visé : ${m}.\nMission : trouve, par la recherche web, le communiqué de la Direction générale des impôts (ministère des Finances) fixant les échéances fiscales de ce mois (déclarations mensuelles des personnes physiques et morales, télédéclaration, acomptes provisionnels, déclarations annuelles, autres obligations). Relève chaque échéance avec sa date exacte et son libellé. N'invente rien : si le communiqué de ce mois n'est pas encore publié, renvoie {"items":[]}. ${TRI_RULE}\nFormat : <json>{"mois":"${m}","items":[{"date":"YYYY-MM-DD","libelle":{…}}],"source":"https://…"}</json>`;
  const r = extractJSON<Record<string, any>>(await claude(SYS, [{ role: 'user', content: prompt }], { web: 5, tag: 'echeances', maxTokens: 2500 }));
  if (!r || !Array.isArray(r.items)) return { ok: false, msg: 'réponse illisible' };
  const items = r.items.flatMap((it: Record<string, unknown>) => {
    const dt = String(it.date || ''); const l = tri(it.libelle, 250);
    const ok = l && dt.startsWith(`${m}-`) && /^\d{4}-\d{2}-\d{2}$/.test(dt) && !isNaN(+new Date(`${dt}T00:00:00Z`)) && new Date(`${dt}T00:00:00Z`).toISOString().startsWith(dt);
    return ok ? [{ date: dt, libelle: l! }] : [];
  }).sort((a: { date: string }, b: { date: string }) => a.date.localeCompare(b.date));
  if (!items.length || !urlOk(r.source, true)) return { ok: true, msg: `communiqué non trouvé pour ${m}` };
  const all = readJSON<Echeances>('echeances.json', { mois: {} });
  all.mois[m] = { items, source: r.source, generated: nowTunis(), hidden: false };
  all.mois = Object.fromEntries(Object.entries(all.mois).sort((a, b) => b[0].localeCompare(a[0])).slice(0, 6)); all.updated = nowTunis();
  writeJSON('echeances.json', all);
  return { ok: true, msg: `${items.length} échéance(s) pour ${m}` };
}

export const TASKS: Record<string, () => Promise<Result>> = {
  news: async () => { const r = await updateNews(); return { ok: r.ok, msg: `${r.n} article(s) de ${r.feeds} source(s)` }; },
  veille: taskVeille, reperes: taskReperes, echeances: taskEcheances, seo: taskSeo,
};
export async function runTask(t: string): Promise<Result> {
  const fn = TASKS[t]; if (!fn) return { ok: false, msg: 'tâche inconnue' };
  let r: Result; try { r = await fn(); } catch (e) { r = { ok: false, msg: (e as Error).message }; }
  log(`tâche ${t} : ${JSON.stringify(r)}`);
  if (r.ok && (t === 'veille' || t === 'seo')) refreshPages();
  return r;
}

/** Régénère les pages publiques (liste de la veille, analyses, plan du site) dès qu'un contenu change. */
export function refreshPages() { try { revalidatePath('/', 'layout'); revalidatePath('/sitemap.xml'); } catch { /* hors contexte de requête */ } }
