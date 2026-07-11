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
          DEFAULT: '#0284c7',
          dark: '#0369a1',
          light: '#e0f2fe',
        },
        danger: {
          DEFAULT: '#f43f5e',
          dark: '#be123c',
        }
      }
    },
  },
  plugins: [],
}