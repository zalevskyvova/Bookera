/** @type {import('tailwindcss').Config} */
export default {
  content: [
    "./index.html",
    "./src/**/*.{js,ts,jsx,tsx}",
  ],
  darkMode: 'class',
  theme: {
    extend: {
      colors: {
        ranobe: {
          dark: '#141414',
          card: '#1f1f1f',
          cardHover: '#2a2a2a',
          border: '#2e2e2e',
          accent: '#2196f3',
          accentHover: '#1e88e5',
          textMuted: '#9e9e9e',
          textMain: '#e0e0e0'
        }
      }
    },
  },
  plugins: [],
}
