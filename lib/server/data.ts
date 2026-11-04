/** Stockage des données privées (hors du site public) : dossier GEM_DATA_DIR, monté en volume Docker. Aucune base de données. */
import fs from 'node:fs';
import path from 'node:path';

export const DATA_DIR = process.env.GEM_DATA_DIR || path.join(/*turbopackIgnore: true*/ process.cwd(), 'gem-data');
const TZ = 'Africa/Tunis';

export function dataPath(f: string): string {
  fs.mkdirSync(/*turbopackIgnore: true*/ DATA_DIR, { recursive: true, mode: 0o750 });
  return path.join(/*turbopackIgnore: true*/ DATA_DIR, path.basename(f));
}
export function readJSON<T>(f: string, def: T): T {
  try { return JSON.parse(fs.readFileSync(/*turbopackIgnore: true*/ dataPath(f), 'utf8')) as T; } catch { return def; }
}
export function writeJSON(f: string, data: unknown): void {
  const p = dataPath(f); const t = `${p}.${process.pid}.tmp`;
  fs.writeFileSync(/*turbopackIgnore: true*/ t, JSON.stringify(data, null, 1), { mode: 0o640 });
  fs.renameSync(/*turbopackIgnore: true*/ t, p);
}
export function fileAgeSec(f: string): number {
  try { return (Date.now() - fs.statSync(/*turbopackIgnore: true*/ dataPath(f)).mtimeMs) / 1000; } catch { return Infinity; }
}
/** Date/heure locale de Tunis : « 2026-11-03 14:05:00 » */
export function nowTunis(): string { return new Date().toLocaleString('sv-SE', { timeZone: TZ }); }
export function todayTunis(): string { return nowTunis().slice(0, 10); }
export function log(msg: string): void {
  try { fs.appendFileSync(/*turbopackIgnore: true*/ dataPath('ia.log'), `${nowTunis()} ${msg}\n`); } catch { /* journal facultatif */ }
}
export function tailLog(f = 'ia.log', n = 25): string {
  try { return fs.readFileSync(/*turbopackIgnore: true*/ dataPath(f), 'utf8').trim().split('\n').slice(-n).join('\n'); } catch { return ''; }
}
