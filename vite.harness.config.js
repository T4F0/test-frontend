import { defineConfig } from 'vite'
import react from '@vitejs/plugin-react'
export default defineConfig({
  plugins: [react()],
  base: '/',
  define: { global: 'window' },
  build: { outDir: '/tmp/claude-1000/-home-ercp-e-rcp/085dfa62-b523-42ca-bfde-a85735e97cca/scratchpad/h/dist', emptyOutDir: true, rollupOptions: { input: ['harness/index.html','harness/rtc-new.html','harness/rtc-old.html'] }, minify: false },
})
