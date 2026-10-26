// setup.ts — runs before every test file (see setupFiles in vitest.config.ts)
import '@testing-library/jest-dom/vitest'           // adds readable checks like expect(...).toBeInTheDocument()
import { afterAll, afterEach, beforeAll } from 'vitest'
import { cleanup } from '@testing-library/react'
import { server, unanswered } from './server'

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
