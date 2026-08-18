import { defineConfig } from 'vite'
import react from '@vitejs/plugin-react'
import { readFileSync } from 'node:fs'

const { version } = JSON.parse(readFileSync('./package.json', 'utf-8'))

// Base path matches the GitHub Pages project site URL: username.github.io/kipro-playlist-creator/
export default defineConfig({
  base: '/kipro-playlist-creator/',
  plugins: [react()],
  define: {
    __APP_VERSION__: JSON.stringify(version),
  },
})
