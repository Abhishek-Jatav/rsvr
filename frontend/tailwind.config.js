/**
 * Design tokens live here so the look can change without touching components
 * (docs/design.md section 3). Exact brand colours were not supplied; these are
 * accessible defaults (text/background contrast >= WCAG AA).
 */
/** @type {import('tailwindcss').Config} */
module.exports = {
  content: ['./src/**/*.{js,jsx}'],
  theme: {
    extend: {
      colors: {
        brand: { DEFAULT: '#4338ca', hover: '#3730a3', soft: '#eef2ff' },
        surface: { page: '#f1f5f9', card: '#ffffff' },
        ink: { DEFAULT: '#0f172a', muted: '#475569' },
        line: '#cbd5e1',
        success: { DEFAULT: '#166534', soft: '#f0fdf4', line: '#86efac' },
        warning: { DEFAULT: '#92400e', soft: '#fffbeb', line: '#fcd34d' },
        danger: { DEFAULT: '#b91c1c', soft: '#fef2f2', line: '#fca5a5' },
      },
      borderRadius: { card: '0.75rem' },
      boxShadow: { card: '0 1px 3px rgba(15, 23, 42, 0.08), 0 8px 24px rgba(15, 23, 42, 0.06)' },
    },
  },
  plugins: [],
};
