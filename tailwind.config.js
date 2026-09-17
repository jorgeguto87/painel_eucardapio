/** @type {import('tailwindcss').Config} */
export default {
  content: ['./index.html', './src/**/*.{js,jsx}'],
  theme: {
    extend: {
      colors: {
        primary:   { DEFAULT: '#FF6B2C', light: '#FF8C5A', dark: '#E05520' },
        secondary: { DEFAULT: '#1A1A2E', light: '#2D2D4E' },
        success:   '#22C55E',
        warning:   '#F59E0B',
        danger:    '#EF4444',
        surface:   '#FFFFFF',
        bg:        '#F8F9FA',
        // O cinza padrão do Tailwind (usado em texto secundário, alça de
        // arrastar, borda pontilhada etc.) é claro demais pra ler
        // confortavelmente — escurece só esses 2 tons, mantendo 300 mais
        // claro que 400 (a mesma hierarquia de sempre, só mais legível).
        gray: {
          300: '#9CA3AF', // era #D1D5DB
          400: '#6B7280', // era #9CA3AF
        },
      },
      fontFamily: { sans: ['Inter', 'sans-serif'] },
      borderRadius: { xl: '12px', '2xl': '16px' },
      minHeight:    { touch: '48px' },
      boxShadow: {
        card: '0 2px 8px rgba(0,0,0,0.08)',
        nav:  '0 -2px 12px rgba(0,0,0,0.08)',
        float: '0 12px 28px -8px rgba(26,26,46,0.18)',
      },
    },
  },
  plugins: [],
}
