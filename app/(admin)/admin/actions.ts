'use server';
/** Actions de l'administration (exécutées côté serveur). Chaque action vérifie la session, puis revient sur /admin avec un message. */
import fs from 'node:fs';
import { redirect } from 'next/navigation';
import { closeSession, dropSetupCode, hashPassword, isAdmin, openSession, setupCode, verifyPassword } from '@/lib/server/auth';
import { claude, MODEL_FAST } from '@/lib/server/claude';
import { getConfig, isAccountKey, keyLooksValid, saveConfig, workspaceLooksValid } from '@/lib/server/config';
import { dataPath, readJSON, tailLog, writeJSON, nowTunis } from '@/lib/server/data';
import { sendMail } from '@/lib/server/mail';
import { getParams } from '@/lib/server/params';
import { runTask, type Echeances, type Veille, refreshPages } from '@/lib/server/tasks';

const back = (msg: string, err = false): never => redirect(`/admin?${err ? 'err' : 'msg'}=${encodeURIComponent(msg)}`);
const s = (f: FormData, k: string) => String(f.get(k) ?? '').trim();
const pause = () => new Promise((r) => setTimeout(r, 700));
async function guard() { if (!(await isAdmin())) redirect('/admin'); }

export async function setup(f: FormData) {
  if (getConfig().adminHash) back('Installation déjà effectuée.', true);
  await pause();
  const p1 = s(f, 'p1'), p2 = s(f, 'p2'), key = s(f, 'key');
  if (s(f, 'code').toUpperCase() !== setupCode()) back("Code d'installation incorrect.", true);
  if (p1.length < 10 || p1 !== p2) back('Mot de passe : 10 caractères minimum, identique dans les deux champs.', true);
  if (key && !keyLooksValid(key)) back('La clé API doit commencer par « sk-ant-api » ou « sk-ant-usr ».', true);
  const ws = s(f, 'workspace'); if (ws && !workspaceLooksValid(ws)) back("ID d'espace de travail non valide : il commence par « wrkspc_ ».", true);
  saveConfig({ adminHash: hashPassword(p1), apiKey: key || undefined, workspaceId: ws || undefined, mailTo: s(f, 'mail_to') || 'contact@gemabm.com', mailFrom: s(f, 'mail_from') || 'site@gemabm.com' });
  dropSetupCode(); await openSession();
  back('Installation terminée. Bienvenue !');
}
export async function login(f: FormData) {
  await pause();
  if (!verifyPassword(s(f, 'pwd'), getConfig().adminHash)) back('Mot de passe incorrect.', true);
  await openSession(); redirect('/admin');
}
export async function logout() { await closeSession(); redirect('/admin'); }

export async function saveKey(f: FormData) {
  await guard(); const k = s(f, 'key'); const w = s(f, 'workspace');
  if (k && !keyLooksValid(k)) back('Clé non enregistrée : elle doit commencer par « sk-ant-api » ou « sk-ant-usr » (copiez-la depuis console.anthropic.com).', true);
  if (w && !workspaceLooksValid(w)) back("ID d'espace de travail non valide : il commence par « wrkspc_ ».", true);
  const finalKey = k || getConfig().apiKey;
  if (!finalKey) back('Collez d’abord la clé API.', true);
  if (isAccountKey(finalKey) && !w && !getConfig().workspaceId) back("Cette clé (sk-ant-usr…) exige l'ID de l'espace de travail (wrkspc_…) : il est indiqué dans la Console, lien « Trouver l'ID de votre espace de travail ».", true);
  saveConfig({ apiKey: k || undefined, workspaceId: w || undefined }); try { fs.unlinkSync(/*turbopackIgnore: true*/ dataPath('key-status.json')); } catch { /* */ }
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
  if (r) back(`Connexion à Claude réussie (${((Date.now() - t0) / 1000).toFixed(1)} s). Le site est en mode intelligent.`);
  const last = tailLog('ia.log', 1);
  const why = /not scoped to a workspace|anthropic-workspace-id/i.test(last) ? "cette clé exige l'ID de l'espace de travail (wrkspc_…) : renseignez-le dans le champ prévu."
    : /workspace/i.test(last) && /HTTP 40[034]/.test(last) ? "ID d'espace de travail refusé : vérifiez qu'il correspond bien à la clé (Console → espaces de travail)."
    : last.includes('HTTP 401') ? 'clé refusée par Anthropic (invalide, mal copiée, expirée ou révoquée).'
    : /credit|billing/i.test(last) ? 'crédit insuffisant sur le compte Anthropic (Billing).'
    : last.includes('HTTP 429') ? 'limite de débit atteinte, réessayez dans quelques minutes.'
    : last.includes('HTTP 0') ? "le serveur n'arrive pas à joindre api.anthropic.com (pare-feu sortant du VPS ou du conteneur)."
    : /HTTP 404|model/i.test(last) ? 'modèle indisponible : vérifier les variables GEM_MODEL / GEM_MODEL_FAST.' : 'voir le détail technique.';
  back(`Échec de la connexion : ${why} — Détail : ${last.slice(0, 220)}`, true);
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
  if (!verifyPassword(s(f, 'old'), getConfig().adminHash)) back('Mot de passe actuel incorrect.', true);
  const p1 = s(f, 'p1'); if (p1.length < 10 || p1 !== s(f, 'p2')) back('Nouveau mot de passe : 10 caractères minimum, identique dans les deux champs.', true);
  saveConfig({ adminHash: hashPassword(p1) }); back('Mot de passe modifié.');
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
  if (t !== 'news' && !getConfig().apiKey && !process.env.GEM_AI_MOCK) back("Enregistrez d'abord la clé API.", true);
  const r = await runTask(t); back(`Tâche « ${t} » : ${r.msg}`, !r.ok);
}
