/** @type {import('tailwindcss').Config} */
export default {
  content: ['./index.html', './src/**/*.{js,jsx,ts,tsx}'],
  theme: {
    extend: {
      colors: {
        bg:      '#0a0e17',
        card:    '#0f172a',
        surface: '#1e293b',
        border:  '#1e293b',
        text:    '#e2e8f0',
        muted:   '#64748b',
        dim:     '#475569',
        accent:  '#3b82f6',
        accent2: '#60a5fa',
        ok:      '#34d399',
        warn:    '#fbbf24',
        danger:  '#ef4444',
        orange:  '#f97316',
      },
      fontFamily: {
        sans: ['DM Sans', 'system-ui', 'sans-serif'],
        mono: ['JetBrains Mono', 'Fira Code', 'monospace'],
      },
    },
  },
  plugins: [],
};
