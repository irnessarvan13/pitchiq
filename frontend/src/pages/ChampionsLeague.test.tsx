// ChampionsLeague.test.tsx — characterization tests (#41): what the Champions League page does TODAY
import { describe, it, expect } from 'vitest'
import { render, screen, within } from '@testing-library/react'
import { MemoryRouter } from 'react-router-dom'
import { http, HttpResponse } from 'msw'
import { server } from '../test/server'
import { standingsPL, scorersPL, liveMatch } from '../test/fixtures'
import ChampionsLeague from './ChampionsLeague'

// the page makes 3 requests at once; each test decides what the live one returns
function answerAll(liveMatches: unknown[]) {
  server.use(
    http.get('/api/football/standings', () => HttpResponse.json(standingsPL)),    // stand-in table (20 teams)
    http.get('/api/football/scorers', () => HttpResponse.json(scorersPL)),
    http.get('/api/football/live', () => HttpResponse.json({ matches: liveMatches })),
  )
}

function renderPage() {
  render(<MemoryRouter><ChampionsLeague /></MemoryRouter>)                        // the page uses <Link>, so it needs a router
}

describe('ChampionsLeague page', () => {
  it('shows a loading message, then the title, matchday, standings and top scorers', async () => {
    answerAll([])

    renderPage()

    expect(screen.getByText('Loading Champions League data...')).toBeInTheDocument()
    expect(await screen.findByText('Matchday 7')).toBeInTheDocument()
    expect(screen.getByRole('heading', { name: 'UEFA Champions League' })).toBeInTheDocument()
    expect(screen.getByText('League Stage Standings')).toBeInTheDocument()
    expect(screen.getByText(/Erling Haaland/)).toBeInTheDocument()
    expect(screen.getByRole('link', { name: '← Back to Dashboard' })).toHaveAttribute('href', '/')
  })

  it('marks the top 8 teams as qualified', async () => {
    answerAll([])

    renderPage()

    await screen.findByText('Matchday 7')
    const standingsTable = screen.getAllByRole('table')[0]
    const teamRows = within(standingsTable).getAllByRole('row').slice(1)          // skip the header row
    expect(teamRows[7]).toHaveClass('ucl-qualify')                                // 8th place
    expect(teamRows[8]).not.toHaveClass('ucl-qualify')                            // 9th place
  })

  it('shows only Champions League matches in "Live Now"', async () => {
    answerAll([
      liveMatch(1, 'Real Madrid CF', 'FC Bayern München', 1, 0, 'UEFA Champions League'),
      liveMatch(2, 'Santos FC', 'EC Bahia', 2, 2, 'Campeonato Brasileiro Série A'),   // not a UCL match → hidden
    ])

    renderPage()

    expect(await screen.findByText('🔴 Live Now')).toBeInTheDocument()
    expect(screen.getByText('Real Madrid CF')).toBeInTheDocument()
    expect(screen.queryByText('Santos FC')).toBeNull()
  })

  it('hides "Live Now" when no Champions League match is live', async () => {
    answerAll([liveMatch(2, 'Santos FC', 'EC Bahia', 2, 2, 'Campeonato Brasileiro Série A')])

    renderPage()

    await screen.findByText('Matchday 7')
    expect(screen.queryByText('🔴 Live Now')).toBeNull()
  })

  it('shows only an error when ONE of its 3 requests fails (BUG recorded on purpose — #42 will change this)', async () => {
    answerAll([])
    server.use(http.get('/api/football/live', () => HttpResponse.json({ detail: 'busy' }, { status: 503 })))   // only live fails

    renderPage()

    expect(await screen.findByText('Failed to load Champions League data. Please try again.')).toBeInTheDocument()
    expect(screen.queryByText('League Stage Standings')).toBeNull()               // standings loaded fine, but aren't shown
  })
})
