/** Authentification de l'administration : mot de passe (scrypt), double authentification facultative, cookie de session signé (HMAC, 8 h).
 *  Le numéro de version de session permet de déconnecter toutes les sessions (changement de mot de passe, bouton dédié). */
import crypto from 'node:crypto';
import fs from 'node:fs';
import { cookies } from 'next/headers';
import { getConfig, saveConfig } from './config';
import { dataPath } from './data';

const COOKIE = 'gem_admin'; const TTL = 8 * 3600;

export function hashPassword(p: string): string {
  const salt = crypto.randomBytes(16).toString('hex');
  return `scrypt$${salt}$${crypto.scryptSync(p, salt, 64).toString('hex')}`;
}
export function verifyPassword(p: string, h?: string): boolean {
  const [alg, salt, hex] = String(h || '').split('$');
  if (alg !== 'scrypt' || !salt || !hex) return false;
  const a = crypto.scryptSync(p, salt, 64); const b = Buffer.from(hex, 'hex');
  return a.length === b.length && crypto.timingSafeEqual(a, b);
}
function secret(): string {
  let s = getConfig().sessionSecret;
  if (!s) { s = crypto.randomBytes(32).toString('hex'); saveConfig({ sessionSecret: s }); }
  return s;
}
const sign = (v: string) => crypto.createHmac('sha256', secret()).update(v).digest('hex');

const ver = () => String(getConfig().sessionVersion || 1);
export async function openSession(): Promise<void> {
  const exp = String(Math.floor(Date.now() / 1000) + TTL); const v = `${exp}.${ver()}`;
  (await cookies()).set(COOKIE, `${v}.${sign(v)}`, { httpOnly: true, sameSite: 'strict', secure: process.env.NODE_ENV === 'production' && !process.env.GEM_INSECURE_COOKIE, path: '/', maxAge: TTL });
}
export async function closeSession(): Promise<void> { (await cookies()).delete(COOKIE); }
/** Invalide toutes les sessions ouvertes (sur tous les appareils). */
export function revokeAllSessions(): void { saveConfig({ sessionVersion: (getConfig().sessionVersion || 1) + 1 }); }
export async function isAdmin(): Promise<boolean> {
  const c = (await cookies()).get(COOKIE)?.value || ''; const [exp, v, sig] = c.split('.');
  if (!exp || !v || !sig || +exp < Date.now() / 1000 || v !== ver()) return false;
  const good = sign(`${exp}.${v}`);
  return sig.length === good.length && crypto.timingSafeEqual(Buffer.from(sig), Buffer.from(good));
}
/** Code d'installation : protège /admin tant qu'aucun mot de passe n'est défini (lisible dans gem-data/ et dans les journaux Docker). */
export function setupCode(): string {
  const f = dataPath('code-installation.txt');
  if (!fs.existsSync(/*turbopackIgnore: true*/ f)) {
    fs.writeFileSync(/*turbopackIgnore: true*/ f, crypto.randomBytes(4).toString('hex').toUpperCase() + '\n', { mode: 0o600 });
    console.log(`[GEM] Code d'installation de /admin : ${fs.readFileSync(/*turbopackIgnore: true*/ f, 'utf8').trim()}`);
  }
  return fs.readFileSync(/*turbopackIgnore: true*/ f, 'utf8').trim();
}
export const dropSetupCode = () => { try { fs.unlinkSync(/*turbopackIgnore: true*/ dataPath('code-installation.txt')); } catch { /* */ } };
