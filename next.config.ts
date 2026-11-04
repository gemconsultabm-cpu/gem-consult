import type { NextConfig } from 'next';

// Politique de sécurité du contenu : le site ne charge rien depuis l'extérieur (polices et scripts auto-hébergés),
// seule la carte Google Maps est autorisée en cadre. Les scripts en ligne restent nécessaires au fonctionnement de Next.js.
const csp = [
  "default-src 'self'",
  "script-src 'self' 'unsafe-inline'",
  "style-src 'self' 'unsafe-inline'",
  "img-src 'self' data: blob:",
  "font-src 'self' data:",
  "connect-src 'self'",
  'frame-src https://www.google.com https://maps.google.com',
  "worker-src 'self'",
  "manifest-src 'self'",
  "media-src 'self'",
  "object-src 'none'",
  "base-uri 'self'",
  "form-action 'self'",
  "frame-ancestors 'none'",
  'upgrade-insecure-requests',
].join('; ');

const securityHeaders = [
  { key: 'Content-Security-Policy', value: csp },
  { key: 'Strict-Transport-Security', value: 'max-age=31536000' },            // HTTPS obligatoire pendant 1 an
  { key: 'X-Content-Type-Options', value: 'nosniff' },
  { key: 'Referrer-Policy', value: 'strict-origin-when-cross-origin' },
  { key: 'X-Frame-Options', value: 'DENY' },
  { key: 'Cross-Origin-Opener-Policy', value: 'same-origin' },
  { key: 'Cross-Origin-Resource-Policy', value: 'same-origin' },
  { key: 'X-Permitted-Cross-Domain-Policies', value: 'none' },
  { key: 'Permissions-Policy', value: 'camera=(), microphone=(), geolocation=(), payment=(), usb=(), interest-cohort=(), browsing-topics=()' },
];

const config: NextConfig = {
  experimental: { globalNotFound: true }, // page 404 unique pour tout le site
  output: 'standalone',            // image Docker légère (node server.js)
  poweredByHeader: false,
  compress: true,                  // nginx peut aussi compresser
  images: { unoptimized: true },   // logos déjà optimisés en WebP
  async headers() {
    return [
      { source: '/:path*', headers: securityHeaders },
      { source: '/assets/:path*', headers: [{ key: 'Cache-Control', value: 'public, max-age=2592000' }] },
      { source: '/js/:path*', headers: [{ key: 'Cache-Control', value: 'public, max-age=3600, must-revalidate' }] },
      { source: '/sw.js', headers: [{ key: 'Cache-Control', value: 'no-cache' }] },
      { source: '/admin', headers: [{ key: 'X-Robots-Tag', value: 'noindex, nofollow' }, { key: 'Cache-Control', value: 'no-store' }] },
      { source: '/api/:path*', headers: [{ key: 'X-Robots-Tag', value: 'noindex' }, { key: 'Cache-Control', value: 'no-store' }] },
    ];
  },
  async redirects() {
    return [{ source: '/:path*', has: [{ type: 'host', value: 'www.gemabm.com' }], destination: 'https://gemabm.com/:path*', permanent: true }];
  },
};
export default config;
