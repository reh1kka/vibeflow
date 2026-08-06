import { defineConfig } from 'vite'
import react from '@vitejs/plugin-react'
import { VitePWA } from 'vite-plugin-pwa'
import { spotifyApiPlugin } from './vite/plugins/spotify-api'

export default defineConfig({
  plugins: [
    react(),
    spotifyApiPlugin(),
    VitePWA({
      registerType: 'autoUpdate',
      includeAssets: [
        'favicon.svg',
        'favicon.png',
        'favicon-48.png',
        'favicon-64.png',
        'apple-touch-icon.png',
        'logo.png',
      ],
      manifest: {
        name: 'VibeFlows',
        short_name: 'VibeFlows',
        description: 'VibeFlows — discover obscure music genres',
        theme_color: '#121212',
        background_color: '#121212',
        display: 'standalone',
        orientation: 'portrait',
        start_url: '/',
        icons: [
          {
            src: 'pwa-192.png',
            sizes: '192x192',
            type: 'image/png',
          },
          {
            src: 'pwa-512.png',
            sizes: '512x512',
            type: 'image/png',
          },
          {
            src: 'pwa-512.png',
            sizes: '512x512',
            type: 'image/png',
            purpose: 'maskable',
          },
        ],
      },
      workbox: {
        cleanupOutdatedCaches: true,
        skipWaiting: true,
        clientsClaim: true,
        globPatterns: ['**/*.{js,css,html,ico,png,svg,woff2}'],
        maximumFileSizeToCacheInBytes: 4 * 1024 * 1024,
        runtimeCaching: [
          {
            // Prefer network; large JSON is sometimes challenged on Vercel
            urlPattern: /\/genres\.json/,
            handler: 'NetworkOnly',
            options: {
              cacheName: 'genres-data-v5',
            },
          },
          {
            urlPattern: /\/genre-overrides\.json/,
            handler: 'StaleWhileRevalidate',
            options: {
              cacheName: 'genre-overrides-v3',
              cacheableResponse: {
                statuses: [200],
              },
            },
          },
          {
            urlPattern: /\/similarity\.json$/,
            handler: 'NetworkOnly',
            options: {
              cacheName: 'similarity-data-v3',
            },
          },
          {
            urlPattern: /\/genre-descriptions\.json$/,
            handler: 'StaleWhileRevalidate',
            options: {
              cacheName: 'genre-descriptions-v3',
              cacheableResponse: {
                statuses: [200],
              },
            },
          },
        ],
      },
    }),
  ],
  server: {
    proxy: {
      '/everynoise': {
        target: 'https://everynoise.com',
        changeOrigin: true,
        rewrite: (p) => p.replace(/^\/everynoise/, ''),
      },
      '/deezer': {
        target: 'https://api.deezer.com',
        changeOrigin: true,
        rewrite: (p) => p.replace(/^\/deezer/, ''),
      },
    },
  },
})
