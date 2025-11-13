/** @type {import('tailwindcss').Config} */
module.exports = {
  content: [
    './src/pages/**/*.{js,jsx}',
    './src/components/**/*.{js,jsx}',
    './src/app/**/*.{js,jsx}',
  ],
  theme: {
    extend: {
      colors: {
        // Tema oscuro quirófano-friendly
        surgical: {
          50: '#e6f7f7',
          100: '#b3e6e6',
          200: '#80d4d4',
          300: '#4dc3c3',
          400: '#1ab1b1',
          500: '#00a0a0', // Verde quirúrgico principal
          600: '#008080',
          700: '#006060',
          800: '#004040',
          900: '#002020',
        },
        medical: {
          50: '#e6f0ff',
          100: '#b3d1ff',
          200: '#80b3ff',
          300: '#4d94ff',
          400: '#1a75ff',
          500: '#0057e6', // Azul médico
          600: '#0046b8',
          700: '#00358a',
          800: '#00245c',
          900: '#00122e',
        },
        dark: {
          50: '#e8e9ea',
          100: '#c1c4c6',
          200: '#9a9fa2',
          300: '#73797e',
          400: '#4c545a',
          500: '#252f36', // Fondo principal
          600: '#1e262c',
          700: '#161c21',
          800: '#0f1316',
          900: '#07090b',
        },
      },
      fontFamily: {
        sans: ['var(--font-inter)', 'system-ui', 'sans-serif'],
        mono: ['var(--font-roboto-mono)', 'monospace'],
      },
      boxShadow: {
        glow: '0 0 20px rgba(0, 160, 160, 0.3)',
        'glow-lg': '0 0 40px rgba(0, 160, 160, 0.4)',
      },
      animation: {
        'pulse-slow': 'pulse 3s cubic-bezier(0.4, 0, 0.6, 1) infinite',
      },
    },
  },
  plugins: [],
};
