/** @type {import('tailwindcss').Config} */
export default {
  content: ['./index.html', './src/**/*.{ts,tsx}'],
  theme: {
    extend: {
      colors: {
        crab: {
          50: '#fff4f1',
          100: '#ffe4dd',
          200: '#ffcabd',
          300: '#ffa38f',
          400: '#ff6e50',
          500: '#f84a26',
          600: '#e5300c',
          700: '#c02408',
          800: '#9e220d',
          900: '#832212',
        },
      },
    },
  },
  plugins: [],
}
