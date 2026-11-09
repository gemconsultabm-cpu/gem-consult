/** Formulaires : contact, rendez-vous, lettre d'information → e-mail au cabinet, puis analyse par Claude (tri + brouillon de réponse). */
import fs from 'node:fs';
import { after } from 'next/server';
import { claude, extractJSON, MODEL_FAST } from '@/lib/server/claude';
import { dataPath, log, readJSON, todayTunis, writeJSON } from '@/lib/server/data';
import { sendMail } from '@/lib/server/mail';
import { allow, clientIp } from '@/lib/server/ratelimit';

const clean = (v: unknown, max = 300) => String(v ?? '').replace(/[\r\0]/g, '').trim().slice(0, max);
const json = (b: unknown, status = 200) => Response.json(b, { status });

export async function POST(req: Request) {
  const origin = req.headers.get('origin');
  if (origin && !/^https:\/\/(www\.)?gemabm\.com$/.test(origin) && process.env.NODE_ENV === 'production' && !process.env.GEM_ALLOW_ANY_ORIGIN) return json({ ok: false }, 403);
  let d: Record<string, unknown>; try { d = await req.json(); } catch { return json({ ok: false, error: 'json' }, 400); }
  if (d.hp) return json({ ok: true });                                     // pot de miel : robot
  const type = ['contact', 'rdv', 'newsletter'].includes(String(d.type)) ? String(d.type) : 'contact';
  const email = clean(d.email, 160);
  if (!/^[^@\s]+@[^@\s]+\.[^@\s]+$/.test(email)) return json({ ok: false, error: 'email' }, 422);
  if (!allow(`c:${clientIp(req.headers)}`, 8, 3600)) return json({ ok: false, error: 'rate' }, 429);

  let subject: string; let body: string;
  if (type === 'newsletter') {
    fs.appendFileSync(/*turbopackIgnore: true*/ dataPath('newsletter.csv'), `${new Date().toISOString()};${email}\n`);
    subject = "Inscription — lettre d'information"; body = `Nouvelle inscription à la lettre d'information :\n${email}`;
  } else {
    const f: Record<string, string> = { 'Nom / raison sociale': clean(d.nom), 'E-mail': email, 'Téléphone': clean(d.tel, 40), 'Objet': clean(d.objet, 120) };
    if (type === 'rdv') { f['Date souhaitée'] = clean(d.date, 20); f['Mode'] = clean(d.mode, 60); }
    if (!f['Nom / raison sociale']) return json({ ok: false, error: 'nom' }, 422);
    subject = `${type === 'rdv' ? 'Demande de rendez-vous' : 'Demande de contact'} — ${f['Objet'] || 'site web'}`;
    body = Object.entries(f).map(([k, v]) => `${k} : ${v}`).join('\n') + `\nLangue : ${clean(d.lang, 2)}\n\nMessage :\n${clean(d.message, 5000)}\n\n— Envoyé depuis gemabm.com`;
  }
  const ok = await sendMail(subject, body, email);
  log(`formulaire ${type} : ${ok ? 'OK' : 'ÉCHEC'}`);
  // Compteur anonyme pour le rapport quotidien (aucune donnée personnelle conservée).
  try { const st = readJSON<Record<string, Record<string, number>>>('stats-formulaires.json', {}); const d0 = todayTunis(); (st[d0] ||= {})[type] = (st[d0][type] || 0) + 1;
    writeJSON('stats-formulaires.json', Object.fromEntries(Object.entries(st).sort().slice(-90))); } catch { /* non bloquant */ }
  if (!ok) return json({ ok: false, error: 'mail' }, 500);

  if (type !== 'newsletter') after(async () => {           // après la réponse au visiteur
    const sys = "Tu assistes le Cabinet GEM Consult (expertise comptable, commissariat aux comptes, fiscalité, expertise judiciaire, conciliation pénale, associations et organismes publics, Tunis). On te transmet une demande reçue via le site. Classe-la et prépare un brouillon de réponse que le cabinet relira avant envoi. Le brouillon est rédigé dans la langue du demandeur, courtois et professionnel, remercie, reformule le besoin, propose un rendez-vous ou un appel, liste les documents utiles à préparer ; il ne donne ni avis juridique définitif ni montant d'honoraires, et se termine par « Le Cabinet GEM Consult — +216 71 904 572 ». Réponds uniquement par un objet JSON entre <json> et </json>.";
    const prompt = `Demande reçue (${type === 'rdv' ? 'rendez-vous' : 'contact'}) :\n${body}\n\nFormat : <json>{"categorie":"audit légal|expertise comptable|fiscalité|contentieux fiscal|expertise judiciaire|conciliation pénale|association|organisme public|social-CNSS|autre","urgence":"élevée|moyenne|faible","motif_urgence":"…","resume":"2 phrases","points_a_verifier":["…"],"documents_a_demander":["…"],"brouillon_reponse":"…"}</json>`;
    const a = extractJSON<Record<string, any>>(await claude(sys, [{ role: 'user', content: prompt }], { model: MODEL_FAST, maxTokens: 1500, tag: 'tri', timeoutMs: 60000 }));
    if (!a) return;
    const li = (x: unknown) => (Array.isArray(x) ? x : []).slice(0, 8).map((v) => `- ${v}`).join('\n');
    const urg = String(a.urgence || '').toUpperCase();
    await sendMail(`[${urg}] Analyse IA — ${subject}`,
      `Analyse automatique de la demande de ${clean(d.nom)} <${email}>\n\nCatégorie : ${a.categorie ?? '?'}\nUrgence : ${urg} — ${a.motif_urgence ?? ''}\n\nRésumé : ${a.resume ?? ''}\n\nPoints à vérifier :\n${li(a.points_a_verifier)}\n\nDocuments à demander :\n${li(a.documents_a_demander)}\n\n———— BROUILLON DE RÉPONSE (à relire avant envoi) ————\n\n${a.brouillon_reponse ?? ''}\n\n————\nRépondre à ce message répond directement au demandeur.`, email);
  });
  return json({ ok: true });
}
