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
