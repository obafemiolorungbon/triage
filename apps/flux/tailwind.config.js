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
          950: '#0C0B0A',
          900: '#11100E',
          850: '#151412',
          800: '#181715',
          750: '#211F1C',
          700: '#292620',
          600: '#363228',
          500: '#454034',
          400: '#5B5548',
        },
        paper: {
          50: '#F8F1E7',
          100: '#F1E8DC',
          200: '#E2D4C1',
          300: '#C5B8A8',
          400: '#A49B8E',
          500: '#756D61',
          600: '#514A40',
        },
        lime: {
          DEFAULT: '#B8D66B',
          bright: '#CAE783',
          soft: '#B8D66B33',
          dim: '#B8D66B14',
        },
        escalation: {
          critical: '#E66A5C',
          expedite: '#D99A3D',
          watch: '#D8C45D',
          none: '#A49B8E',
        },
      },
      fontFamily: {
        sans: ['var(--font-geist-sans)', 'ui-sans-serif', 'system-ui', 'sans-serif'],
        mono: ['var(--font-geist-mono)', 'ui-monospace', 'SFMono-Regular', 'monospace'],
        display: ['var(--font-geist-sans)', 'ui-sans-serif', 'system-ui', 'sans-serif'],
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
        'glow-lime': '0 16px 34px -24px rgba(184, 214, 107, 0.45)',
        'glow-urgent': '0 16px 30px -24px rgba(230, 106, 92, 0.55)',
        'card': '0 1px 0 0 rgba(255,255,255,0.04) inset, 0 0 0 1px rgba(255,255,255,0.06), 0 20px 44px -30px rgba(0,0,0,0.75)',
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
