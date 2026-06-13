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
          deep: '#2D1B4E',
          gold: '#FBBF24',
          mint: '#10B981',
          smoke: '#FAFAF9',
          white: '#FFFFFF',
          gray: '#6B7280',
          lila: '#EDE9FE',
        },
      },
      fontFamily: {
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
