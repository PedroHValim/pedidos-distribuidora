import { defineConfig } from 'vite'
import react from '@vitejs/plugin-react'

// base: './' garante que os arquivos gerados usem caminhos relativos,
// funcionando tanto em usuario.github.io/repo quanto em domínio próprio.
export default defineConfig({
  plugins: [react()],
  base: './',
})
