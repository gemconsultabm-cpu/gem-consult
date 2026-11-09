import type { Metadata, Viewport } from 'next';
import '../../styles';
import { SITE_URL, parseSlug, type Lang } from '@/lib/pages';

export const metadata: Metadata = {
  metadataBase: new URL(SITE_URL),
  applicationName: 'GEM Consult',
  authors: [{ name: 'Cabinet GEM Consult' }],
  keywords: ['expert-comptable Tunis', 'commissaire aux comptes Tunisie', 'audit légal', 'expertise judiciaire', 'conseil fiscal', 'conciliation pénale', 'OECT', 'GEM Consult'],
  icons: { icon: '/favicon.png', apple: '/apple-touch-icon.png' },
  robots: { index: true, follow: true, googleBot: { index: true, follow: true, 'max-image-preview': 'large', 'max-snippet': -1 } },
  formatDetection: { telephone: false },
  // Chaque page existe déjà dans sa langue officielle (FR / EN / AR) : on interdit la traduction automatique du navigateur,
  // qui produisait des contresens (« Firm » → « Ferme », « Home » → « Maison »…).
  other: { google: 'notranslate' },
  verification: process.env.GOOGLE_SITE_VERIFICATION ? { google: process.env.GOOGLE_SITE_VERIFICATION } : undefined,
};
export const viewport: Viewport = { width: 'device-width', initialScale: 1, viewportFit: 'cover', themeColor: '#0f0a38' };
export default async function SiteLayout({ children, params }: { children: React.ReactNode; params: Promise<{ slug?: string[] }> }) {
  const { slug } = await params;
  // La langue est connue dès le serveur : <html lang> et dir sont exacts pour Google, sans attendre le JavaScript.
  const lang: Lang = parseSlug(slug)?.lang ?? (slug?.[0] === 'en' ? 'en' : slug?.[0] === 'ar' ? 'ar' : 'fr');
  return (
    <html lang={lang} dir={lang === 'ar' ? 'rtl' : 'ltr'} data-lang={lang} translate="no" className="notranslate" suppressHydrationWarning>
      <body suppressHydrationWarning>{children}</body>
    </html>
  );
}
