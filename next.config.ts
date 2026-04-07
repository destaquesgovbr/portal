import type { NextConfig } from 'next'

// --- Content-Security-Policy ---
// Construída dinamicamente para incluir hosts opcionais (Umami, GrowthBook)

const umamiOrigin = (() => {
  try {
    return process.env.NEXT_PUBLIC_UMAMI_SCRIPT_URL
      ? new URL(process.env.NEXT_PUBLIC_UMAMI_SCRIPT_URL).origin
      : ''
  } catch {
    return ''
  }
})()

const cspConnectSrc = [
  "'self'",
  umamiOrigin,
  '*.clarity.ms',
  'www.clarity.ms',
  process.env.NEXT_PUBLIC_GROWTHBOOK_API_HOST || 'https://cdn.growthbook.io',
  process.env.NEXT_PUBLIC_PUSH_WORKER_URL || '',
]
  .filter(Boolean)
  .join(' ')

const cspScriptSrc = [
  "'self'",
  "'unsafe-inline'",
  umamiOrigin,
  'www.clarity.ms',
  'scripts.clarity.ms',
]
  .filter(Boolean)
  .join(' ')

function buildCSP(frameAncestors: string = "'none'") {
  return [
    `default-src 'self'`,
    `script-src ${cspScriptSrc}`,
    `style-src 'self' 'unsafe-inline' fonts.googleapis.com cdngovbr-ds.estaleiro.serpro.gov.br cdnjs.cloudflare.com`,
    `img-src 'self' data: blob: authjs.dev storage.googleapis.com *.gov.br *.ebc.com.br *.flickr.com *.staticflickr.com *.googleusercontent.com i.ytimg.com *.fbcdn.net *.cnpq.br *.inpe.br *.on.br *.embrapa.br *.confap.org.br *.cta.br *.mast.br *.bigmidia.com *.agenciasebrae.com.br *.clarity.ms c.bing.com`,
    `font-src 'self' data: fonts.gstatic.com cdngovbr-ds.estaleiro.serpro.gov.br cdnjs.cloudflare.com`,
    `connect-src ${cspConnectSrc}`,
    `frame-src 'self' *.youtube.com *.youtube-nocookie.com *.gov.br`,
    `frame-ancestors ${frameAncestors}`,
    `worker-src 'self'`,
    `object-src 'none'`,
    `base-uri 'self'`,
    `form-action 'self'`,
  ].join('; ')
}

const contentSecurityPolicy = buildCSP("'none'")
const embedCSP = buildCSP('*')

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
      // GCS — thumbnails de vídeo
      { hostname: 'storage.googleapis.com' },
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
            value: embedCSP,
          },
        ],
      },
    ]
  },
}

export default nextConfig
