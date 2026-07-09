/** @type {import('tailwindcss').Config} */
export default {
  content: [
    "./index.html",
    "./src/**/*.{vue,js,ts,jsx,tsx}",
  ],
  theme: {
    extend: {
      colors: {
        primary: {
          DEFAULT: '#2563EB',
          dark: '#1D4ED8',
        },
        danger: {
          DEFAULT: '#EF4444',
          dark: '#B91C1C',
        }
      }
    },
  },
  plugins: [],
}