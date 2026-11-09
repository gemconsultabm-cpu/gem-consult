import type { Metadata } from 'next';
import './styles';
export const metadata: Metadata = { title: 'Page introuvable — GEM Consult', robots: { index: false, follow: true } };
export default function GlobalNotFound() {
  return (
    <html lang="fr" dir="ltr" data-lang="fr" translate="no" className="notranslate">
      <body>
        <main style={{ minHeight: '100vh', display: 'grid', placeItems: 'center', textAlign: 'center', padding: 24, color: '#E9EEF8', background: '#0f0a38' }}>
          <div>
            <h1 style={{ fontFamily: 'Spectral, serif', fontWeight: 400 }}>Page introuvable</h1>
            <p><a href="/" style={{ color: '#E6CE97' }}>Retour à l’accueil de GEM Consult</a> · <a href="/en" style={{ color: '#E6CE97' }}>English</a> · <a href="/ar" style={{ color: '#E6CE97' }}>العربية</a></p>
          </div>
        </main>
      </body>
    </html>
  );
}
