import { defineConfig } from 'vite'
import react from '@vitejs/plugin-react'

// https://vite.dev/config/
export default defineConfig({
  plugins: [react()],
  server: {
    // Listen on the local network too, so phones on the same WiFi can connect
    // during development (Vite prints a "Network:" URL to use on the phone).
    host: true,
  },
})
