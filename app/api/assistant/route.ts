/** Assistant IA du site : relais vers Claude, avec repères vérifiés du jour et veille récente du cabinet. */
import { assistantPrompt } from '@/lib/server/assistant-prompt';
import { claude, MODEL } from '@/lib/server/claude';
import { getConfig } from '@/lib/server/config';
import { readJSON, todayTunis } from '@/lib/server/data';
import { getParams, paramsText } from '@/lib/server/params';
import { allow, clientIp } from '@/lib/server/ratelimit';
import type { Veille } from '@/lib/server/tasks';

const MAX_PER_DAY = Number(process.env.GEM_ASSISTANT_MAX_PER_DAY || 600);
let day = ''; let dayCount = 0;

export async function POST(req: Request) {
  if (!getConfig().apiKey && !process.env.GEM_AI_MOCK) return Response.json({ ok: false, error: 'not_configured' }, { status: 503 });
  let d: { lang?: string; messages?: { role?: string; content?: unknown }[] };
  try { d = await req.json(); } catch { return Response.json({ ok: false }, { status: 400 }); }
  const lang = ['fr', 'en', 'ar'].includes(String(d.lang)) ? String(d.lang) : 'fr';
  const msgs: { role: 'user' | 'assistant'; content: string }[] = [];
  for (const m of (Array.isArray(d.messages) ? d.messages : []).slice(-10)) {
    const role = m.role === 'assistant' ? 'assistant' : 'user'; const c = String(m.content ?? '').trim().slice(0, 1500);
    if (!c) continue;
    if (msgs.length && msgs[msgs.length - 1].role === role) msgs[msgs.length - 1].content += `\n${c}`; else msgs.push({ role, content: c });
  }
  while (msgs.length && msgs[0].role !== 'user') msgs.shift();
  if (!msgs.length || msgs[msgs.length - 1].role !== 'user') return Response.json({ ok: false }, { status: 400 });
  if (!allow(`a:${clientIp(req.headers)}`, 25, 3600)) return Response.json({ ok: false, error: 'rate' }, { status: 429 });
  const t = todayTunis(); if (t !== day) { day = t; dayCount = 0; }
  if (++dayCount > MAX_PER_DAY) return Response.json({ ok: false, error: 'quota' }, { status: 429 });

  const p = getParams();
  let system = assistantPrompt({ fr: 'français', en: 'anglais', ar: 'arabe' }[lang]!);
  system += `\n\nREPÈRES À JOUR (vérifiés automatiquement le ${p.verified ? new Date(p.verified).toLocaleDateString('fr-FR', { timeZone: 'Africa/Tunis' }) : 'n.c.'} ; ils PRÉVALENT sur la liste ci-dessus en cas de différence) :\n${paramsText(p)}`;
  for (const c of p.changes.slice(0, 5)) system += `\n- Changement récent : ${c.description.fr} (effet ${c.date_effet}, source ${c.source})`;
  if (p.a_surveiller?.fr) system += `\nÀ surveiller (non encore en vigueur) : ${p.a_surveiller.fr}`;
  const v = readJSON<Veille>('veille.json', { days: [] });
  const recent = v.days.flatMap((x) => x.items.filter((i) => !i.hidden).map((i) => `- ${x.date} : ${i.titre.fr} — ${i.resume.fr} (source : ${i.source_url})`)).slice(0, 8);
  if (recent.length) system += `\n\nVEILLE RÉCENTE DU CABINET (tu peux t'y référer) :\n${recent.join('\n')}`;

  const reply = await claude(system, msgs, { model: MODEL, maxTokens: 900, tag: 'assistant', timeoutMs: 40000 });
  if (!reply) return Response.json({ ok: false, error: 'upstream' }, { status: 502 });
  return Response.json({ ok: true, reply });
}
