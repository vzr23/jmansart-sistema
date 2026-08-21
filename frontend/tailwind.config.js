/** @type {import('tailwindcss').Config} */
export default {
  content: ['./index.html', './src/**/*.{vue,js,ts}'],
  theme: {
    extend: {
      colors: {
        navy: {
          50:  '#f0f2f7',
          100: '#DCDEE0',  // Cinza Claro — fundos neutros
          200: '#C8CBCF',  // Cinza Frio — textos de apoio, linhas
          300: '#8a9ab5',
          400: '#4a6080',
          500: '#243858',
          600: '#1B2743',  // Azul Vendôme Profundo — navbar, fundos
          700: '#101A30',  // Azul Vendôme — cor principal da marca
          800: '#0c1428',
          900: '#080d1a',
        },
      },
      fontFamily: {
        sans:  ['Karla', 'system-ui', 'sans-serif'],
        serif: ['Cormorant Garamond', 'Georgia', 'serif'],
      },
    },
  },
  plugins: [],
};
