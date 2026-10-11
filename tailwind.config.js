/** @type {import('tailwindcss').Config} */
export default {
  content: ['./index.html', './src/**/*.{js,jsx}'],
  theme: {
    extend: {
      colors: {
        ink: '#090B12', panel: '#0F121C', surface: '#151925', raised: '#1B2030',
        text: '#F5F6FA', muted: '#9299AB', line: '#282E3D', violet: '#9B87F5', lime: '#C4F36B',
        amber: '#F5BE62', coral: '#FF747F',
      },
      fontFamily: { sans: ['Inter', 'Geist', 'ui-sans-serif', 'system-ui', 'sans-serif'] },
      borderRadius: { card: '16px' },
    },
  },
  plugins: [],
};
