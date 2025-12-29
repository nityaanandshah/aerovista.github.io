import { defineConfig } from 'vite'
import react from '@vitejs/plugin-react'
import path from 'path'

// https://vitejs.dev/config/
export default defineConfig({
  base: '/aerovista.github.io/',
  plugins: [react()],
  resolve: {
    alias: {
      '@': path.resolve(__dirname, './src')
    },
    dedupe: ['three'] // Prevent multiple Three.js instances
  },
  optimizeDeps: {
    include: ['globe.gl', 'three']
  }
})


