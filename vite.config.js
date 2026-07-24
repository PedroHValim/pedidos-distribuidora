import { defineConfig } from 'vite'
import react from '@vitejs/plugin-react'
import { VitePWA } from 'vite-plugin-pwa'

// base: './' garante que os arquivos gerados usem caminhos relativos,
// funcionando tanto em usuario.github.io/repo quanto em domínio próprio.
export default defineConfig({
  base: './',
  plugins: [
    react(),
    VitePWA({
      // não define `base` aqui de propósito: o plugin herda `viteConfig.base`
      // (o './' acima) e usa isso para o manifest, o link do manifest no HTML
      // e o service worker — por isso o app funciona tanto num domínio próprio
      // quanto em usuario.github.io/repo sem precisar reconfigurar nada.
      registerType: 'autoUpdate',
      includeAssets: ['icons/*.png'],
      manifest: {
        name: 'Pedidos — Distribuidora',
        short_name: 'Pedidos',
        description: 'Controle de pedidos, compras e entregas da distribuidora',
        lang: 'pt-BR',
        theme_color: '#1c2321',
        background_color: '#f5f6f3',
        display: 'standalone',
        start_url: './',
        scope: './',
        icons: [
          { src: 'icons/icon-192.png', sizes: '192x192', type: 'image/png', purpose: 'any' },
          { src: 'icons/icon-512.png', sizes: '512x512', type: 'image/png', purpose: 'any' },
          { src: 'icons/icon-maskable-512.png', sizes: '512x512', type: 'image/png', purpose: 'maskable' },
        ],
      },
      workbox: {
        globPatterns: ['**/*.{js,css,html,png,svg,ico,webmanifest}'],
      },
    }),
  ],
})
