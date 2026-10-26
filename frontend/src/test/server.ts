// server.ts — the fake backend (MSW = Mock Service Worker)
// It answers the app's real axios calls, so tests never need FastAPI, Docker or the internet.
// Each test tells it what to answer with server.use(...)
import { setupServer } from 'msw/node'
import { http, HttpResponse } from 'msw'

// every request a test made that it didn't set up an answer for
export const unanswered: string[] = []

export const server = setupServer(
  // the safety net: catches ANY request no test planned for, and remembers it so that test fails
  // (answers set up with server.use(...) are checked first, so this only runs when nothing else matched)
  http.all('*', ({ request }) => {
    unanswered.push(`${request.method} ${new URL(request.url).pathname}`)
    return HttpResponse.json({ detail: 'The fake backend has no answer for this request' }, { status: 500 })
  })
)
