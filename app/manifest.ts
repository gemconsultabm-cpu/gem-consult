import type { MetadataRoute } from 'next';
export default function manifest(): MetadataRoute.Manifest {
  return {
    name: 'GEM Consult — Expertise comptable & Audit', short_name: 'GEM Consult', start_url: '/?source=app', scope: '/', display: 'standalone',
    background_color: '#0f0a38', theme_color: '#0f0a38', lang: 'fr',
    description: "Cabinet d'expertise comptable et de commissariat aux comptes à Tunis : outils fiscaux gratuits, calendrier déclaratif, assistant IA.",
    icons: [
      { src: '/assets/img/icon-192.png', sizes: '192x192', type: 'image/png', purpose: 'maskable' },
      { src: '/assets/img/icon-512.png', sizes: '512x512', type: 'image/png', purpose: 'maskable' },
    ],
    shortcuts: [{ name: 'Outils de calcul', url: '/outils' }, { name: 'Calendrier déclaratif', url: '/veille' }, { name: 'Prendre rendez-vous', url: '/contact' }],
  };
}
