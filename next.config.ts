import type { NextConfig } from 'next'

// --- Content-Security-Policy ---
// Construída dinamicamente para incluir hosts opcionais (Umami, GrowthBook)

const cspConnectSrc = [
  "'self'",
  process.env.NEXT_PUBLIC_UMAMI_SCRIPT_URL
    ? new URL(process.env.NEXT_PUBLIC_UMAMI_SCRIPT_URL).origin
    : '',
  process.env.NEXT_PUBLIC_GROWTHBOOK_API_HOST || '',
]
  .filter(Boolean)
  .join(' ')

const cspScriptSrc = [
  "'self'",
  "'unsafe-inline'",
  process.env.NEXT_PUBLIC_UMAMI_SCRIPT_URL
    ? new URL(process.env.NEXT_PUBLIC_UMAMI_SCRIPT_URL).origin
    : '',
]
  .filter(Boolean)
  .join(' ')

const contentSecurityPolicy = [
  `default-src 'self'`,
  `script-src ${cspScriptSrc}`,
  `style-src 'self' 'unsafe-inline' fonts.googleapis.com cdngovbr-ds.estaleiro.serpro.gov.br cdnjs.cloudflare.com`,
  `img-src 'self' data: blob: *.gov.br *.ebc.com.br *.flickr.com *.staticflickr.com *.googleusercontent.com i.ytimg.com *.fbcdn.net *.cnpq.br *.inpe.br *.on.br *.embrapa.br *.confap.org.br *.cta.br *.mast.br *.bigmidia.com *.agenciasebrae.com.br`,
  `font-src 'self' data: fonts.gstatic.com cdngovbr-ds.estaleiro.serpro.gov.br cdnjs.cloudflare.com`,
  `connect-src ${cspConnectSrc}`,
  `frame-src 'self' *.youtube.com *.youtube-nocookie.com *.gov.br`,
  `frame-ancestors 'none'`,
  `worker-src 'self'`,
  `object-src 'none'`,
  `base-uri 'self'`,
  `form-action 'self'`,
].join('; ')

// Headers de segurança aplicados a todas as rotas
const securityHeaders = [
  {
    key: 'Strict-Transport-Security',
    value: 'max-age=63072000; includeSubDomains; preload',
  },
  {
    key: 'X-Frame-Options',
    value: 'DENY',
  },
  {
    key: 'X-Content-Type-Options',
    value: 'nosniff',
  },
  {
    key: 'Referrer-Policy',
    value: 'strict-origin-when-cross-origin',
  },
  {
    key: 'Permissions-Policy',
    value: 'camera=(), microphone=(), geolocation=(), interest-cohort=()',
  },
  {
    key: 'Content-Security-Policy',
    value: contentSecurityPolicy,
  },
]

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
      // Security headers globais
      {
        source: '/(.*)',
        headers: securityHeaders,
      },
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
      // Sobrescrevem X-Frame-Options e CSP globais para esta rota
      {
        source: '/embed',
        headers: [
          {
            key: 'X-Frame-Options',
            value: 'ALLOWALL',
          },
          {
            key: 'Content-Security-Policy',
            value: contentSecurityPolicy.replace(
              "frame-ancestors 'none'",
              'frame-ancestors *',
            ),
          },
        ],
      },
    ]
  },
}

export default nextConfig
