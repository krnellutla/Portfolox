// ─────────────────────────────────────────────────────────────────────────
// Blueflutes — Design tokens as a Tailwind v3 config extension.
// Merge `theme.extend` into your existing tailwind.config.js.
// Every value below is taken verbatim from the HTML reference prototype.
// ─────────────────────────────────────────────────────────────────────────

/** @type {import('tailwindcss').Config} */
module.exports = {
  theme: {
    extend: {
      colors: {
        // Core neutrals (warm-toned, never pure black/white)
        paper:    '#f4f3f0', // app background
        surface:  '#ffffff', // cards, inputs, panels
        canvas:   '#e7e6e1', // recessed gray (mobile board, lightbox edges)
        ink:      '#16150f', // primary text, buttons, active states
        'ink-2':  '#2a2924', // body copy on surfaces
        'ink-3':  '#56544c', // secondary text
        muted:    '#9a988f', // tertiary text, mono labels
        'muted-2':'#8c8a82', // mono labels on gray
        line:     '#e0ded8', // hairline borders on paper
        'line-2': '#ecebe6', // hairline borders inside cards
        field:    '#d6d3cb', // input borders
        'field-bg':'#faf9f6',// recessed input fill
        // Semantic
        positive: '#3f7a5e', // gains, "Published", online dot
        'positive-soft':'#6fae8c',
        negative: '#c0683f', // losses
        // Filter color chips (the only saturated swatches in the product)
        'chip-warm':   '#c0683f',
        'chip-cool':   '#3f6ec0',
        'chip-green':  '#3f7a5e',
        'chip-neutral':'#8c8a82',
        'chip-mono':   '#1c1b18',
        'chip-dusk':   '#7c4dcc',
      },
      fontFamily: {
        // Display / editorial — headlines, names, prices, numbers
        serif: ['Newsreader', 'Georgia', 'serif'],
        // UI / body — everything else
        sans:  ['"Hanken Grotesk"', 'system-ui', 'sans-serif'],
        // Metadata, codes, labels, EXIF, eyebrows
        mono:  ['"Space Mono"', 'ui-monospace', 'monospace'],
      },
      fontSize: {
        // Display scale (Newsreader, weight 500, letter-spacing -0.01em to -0.02em)
        'display-xl': ['62px', { lineHeight: '1.03', letterSpacing: '-0.02em' }], // hero h1
        'display-l':  ['54px', { lineHeight: '1.05', letterSpacing: '-0.02em' }], // pricing h1
        'display-m':  ['40px', { lineHeight: '1',    letterSpacing: '-0.02em' }], // section h1
        'display-s':  ['30px', { lineHeight: '1.05', letterSpacing: '-0.01em' }], // h2
        'serif-card': ['22px', { lineHeight: '1.1' }], // card titles, panel headers
      },
      letterSpacing: {
        eyebrow: '0.22em', // mono section eyebrows: "01 — DISCOVER"
        label:   '0.14em', // mono uppercase labels
      },
      borderRadius: {
        // Used radii: 6 8 9 10 11 12 14 16 999(pill) 50%(circle)
        card: '14px',
        panel: '16px',
        control: '9px',
        tile: '8px',
      },
      boxShadow: {
        // The product is mostly flat (hairline borders do the work). Shadows are rare:
        avatar: '0 8px 24px rgba(0,0,0,0.18)',     // portfolio avatar over cover
        lightbox: '0 30px 80px rgba(0,0,0,0.5)',   // hero image in lightbox
        device: '0 40px 80px rgba(0,0,0,0.18), 0 0 0 1px rgba(0,0,0,0.12)', // iOS frame
      },
      maxWidth: {
        shell: '1280px', // standard page content width
        prose: '1080px', // pricing / narrow pages
      },
      keyframes: {
        pfxFade: { from: { opacity: 0, transform: 'translateY(10px)' }, to: { opacity: 1, transform: 'none' } },
      },
      animation: { pfxFade: 'pfxFade .4s ease both' }, // screen-enter transition
    },
  },
};

// ── PHOTO PLACEHOLDER TONES ───────────────────────────────────────────────
// The prototype has no real imagery. Every "photo" is a 145deg linear-gradient
// between two muted tones (low chroma, so UI stays monochrome and photos read
// as photos). Replace ALL of these with real <img> / next/image in production.
// Kept here only so you can reproduce the reference look 1:1 if needed.
const PHOTO_TONES = [
  ['#9aa79b', '#5f6f63'], ['#bda988', '#8a7150'], ['#7e8893', '#525c68'],
  ['#b09092', '#7a5e60'], ['#9a96a6', '#675f74'], ['#b3a886', '#857a5b'],
  ['#7e9396', '#52696c'], ['#bb9d9a', '#8a6d6b'], ['#92997f', '#646a52'],
  ['#8f93a3', '#5e6374'], ['#c0ab9a', '#8f7967'], ['#869a93', '#566b63'],
];
module.exports.PHOTO_TONES = PHOTO_TONES;
