/** @type {import('tailwindcss').Config} */
export default {
  content: ['./index.html', './src/**/*.{js,ts,jsx,tsx}'],
  theme: {
    extend: {
      colors: {
        primary: '#6366f1',
        background: '#0f172a',
        surface: '#1e293b',
      },
      backgroundImage: {
        'gradient-hero': 'linear-gradient(135deg, #667eea 0%, #764ba2 100%)',
      },
      boxShadow: {
        glow: '0 10px 30px -10px rgba(99, 102, 241, 0.45)',
      },
    },
  },
  plugins: [],
}

