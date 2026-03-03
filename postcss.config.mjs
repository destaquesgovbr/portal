import prefixWrap from 'postcss-prefixwrap'

const config = {
  plugins: [
    '@tailwindcss/postcss',
    prefixWrap('.govbr', {
      whitelist: ['govbr\\.css'],
      ignoredSelectors: [':root'],
    }),
  ],
}

export default config
