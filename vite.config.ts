import { defineConfig } from 'vite'
import react from '@vitejs/plugin-react'

// Base path matches the GitHub Pages project site URL: username.github.io/kipro-playlist-creator/
export default defineConfig({
  base: '/kipro-playlist-creator/',
  plugins: [react()],
})
