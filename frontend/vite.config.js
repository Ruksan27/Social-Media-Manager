import { defineConfig } from 'vite'
import react from '@vitejs/plugin-react'
import tailwindcss from '@tailwindcss/vite'

// https://vite.dev/config/
export default defineConfig({
  plugins: [
    tailwindcss(),
    react(),
  ],
  server: {
    // Enable hot module replacement with polling for reliable file changes on Windows
    watch: {
      usePolling: true,
    },
    hmr: true,
  },
})
