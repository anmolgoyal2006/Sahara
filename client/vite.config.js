import { defineConfig } from 'vite'
import react from '@vitejs/plugin-react'

export default defineConfig({
  plugins: [react()],
  server: {
    port: 3000,
    proxy: {
      '/api': 'http://localhost:5000'
    }
  },
  build: {
    rollupOptions: {
      // Suppress the dynamic import warning for @daily-co/daily-js
      // It is loaded lazily at runtime only when a call starts
      onwarn(warning, warn) {
        if (
          warning.code === 'UNRESOLVED_IMPORT' &&
          warning.message?.includes('@daily-co/daily-js')
        ) return
        warn(warning)
      }
    }
  }
})
