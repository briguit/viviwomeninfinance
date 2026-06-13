import type { Config } from 'tailwindcss'

const config: Config = {
  content: [
    './src/**/*.{js,ts,jsx,tsx,mdx}',
  ],
  theme: {
    extend: {
      colors: {
        vivi: {
          purple: '#7C3AED',
          deep: '#1d1a24',
          plum: '#4c1d95',
          muted: '#4a4455',
          surface: '#fef7ff',
          lila: '#ede9fe',
          gold: '#F59E0B',
          mint: '#10B981',
          white: '#FFFFFF',
          gray: '#4a4455',
          outline: '#ccc3d8',
        },
      },
      fontFamily: {
        manrope: ['Manrope', 'Verdana', 'Arial', 'sans-serif'],
        poppins: ['Poppins', 'Verdana', 'Arial', 'sans-serif'],
      },
      maxWidth: {
        app: '430px',
      },
      borderRadius: {
        card: '20px',
        btn: '16px',
      },
    },
  },
  plugins: [],
}
export default config
