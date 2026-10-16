/** @type {import('tailwindcss').Config} */
export default {
  content: [
    "./index.html",
    "./src/**/*.{js,ts,jsx,tsx}",
  ],
  theme: {
    extend: {
      fontFamily: {
        sans: ['"Plus Jakarta Sans"', '-apple-system', 'BlinkMacSystemFont', 'system-ui', 'sans-serif'],
        mono: ['"JetBrains Mono"', 'ui-monospace', 'SFMono-Regular', 'Menlo', 'monospace'],
      },
      borderRadius: {
        '2xl': '18px',
        '3xl': '26px',
        '4xl': '34px',
        '5xl': '44px',
      },
      colors: {
        vault: {
          950: '#070a12',
          900: '#0d1322',
          850: '#11182c',
          800: '#17213b',
          700: '#233054',
          600: '#344572',
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
