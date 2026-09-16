/** @type {import('tailwindcss').Config} */
export default {
  content: [
    "./index.html",
    "./*.{js,ts,jsx,tsx}",
    "./components/**/*.{js,ts,jsx,tsx}",
    "./services/**/*.{js,ts,jsx,tsx}"
  ],
  theme: {
    extend: {
      fontFamily: {
        'sans': ['"Comic Sans MS"', '"Comic Sans"', '"Chalkboard SE"', '"Comic Neue"', 'cursive', 'sans-serif'],
        'press-start': ['"Press Start 2P"', 'cursive'],
        'creepster': ['"Creepster"', 'cursive'],
      },
      animation: {
        'spin-slow': 'spin 3s linear infinite',
      }
    },
  },
  plugins: [],
}