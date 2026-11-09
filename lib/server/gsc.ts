/** Accès en lecture à Google Search Console par un compte de service (clé JSON saisie dans /admin, jamais affichée).
 *  Authentification OAuth 2 « JWT bearer » signée en RS256 avec le module crypto de Node : aucune dépendance externe. */
import crypto from 'node:crypto';
import { getConfig } from './config';

type SA = { client_email: string; private_key: string; token_uri?: string };
const TOKEN_URL = () => process.env.GEM_GOOGLE_TOKEN_URL || 'https://oauth2.googleapis.com/token';
const API = () => process.env.GEM_GSC_URL || 'https://searchconsole.googleapis.com';
const SCOPE = 'https://www.googleapis.com/auth/webmasters.readonly';

export function parseServiceAccount(raw?: string): SA | null {
  try { const j = JSON.parse(String(raw || '')) as SA; return j.client_email && /BEGIN (RSA )?PRIVATE KEY/.test(j.private_key) ? j : null; } catch { return null; }
}
export const gscSite = () => getConfig().gscSite || 'sc-domain:gemabm.com';
export const gscReady = () => !!parseServiceAccount(getConfig().gscKey);

let cache: { token: string; exp: number } | null = null;
const b64u = (b: Buffer | string) => Buffer.from(b).toString('base64').replace(/=+$/, '').replace(/\+/g, '-').replace(/\//g, '_');

async function token(): Promise<string> {
  if (cache && cache.exp > Date.now() + 60_000) return cache.token;
  const sa = parseServiceAccount(getConfig().gscKey); if (!sa) throw new Error('clé du compte de service absente ou illisible');
  const now = Math.floor(Date.now() / 1000);
  const head = b64u(JSON.stringify({ alg: 'RS256', typ: 'JWT' }));
  const claims = b64u(JSON.stringify({ iss: sa.client_email, scope: SCOPE, aud: 'https://oauth2.googleapis.com/token', iat: now, exp: now + 3600 }));
  const sig = b64u(crypto.createSign('RSA-SHA256').update(`${head}.${claims}`).sign(sa.private_key));
  const res = await fetch(TOKEN_URL(), { method: 'POST', headers: { 'content-type': 'application/x-www-form-urlencoded' },
    body: new URLSearchParams({ grant_type: 'urn:ietf:params:oauth:grant-type:jwt-bearer', assertion: `${head}.${claims}.${sig}` }) });
  const j = await res.json().catch(() => ({})) as { access_token?: string; expires_in?: number; error_description?: string; error?: string };
  if (!res.ok || !j.access_token) throw new Error(`Google a refusé la connexion : ${j.error_description || j.error || res.status}`);
  cache = { token: j.access_token, exp: Date.now() + (j.expires_in || 3600) * 1000 };
  return cache.token;
}
async function call<T>(path: string, body?: unknown): Promise<T> {
  const res = await fetch(`${API()}${path}`, { method: body ? 'POST' : 'GET',
    headers: { authorization: `Bearer ${await token()}`, ...(body ? { 'content-type': 'application/json' } : {}) }, body: body ? JSON.stringify(body) : undefined });
  const j = await res.json().catch(() => ({})) as T & { error?: { message?: string } };
  if (!res.ok) throw new Error(res.status === 403
    ? `accès refusé à ${gscSite()} : ajoutez l'adresse du compte de service comme utilisateur de la propriété dans Search Console (Paramètres → Utilisateurs et autorisations)`
    : `Search Console ${res.status} : ${j.error?.message || ''}`);
  return j;
}

export type Row = { keys: string[]; clicks: number; impressions: number; ctr: number; position: number };
export async function searchAnalytics(start: string, end: string, dimensions: string[], rowLimit = 250): Promise<Row[]> {
  const r = await call<{ rows?: Row[] }>(`/webmasters/v3/sites/${encodeURIComponent(gscSite())}/searchAnalytics/query`,
    { startDate: start, endDate: end, dimensions, rowLimit, dataState: 'all' });
  return r.rows || [];
}
export type Sitemap = { path: string; lastDownloaded?: string; errors?: string | number; warnings?: string | number; isPending?: boolean; contents?: { submitted?: string; indexed?: string }[] };
export async function sitemaps(): Promise<Sitemap[]> {
  const r = await call<{ sitemap?: Sitemap[] }>(`/webmasters/v3/sites/${encodeURIComponent(gscSite())}/sitemaps`);
  return r.sitemap || [];
}
/** Test de connexion pour /admin : renvoie le nombre de sitemaps visibles ou lève une erreur explicite. */
export async function testGsc(): Promise<string> { cache = null; const s = await sitemaps(); return `${s.length} sitemap(s) visible(s) pour ${gscSite()}`; }
