/** @type {import('tailwindcss').Config} */
export default {
  content: [
    "./index.html",
    "./src/**/*.{js,ts,jsx,tsx}",
  ],
  theme: {
    extend: {
      fontFamily: {
        sans: ['"Geist"', '"Plus Jakarta Sans"', '-apple-system', 'BlinkMacSystemFont', 'system-ui', 'sans-serif'],
        mono: ['"Geist Mono"', '"JetBrains Mono"', 'ui-monospace', 'SFMono-Regular', 'Menlo', 'monospace'],
      },
      borderRadius: {
        'xl': '14px',
        '2xl': '20px',
        '3xl': '28px',
        '4xl': '36px',
        '5xl': '48px',
      },
      colors: {
        vault: {
          950: '#06080f',
          900: '#0d121f',
          850: '#111728',
          800: '#161f36',
          700: '#222f52',
          600: '#334475',
          gold: '#f59e0b',
          emerald: '#10b981',
          ruby: '#f43f5e',
          cyan: '#38bdf8'
        }
      }
    },
  },
  plugins: [],
}
