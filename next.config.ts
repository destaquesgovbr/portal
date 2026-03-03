import type { NextConfig } from 'next'

const nextConfig: NextConfig = {
  output: 'standalone',
  images: {
    remotePatterns: [
      // gov.br e ebc (96.4% das imagens)
      { hostname: '**.gov.br' },
      { hostname: '**.ebc.com.br' },
      // Flickr (419 imagens)
      { hostname: '**.flickr.com' },
      { hostname: '**.staticflickr.com' },
      // Google (docs, user content)
      { hostname: '**.googleusercontent.com' },
      // YouTube thumbnails
      { hostname: 'i.ytimg.com' },
      // Facebook CDN
      { hostname: '**.fbcdn.net' },
      // Domínios .br não-gov
      { hostname: '**.cnpq.br' },
      { hostname: '**.inpe.br' },
      { hostname: '**.on.br' },
      { hostname: '**.embrapa.br' },
      { hostname: '**.confap.org.br' },
      { hostname: '**.cta.br' },
      { hostname: '**.mast.br' },
      { hostname: '**.bigmidia.com' },
      { hostname: '**.agenciasebrae.com.br' },
    ],
  },
  async headers() {
    return [
      // CORS headers para API de widgets
      {
        source: '/api/widgets/:path*',
        headers: [
          {
            key: 'Access-Control-Allow-Origin',
            value: '*',
          },
          {
            key: 'Access-Control-Allow-Methods',
            value: 'GET, OPTIONS',
          },
          {
            key: 'Access-Control-Allow-Headers',
            value: 'Content-Type',
          },
        ],
      },
      // Headers para permitir embedding do widget em iframes
      {
        source: '/embed',
        headers: [
          {
            key: 'X-Frame-Options',
            value: 'ALLOWALL',
          },
          {
            key: 'Content-Security-Policy',
            value: 'frame-ancestors *;',
          },
        ],
      },
    ]
  },
}

export default nextConfig
