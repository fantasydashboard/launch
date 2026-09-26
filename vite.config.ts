import { defineConfig } from 'vite'
import vue from '@vitejs/plugin-vue'
import path from 'path'
import devApi from './scripts/vite-plugin-dev-api.mjs'

export default defineConfig({
  /* devApi runs the `api/` handlers in dev. Without it Vite serves them as module source —
     200, text/javascript — which every caller reads as a healthy-but-empty upstream. */
  plugins: [vue(), devApi()],
  resolve: {
    alias: {
      '@': path.resolve(__dirname, './src')
    }
  }
})
