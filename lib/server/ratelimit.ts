/** Limitation de débit simple, en mémoire (une seule instance de l'application). */
const buckets = new Map<string, number[]>();
export function allow(key: string, max: number, windowSec: number): boolean {
  const now = Date.now(); const lim = now - windowSec * 1000;
  const arr = (buckets.get(key) || []).filter((t) => t > lim);
  if (arr.length >= max) { buckets.set(key, arr); return false; }
  arr.push(now); buckets.set(key, arr);
  if (buckets.size > 5000) for (const [k, v] of buckets) if (!v.some((t) => t > lim)) buckets.delete(k);
  return true;
}
/** Adresse IP réelle du visiteur, transmise par le reverse proxy nginx (X-Real-IP / X-Forwarded-For). */
export function clientIp(h: Headers): string {
  return h.get('x-real-ip') || (h.get('x-forwarded-for') || '').split(',')[0].trim() || '0';
}
