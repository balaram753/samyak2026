import { fileURLToPath, URL } from 'node:url'
import { defineConfig } from 'vite'
import react from '@vitejs/plugin-react'
import tailwindcss from '@tailwindcss/vite'

// https://vite.dev/config/
export default defineConfig({
  plugins: [
    react(),
    tailwindcss(),
  ],
  server: {
    // Expose on the LAN so the site can be tested from a phone.
    host: true,
  },
  resolve: {
    alias: {
      '@': fileURLToPath(new URL('./src', import.meta.url)),
      '@backend': fileURLToPath(new URL('./src/backend', import.meta.url)),
      '@services': fileURLToPath(new URL('./src/services', import.meta.url)),
      '@components': fileURLToPath(new URL('./src/components', import.meta.url)),
      '@pages': fileURLToPath(new URL('./src/pages', import.meta.url)),
      '@designcodeio/threeui/style.css': fileURLToPath(new URL('./src/shaders/threeui.css', import.meta.url)),
      '@designcodeio/threeui': fileURLToPath(new URL('./src/threeui/index.ts', import.meta.url)),
      'three165': 'three',
    },
  },
  build: {
    chunkSizeWarningLimit: 1200,
    modulePreload: {
      polyfill: true,
    },
    rollupOptions: {
      output: {
        manualChunks(id) {
          if (id.includes('node_modules')) {
            if (id.includes('firebase')) return 'vendor-firebase';
            if (id.includes('react') || id.includes('react-dom') || id.includes('react-router-dom')) return 'vendor-core';
            if (id.includes('lucide-react') || id.includes('framer-motion') || id.includes('lenis')) return 'vendor-ui';
          }
        },
      },
    },
  },
})

