/** Déclenchement des tâches planifiées par le conteneur « cron » (en-tête x-cron-key = CRON_SECRET). Jamais accessible sans la clé. */
import { runTask, TASKS } from '@/lib/server/tasks';
export const maxDuration = 420;
export async function POST(req: Request, ctx: { params: Promise<{ task: string }> }) {
  const secret = process.env.CRON_SECRET;
  if (!secret || req.headers.get('x-cron-key') !== secret) return Response.json({ ok: false }, { status: 403 });
  const { task } = await ctx.params;
  if (!TASKS[task]) return Response.json({ ok: false, msg: 'tâche inconnue' }, { status: 404 });
  return Response.json(await runTask(task));
}
