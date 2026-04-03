import { defineConfig } from 'vite'
import react from '@vitejs/plugin-react'

export default defineConfig({
  plugins: [react()],
  server: {
    port: 3000,
    // proxy: {
    //   '/api': {
    //     target: 'http://localhost:8000',
    //     changeOrigin: true
    //   },
    //   '/ws': {
    //     target: 'ws://localhost:8000',
    //     ws: true,
    //     changeOrigin: true
    //   },
    //   '/media': {
    //     target: 'http://localhost:8000',
    //     changeOrigin: true
    //   }
    // }
    proxy: {
      '/api': {
        target: 'http://app.alpha.openscaler.net:9077',
        changeOrigin: true
      },
      '/ws': {
        target: 'ws://app.alpha.openscaler.net:9077',
        ws: true,
        changeOrigin: true
      },
      '/media': {
        target: 'http://app.alpha.openscaler.net:9077',
        changeOrigin: true
      }
    }
  },
  define: {
    global: 'window',
  }
})
