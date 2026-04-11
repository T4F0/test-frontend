import { defineConfig, loadEnv } from 'vite'
import react from '@vitejs/plugin-react'

export default defineConfig(({ mode }) => {
  // Load env file based on `mode` in the current working directory.
  // Set the third parameter to '' to load all envs regardless of the `VITE_` prefix.
  const env = loadEnv(mode, process.cwd(), '')
  const apiTarget = env.VITE_API_URL || 'http://app.alpha.openscaler.net:9077'
  // const apiTarget = env.VITE_API_URL || 'http://localhost:8000'

  return {
    plugins: [react()],
    base: './',
    server: {
      port: 3000,
      proxy: {
        '/api': {
          target: apiTarget,
          changeOrigin: true
        },
        '/ws': {
          target: apiTarget.replace('http', 'ws'),
          ws: true,
          changeOrigin: true
        },
        '/media': {
          target: apiTarget,
          changeOrigin: true
        }
      }
    },
    define: {
      global: 'window',
    }
  }
})
