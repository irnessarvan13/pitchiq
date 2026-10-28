// ChampionsLeague.test.tsx — characterization tests (#41) + each section failing on its own (#42)
import { describe, it, expect } from 'vitest'
import { render, screen, within } from '@testing-library/react'
import userEvent from '@testing-library/user-event'
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
    expect(screen.getByRole('img', { name: 'Norway' })).toHaveAttribute('src', 'https://flagcdn.com/w20/no.png')   // Haaland's flag image (#46)
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

  it('shows "–" instead of a fake "0 - 0" for a live UCL match with no score yet (#29)', async () => {
    answerAll([liveMatch(1, 'Real Madrid CF', 'FC Bayern München', null, null, 'UEFA Champions League')])

    renderPage()

    expect(await screen.findByText('🔴 Live Now')).toBeInTheDocument()
    expect(screen.getByText('–')).toBeInTheDocument()
    expect(screen.queryByText('0 - 0')).toBeNull()
  })

  it('hides "Live Now" when no Champions League match is live', async () => {
    answerAll([liveMatch(2, 'Santos FC', 'EC Bahia', 2, 2, 'Campeonato Brasileiro Série A')])

    renderPage()

    await screen.findByText('Matchday 7')
    expect(screen.queryByText('🔴 Live Now')).toBeNull()
  })

  // #42: each section succeeds or fails on its own — one failed request must not hide the others
  it('when live matches fail, standings and top scorers still show, and only Live Now shows an error', async () => {
    answerAll([])
    server.use(http.get('/api/football/live', () => HttpResponse.json({ detail: 'busy' }, { status: 503 })))   // only live fails

    renderPage()

    expect(await screen.findByText("Couldn't load live matches right now.")).toBeInTheDocument()
    expect(screen.getByText('Sunderland AFC')).toBeInTheDocument()               // standings loaded
    expect(screen.getByText(/Erling Haaland/)).toBeInTheDocument()               // top scorers loaded
    expect(screen.getAllByRole('button', { name: 'Try again' })).toHaveLength(1) // only the failed section has a Try again
  })

  it('when standings fail, only the standings section shows an error', async () => {
    answerAll([])
    server.use(http.get('/api/football/standings', () => HttpResponse.json({ detail: 'busy' }, { status: 503 })))

    renderPage()

    expect(await screen.findByText("Couldn't load standings right now.")).toBeInTheDocument()
    expect(screen.getByRole('heading', { name: 'UEFA Champions League' })).toBeInTheDocument()   // the page itself still shows
    expect(screen.getByText(/Erling Haaland/)).toBeInTheDocument()
    expect(screen.getAllByRole('button', { name: 'Try again' })).toHaveLength(1)
  })

  it('when top scorers fail, only the top scorers section shows an error', async () => {
    answerAll([])
    server.use(http.get('/api/football/scorers', () => HttpResponse.json({ detail: 'busy' }, { status: 503 })))

    renderPage()

    expect(await screen.findByText("Couldn't load top scorers right now.")).toBeInTheDocument()
    expect(screen.getByText('Sunderland AFC')).toBeInTheDocument()
    expect(screen.getAllByRole('button', { name: 'Try again' })).toHaveLength(1)
  })

  it('Try again only re-fetches the section that failed', async () => {
    let standingsCalls = 0
    let liveCalls = 0
    server.use(
      http.get('/api/football/standings', () => {
        standingsCalls += 1
        return HttpResponse.json(standingsPL)
      }),
      http.get('/api/football/scorers', () => HttpResponse.json(scorersPL)),
      http.get('/api/football/live', () => {
        liveCalls += 1
        if (liveCalls === 1) return HttpResponse.json({ detail: 'busy' }, { status: 503 })   // 1st live request fails
        return HttpResponse.json({ matches: [liveMatch(1, 'Real Madrid CF', 'FC Bayern München', 1, 0, 'UEFA Champions League')] })
      }),
    )

    renderPage()

    await userEvent.click(await screen.findByRole('button', { name: 'Try again' }))
    expect(await screen.findByText('Real Madrid CF')).toBeInTheDocument()       // live is back
    expect(screen.queryByText("Couldn't load live matches right now.")).toBeNull()
    expect(liveCalls).toBe(2)
    expect(standingsCalls).toBe(1)                                                // standings were NOT fetched again
  })
})
