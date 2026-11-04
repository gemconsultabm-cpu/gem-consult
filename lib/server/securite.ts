/** Protection de la connexion à l'administration contre les essais de mots de passe en série, et journal de sécurité. */
import fs from 'node:fs';
import { dataPath, nowTunis, readJSON, writeJSON } from './data';

type State = { ip: Record<string, number[]>; global: number[]; lockUntil?: number; alerted?: number };
const F = 'securite.json';
const IP_MAX = 5, IP_WIN = 15 * 60e3;          // 5 échecs en 15 min depuis une même adresse → blocage 15 min
const G_MAX = 30, G_WIN = 60 * 60e3;           // 30 échecs en 1 h toutes adresses confondues → connexion fermée 1 h
const G_LOCK = 60 * 60e3;

const load = (): State => readJSON<State>(F, { ip: {}, global: [] });
function prune(s: State, now: number) {
  for (const [k, v] of Object.entries(s.ip)) { const w = v.filter((t) => t > now - IP_WIN); if (w.length) s.ip[k] = w; else delete s.ip[k]; }
  s.global = s.global.filter((t) => t > now - G_WIN);
}
export function journal(msg: string) {
  try { fs.appendFileSync(/*turbopackIgnore: true*/ dataPath('securite.log'), `[${nowTunis()}] ${msg}\n`, { mode: 0o600 }); } catch { /* */ }
}
export function tailSecurite(n = 20): string {
  try { return fs.readFileSync(/*turbopackIgnore: true*/ dataPath('securite.log'), 'utf8').trim().split('\n').slice(-n).join('\n'); } catch { return ''; }
}
/** null = essai autorisé ; sinon le message à afficher. */
export function bloque(ip: string): string | null {
  const s = load(); const now = Date.now(); prune(s, now);
  if (s.lockUntil && s.lockUntil > now) return `Connexion temporairement fermée après de nombreux essais infructueux. Réessayez après ${new Date(s.lockUntil).toLocaleTimeString('fr-FR', { timeZone: 'Africa/Tunis', hour: '2-digit', minute: '2-digit' })}.`;
  if ((s.ip[ip] || []).length >= IP_MAX) return 'Trop d’essais infructueux depuis votre connexion. Réessayez dans 15 minutes.';
  return null;
}
/** Enregistre un échec ; renvoie true si la fermeture générale vient d'être déclenchée (pour alerter le cabinet). */
export function echec(ip: string, quoi: string): boolean {
  const s = load(); const now = Date.now(); prune(s, now);
  (s.ip[ip] ||= []).push(now); s.global.push(now); journal(`ÉCHEC ${quoi} depuis ${ip}`);
  let alerte = false;
  if (s.global.length >= G_MAX && !(s.lockUntil && s.lockUntil > now)) { s.lockUntil = now + G_LOCK; journal('FERMETURE de la connexion pendant 1 h (trop d’échecs)'); if (!s.alerted || now - s.alerted > G_LOCK) { s.alerted = now; alerte = true; } }
  writeJSON(F, s); return alerte;
}
export function succes(ip: string) { const s = load(); delete s.ip[ip]; writeJSON(F, s); journal(`Connexion réussie depuis ${ip}`); }
