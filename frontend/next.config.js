/** @type {import('next').NextConfig} */
const nextConfig = {
  reactStrictMode: true,
  swcMinify: true,
  // Output standalone para Docker
  output: 'standalone',
  images: {
    domains: [],
    formats: ['image/avif', 'image/webp'],
    // Permitir logos de instituciones externas
    remotePatterns: [
      {
        protocol: 'https',
        hostname: '**',
      },
    ],
  },
  // Configuración para producción
  poweredByHeader: false,
  compress: true,
  // Variables de entorno expuestas al cliente
  env: {
    NEXT_PUBLIC_API_URL: process.env.NEXT_PUBLIC_API_URL,
    NEXT_PUBLIC_APP_NAME: process.env.NEXT_PUBLIC_APP_NAME || 'TxH Registro',
    // Branding por institución
    NEXT_PUBLIC_INSTITUTION_NAME: process.env.NEXT_PUBLIC_INSTITUTION_NAME,
    NEXT_PUBLIC_INSTITUTION_LOGO_URL: process.env.NEXT_PUBLIC_INSTITUTION_LOGO_URL,
    NEXT_PUBLIC_PRIMARY_COLOR: process.env.NEXT_PUBLIC_PRIMARY_COLOR || '#0066cc',
  },
};

module.exports = nextConfig;
