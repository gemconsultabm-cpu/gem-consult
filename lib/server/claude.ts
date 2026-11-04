/** Appels à l'API Claude d'Anthropic (rédaction, recherche web, analyse). Mode test : GEM_AI_MOCK=/dossier (réponses <tag>.txt). */
import fs from 'node:fs';
import path from 'node:path';
import { getConfig } from './config';
import { log } from './data';

export const MODEL = process.env.GEM_MODEL || 'claude-sonnet-5-5';          // rédaction, assistant
export const MODEL_FAST = process.env.GEM_MODEL_FAST || 'claude-haiku-5-5'; // tri des demandes
const WEB_SEARCH = process.env.GEM_WEB_SEARCH_TOOL || 'web_search_20250305';

export const TRUSTED = [
  'iort.gov.tn', 'finances.gov.tn', 'impots.finances.gov.tn', 'douane.gov.tn', 'cnss.tn', 'bct.gov.tn', 'cmf.tn',
  'oect.org.tn', 'registre-entreprises.tn', 'arp.tn', 'pm.gov.tn', 'legislation-securite.tn', 'jurisitetunisie.com',
  'lapresse.tn', 'webmanagercenter.com', 'leconomistemaghrebin.com', 'managers.tn', 'businessnews.com.tn',
  'tap.info.tn', 'espacemanager.com', 'ilboursa.com', 'africanmanager.com', 'kapitalis.com', 'tunisienumerique.com', 'allafrica.com',
];
export type Msg = { role: 'user' | 'assistant'; content: unknown };
type Opts = { model?: string; maxTokens?: number; web?: number; tag?: string; timeoutMs?: number; system?: string };

export async function claude(system: string, messages: Msg[], o: Opts = {}): Promise<string> {
  const tag = o.tag || 'ia';
  if (process.env.GEM_AI_MOCK) {
    const f = path.join(process.env.GEM_AI_MOCK, `${tag}.txt`);
    return fs.existsSync(/*turbopackIgnore: true*/ f) ? fs.readFileSync(/*turbopackIgnore: true*/ f, 'utf8') : '';
  }
  const cfg = getConfig(); const key = cfg.apiKey;
  if (!key) { log(`${tag} : clé API absente`); return ''; }
  // Clés de compte (sk-ant-usr) : l'ID de l'espace de travail est obligatoire (en-tête anthropic-workspace-id)
  const baseHeaders: Record<string, string> = { 'content-type': 'application/json', 'anthropic-version': '2023-06-01' };
  if (cfg.workspaceId) baseHeaders['anthropic-workspace-id'] = cfg.workspaceId;
  let auth: Record<string, string> = { 'x-api-key': key };
  const body: Record<string, unknown> = { model: o.model || MODEL, max_tokens: o.maxTokens || 2500, system, messages: [...messages] };
  if (o.web) body.tools = [{ type: WEB_SEARCH, name: 'web_search', max_uses: o.web }];
  let text = '';
  for (let turn = 0; turn < 4; turn++) {
    const ctrl = new AbortController(); const to = setTimeout(() => ctrl.abort(), o.timeoutMs || 120000);
    let res: Response;
    try {
      res = await fetch(process.env.GEM_ANTHROPIC_URL || 'https://api.anthropic.com/v1/messages', {
        method: 'POST', signal: ctrl.signal,
        headers: { ...baseHeaders, ...auth },
        body: JSON.stringify(body),
      });
    } catch (e) { clearTimeout(to); log(`${tag} : HTTP 0 ${(e as Error).message}`); return ''; }
    clearTimeout(to);
    const raw = await res.text();
    // Certaines clés de compte exigent l'authentification « Bearer » : une seule nouvelle tentative
    if (res.status === 401 && key.startsWith('sk-ant-usr') && 'x-api-key' in auth) { auth = { authorization: `Bearer ${key}` }; turn--; continue; }
    if (res.status !== 200) { log(`${tag} : HTTP ${res.status} ${raw.slice(0, 300)}`); return ''; }
    const j = JSON.parse(raw) as { content: { type: string; text?: string }[]; stop_reason: string };
    for (const c of j.content) if (c.type === 'text' && c.text) text += c.text;
    if (j.stop_reason !== 'pause_turn') break;            // recherche longue : on relance la suite
    (body.messages as Msg[]).push({ role: 'assistant', content: j.content });
  }
  log(`${tag} : OK ${text.length} car.`);
  return text.trim();
}

/** Premier objet JSON d'une réponse (balises <json>…</json> ou bloc ```json). */
export function extractJSON<T = Record<string, unknown>>(t: string): T | null {
  const m = t.match(/<json>([\s\S]*?)<\/json>/) || t.match(/```(?:json)?\s*([\s\S]*?)```/);
  const s = m ? m[1] : t; const a = s.indexOf('{'); const b = s.lastIndexOf('}');
  if (a < 0 || b < 0) return null;
  try { const j = JSON.parse(s.slice(a, b + 1)); return j && typeof j === 'object' ? (j as T) : null; } catch { return null; }
}
export function urlOk(u: unknown, trustedOnly = false): boolean {
  if (typeof u !== 'string') return false;
  let h: string; try { const x = new URL(u); if (!/^https?:$/.test(x.protocol)) return false; h = x.hostname.toLowerCase().replace(/^www\./, ''); } catch { return false; }
  return !trustedOnly || TRUSTED.some((d) => h === d || h.endsWith(`.${d}`));
}
export type Tri = { fr: string; en: string; ar: string };
export const txt = (v: unknown, max = 900) => String(v ?? '').replace(/<[^>]*>/g, '').trim().slice(0, max);
export function tri(v: unknown, max = 900): Tri | null {
  if (!v || typeof v !== 'object') return null; const o = v as Record<string, unknown>;
  if (!o.fr) return null;
  return { fr: txt(o.fr, max), en: txt(o.en ?? o.fr, max), ar: txt(o.ar ?? o.fr, max) };
}
