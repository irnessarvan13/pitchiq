// vitest.config.ts — settings for the frontend tests
// mergeConfig = start from the app's own Vite settings (vite.config.ts), then add the test settings on top
import { defineConfig, mergeConfig } from 'vitest/config'
import viteConfig from './vite.config.ts'

export default mergeConfig(viteConfig, defineConfig({
  test: {
    environment: 'jsdom',                 // a fake browser inside Node, so components can render without Chrome
    setupFiles: ['./src/test/setup.ts'],  // runs before every test file
  },
}))

