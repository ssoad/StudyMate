import { defineConfig } from 'vite'
import react from '@vitejs/plugin-react'
import tailwindcss from '@tailwindcss/vite'

// Optional: point `npm run dev` at a running StudyMate server for API calls,
// e.g. STUDYMATE_DEV_PROXY=http://10.0.0.206:5173 npm run dev
const apiTarget = process.env.STUDYMATE_DEV_PROXY

// https://vite.dev/config/
export default defineConfig({
  plugins: [
    tailwindcss(),
    react()
  ],
  server: apiTarget
    ? {
        proxy: Object.fromEntries(
          ['/rest', '/auth', '/api', '/storage'].map((p) => [p, { target: apiTarget, changeOrigin: true }])
        ),
      }
    : undefined,
})
