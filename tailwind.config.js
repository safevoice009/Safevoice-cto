/** @type {import('tailwindcss').Config} */
export default {
  content: ['./index.html', './src/**/*.{js,ts,jsx,tsx}'],
  theme: {
    extend: {
      screens: {
        xs: '320px',
        tablet: '768px',
        desktop: '1024px',
        wide: '1440px',
      },
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
          strong: 'var(--color-border-strong)',
        },
        success: 'var(--color-success)',
        successLight: 'var(--color-success-light)',
        warning: 'var(--color-warning)',
        danger: 'var(--color-danger)',
        info: 'var(--color-info)',
        infoLight: 'var(--color-info-light)',
        error: 'var(--color-error)',
      },
      spacing: {
        'space-1': 'var(--space-1)',
        'space-2': 'var(--space-2)',
        'space-3': 'var(--space-3)',
        'space-4': 'var(--space-4)',
        'space-5': 'var(--space-5)',
        'space-6': 'var(--space-6)',
      },
      fontSize: {
        caption: 'var(--font-size-caption)',
        body: 'var(--font-size-body)',
        subtitle: 'var(--font-size-subtitle)',
        title: 'var(--font-size-title)',
        display: 'var(--font-size-display)',
        hero: 'var(--font-size-hero)',
      },
      boxShadow: {
        elevation: 'var(--shadow-elevation)',
        'elevation-strong': 'var(--shadow-elevation-strong)',
        glow: '0 10px 30px -10px var(--color-primary)',
      },
      borderRadius: {
        lg: 'var(--radius-lg)',
        xl: 'var(--radius-xl)',
      },
      outline: {
        hc: ['var(--color-focus-outline-width) solid var(--color-focus-outline)', 'var(--color-focus-outline-width)'],
      },
      transitionDuration: {
        fast: '120ms',
        slow: '240ms',
      },
    },
  },
  plugins: [],
};
