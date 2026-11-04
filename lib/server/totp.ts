/** Double authentification (codes à 6 chiffres type Google Authenticator / Microsoft Authenticator, RFC 6238). */
import crypto from 'node:crypto';

const B32 = 'ABCDEFGHIJKLMNOPQRSTUVWXYZ234567';

export function newSecret(): string {
  const b = crypto.randomBytes(20); let bits = ''; let out = '';
  for (const x of b) bits += x.toString(2).padStart(8, '0');
  for (let i = 0; i + 5 <= bits.length; i += 5) out += B32[parseInt(bits.slice(i, i + 5), 2)];
  return out;
}
function decode(s: string): Buffer {
  let bits = '';
  for (const c of s.replace(/[\s=]/g, '').toUpperCase()) { const v = B32.indexOf(c); if (v < 0) continue; bits += v.toString(2).padStart(5, '0'); }
  const bytes: number[] = []; for (let i = 0; i + 8 <= bits.length; i += 8) bytes.push(parseInt(bits.slice(i, i + 8), 2));
  return Buffer.from(bytes);
}
function codeAt(secret: string, counter: number): string {
  const buf = Buffer.alloc(8); buf.writeBigUInt64BE(BigInt(counter));
  const h = crypto.createHmac('sha1', decode(secret)).update(buf).digest(); const o = h[h.length - 1] & 15;
  return String(((h.readUInt32BE(o) & 0x7fffffff) % 1_000_000)).padStart(6, '0');
}
/** Renvoie le compteur de 30 s accepté (tolérance ±1 intervalle) ou -1 ; `after` empêche de réutiliser un code déjà employé. */
export function checkCode(secret: string, code: string, after = -1): number {
  const c = String(code || '').replace(/\s/g, ''); if (!/^\d{6}$/.test(c)) return -1;
  const now = Math.floor(Date.now() / 30000);
  for (const k of [now, now - 1, now + 1]) {
    if (k <= after) continue;
    const good = codeAt(secret, k);
    if (crypto.timingSafeEqual(Buffer.from(good), Buffer.from(c))) return k;
  }
  return -1;
}
export const otpauthUrl = (secret: string) =>
  `otpauth://totp/${encodeURIComponent('GEM Consult:admin gemabm.com')}?secret=${secret}&issuer=${encodeURIComponent('GEM Consult')}&algorithm=SHA1&digits=6&period=30`;
