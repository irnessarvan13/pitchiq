// vitest.config.ts — settings for the frontend tests
// mergeConfig = start from the app's own Vite settings (vite.config.ts), then add the test settings on top
import { defineConfig, mergeConfig } from 'vitest/config'
import viteConfig from './vite.config.ts'

export default mergeConfig(viteConfig, defineConfig({
  test: {
    environment: 'jsdom',                 // a fake browser inside Node, so components can render without Chrome
    setupFiles: ['./src/test/setup.ts'],  // runs before every test file
    // coverage (#48) — which lines and branches of the app no test ran: npm run test:coverage
    coverage: {
      provider: 'v8',                     // uses the coverage counting built into Node's V8 engine
      include: ['src/**/*.{ts,tsx}'],     // every app file counts — even ones no test imports
      exclude: [
        'src/**/*.test.tsx',              // the tests themselves
        'src/test/**',                    // test helpers (the fake backend, fixtures, setup)
        'src/main.tsx',                   // the app's entry point — only runs in a real browser; the e2e test covers it
      ],
      reporter: ['text'],                 // print a table in the terminal (and in CI)
    },
  },
}))

