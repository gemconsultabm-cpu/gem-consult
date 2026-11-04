import type { NextConfig } from 'next';

const securityHeaders = [
  { key: 'X-Content-Type-Options', value: 'nosniff' },
  { key: 'Referrer-Policy', value: 'strict-origin-when-cross-origin' },
  { key: 'X-Frame-Options', value: 'SAMEORIGIN' },
  { key: 'Permissions-Policy', value: 'camera=(), microphone=(), geolocation=()' },
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
      { source: '/admin', headers: [{ key: 'X-Robots-Tag', value: 'noindex' }, { key: 'Cache-Control', value: 'no-store' }] },
    ];
  },
  async redirects() {
    return [{ source: '/:path*', has: [{ type: 'host', value: 'www.gemabm.com' }], destination: 'https://gemabm.com/:path*', permanent: true }];
  },
};
export default config;
