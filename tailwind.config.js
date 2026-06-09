/** @type {import('tailwindcss').Config} */
export default {
  darkMode: 'class',
  content: [
    "./index.html",
    "./src/**/*.{vue,js,ts,jsx,tsx}",
  ],
  theme: {
    extend: {
      colors: {
        primary: 'var(--color-primary, #C6FF3A)',
        accent: 'var(--color-primary, #C6FF3A)',
        warn: '#F2B33A',
        alert: '#FF5C5C',
        dark: {
          bg: '#0B0E13',
          elevated: '#12161F',
          elevatedSoft: '#181D29',
          card: '#12161F',
          cardHover: '#181D29',
          border: '#222835',
          text: '#E6EAF2',
          textSecondary: '#A6AEC0',
          textMuted: '#8A93A6'
        }
      },
      fontFamily: {
        sans: ['Inter', 'system-ui', '-apple-system', 'BlinkMacSystemFont', 'Segoe UI', 'sans-serif'],
        display: ['Space Grotesk', 'Inter', 'system-ui', 'sans-serif'],
        mono: ['JetBrains Mono', 'ui-monospace', 'SFMono-Regular', 'Menlo', 'monospace']
      },
      borderRadius: {
        'card': '16px'
      },
      boxShadow: {
        'soft': '0 12px 40px rgba(0, 0, 0, 0.45)'
      }
    },
  },
  plugins: [],
}
