import { defineConfig, configDefaults } from 'vitest/config'
import react from '@vitejs/plugin-react'
import path from 'node:path'

export default defineConfig({
  plugins: [react()],
  test: {
    environment: 'jsdom',
    setupFiles: ['./src/test-setup.ts'],
    // Agent worktrees hold checkouts of this repo; without this they are
    // collected as a second copy of every test.
    exclude: [...configDefaults.exclude, '.claude/**'],
  },
  resolve: { alias: { '@': path.resolve(__dirname, 'src') } },
})
