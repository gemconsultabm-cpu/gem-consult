/** Configuration (clé API, mot de passe, e-mails, SMTP) : gem-data/config.json, modifiable depuis /admin. Les variables d'environnement ont priorité. */
import fs from 'node:fs';
import { dataPath, readJSON, writeJSON } from './data';

export type Smtp = { host: string; port: number; secure: boolean; user: string; pass: string };
export type Config = {
  apiKey?: string; workspaceId?: string; adminHash?: string; sessionSecret?: string;
  mailTo: string; mailFrom: string; smtp?: Smtp;
};
const DEFAULTS: Config = { mailTo: 'contact@gemabm.com', mailFrom: 'site@gemabm.com' };

export function getConfig(): Config {
  const c = { ...DEFAULTS, ...readJSON<Partial<Config>>('config.json', {}) } as Config;
  if (process.env.ANTHROPIC_API_KEY) c.apiKey = process.env.ANTHROPIC_API_KEY;
  if (process.env.ANTHROPIC_WORKSPACE_ID) c.workspaceId = process.env.ANTHROPIC_WORKSPACE_ID;
  if (process.env.SMTP_HOST) c.smtp = { host: process.env.SMTP_HOST, port: Number(process.env.SMTP_PORT || 465), secure: (process.env.SMTP_SECURE ?? 'true') !== 'false', user: process.env.SMTP_USER || '', pass: process.env.SMTP_PASS || '' };
  if (process.env.MAIL_TO) c.mailTo = process.env.MAIL_TO;
  if (process.env.MAIL_FROM) c.mailFrom = process.env.MAIL_FROM;
  return c;
}
/** Fusionne et enregistre (null = supprimer la clé). Fichier lisible par le seul utilisateur de l'application. */
export function saveConfig(changes: Partial<Record<keyof Config, unknown>>): void {
  const cur = readJSON<Record<string, unknown>>('config.json', {});
  for (const [k, v] of Object.entries(changes)) { if (v === null) delete cur[k]; else if (v !== undefined) cur[k] = v; }
  writeJSON('config.json', cur);
  try { fs.chmodSync(/*turbopackIgnore: true*/ dataPath('config.json'), 0o600); } catch { /* */ }
}
export const maskKey = (k?: string) => (k ? `${k.slice(0, 10)}…${k.slice(-4)}` : '');
/** Clés acceptées : clé d'espace de travail (sk-ant-api…) ou clé de compte de la nouvelle Console (sk-ant-usr…, avec l'ID d'espace de travail). */
export const keyLooksValid = (k: string) => /^sk-ant-(api|usr)[A-Za-z0-9_-]{20,}$/.test(k);
export const isAccountKey = (k?: string) => !!k && k.startsWith('sk-ant-usr');
export const workspaceLooksValid = (w: string) => /^wrkspc_[A-Za-z0-9]{6,}$/.test(w);
