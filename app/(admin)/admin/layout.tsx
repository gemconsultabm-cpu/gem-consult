import type { Viewport } from 'next';
import '../../styles';
export const viewport: Viewport = { width: 'device-width', initialScale: 1, themeColor: '#0f0a38' };
export default function AdminLayout({ children }: { children: React.ReactNode }) {
  return (
    <html lang="fr" dir="ltr" data-lang="fr">
      <body>{children}</body>
    </html>
  );
}
