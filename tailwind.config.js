/** @type {import('tailwindcss').Config} */
module.exports = {
  content: [
    './pages/**/*.{js,ts,jsx,tsx,mdx}',
    './components/**/*.{js,ts,jsx,tsx,mdx}',
    './app/**/*.{js,ts,jsx,tsx,mdx}',
  ],
  theme: {
    extend: {
      colors: {
        letterboxd: {
          orange: '#fe8000',
          green: '#0ae053',
          blue: '#41bcf4',
          dark: '#14181c',
          'dark-light': '#1c2228',
          'dark-lighter': '#2c3440',
          gray: '#556677',
          'gray-light': '#778899',
          'gray-lighter': '#99aabb',
        },
      },
    },
  },
  plugins: [],
}
