// Standings.test.tsx — characterization tests (#41) + the error state (#42)
import { describe, it, expect } from 'vitest'
import { render, screen, within } from '@testing-library/react'
import userEvent from '@testing-library/user-event'
import { http, HttpResponse } from 'msw'
import { server } from '../test/server'
import { standingsPL } from '../test/fixtures'
import Standings from './Standings'

// the fake backend answers every standings request with the real Premier League table from #4
function answerWithPremierLeague() {
  server.use(http.get('/api/football/standings', () => HttpResponse.json(standingsPL)))
}

// the first cell (position) of every team row, top to bottom
function positionCells() {
  return screen.getAllByRole('row').slice(1).map(row => within(row).getAllByRole('cell')[0])   // slice(1) skips the header row
}

describe('Standings', () => {
  it('shows a loading message, then the matchday and all 20 teams in order', async () => {
    answerWithPremierLeague()

    render(<Standings competition="PL" />)

    expect(screen.getByText('Loading standings...')).toBeInTheDocument()
    expect(await screen.findByText('Matchday 7')).toBeInTheDocument()
    const rows = screen.getAllByRole('row')
    expect(rows).toHaveLength(21)                                                 // 1 header row + 20 teams
    expect(rows[1]).toHaveTextContent('Manchester City FC')                       // 1st place
    expect(within(rows[1]).getAllByRole('cell').at(-1)).toHaveTextContent('21')   // last cell = points
    expect(rows[20]).toHaveTextContent('Sunderland AFC')                          // 20th place
  })

  it('colors the Premier League zones: top 4, Europa (5th), bottom 3 relegated', async () => {
    answerWithPremierLeague()

    render(<Standings competition="PL" />)

    await screen.findByText('Matchday 7')
    const cells = positionCells()
    expect(cells[0]).toHaveClass('position-top4')
    expect(cells[3]).toHaveClass('position-top4')
    expect(cells[4]).toHaveClass('position-europa')
    expect(cells[9].className).toBe('')                                           // mid-table: no color at all
    expect(cells[17]).toHaveClass('position-relegation')
    expect(cells[19]).toHaveClass('position-relegation')
    expect(screen.queryByText('Relegation Playoff')).toBeNull()                  // the Premier League has no playoff spot
  })

  it('Bundesliga: 3rd from bottom is the relegation playoff spot, and the legend shows it', async () => {
    answerWithPremierLeague()                                                     // same table, but read with Bundesliga rules

    render(<Standings competition="BL1" />)

    await screen.findByText('Matchday 7')
    const cells = positionCells()
    expect(cells[17]).toHaveClass('position-playoff')
    expect(cells[18]).toHaveClass('position-relegation')
    expect(screen.getByText('Relegation Playoff')).toBeInTheDocument()
  })

  it('asks the backend for the league it was given', async () => {
    let askedFor = ''
    server.use(http.get('/api/football/standings', ({ request }) => {
      askedFor = new URL(request.url).searchParams.get('competition') ?? ''
      return HttpResponse.json(standingsPL)
    }))

    render(<Standings competition="PD" />)

    await screen.findByText('Matchday 7')
    expect(askedFor).toBe('PD')
  })

  it('shows the Predict button after picking a home and an away team', async () => {
    answerWithPremierLeague()

    render(<Standings competition="PL" />)

    await screen.findByText('Matchday 7')
    expect(screen.queryByText('Predict this match')).toBeNull()                  // nothing picked yet → no button
    const [home, away] = screen.getAllByRole('combobox')                          // the two team dropdowns
    await userEvent.selectOptions(home, 'Arsenal FC')
    await userEvent.selectOptions(away, 'Chelsea FC')
    expect(screen.getByText('Predict this match')).toBeInTheDocument()
  })

  // #43: the Predict button only appears after the user picked BOTH teams themselves
  it('picking only a home team does not show the Predict button, and the away team stays empty', async () => {
    answerWithPremierLeague()

    render(<Standings competition="PL" />)

    await screen.findByText('Matchday 7')
    const [home, away] = screen.getAllByRole('combobox')
    await userEvent.selectOptions(home, 'Liverpool FC')
    expect(screen.queryByText('Predict this match')).toBeNull()                  // only one team picked → no button
    expect(away).toHaveDisplayValue('Away team')                                  // nothing was filled in by itself
  })

  it('a team cannot play itself: the team picked on one side is disabled on the other side', async () => {
    answerWithPremierLeague()

    render(<Standings competition="PL" />)

    await screen.findByText('Matchday 7')
    const [home, away] = screen.getAllByRole('combobox')
    await userEvent.selectOptions(home, 'Arsenal FC')
    expect(within(away).getByRole('option', { name: 'Arsenal FC' })).toBeDisabled()   // Arsenal can't be picked as away now
    await userEvent.selectOptions(away, 'Chelsea FC')
    expect(within(home).getByRole('option', { name: 'Chelsea FC' })).toBeDisabled()   // and Chelsea can't be picked as home
  })

  it('switching to another league clears both team pickers and hides the Predict button', async () => {
    answerWithPremierLeague()

    const { rerender } = render(<Standings competition="PL" />)

    await screen.findByText('Matchday 7')
    const [home, away] = screen.getAllByRole('combobox')
    await userEvent.selectOptions(home, 'Manchester City FC')
    await userEvent.selectOptions(away, 'Arsenal FC')
    expect(screen.getByText('Predict this match')).toBeInTheDocument()

    rerender(<Standings competition="BL1" />)                                     // the user switches to the Bundesliga

    await screen.findByText('Matchday 7')                                        // the new table has loaded
    const [newHome, newAway] = screen.getAllByRole('combobox')                    // the table was rebuilt, so find the pickers again
    expect(newHome).toHaveDisplayValue('Home team')                               // both pickers are back to empty
    expect(newAway).toHaveDisplayValue('Away team')
    expect(screen.queryByText('Predict this match')).toBeNull()                  // no way to send last league's teams
  })

  it('Predict sends the two picked teams and the league name (not its code) to /predict', async () => {
    answerWithPremierLeague()
    let sent: unknown = null
    server.use(http.post('/api/predict', async ({ request }) => {
      sent = await request.json()                                                 // capture exactly what the app sent
      return HttpResponse.json({ prediction: 'Arsenal win 2-1' })
    }))

    render(<Standings competition="PL" />)

    await screen.findByText('Matchday 7')
    const [home, away] = screen.getAllByRole('combobox')
    await userEvent.selectOptions(home, 'Arsenal FC')
    await userEvent.selectOptions(away, 'Chelsea FC')
    await userEvent.click(screen.getByText('Predict this match'))
    await screen.findByText('Arsenal win 2-1')
    expect(sent).toEqual({
      home_team: 'Arsenal FC', away_team: 'Chelsea FC', competition: 'Premier League',   // the name, not "PL"
      home_position: 2, away_position: 4, home_points: 18, away_points: 13,
      home_gd: 6, away_gd: 4, matchday: 7,                                        // real numbers from the #4 table
    })
  })

  // #42: a failed request shows an error, not an empty table — checked for each error the backend can send
  it.each([503, 502, 504])('shows an error and a Try again button instead of the table when the backend answers %i', async (status) => {
    server.use(http.get('/api/football/standings', () => HttpResponse.json({ detail: 'failed' }, { status })))

    render(<Standings competition="PL" />)

    expect(await screen.findByText("Couldn't load standings right now.")).toBeInTheDocument()
    expect(screen.getByRole('button', { name: 'Try again' })).toBeInTheDocument()
    expect(screen.queryByRole('table')).toBeNull()                                // no empty table
    expect(screen.queryAllByRole('combobox')).toHaveLength(0)                     // and no empty team pickers
  })

  it('Try again fetches again and shows the table once the backend recovers', async () => {
    let calls = 0
    server.use(http.get('/api/football/standings', () => {
      calls += 1
      if (calls === 1) return HttpResponse.json({ detail: 'busy' }, { status: 503 })   // 1st request fails
      return HttpResponse.json(standingsPL)                                            // 2nd request works
    }))

    render(<Standings competition="PL" />)

    await userEvent.click(await screen.findByRole('button', { name: 'Try again' }))
    expect(await screen.findByText('Matchday 7')).toBeInTheDocument()
    expect(screen.getAllByRole('row')).toHaveLength(21)                           // the full table is back
    expect(calls).toBe(2)
  })
})
