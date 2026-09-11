import { defineConfig } from 'vite'
import react from '@vitejs/plugin-react'

export default defineConfig({
  plugins: [react()],
  server: {
    host: '0.0.0.0',                     // allow external connections
    proxy: {
      '/api': {
        target: process.env.VITE_API_URL || 'http://localhost:8000',  // uses backend container in Docker, localhost locally
        changeOrigin: true,
        rewrite: (path) => path.replace(/^\/api/, '')
      }
    }
  }
})