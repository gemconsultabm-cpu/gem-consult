/** Analyses de la veille du cabinet publiées comme pages indexables (/veille/analyse/<id>). */
import { readJSON } from './data';
import type { Veille, VeilleItem } from './tasks';

export type Analyse = VeilleItem & { day: string };
export function listVeille(): Analyse[] {
  const v = readJSON<Veille>('veille.json', { days: [] });
  return v.days.flatMap((d) => d.items.filter((i) => !i.hidden).map((i) => ({ ...i, day: d.date })));
}
export const getAnalyse = (id: string) => listVeille().find((a) => a.id === id) || null;
