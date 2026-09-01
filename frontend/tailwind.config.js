/** @type {import('tailwindcss').Config} */
export default {
  content: ['./index.html', './src/**/*.{js,jsx}'],
  darkMode: 'class',
  theme: {
    extend: {
      colors: {
        // Site-survey / single-line-diagram palette — see README "Design system"
        ink: '#14192B',
        paper: '#F3F5F5',
        dusk: '#10182B',
        panel: '#161E33',
        panelBorder: '#2A3350',
        inputDark: '#0D1424',
        solar: '#E8A93A',
        copper: '#B5623F',
        steel: '#5C6478',
        sky: '#3E7C8C',
      },
      fontFamily: {
        display: ['"IBM Plex Sans"', 'system-ui', 'sans-serif'],
        mono: ['"IBM Plex Mono"', 'ui-monospace', 'SFMono-Regular', 'monospace'],
      },
    },
  },
  plugins: [],
};
