import tailwindcss from '@tailwindcss/vite';
import react from '@vitejs/plugin-react';
import path from 'path';
import {defineConfig} from 'vite';
import {VitePWA} from 'vite-plugin-pwa';

export default defineConfig(() => {
  return {
    plugins: [
      react(),
      tailwindcss(),
      VitePWA({
        registerType: 'autoUpdate',
        workbox: {
          // Adopt new service workers immediately instead of the default
          // two-reload dance; old precaches are then purged automatically.
          skipWaiting: true,
          clientsClaim: true,
          cleanupOutdatedCaches: true,
        },
        // No SW in dev: the dev SW caches unhashed modules, so code edits can
        // serve stale bundles forever (caused invisible transport icons).
        devOptions: {
          enabled: false,
        },
        manifest: {
          id: '/',
          name: 'MapAnimator - Explorer Edition',
          short_name: 'MapAnimator',
          description: 'Desktop-grade travel route video animator with OpenStreetMap cartography, real OSRM road routing, and flight geodesic tracking.',
          theme_color: '#0E6466',
          background_color: '#F4F1EA',
          display: 'standalone',
          start_url: '/',
          scope: '/',
          icons: [
            {
              src: '/pwa-192x192.png',
              sizes: '192x192',
              type: 'image/png',
              purpose: 'any',
            },
            {
              src: '/pwa-512x512.png',
              sizes: '512x512',
              type: 'image/png',
              purpose: 'any',
            },
          ],
        },
      }),
    ],
    resolve: {
      alias: {
        '@': path.resolve(__dirname, '.'),
      },
    },
    server: {
      // HMR is disabled in AI Studio via DISABLE_HMR env var.
      // Do not modify—file watching is disabled to prevent flickering during agent edits.
      hmr: process.env.DISABLE_HMR !== 'true',
      // Disable file watching when DISABLE_HMR is true to save CPU during agent edits.
      watch: process.env.DISABLE_HMR === 'true' ? null : {},
    },
  };
});
