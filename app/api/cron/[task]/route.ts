/** Déclenchement des tâches planifiées par le conteneur « cron » (en-tête x-cron-key = CRON_SECRET). Jamais accessible sans la clé. */
import crypto from 'node:crypto';
import { runTask, TASKS } from '@/lib/server/tasks';
export const maxDuration = 420;
export async function POST(req: Request, ctx: { params: Promise<{ task: string }> }) {
  const secret = process.env.CRON_SECRET;
  const k = Buffer.from(req.headers.get('x-cron-key') || ''); const g = Buffer.from(secret || '');
  if (!secret || k.length !== g.length || !crypto.timingSafeEqual(k, g)) return Response.json({ ok: false }, { status: 403 });
  const { task } = await ctx.params;
  if (!TASKS[task]) return Response.json({ ok: false, msg: 'tâche inconnue' }, { status: 404 });
  return Response.json(await runTask(task));
}
