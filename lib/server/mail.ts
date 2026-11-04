/** Envoi d'e-mails via SMTP (boîte OVH du domaine ou Gmail), paramétré dans /admin ou par variables d'environnement. */
import fs from 'node:fs';
import nodemailer from 'nodemailer';
import { getConfig } from './config';
import { dataPath, log, nowTunis } from './data';

export async function sendMail(subject: string, text: string, replyTo?: string): Promise<boolean> {
  const c = getConfig();
  if (process.env.GEM_AI_MOCK) { fs.appendFileSync(/*turbopackIgnore: true*/ dataPath('mails-test.log'), `=== ${nowTunis()} ${subject}\n${text}\n\n`); return true; }
  if (!c.smtp?.host) { log(`e-mail non envoyé (SMTP non configuré) : ${subject}`); return false; }
  try {
    const t = nodemailer.createTransport({ host: c.smtp.host, port: c.smtp.port, secure: c.smtp.secure, auth: c.smtp.user ? { user: c.smtp.user, pass: c.smtp.pass } : undefined });
    await t.sendMail({ from: `"GEM Consult — site web" <${c.mailFrom}>`, to: c.mailTo, subject, text, replyTo });
    return true;
  } catch (e) { log(`e-mail en échec : ${(e as Error).message}`); return false; }
}
