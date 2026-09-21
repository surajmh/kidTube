/**
 * Design tokens for both halves of the app.
 *
 * `accent` and `onAccent` are deliberately separate from `ink`: the previous single token had to
 * be both a button fill (which carries white text) and an active label colour, which is why
 * active labels were coming out red.
 */
/** @type {import('tailwindcss').Config} */
module.exports = {
  content: ['./App.tsx', './src/**/*.{ts,tsx}'],
  presets: [require('nativewind/preset')],
  theme: {
    extend: {
      colors: {
        bg: '#0F0F0F',
        surface: '#212121',
        'surface-alt': '#272727',
        line: '#303030',
        ink: '#F1F1F1',
        'ink-dim': '#AAAAAA',
        accent: '#FF0033',
        'on-accent': '#FFFFFF',
        /** Inverted pill: light fill, dark label. */
        invert: '#F1F1F1',
        'on-invert': '#0F0F0F',
        success: '#5FD068',
        danger: '#FF6E6E',
        /** Scrim over a thumbnail, for the duration badge. */
        scrim: 'rgba(0,0,0,0.8)',
      },
    },
  },
  plugins: [],
};
