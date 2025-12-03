import { defineConfig } from 'vite'
import react from '@vitejs/plugin-react'
import { VitePWA } from 'vite-plugin-pwa'

// https://vite.dev/config/
export default defineConfig(({ mode }) => ({
  plugins: [
    react(),
    VitePWA({
      registerType: 'autoUpdate',
      includeAssets: ['favicon.ico', 'apple-touch-icon.png', 'masked-icon.svg'],
      manifest: {
        name: 'SafeVoice',
        short_name: 'SafeVoice',
        description: 'Anonymous peer support platform for students',
        theme_color: '#7c3aed',
        background_color: '#0f172a',
        display: 'standalone',
        icons: [
          {
            src: 'pwa-192x192.png',
            sizes: '192x192',
            type: 'image/png',
          },
          {
            src: 'pwa-512x512.png',
            sizes: '512x512',
            type: 'image/png',
          },
          {
            src: 'pwa-512x512.png',
            sizes: '512x512',
            type: 'image/png',
            purpose: 'any maskable',
          },
        ],
      },
      workbox: {
        globPatterns: ['**/*.{js,css,html,ico,png,svg,woff,woff2}'],
        runtimeCaching: [
          {
            urlPattern: /^https:\/\/fonts\.googleapis\.com\/.*/i,
            handler: 'CacheFirst',
            options: {
              cacheName: 'google-fonts-cache',
              expiration: {
                maxEntries: 10,
                maxAgeSeconds: 60 * 60 * 24 * 365, // 1 year
              },
              cacheableResponse: {
                statuses: [0, 200],
              },
            },
          },
          {
            urlPattern: /^https:\/\/fonts\.gstatic\.com\/.*/i,
            handler: 'CacheFirst',
            options: {
              cacheName: 'gstatic-fonts-cache',
              expiration: {
                maxEntries: 10,
                maxAgeSeconds: 60 * 60 * 24 * 365, // 1 year
              },
              cacheableResponse: {
                statuses: [0, 200],
              },
            },
          },
          {
            urlPattern: /\.(?:png|jpg|jpeg|svg|gif|webp)$/i,
            handler: 'CacheFirst',
            options: {
              cacheName: 'images-cache',
              expiration: {
                maxEntries: 100,
                maxAgeSeconds: 60 * 60 * 24 * 30, // 30 days
              },
            },
          },
        ],
      },
    }),
  ],
  base: mode === 'production' ? '/Safevoice-cto/' : '/',
  build: {
    outDir: 'dist',
    rollupOptions: {
      output: {
        manualChunks: (id) => {
          // React vendor chunk
          if (id.includes('node_modules')) {
            if (id.includes('react') || id.includes('react-dom') || id.includes('react-router')) {
              return 'react-vendor';
            }
            // Wallet and web3 libraries
            if (id.includes('ethers') || id.includes('wagmi') || id.includes('@rainbow-me') || id.includes('viem')) {
              return 'wallet';
            }
            // Crypto libraries
            if (id.includes('openpgp') || id.includes('crypto-js')) {
              return 'crypto';
            }
            // UI libraries
            if (id.includes('framer-motion') || id.includes('lucide-react')) {
              return 'ui-vendor';
            }
            // 3D/Graphics libraries
            if (id.includes('three') || id.includes('@react-three')) {
              return 'graphics';
            }
            // Other vendor libraries
            return 'vendor';
          }
          // Analytics chunk
          if (id.includes('/pages/AnalyticsDashboard') || id.includes('/lib/analytics')) {
            return 'analytics';
          }
          // Wallet chunk
          if (id.includes('/components/wallet/') || id.includes('/lib/wallet/')) {
            return 'wallet-components';
          }
          // Marketplace chunk
          if (id.includes('/pages/TokenMarketplace')) {
            return 'marketplace';
          }
          // Communities chunk
          if (id.includes('/lib/communities/') || id.includes('/pages/Communities')) {
            return 'communities';
          }
        },
      },
    },
  },
}))
