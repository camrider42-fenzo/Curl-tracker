/**
 * Curl Tracker — Vite build.
 *
 * BASE_PATH is the public path the built files are served from.
 * Unset, the build uses relative URLs (`./`) so the same `dist/` works on
 * any static host and under `vite preview`. GitHub Actions sets `/<repo>/`
 * for project pages and `/` for a user or organization site.
 */
import preact from '@preact/preset-vite'
import { VitePWA } from 'vite-plugin-pwa'
import { defineConfig } from 'vitest/config'

const base = process.env.BASE_PATH || './'
const testing = Boolean(process.env.VITEST)

export default defineConfig({
  base,
  plugins: [
    preact(),
    ...(testing
      ? []
      : [
          VitePWA({
            registerType: 'autoUpdate',
            injectRegister: null,
            includeAssets: ['favicon.svg', 'icons/icon-192.png', 'icons/icon-512.png', 'icons/icon-maskable-512.png'],
            manifest: {
              name: 'Curl Tracker',
              short_name: 'Curl Tracker',
              description: 'Daily curly-hair routine log, stored on this device.',
              theme_color: '#16130f',
              background_color: '#16130f',
              display: 'standalone',
              start_url: './',
              scope: './',
              lang: 'en',
              icons: [
                { src: 'icons/icon-192.png', sizes: '192x192', type: 'image/png', purpose: 'any' },
                { src: 'icons/icon-512.png', sizes: '512x512', type: 'image/png', purpose: 'any' },
                { src: 'icons/icon-maskable-512.png', sizes: '512x512', type: 'image/png', purpose: 'maskable' },
              ],
            },
            workbox: {
              globPatterns: ['**/*.{js,css,html,svg,png,webmanifest,woff2}'],
              navigateFallback: 'index.html',
            },
          }),
        ]),
  ],
  server: { host: '127.0.0.1', port: 47321, strictPort: true },
  preview: { host: '127.0.0.1', port: 47322, strictPort: true },
  test: {
    environment: 'node',
    setupFiles: ['tests/setup.ts'],
    include: ['tests/**/*.test.ts'],
  },
})
