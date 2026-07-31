import { defineConfig } from 'vite'
import react from '@vitejs/plugin-react'
import { VitePWA } from 'vite-plugin-pwa'

// https://vite.dev/config/
export default defineConfig({
  plugins: [
    react(),
    VitePWA({
      // Ship updates without the user having to do anything: the new service
      // worker takes over as soon as it's ready.
      registerType: 'autoUpdate',
      includeAssets: ['apple-touch-icon.png', 'favicon.svg'],
      manifest: {
        name: 'Imposter — party word game',
        short_name: 'Imposter',
        description:
          'A bilingual party game: everyone gets the same secret word except one imposter.',
        theme_color: '#7c3aed',
        background_color: '#f7f3ff',
        display: 'standalone',
        orientation: 'portrait',
        start_url: '/',
        scope: '/',
        icons: [
          { src: '/pwa-192.png', sizes: '192x192', type: 'image/png' },
          { src: '/pwa-512.png', sizes: '512x512', type: 'image/png' },
          {
            src: '/pwa-maskable-512.png',
            sizes: '512x512',
            type: 'image/png',
            purpose: 'maskable',
          },
        ],
      },
      workbox: {
        // Firestore/Auth traffic must always hit the network — never cache it.
        navigateFallbackDenylist: [/^\/__/],
        runtimeCaching: [
          {
            urlPattern:
              /^https:\/\/(firestore|identitytoolkit|securetoken)\.googleapis\.com\/.*/i,
            handler: 'NetworkOnly',
          },
        ],
      },
    }),
  ],
  server: {
    // Listen on the local network too, so phones on the same WiFi can connect
    // during development (Vite prints a "Network:" URL to use on the phone).
    host: true,
  },
})
