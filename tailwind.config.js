/** @type {import('tailwindcss').Config} */
export default {
  content: ['./index.html', './src/**/*.{js,ts,jsx,tsx}'],
  theme: {
    extend: {
      colors: {
        // Paleta institucional AIEP: azul primario + blanco, rojo como acento.
        brand: {
          50: '#eef4fb',
          100: '#d6e4f7',
          200: '#aecbef',
          500: '#0b4ea2',
          600: '#073e85',
          700: '#052d63',
        },
        // Rojo de los "techos" del logo — solo para acentos puntuales.
        accent: {
          500: '#c8102e',
          600: '#a6122b',
        },
      },
    },
  },
  plugins: [],
}
