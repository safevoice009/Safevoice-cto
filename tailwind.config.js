/** @type {import('tailwindcss').Config} */
export default {
  content: ['./index.html', './src/**/*.{js,ts,jsx,tsx}'],
  theme: {
    extend: {
      colors: {
        primary: 'var(--color-primary)',
        background: 'var(--color-surface)',
        surface: 'var(--color-surface-secondary)',
        text: {
          DEFAULT: 'var(--color-text)',
          secondary: 'var(--color-text-secondary)',
          muted: 'var(--color-text-muted)',
          inverse: 'var(--color-text-inverse)',
        },
        border: {
          DEFAULT: 'var(--color-border)',
          light: 'var(--color-border-light)',
        },
        success: 'var(--color-success)',
        warning: 'var(--color-warning)',
        error: 'var(--color-error)',
        info: 'var(--color-info)',
      },
      backgroundImage: {
        'gradient-hero': 'linear-gradient(135deg, var(--color-primary) 0%, var(--color-primary-dark) 100%)',
      },
      boxShadow: {
        glow: '0 10px 30px -10px var(--color-primary)',
      },
      outline: {
        hc: ['var(--color-focus-outline-width) solid var(--color-focus-outline)', 'var(--color-focus-outline-width)'],
      },
    },
  },
  plugins: [],
}

