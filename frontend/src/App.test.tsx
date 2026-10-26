// App.test.tsx — characterization tests (#41): the league buttons and the 500 ms debounce
import { describe, it, expect } from 'vitest'
import { render, screen, waitFor } from '@testing-library/react'
import userEvent from '@testing-library/user-event'
import { MemoryRouter } from 'react-router-dom'
import { http, HttpResponse } from 'msw'
import { server } from './test/server'
import { standingsPL, scorersPL } from './test/fixtures'
import App from './App'

let standingsAskedFor: string[] = []                                              // every league the standings were requested for

async function renderApp() {
  standingsAskedFor = []
  server.use(
    http.get('/api/football/live', () => HttpResponse.json({ matches: [] })),
    http.get('/api/football/scorers', () => HttpResponse.json(scorersPL)),
    http.get('/api/football/standings', ({ request }) => {
      standingsAskedFor.push(new URL(request.url).searchParams.get('competition') ?? '')
      return HttpResponse.json(standingsPL)
    }),
  )
  render(<MemoryRouter><App /></MemoryRouter>)                                    // App uses <Link> (in Navbar), so it needs a router
  await screen.findByText('Matchday 7')                                           // wait for the first load to finish
}

function wait(milliseconds: number) {
  return new Promise(resolve => setTimeout(resolve, milliseconds))
}

describe('App', () => {
  it('starts on the Premier League', async () => {
    await renderApp()

    expect(screen.getByRole('button', { name: 'Premier League' })).toBeDisabled()   // the selected league can't be clicked again
    expect(standingsAskedFor).toEqual(['PL'])
  })

  it('highlights a league right away, but waits before fetching it (the 500 ms debounce)', async () => {
    await renderApp()

    await userEvent.click(screen.getByRole('button', { name: 'Bundesliga' }))
    expect(screen.getByRole('button', { name: 'Bundesliga' })).toBeDisabled()     // highlighted immediately

    await wait(250)                                                               // half of the 500 ms debounce
    expect(standingsAskedFor).toEqual(['PL'])                                     // not fetched yet

    await waitFor(() => expect(standingsAskedFor).toEqual(['PL', 'BL1']))         // fetched soon after (waitFor keeps checking for up to 1 s)
  })

  it('clicking two leagues quickly only fetches the last one', async () => {
    await renderApp()

    await userEvent.click(screen.getByRole('button', { name: 'Bundesliga' }))
    await userEvent.click(screen.getByRole('button', { name: 'Ligue 1' }))        // within 500 ms of the first click

    await waitFor(() => expect(standingsAskedFor).toEqual(['PL', 'FL1']))         // Bundesliga was never fetched
  })
})
