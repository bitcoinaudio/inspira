/** @type {import('tailwindcss').Config} */
export default {
  content: [
    "./index.html",
    "./src/**/*.{js,ts,jsx,tsx}",
  ],
  theme: {
    extend: {
      colors: {
        bitcoin: '#f7931a',
      },
      fontFamily: {
        sans: ['Work Sans', 'system-ui', 'sans-serif'],
        orbitron: ['Orbitron', 'monospace'],
        mono: ['Space Mono', 'monospace'],
        display: ['Orbitron', 'system-ui', 'sans-serif'],
      },
    },
  },
  plugins: [
    require('daisyui'),
  ],
  daisyui: {
    themes: ['dark', 'light', 'synthwave', 'retro', 'cyberpunk'],
    darkTheme: 'dark',
  },
}
