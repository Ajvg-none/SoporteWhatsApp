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
          DEFAULT: '#95c11f',
          dark: '#7ca317',
          light: '#e6f2d0',
          hover: '#7ca317',
        },
        background: {
          light: '#FFFFFF',
          dark: '#878787',
        },
        card: {
          light: '#FFFFFF',
          dark: '#9E9E9E',
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