/** Rendu d'une analyse de la veille (page publique, une langue) et de la liste servie sur /veille. */
import { pagePath, type Lang } from '@/lib/pages';
import type { Analyse } from '@/lib/server/veille-pages';

const esc = (s: unknown) => String(s ?? '').replace(/[&<>"]/g, (c) => ({ '&': '&amp;', '<': '&lt;', '>': '&gt;', '"': '&quot;' }[c]!));
const T = {
  fr: { k: 'La veille du cabinet', badge: 'IA · Analyse quotidienne', impact: 'Ce que cela change pour vous', src: 'Source', read: "Lire l'analyse →", back: '← Toute la veille et le calendrier fiscal', cta: 'Une question sur votre situation ? Prenez rendez-vous avec le cabinet.', rdv: 'Prendre rendez-vous', disc: "Analyse rédigée par l'assistant IA du cabinet à partir de la source citée, à titre d'information générale. Elle ne constitue pas une consultation : vérifiez les textes officiels et consultez le cabinet pour votre cas.", sub: 'Rédigée chaque matin par l’assistant IA du cabinet à partir des sources citées. Information générale, à confirmer dans les textes officiels.' },
  en: { k: 'The firm’s daily briefing', badge: 'AI · Daily analysis', impact: 'What it means for you', src: 'Source', read: 'Read the analysis →', back: '← All insights and the tax calendar', cta: 'A question about your situation? Book an appointment with the firm.', rdv: 'Book an appointment', disc: 'Analysis written by the firm’s AI assistant from the cited source, for general information only. It is not professional advice: check the official texts and consult the firm for your case.', sub: 'Written every morning by the firm’s AI assistant from the sources cited. General information, to be confirmed against official texts.' },
  ar: { k: 'متابعة المكتب', badge: 'ذكاء اصطناعي · تحليل يومي', impact: 'ما الذي يتغيّر بالنسبة إليكم', src: 'المصدر', read: '← اقرأ التحليل', back: 'كلّ المتابعة والرزنامة الجبائية →', cta: 'سؤال حول وضعيتكم؟ احجزوا موعدًا مع المكتب.', rdv: 'حجز موعد', disc: 'تحليل حرّره المساعد الذكي للمكتب انطلاقًا من المصدر المذكور، لغرض الإعلام العام ولا يُعدّ استشارة: يُرجى التثبّت من النصوص الرسمية واستشارة المكتب بخصوص حالتكم.', sub: 'يُحرّرها المساعد الذكي للمكتب كلّ صباح انطلاقًا من المصادر المذكورة. معلومات عامّة يُتثبَّت منها في النصوص الرسمية.' },
};
const fdate = (iso: string, l: Lang) => { const d = new Date(`${iso}T12:00:00Z`); return isNaN(+d) ? iso : d.toLocaleDateString(l === 'ar' ? 'ar-TN' : l === 'en' ? 'en-GB' : 'fr-FR', { day: 'numeric', month: 'long', year: 'numeric', timeZone: 'UTC' }); };
const THEMES: Record<string, [string, string, string]> = { 'fiscalité': ['Fiscalité', 'Tax', 'جباية'], 'social': ['Social', 'Social', 'اجتماعي'], 'comptabilité-audit': ['Comptabilité & audit', 'Accounting & audit', 'محاسبة وتدقيق'], 'réglementation': ['Réglementation', 'Regulation', 'تشريع'], 'banque-marchés': ['Banque & marchés', 'Banking & markets', 'بنوك وأسواق'], 'sociétés': ['Sociétés', 'Companies', 'شركات'] };
const themeL = (t: string, l: Lang) => { const x = THEMES[String(t || '').toLowerCase().trim()]; return x ? x[l === 'en' ? 1 : l === 'ar' ? 2 : 0] : t; };
export const analysePath = (l: Lang, id: string) => `${l === 'fr' ? '' : `/${l}`}/veille/analyse/${id}`;

/** Bloc « La veille du cabinet » de la page /veille (liens vers chaque analyse). */
export function veilleListHtml(items: Analyse[], l: Lang): string {
  if (!items.length) return '<div id="veilleIA" class="via" hidden></div>';
  const t = T[l];
  const cards = items.slice(0, 6).map((it) => `<div class="news"><div class="k">${esc(themeL(it.theme, l))} · <span dir="ltr">${esc(fdate(it.date, l))}</span></div><h3><a href="${analysePath(l, it.id)}" style="color:inherit;text-decoration:none">${esc(it.titre[l])}</a></h3><p>${esc(it.resume[l])}</p><p class="imp"><b>${t.impact} : </b>${esc(it.impact[l])}</p><a class="srcl" href="${analysePath(l, it.id)}">${t.read}</a></div>`).join('');
  return `<div id="veilleIA" class="via"><div class="via-head"><h3>${t.k}</h3><span class="ia-badge">${t.badge}</span></div><p class="via-sub">${t.sub}</p><div class="news-grid in-stagger">${cards}</div></div>`;
}

/** Contenu principal d'une page d'analyse. */
export function analyseHtml(it: Analyse, l: Lang): string {
  const t = T[l];
  return `<section class="sec" data-pg="veille" id="analyse"><div class="wrap" style="max-width:820px">
<div class="sec-head in"><span class="eyebrow">${t.k} · ${esc(themeL(it.theme, l))}</span>
<h1 style="font-size:clamp(1.7rem,3.4vw,2.5rem);font-weight:400;margin:14px 0">${esc(it.titre[l])}</h1>
<p style="color:var(--faint);font-size:.9rem"><time datetime="${esc(it.date)}" dir="ltr">${esc(fdate(it.date, l))}</time> · <span class="ia-badge">${t.badge}</span></p></div>
<p style="font-size:1.08rem;line-height:1.75">${esc(it.resume[l])}</p>
<div class="lead-card" style="margin:26px 0"><div class="who" style="font-size:1.05rem">${t.impact}</div><p style="margin-top:8px">${esc(it.impact[l])}</p></div>
<p>${t.src} : <a href="${esc(it.source_url)}" target="_blank" rel="noopener" style="color:var(--gold-bright)">${esc(it.source_nom || it.source_url)}</a></p>
<p style="margin-top:22px;color:var(--faint);font-size:.85rem">${t.disc}</p>
<div style="display:flex;gap:12px;flex-wrap:wrap;margin-top:26px"><a class="btn btn-gold" href="${pagePath(l, 'contact')}#rdv">${t.rdv}</a><a class="btn btn-ghost" href="${pagePath(l, 'veille')}">${t.back}</a></div>
<p style="margin-top:14px;color:var(--muted)">${t.cta}</p>
</div></section>`;
}
