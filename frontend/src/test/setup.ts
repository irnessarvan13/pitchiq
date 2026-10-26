// setup.ts — runs before every test file (see setupFiles in vitest.config.ts)
import '@testing-library/jest-dom/vitest'           // adds readable checks like expect(...).toBeInTheDocument()
import { afterAll, afterEach, beforeAll, vi } from 'vitest'
import { cleanup } from '@testing-library/react'
import { server, unanswered } from './server'

// jsdom (the fake browser) has no IntersectionObserver, which Navbar uses to highlight the section on screen
// this stand-in does nothing, so components that use it can still render in tests
vi.stubGlobal('IntersectionObserver', class {
  observe() {}
  unobserve() {}
  disconnect() {}
  takeRecords() { return [] }
})

beforeAll(() => server.listen())                    // start the fake backend
afterEach(() => {
  server.resetHandlers()                            // forget the answers one test set up, so tests don't affect each other
  cleanup()                                         // remove whatever the test rendered
  if (unanswered.length > 0) {                      // fail the test if it made a request we didn't plan for
    const requests = unanswered.splice(0).join(', ')
    throw new Error(`The fake backend has no answer for: ${requests}. Add one with server.use(...)`)
  }
})
afterAll(() => server.close())                      // stop the fake backend when all tests are done

