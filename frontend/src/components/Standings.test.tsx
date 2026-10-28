// Standings.test.tsx — characterization tests (#41) + the error state (#42)
import { describe, it, expect } from 'vitest'
import { render, screen, within } from '@testing-library/react'
import userEvent from '@testing-library/user-event'
import { http, HttpResponse, delay } from 'msw'
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

  // #44: a prediction (or its error) belongs to ONE matchup — changing a team must clear it
  it('changing a team clears the old prediction and brings the Predict button back', async () => {
    answerWithPremierLeague()
    server.use(http.post('/api/predict', () => HttpResponse.json({ prediction: 'Arsenal win 2-1' })))

    render(<Standings competition="PL" />)

    await screen.findByText('Matchday 7')
    const [home, away] = screen.getAllByRole('combobox')
    await userEvent.selectOptions(home, 'Arsenal FC')
    await userEvent.selectOptions(away, 'Chelsea FC')
    await userEvent.click(screen.getByText('Predict this match'))
    await screen.findByText('Arsenal win 2-1')

    await userEvent.selectOptions(away, 'Liverpool FC')                           // now it's Arsenal vs Liverpool

    expect(screen.queryByText('Arsenal win 2-1')).toBeNull()                     // the Chelsea prediction is gone
    expect(screen.getByText('Predict this match')).toBeInTheDocument()           // ready to predict the new matchup
  })

  it('changing a team clears an old prediction error too', async () => {
    answerWithPremierLeague()
    server.use(http.post('/api/predict', () => HttpResponse.json({ detail: 'busy' }, { status: 503 })))

    render(<Standings competition="PL" />)

    await screen.findByText('Matchday 7')
    const [home, away] = screen.getAllByRole('combobox')
    await userEvent.selectOptions(home, 'Arsenal FC')
    await userEvent.selectOptions(away, 'Chelsea FC')
    await userEvent.click(screen.getByText('Predict this match'))
    await screen.findByText('Failed to get prediction. Please try again.')

    await userEvent.selectOptions(home, 'Liverpool FC')                           // now it's Liverpool vs Chelsea

    expect(screen.queryByText('Failed to get prediction. Please try again.')).toBeNull()
    expect(screen.getByText('Predict this match')).toBeInTheDocument()
  })

  it('a slow prediction for the old matchup never shows up after the teams change', async () => {
    answerWithPremierLeague()
    server.use(http.post('/api/predict', async () => {
      await delay(100)                                                            // Claude takes 100 ms to answer...
      return HttpResponse.json({ prediction: 'Arsenal win 2-1' })                 // ...and this answer is for Arsenal vs Chelsea
    }))

    render(<Standings competition="PL" />)

    await screen.findByText('Matchday 7')
    const [home, away] = screen.getAllByRole('combobox')
    await userEvent.selectOptions(home, 'Arsenal FC')
    await userEvent.selectOptions(away, 'Chelsea FC')
    await userEvent.click(screen.getByText('Predict this match'))
    expect(screen.getByText('Claude is analyzing the match...')).toBeInTheDocument()

    await userEvent.selectOptions(away, 'Liverpool FC')                           // change the matchup BEFORE the answer arrives
    await new Promise(resolve => setTimeout(resolve, 300))                        // wait well past the 100 ms answer

    expect(screen.queryByText('Arsenal win 2-1')).toBeNull()                     // it was ignored — wrong matchup
    expect(screen.queryByText('Claude is analyzing the match...')).toBeNull()    // and the new matchup isn't stuck "analyzing"
    expect(screen.getByText('Predict this match')).toBeInTheDocument()
  })

  // #45: a race condition — the OLD league's answer arrives AFTER the new one
  it('a slow answer for the previous league never replaces the new league\'s table', async () => {
    const bundesliga = { ...standingsPL, season: { ...standingsPL.season, currentMatchday: 8 } }   // same table, but "Matchday 8" so we can tell them apart
    server.use(http.get('/api/football/standings', async ({ request }) => {
      const competition = new URL(request.url).searchParams.get('competition')
      if (competition === 'PL') {
        await delay(300)                                                          // the Premier League answer is slow...
        return HttpResponse.json(standingsPL)                                     // ...and says "Matchday 7"
      }
      return HttpResponse.json(bundesliga)                                        // the Bundesliga answer is fast — "Matchday 8"
    }))

    const { rerender } = render(<Standings competition="PL" />)                   // asks for the Premier League (slow)
    rerender(<Standings competition="BL1" />)                                     // switch to the Bundesliga before it answers

    expect(await screen.findByText('Matchday 8')).toBeInTheDocument()           // the Bundesliga arrives first
    await new Promise(resolve => setTimeout(resolve, 500))                        // wait until the slow Premier League answer has arrived too

    expect(screen.getByText('Matchday 8')).toBeInTheDocument()                   // still the Bundesliga...
    expect(screen.queryByText('Matchday 7')).toBeNull()                          // ...the old answer was ignored
  })

  // #48 (found by coverage): Ligue 1, La Liga and "any other league" had zone rules no test checked
  it.each([
    { league: 'Ligue 1', competition: 'FL1', zones: { 2: 'position-top4', 3: 'position-europa', 5: '', 17: 'position-playoff', 18: 'position-relegation' } },
    { league: 'La Liga', competition: 'PD', zones: { 3: 'position-top4', 5: 'position-europa', 6: '', 17: 'position-relegation' } },
    { league: 'any other league', competition: 'SA', zones: { 3: 'position-top4', 4: '', 16: '', 17: 'position-relegation' } },
  ])('colors the $league zones', async ({ competition, zones }) => {
    answerWithPremierLeague()                                                     // the same 20-team table, read with this league's rules

    render(<Standings competition={competition} />)

    await screen.findByText('Matchday 7')
    const cells = positionCells()
    for (const [row, zoneClass] of Object.entries(zones)) {
      expect(cells[Number(row)].className).toBe(zoneClass)                        // row 0 = 1st place, row 19 = last
    }
  })

  // #48 (found by coverage): the cleanup from #45 also covers an OLD request that FAILS late
  it('a slow failure for the previous league never shows an error over the new league\'s table', async () => {
    const bundesliga = { ...standingsPL, season: { ...standingsPL.season, currentMatchday: 8 } }
    server.use(http.get('/api/football/standings', async ({ request }) => {
      if (new URL(request.url).searchParams.get('competition') === 'PL') {
        await delay(300)
        return HttpResponse.json({ detail: 'busy' }, { status: 503 })            // the old league's request fails — late
      }
      return HttpResponse.json(bundesliga)
    }))

    const { rerender } = render(<Standings competition="PL" />)
    rerender(<Standings competition="BL1" />)

    expect(await screen.findByText('Matchday 8')).toBeInTheDocument()
    await new Promise(resolve => setTimeout(resolve, 500))                        // wait until the old failure has arrived

    expect(screen.getByText('Matchday 8')).toBeInTheDocument()                   // the new table is still there...
    expect(screen.queryByText("Couldn't load standings right now.")).toBeNull()  // ...and no error for an old request
  })

  // #48 (found by coverage): picking the "Home team" / "Away team" placeholder again had no test
  it.each(['Home team', 'Away team'])('picking "%s" again clears that pick and hides the Predict button', async (placeholder) => {
    answerWithPremierLeague()

    render(<Standings competition="PL" />)

    await screen.findByText('Matchday 7')
    const [home, away] = screen.getAllByRole('combobox')
    await userEvent.selectOptions(home, 'Arsenal FC')
    await userEvent.selectOptions(away, 'Chelsea FC')
    await userEvent.selectOptions(placeholder === 'Home team' ? home : away, placeholder)   // back to the empty choice

    expect(screen.queryByText('Predict this match')).toBeNull()                  // only one team picked now → no button
  })

  // #48 (found by coverage): football-data.org can leave currentMatchday empty (null), e.g. before a season starts
  it('with no current matchday, hides "Matchday" and sends matchday 1 to /predict', async () => {
    const noMatchday = { ...standingsPL, season: { ...standingsPL.season, currentMatchday: null } }
    server.use(http.get('/api/football/standings', () => HttpResponse.json(noMatchday)))
    let sent: { matchday?: number } = {}
    server.use(http.post('/api/predict', async ({ request }) => {
      sent = await request.json() as { matchday?: number }
      return HttpResponse.json({ prediction: 'Arsenal win 2-1' })
    }))

    render(<Standings competition="PL" />)

    await screen.findByRole('table')                                              // wait for the table to load
    expect(screen.queryByText(/Matchday/)).toBeNull()                            // no "Matchday null" in the header
    const [home, away] = screen.getAllByRole('combobox')
    await userEvent.selectOptions(home, 'Arsenal FC')
    await userEvent.selectOptions(away, 'Chelsea FC')
    await userEvent.click(screen.getByText('Predict this match'))
    await screen.findByText('Arsenal win 2-1')
    expect(sent.matchday).toBe(1)                                                // 1 is the smallest matchday the backend accepts
  })
})
