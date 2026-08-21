/** @type {import('tailwindcss').Config} */
export default {
  content: ['./index.html', './src/**/*.{vue,js,ts}'],
  theme: {
    extend: {
      colors: {
        navy: {
          50:  '#f0f4fa',
          100: '#d9e2ef',
          200: '#b3c4de',
          300: '#7a9ac3',
          400: '#4d78aa',
          500: '#2c5899',
          600: '#1e3a5f',   // primary
          700: '#162d4d',
          800: '#0f1f35',
          900: '#08131f',
        },
        gold: {
          300: '#f5d987',
          400: '#e8c14a',
          500: '#c8a951',   // accent
          600: '#a88830',
          700: '#7a6020',
        },
      },
      fontFamily: {
        sans: ['Inter', 'system-ui', 'sans-serif'],
      },
    },
  },
  plugins: [],
};
