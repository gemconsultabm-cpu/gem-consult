/** Repères fiscaux et sociaux utilisés par les simulateurs, la note « Repères » et l'assistant (vérifiés chaque jour par Claude). */
import { readJSON } from './data';
import type { Tri } from './claude';

export type Change = { date: string; cle: string; description: Tri; date_effet: string; source: string };
export type Params = {
  verified: string | null; updated: string;
  irpp: [number | null, number][]; css_points: number; css_points_next: number; css_next_year: number;
  is_general: number; is_special: number[]; tva: number[]; cnss_salarie: number;
  frais_pro_taux: number; frais_pro_plafond: number; chef_famille: number; enfant: number;
  forfait_seuil: number; penalite_spontane: number; penalite_controle: number;
  changes: Change[]; a_surveiller?: Tri & { date: string };
};
export const PARAMS_DEFAULT: Params = {
  verified: null, updated: '2026-11-02',
  irpp: [[5000, 0], [10000, 15], [20000, 25], [30000, 30], [40000, 33], [50000, 36], [70000, 38], [null, 40]],
  css_points: 0.5, css_points_next: 1, css_next_year: 2027,
  is_general: 20, is_special: [10, 35, 40], tva: [19, 13, 7], cnss_salarie: 9.68,
  frais_pro_taux: 10, frais_pro_plafond: 2000, chef_famille: 300, enfant: 100,
  forfait_seuil: 100000, penalite_spontane: 0.75, penalite_controle: 1.25, changes: [],
};
export const getParams = (): Params => ({ ...PARAMS_DEFAULT, ...readJSON<Partial<Params>>('params.json', {}) });

/** Contrôles de vraisemblance : un repère hors bornes est refusé. */
export function validParams(p: Partial<Params>): string | null {
  const num = (v: unknown, a: number, b: number) => typeof v === 'number' && Number.isFinite(v) && v >= a && v <= b;
  if (!Array.isArray(p.irpp) || p.irpp.length < 3 || p.irpp.length > 12) return 'barème IRPP';
  let prev = 0;
  for (let i = 0; i < p.irpp.length; i++) {
    const r = p.irpp[i]; const last = i === p.irpp.length - 1;
    if (!Array.isArray(r) || !num(r[1], 0, 50)) return 'taux IRPP';
    if (!last) { if (typeof r[0] !== 'number' || r[0] <= prev) return 'tranches IRPP'; prev = r[0]; }
  }
  const bounds: [keyof Params, number, number][] = [['css_points', 0, 3], ['css_points_next', 0, 3], ['is_general', 5, 40], ['cnss_salarie', 3, 20], ['frais_pro_taux', 0, 30],
    ['frais_pro_plafond', 0, 20000], ['chef_famille', 0, 5000], ['enfant', 0, 5000], ['forfait_seuil', 10000, 1000000], ['penalite_spontane', 0, 5], ['penalite_controle', 0, 5]];
  for (const [k, a, b] of bounds) if (!num(p[k], a, b)) return String(k);
  if (!Array.isArray(p.tva) || !p.tva.length || !p.tva.every((t) => num(t, 0, 30))) return 'tva';
  return null;
}
export function paramsText(p: Params): string {
  let lo = 0;
  const b = p.irpp.map(([up, t]) => { const s = up === null ? `au-delà de ${lo} : ${t} %` : `${lo}–${up} : ${t} %`; if (up !== null) lo = up; return s; });
  return `IRPP (barème annuel, DT) : ${b.join(' ; ')}. Déductions : frais professionnels ${p.frais_pro_taux} % plafonnés à ${p.frais_pro_plafond} DT, chef de famille ${p.chef_famille} DT, ${p.enfant} DT par enfant (4 max).\n`
    + `CSS personnes physiques : barème IRPP majoré de ${p.css_points} point(s) ; prévu pour ${p.css_next_year} : ${p.css_points_next} point(s) ; exonération si revenu net ≤ 5 000 DT.\n`
    + `IS : taux général ${p.is_general} % ; taux particuliers ${p.is_special.join(' / ')} %. TVA : ${p.tva.join(' / ')} %. CNSS salarié : ${p.cnss_salarie} %.\n`
    + `Forfait BIC optionnel : chiffre d'affaires ≤ ${p.forfait_seuil} DT. Pénalités de retard (art. 81 CDPF) : ${p.penalite_spontane} %/mois (paiement spontané), ${p.penalite_controle} %/mois (après contrôle).`;
}
