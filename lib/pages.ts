/** Rubriques et langues du site : une adresse par rubrique et par langue, avec ses métadonnées pour les moteurs de recherche. */
export const SITE_URL = process.env.SITE_URL || 'https://gemabm.com';
export const PAGES = ['accueil', 'cabinet', 'services', 'references', 'outils', 'ressources', 'veille', 'contact'] as const;
export type PageId = (typeof PAGES)[number];
export const LANGS = ['fr', 'en', 'ar'] as const;
export type Lang = (typeof LANGS)[number];

/** Adresse d'une rubrique : /cabinet (fr), /en/cabinet, /ar/cabinet ; accueil : /, /en, /ar */
export const pagePath = (lang: Lang, pg: PageId) => `${lang === 'fr' ? '' : `/${lang}`}${pg === 'accueil' ? '' : `/${pg}`}` || '/';

export function parseSlug(slug?: string[]): { lang: Lang; page: PageId; analyse?: string } | null {
  const s = [...(slug || [])];
  let lang: Lang = 'fr';
  if (s[0] === 'en' || s[0] === 'ar') lang = s.shift() as Lang;
  if (s.length === 0) return { lang, page: 'accueil' };
  if (s.length === 3 && s[0] === 'veille' && s[1] === 'analyse' && /^[a-z0-9]{4,16}$/.test(s[2])) return { lang, page: 'veille', analyse: s[2] };
  if (s.length === 1 && (PAGES as readonly string[]).includes(s[0]) && s[0] !== 'accueil') return { lang, page: s[0] as PageId };
  return null;
}

type M = { title: string; description: string; crumb: string };
export const META: Record<Lang, Record<PageId, M>> = {
  fr: {
    accueil: { crumb: 'Accueil', title: 'Expert-comptable et commissaire aux comptes à Tunis | GEM Consult', description: "Cabinet d'expertise comptable et de commissariat aux comptes à Tunis (Montplaisir), membre de l'OECT depuis 1987 : audit légal, conseil fiscal, expertise judiciaire, conciliation pénale, associations et organismes publics." },
    cabinet: { crumb: 'Le cabinet', title: 'Le cabinet GEM Consult — expert-comptable OECT depuis 1987, Tunis', description: "Ali Ben Mohamed, expert-comptable inscrit à l'OECT depuis 1987 et expert judiciaire. Une équipe pluridisciplinaire en six pôles : audit, expertise judiciaire, fiscalité, comptabilité et paie, conseil, systèmes d'information." },
    services: { crumb: 'Services', title: 'Commissariat aux comptes, conseil fiscal, expertise judiciaire — Services GEM Consult', description: "Audit légal (CAC), expertise comptable, conseil fiscal et contentieux, expertise judiciaire, conciliation pénale, IFRS, audit interne, audit des associations, amicales et organismes publics en Tunisie." },
    references: { crumb: 'Références', title: 'Références : entreprises publiques, banques, grands groupes — GEM Consult', description: "Missions de commissariat aux comptes et de révision du cabinet GEM Consult auprès d'entreprises publiques, de banques et de grands groupes tunisiens, dans tous les secteurs." },
    outils: { crumb: 'Outils', title: 'Simulateurs fiscaux gratuits Tunisie : IRPP, paie, TVA, IS, pénalités — GEM Consult', description: "Outils gratuits et à jour : simulateur IRPP et fiche de paie (brut-net), TVA, impôt sur les sociétés, pénalités de retard, honoraires CAC, échéancier fiscal, taux BCT et assistant IA." },
    ressources: { crumb: 'Ressources', title: 'FAQ, lexique comptable et fiscal, check-lists — GEM Consult', description: "Questions fréquentes sur le commissariat aux comptes et la fiscalité tunisienne, lexique comptable et fiscal, check-lists : créer une entreprise, obligations annuelles, préparer un contrôle fiscal." },
    veille: { crumb: 'Veille', title: 'Veille fiscale Tunisie, loi de finances 2027 et calendrier fiscal — GEM Consult', description: "Analyse quotidienne de l'actualité fiscale, comptable et sociale tunisienne, loi de finances 2027, calendrier des déclarations fiscales et échéances DGI, mis à jour chaque jour." },
    contact: { crumb: 'Contact', title: 'Contact et rendez-vous — GEM Consult, Montplaisir, Tunis', description: "GEM Consult, 11 rue Abderrahmen Azzem, Montplaisir, 1073 Tunis. Tél. +216 71 904 572, contact@gemabm.com. Rendez-vous au cabinet, par téléphone ou en visioconférence." },
  },
  en: {
    accueil: { crumb: 'Home', title: 'Chartered Accountants & Statutory Auditors in Tunis, Tunisia | GEM Consult', description: 'Chartered accountancy and statutory audit firm in Tunis, OECT member since 1987: statutory audit, tax advisory, judicial expertise, criminal settlement, non-profits and public bodies.' },
    cabinet: { crumb: 'The firm', title: 'The firm — GEM Consult, Chartered Accountants in Tunis since 1987', description: 'Ali Ben Mohamed, chartered accountant (OECT, 1987) and court-appointed expert. A multidisciplinary team in six units: audit, judicial expertise, tax, accounting and payroll, advisory, information systems.' },
    services: { crumb: 'Services', title: 'Statutory audit, tax advisory and judicial expertise in Tunisia — GEM Consult', description: 'Statutory audit, accounting, tax advisory and disputes, judicial expertise, criminal settlement, IFRS, internal audit, audits of associations and public bodies in Tunisia.' },
    references: { crumb: 'References', title: 'References: public companies, banks and major groups — GEM Consult', description: 'Statutory audit and review engagements of GEM Consult for Tunisian public companies, banks and major groups across all sectors.' },
    outils: { crumb: 'Tools', title: 'Free Tunisian tax calculators: income tax, payroll, VAT, CIT — GEM Consult', description: 'Free, up-to-date tools: Tunisian income-tax and payslip simulator, VAT, corporate tax, late-payment penalties, auditor fees, tax calendar, BCT rates and AI assistant.' },
    ressources: { crumb: 'Resources', title: 'FAQ, accounting and tax glossary, checklists — GEM Consult', description: 'FAQ on statutory audit and Tunisian taxation, accounting and tax glossary, checklists for starting a company, annual obligations and tax audits.' },
    veille: { crumb: 'Insights', title: 'Tunisian tax insights, 2027 Finance Act and tax calendar — GEM Consult', description: 'Daily analysis of Tunisian tax, accounting and social news, the 2027 Finance Act, filing calendar and DGI deadlines, updated every day.' },
    contact: { crumb: 'Contact', title: 'Contact and appointments — GEM Consult, Montplaisir, Tunis', description: 'GEM Consult, 11 Abderrahmen Azzem St., Montplaisir, 1073 Tunis. Phone +216 71 904 572, contact@gemabm.com. Meetings at the firm, by phone or video call.' },
  },
  ar: {
    accueil: { crumb: 'الرئيسية', title: 'خبير محاسب ومراقب حسابات بتونس | GEM Consult', description: 'مكتب خبرة محاسبية ومراقبة حسابات بتونس، عضو هيئة الخبراء المحاسبين منذ 1987: تدقيق قانوني، استشارة جبائية، خبرة قضائية، صلح جزائي، جمعيات وهياكل عمومية.' },
    cabinet: { crumb: 'المكتب', title: 'مكتب GEM Consult — خبير محاسب منذ 1987، تونس', description: 'علي بن محمد، خبير محاسب مرسّم بالهيئة منذ 1987 وخبير قضائي. فريق متعدّد الاختصاصات في ستّة أقطاب: التدقيق، الخبرة القضائية، الجباية، المحاسبة والأجور، الاستشارة ونظم المعلومات.' },
    services: { crumb: 'الخدمات', title: 'مراقبة الحسابات والاستشارة الجبائية والخبرة القضائية بتونس — GEM Consult', description: 'مراقبة الحسابات، الخبرة المحاسبية، الاستشارة والنزاعات الجبائية، الخبرة القضائية، الصلح الجزائي، المعايير الدولية، التدقيق الداخلي، تدقيق الجمعيات والوداديات والهياكل العمومية.' },
    references: { crumb: 'المراجع', title: 'المراجع: مؤسسات عمومية وبنوك ومجامع كبرى — GEM Consult', description: 'مهامّ مراقبة الحسابات والمراجعة لمكتب GEM Consult لدى مؤسسات عمومية وبنوك ومجامع تونسية كبرى في جميع القطاعات.' },
    outils: { crumb: 'أدوات', title: 'محاكيات جبائية مجانية: الضريبة على الدخل، الأجور، الأداء على القيمة المضافة — GEM Consult', description: 'أدوات مجانية ومحيّنة: محاكي الضريبة على الدخل وبطاقة الأجر، الأداء على القيمة المضافة، الضريبة على الشركات، خطايا التأخير، أتعاب مراقب الحسابات، الرزنامة الجبائية والمساعد الذكي.' },
    ressources: { crumb: 'موارد', title: 'أسئلة متكرّرة ومعجم محاسبي وجبائي وقوائم تحقّق — GEM Consult', description: 'أسئلة متكرّرة حول مراقبة الحسابات والجباية التونسية، معجم محاسبي وجبائي، قوائم تحقّق لإحداث مؤسسة والالتزامات السنوية والمراجعة الجبائية.' },
    veille: { crumb: 'متابعة', title: 'متابعة جبائية، قانون المالية 2027 والرزنامة الجبائية — GEM Consult', description: 'تحليل يومي للمستجدّات الجبائية والمحاسبية والاجتماعية بتونس، قانون المالية 2027، رزنامة التصاريح وآجال الإدارة العامّة للأداءات.' },
    contact: { crumb: 'اتصال', title: 'اتصال وموعد — GEM Consult، منبليزير، تونس', description: 'GEM Consult، 11 نهج عبد الرحمن عزّام، منبليزير، 1073 تونس. الهاتف 904572 71 216+، contact@gemabm.com. مواعيد بالمكتب أو بالهاتف أو عبر الفيديو.' },
  },
};
export const OG_LOCALE: Record<Lang, string> = { fr: 'fr_TN', en: 'en_US', ar: 'ar_TN' };
