/** @type {import('tailwindcss').Config} */
module.exports = {
  content: [
    './{src,pages,components,app}/**/*.{ts,tsx,js,jsx,html}',
    '!./{src,pages,components,app}/**/*.{stories,spec}.{ts,tsx,js,jsx,html}',
  ],
  darkMode: 'class',
  theme: {
    extend: {
      colors: {
        ink: {
          950: '#08080A',
          900: '#0A0A0B',
          850: '#0E0E10',
          800: '#121215',
          750: '#17171B',
          700: '#1C1C21',
          600: '#25252C',
          500: '#2E2E36',
          400: '#3A3A44',
        },
        paper: {
          50: '#FAF7F1',
          100: '#F4EFE6',
          200: '#E8E2D3',
          300: '#BFB9AB',
          400: '#8C8678',
          500: '#6B665A',
          600: '#4A4539',
        },
        lime: {
          DEFAULT: '#D9FF4D',
          bright: '#E8FF66',
          soft: '#D9FF4D33',
          dim: '#D9FF4D14',
        },
        priority: {
          urgent: '#FF5E5E',
          high: '#FF9F43',
          med: '#FFD43B',
          low: '#8C8678',
        },
      },
      fontFamily: {
        sans: ['var(--font-geist-sans)', 'ui-sans-serif', 'system-ui', 'sans-serif'],
        mono: ['var(--font-geist-mono)', 'ui-monospace', 'SFMono-Regular', 'monospace'],
        display: ['var(--font-instrument-serif)', 'Georgia', 'serif'],
      },
      fontSize: {
        '2xs': ['0.6875rem', { lineHeight: '1rem', letterSpacing: '0.02em' }],
      },
      letterSpacing: {
        tightest: '-0.04em',
      },
      borderColor: {
        DEFAULT: 'rgba(255, 255, 255, 0.06)',
      },
      boxShadow: {
        'inset-hairline': 'inset 0 0 0 1px rgba(255, 255, 255, 0.06)',
        'glow-lime': '0 0 32px -8px rgba(217, 255, 77, 0.4)',
        'glow-urgent': '0 0 20px -4px rgba(255, 94, 94, 0.5)',
        'card': '0 1px 0 0 rgba(255,255,255,0.04) inset, 0 0 0 1px rgba(255,255,255,0.06), 0 24px 48px -24px rgba(0,0,0,0.6)',
      },
      animation: {
        'fade-up': 'fadeUp 600ms cubic-bezier(0.2, 0.8, 0.2, 1) both',
        'fade-in': 'fadeIn 400ms ease-out both',
        'pulse-soft': 'pulseSoft 2.4s cubic-bezier(0.4, 0, 0.6, 1) infinite',
        'shimmer': 'shimmer 2.5s linear infinite',
      },
      keyframes: {
        fadeUp: {
          '0%': { opacity: '0', transform: 'translateY(12px)' },
          '100%': { opacity: '1', transform: 'translateY(0)' },
        },
        fadeIn: {
          '0%': { opacity: '0' },
          '100%': { opacity: '1' },
        },
        pulseSoft: {
          '0%, 100%': { opacity: '1', transform: 'scale(1)' },
          '50%': { opacity: '0.7', transform: 'scale(1.4)' },
        },
        shimmer: {
          '0%': { backgroundPosition: '-200% 0' },
          '100%': { backgroundPosition: '200% 0' },
        },
      },
    },
  },
  plugins: [],
};
