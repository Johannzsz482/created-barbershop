import react from '@vitejs/plugin-react'
import { defineConfig } from 'vite'

// https://vite.dev/config/
export default defineConfig({
  plugins: [react()],
  server: {
    // Anything the app requests under /api (and uploaded pictures under /uploads) is passed on to the Spring Boot backend
    proxy: { '/api': 'http://localhost:8080', '/uploads': 'http://localhost:8080' },
  },
})
