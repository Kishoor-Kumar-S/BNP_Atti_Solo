/** @type {import('tailwindcss').Config} */
export default {
  darkMode: "class",
  content: [
    "./index.html",
    "./src/**/*.{js,ts,jsx,tsx}",
  ],
  theme: {
    extend: {
      colors: {
        bnp: {
          teal: "#00966D",
          dark: "#0A1F1C",
        },
      },
    },
  },
  plugins: [],
}