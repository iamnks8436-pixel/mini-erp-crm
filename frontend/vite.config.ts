import react from '@vitejs/plugin-react'
import { defineConfig, loadEnv } from 'vite'

// https://vite.dev/config/
export default defineConfig(({ mode }) => {
  const env = loadEnv(mode, '.', '')
  const apiUrl = (env.VITE_API_URL || 'http://localhost:5000')
    .replace(/\/+$/, '')
    .replace(/\/api$/, '')

  return {
    plugins: [react()],
    css: {
      postcss: {
        plugins: [],
      },
    },
    server: {
      port: 5173,
      proxy: {
        '/api': {
          target: apiUrl,
          changeOrigin: true,
        },
      },
    },
  }
})
