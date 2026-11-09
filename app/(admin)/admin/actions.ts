'use server';
/** Actions de l'administration (exécutées côté serveur). Chaque action vérifie la session, puis revient sur /admin avec un message. */
import fs from 'node:fs';
import { headers } from 'next/headers';
import { redirect } from 'next/navigation';
import { after } from 'next/server';
import { closeSession, dropSetupCode, hashPassword, isAdmin, openSession, revokeAllSessions, setupCode, verifyPassword } from '@/lib/server/auth';
import { clientIp } from '@/lib/server/ratelimit';
import { bloque, echec, journal, succes } from '@/lib/server/securite';
import { checkCode, newSecret } from '@/lib/server/totp';
import { parseServiceAccount, testGsc } from '@/lib/server/gsc';
import { DEFAULT_KEYWORDS, type Override, type Proposal } from '@/lib/server/seo';
import { claude, MODEL_FAST } from '@/lib/server/claude';
import { cleanKey, getConfig, isAccountKey, keyLooksValid, maskKey, saveConfig, workspaceLooksValid } from '@/lib/server/config';
import { dataPath, readJSON, tailLog, writeJSON, nowTunis, todayTunis } from '@/lib/server/data';
import { sendMail } from '@/lib/server/mail';
import { getParams } from '@/lib/server/params';
import { runTask, type Echeances, type Veille, refreshPages } from '@/lib/server/tasks';

const back = (msg: string, err = false): never => redirect(`/admin?${err ? 'err' : 'msg'}=${encodeURIComponent(msg)}`);
const s = (f: FormData, k: string) => String(f.get(k) ?? '').trim();
const pause = () => new Promise((r) => setTimeout(r, 700));
async function guard() { if (!(await isAdmin())) redirect('/admin'); }

const ipNow = async () => clientIp(await headers());
const alerte = (sujet: string, texte: string) => after(async () => { await sendMail(sujet, texte); });

export async function setup(f: FormData) {
  if (getConfig().adminHash) back('Installation déjà effectuée.', true);
  await pause(); const ip = await ipNow(); const b = bloque(ip); if (b) back(b, true);
  const p1 = s(f, 'p1'), p2 = s(f, 'p2'), key = s(f, 'key');
  if (s(f, 'code').toUpperCase() !== setupCode()) { echec(ip, "code d'installation"); back("Code d'installation incorrect.", true); }
  if (p1.length < 12 || p1 !== p2) back('Mot de passe : 12 caractères minimum, identique dans les deux champs.', true);
  if (key && !keyLooksValid(key)) back('La clé API doit commencer par « sk-ant-api » ou « sk-ant-usr ».', true);
  const ws = s(f, 'workspace'); if (ws && !workspaceLooksValid(ws)) back("ID d'espace de travail non valide : il commence par « wrkspc_ ».", true);
  saveConfig({ adminHash: hashPassword(p1), apiKey: key || undefined, workspaceId: ws || undefined, mailTo: s(f, 'mail_to') || 'contact@gemabm.com', mailFrom: s(f, 'mail_from') || 'site@gemabm.com' });
  dropSetupCode(); await openSession();
  back('Installation terminée. Bienvenue !');
}
export async function login(f: FormData) {
  await pause(); const ip = await ipNow(); const b = bloque(ip); if (b) back(b, true);
  const cfg = getConfig();
  const fail = (quoi: string) => {
    if (echec(ip, quoi)) alerte('ALERTE sécurité — gemabm.com', `De nombreux essais de connexion infructueux ont visé l'administration du site. La connexion est fermée pendant 1 heure.\nDernière adresse : ${ip}\n\nSi ce n'est pas vous, aucune action n'est nécessaire : le site s'est protégé.`);
    back(quoi === 'code' ? 'Code de double authentification incorrect ou expiré.' : 'Mot de passe incorrect.', true);
  };
  if (!verifyPassword(s(f, 'pwd'), cfg.adminHash)) fail('mot de passe');
  if (cfg.totpSecret) { const k = checkCode(cfg.totpSecret, s(f, 'code'), cfg.totpLast ?? -1); if (k < 0) fail('code'); saveConfig({ totpLast: k }); }
  succes(ip); await openSession();
  alerte('Connexion à l’administration — gemabm.com', `Une connexion à l'administration du site a eu lieu le ${nowTunis()} depuis l'adresse ${ip}.\n\nSi ce n'est pas vous : connectez-vous, changez le mot de passe et cliquez sur « Déconnecter toutes les sessions ».`);
  redirect('/admin');
}
export async function logout() { await closeSession(); redirect('/admin'); }
export async function logoutAll() { await guard(); revokeAllSessions(); journal('Toutes les sessions déconnectées'); await closeSession(); redirect('/admin?msg=' + encodeURIComponent('Toutes les sessions ont été déconnectées. Reconnectez-vous.')); }

/** Double authentification : préparation (secret en attente), confirmation par un premier code, désactivation. */
export async function totpStart() { await guard(); saveConfig({ totpPending: newSecret() }); back('Scannez le code QR avec votre application, puis saisissez le code affiché.'); }
export async function totpCancel() { await guard(); saveConfig({ totpPending: null }); back('Activation annulée.'); }
export async function totpConfirm(f: FormData) {
  await guard(); const p = getConfig().totpPending; if (!p) back('Recommencez l’activation.', true);
  const k = checkCode(p!, s(f, 'code')); if (k < 0) back('Code incorrect : vérifiez l’heure du téléphone et saisissez le code affiché à l’instant.', true);
  saveConfig({ totpSecret: p, totpPending: null, totpLast: k }); revokeAllSessions(); await openSession(); journal('Double authentification ACTIVÉE');
  back('Double authentification activée : chaque connexion demandera désormais le code de votre téléphone.');
}
export async function totpDisable(f: FormData) {
  await guard(); const cfg = getConfig(); const ip = await ipNow();
  if (!verifyPassword(s(f, 'pwd'), cfg.adminHash) || !cfg.totpSecret || checkCode(cfg.totpSecret, s(f, 'code'), cfg.totpLast ?? -1) < 0) { echec(ip, 'désactivation double authentification'); back('Mot de passe ou code incorrect.', true); }
  saveConfig({ totpSecret: null, totpLast: null }); journal('Double authentification DÉSACTIVÉE');
  alerte('Double authentification désactivée — gemabm.com', `La double authentification de l'administration a été désactivée le ${nowTunis()} depuis ${ip}.`);
  back('Double authentification désactivée.');
}

export async function saveKey(f: FormData) {
  await guard(); const k = cleanKey(s(f, 'key')); const w = s(f, 'workspace');
  if (k && !keyLooksValid(k)) back('Clé non enregistrée : elle doit commencer par « sk-ant-api » ou « sk-ant-usr » (copiez-la depuis console.anthropic.com).', true);
  if (w && !workspaceLooksValid(w)) back("ID d'espace de travail non valide : il commence par « wrkspc_ ».", true);
  const finalKey = k || getConfig().apiKey;
  if (!finalKey) back('Collez d’abord la clé API.', true);
  if (isAccountKey(finalKey) && !w && !getConfig().workspaceId) back("Cette clé (sk-ant-usr…) exige l'ID de l'espace de travail (wrkspc_…) : il est indiqué dans la Console, lien « Trouver l'ID de votre espace de travail ».", true);
  // Une clé standard (sk-ant-api) n'a pas d'espace de travail : on efface un éventuel ID resté d'une ancienne clé.
  saveConfig({ apiKey: k || undefined, workspaceId: isAccountKey(finalKey) ? (w || undefined) : null }); try { fs.unlinkSync(/*turbopackIgnore: true*/ dataPath('key-status.json')); } catch { /* */ }
  back('Clé API enregistrée. Cliquez sur « Tester la clé ».');
}
export async function deleteKey() {
  await guard(); saveConfig({ apiKey: null, workspaceId: null }); try { fs.unlinkSync(/*turbopackIgnore: true*/ dataPath('key-status.json')); } catch { /* */ }
  back("Clé API supprimée : le site repasse en mode sans IA (l'assistant répond à partir de la FAQ).");
}
export async function testKey() {
  await guard(); const t0 = Date.now();
  const r = await claude('Réponds uniquement par : OK', [{ role: 'user', content: 'Test de connexion du site gemabm.com' }], { model: MODEL_FAST, maxTokens: 10, tag: 'test-cle', timeoutMs: 30000 });
  writeJSON('key-status.json', { ok: r !== '', at: new Date().toISOString() });
  if (r) back(`Connexion à Claude réussie avec ${maskKey(getConfig().apiKey)} (${((Date.now() - t0) / 1000).toFixed(1)} s). Le site est en mode intelligent.`);
  const last = tailLog('ia.log', 1);
  const why = /not scoped to a workspace|anthropic-workspace-id/i.test(last) ? "cette clé exige l'ID de l'espace de travail (wrkspc_…) : renseignez-le dans le champ prévu."
    : /workspace/i.test(last) && /HTTP 40[034]/.test(last) ? "ID d'espace de travail refusé : vérifiez qu'il correspond bien à la clé (Console → espaces de travail)."
    : last.includes('HTTP 401') ? 'clé refusée par Anthropic (invalide, mal copiée, expirée ou révoquée).'
    : /credit|billing/i.test(last) ? 'crédit insuffisant sur le compte Anthropic (Billing).'
    : last.includes('HTTP 429') ? 'limite de débit atteinte, réessayez dans quelques minutes.'
    : last.includes('HTTP 0') ? "le serveur n'arrive pas à joindre api.anthropic.com (pare-feu sortant du VPS ou du conteneur)."
    : /HTTP 404|model/i.test(last) ? 'modèle indisponible : vérifier les variables GEM_MODEL / GEM_MODEL_FAST.' : 'voir le détail technique.';
  const c = getConfig(); const src = c.keySource === 'env' ? 'clé du fichier .env du serveur' : 'clé saisie dans cette page';
  back(`Échec de la connexion avec ${maskKey(c.apiKey)} (${src}) : ${why} — Détail : ${last.slice(0, 220)}`, true);
}
export async function saveMail(f: FormData) {
  await guard(); const cur = getConfig();
  const host = s(f, 'smtp_host');
  saveConfig({
    mailTo: s(f, 'mail_to') || cur.mailTo, mailFrom: s(f, 'mail_from') || cur.mailFrom,
    smtp: host ? { host, port: Number(s(f, 'smtp_port') || 465), secure: f.get('smtp_secure') === 'on', user: s(f, 'smtp_user'), pass: s(f, 'smtp_pass') || cur.smtp?.pass || '' } : null,
  });
  const ok = await sendMail('Test — site gemabm.com', "Ceci est un e-mail de test envoyé depuis l'administration du site.");
  back(ok ? `Paramètres enregistrés et e-mail de test envoyé à ${getConfig().mailTo}.` : "Paramètres enregistrés, mais l'e-mail de test n'est pas parti : vérifier le serveur SMTP (journal ci-dessous).", !ok);
}
export async function changePassword(f: FormData) {
  await guard();
  if (!verifyPassword(s(f, 'old'), getConfig().adminHash)) { echec(await ipNow(), 'changement de mot de passe'); back('Mot de passe actuel incorrect.', true); }
  const p1 = s(f, 'p1'); if (p1.length < 12 || p1 !== s(f, 'p2')) back('Nouveau mot de passe : 12 caractères minimum, identique dans les deux champs.', true);
  saveConfig({ adminHash: hashPassword(p1) }); revokeAllSessions(); await openSession(); journal('Mot de passe administrateur modifié');
  alerte('Mot de passe modifié — gemabm.com', `Le mot de passe de l'administration a été modifié le ${nowTunis()}. Les autres sessions ont été déconnectées.`);
  back('Mot de passe modifié. Les autres sessions ouvertes ont été déconnectées.');
}
export async function toggleVeille(f: FormData) {
  await guard(); const v = readJSON<Veille>('veille.json', { days: [] }); let m = '';
  for (const d of v.days) for (const it of d.items) if (it.id === s(f, 'id')) { it.hidden = !it.hidden; m = it.hidden ? 'Sujet retiré du site.' : 'Sujet rétabli.'; }
  writeJSON('veille.json', v); refreshPages(); back(m || 'Sujet introuvable.', !m);
}
export async function toggleMois(f: FormData) {
  await guard(); const x = readJSON<Echeances>('echeances.json', { mois: {} }); const m = s(f, 'm');
  if (x.mois[m]) { x.mois[m].hidden = !x.mois[m].hidden; writeJSON('echeances.json', x); }
  back('Échéances mises à jour.');
}
export async function restoreParams(f: FormData) {
  await guard(); const name = s(f, 'f');
  if (!/^params-\d{8}-\d{6}\.json$/.test(name) || !fs.existsSync(/*turbopackIgnore: true*/ dataPath(name))) back('Version introuvable.', true);
  writeJSON(`params-${nowTunis().replace(/[-: ]/g, '').replace(/^(\d{8})(\d{6})$/, '$1-$2')}.json`, getParams());
  fs.copyFileSync(/*turbopackIgnore: true*/ dataPath(name), dataPath('params.json')); back(`Repères rétablis (${name}).`);
}
export async function runNow(f: FormData) {
  await guard(); const t = s(f, 't');
  if (t !== 'news' && t !== 'seo' && !getConfig().apiKey && !process.env.GEM_AI_MOCK) back("Enregistrez d'abord la clé API.", true);
  const r = await runTask(t); back(`Tâche « ${t} » : ${r.msg}`, !r.ok);
}

/* ---------- Référencement (Search Console + propositions) ---------- */
export async function saveGsc(f: FormData) {
  await guard(); const raw = String(f.get('gsckey') ?? '').trim(); const site = s(f, 'gscsite') || 'sc-domain:gemabm.com';
  if (raw && !parseServiceAccount(raw)) back('Clé non reconnue : collez le contenu complet du fichier JSON du compte de service (il contient « client_email » et « private_key »).', true);
  if (!/^(sc-domain:[a-z0-9.-]+|https:\/\/[^\s]+\/)$/.test(site)) back('Propriété Search Console non valide : « sc-domain:gemabm.com » ou « https://gemabm.com/ ».', true);
  const kw = String(f.get('keywords') ?? '').split('\n').map((x) => x.trim()).filter(Boolean).slice(0, 40);
  saveConfig({ gscKey: raw || undefined, gscSite: site, seoKeywords: kw.length ? kw : null, seoDaily: f.get('daily') === 'on' });
  back('Réglages du référencement enregistrés. Cliquez sur « Tester la connexion ».');
}
export async function deleteGsc() { await guard(); saveConfig({ gscKey: null }); back('Connexion à Search Console supprimée.'); }
export async function testGscAction() {
  await guard(); try { back(`Connexion à Search Console réussie : ${await testGsc()}.`); } catch (e) { if ((e as { digest?: string }).digest?.startsWith('NEXT_REDIRECT')) throw e; back(`Échec : ${(e as Error).message}`, true); }
}
export async function seoDecide(f: FormData) {
  await guard(); const id = s(f, 'id'); const ok = s(f, 'd') === 'ok';
  const list = readJSON<Proposal[]>('seo-propositions.json', []); const p = list.find((x) => x.id === id);
  if (!p || p.statut !== 'en attente') back('Proposition introuvable ou déjà traitée.', true);
  p!.statut = ok ? 'validée' : 'rejetée'; writeJSON('seo-propositions.json', list);
  if (!ok) back('Proposition rejetée.');
  if (p!.type === 'meta' && p!.lang && p!.page) {
    const o = readJSON<Record<string, Override>>('seo-overrides.json', {});
    o[`${p!.lang}:${p!.page}`] = { title: p!.title!, description: p!.description!, date: todayTunis(), proposition: p!.id };
    writeJSON('seo-overrides.json', o); refreshPages(); journal(`SEO : titre/description ${p!.lang}:${p!.page} modifiés`);
    back('Titre et description mis en ligne. Google en tiendra compte à son prochain passage.');
  }
  if (p!.type === 'article') {
    const fo = readJSON<{ sujet: string; requete: string; jusqu: string }[]>('seo-focus.json', []);
    const d = new Date(); d.setDate(d.getDate() + 14);
    fo.unshift({ sujet: p!.sujet!, requete: p!.requete || '', jusqu: d.toISOString().slice(0, 10) }); writeJSON('seo-focus.json', fo.slice(0, 10));
    back('Sujet transmis à la veille : il sera traité dès qu’une source officielle fiable le permet (dans les 14 jours).');
  }
  back('Action notée comme validée : à réaliser par le cabinet.');
}
export async function seoRevert(f: FormData) {
  await guard(); const k = s(f, 'k'); const o = readJSON<Record<string, Override>>('seo-overrides.json', {});
  delete o[k]; writeJSON('seo-overrides.json', o); refreshPages(); journal(`SEO : titre/description ${k} rétablis`);
  back('Titre et description d’origine rétablis.');
}
void DEFAULT_KEYWORDS;
