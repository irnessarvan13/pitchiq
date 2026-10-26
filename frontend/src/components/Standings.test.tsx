// Standings.test.tsx — characterization tests (#41): what Standings does TODAY
import { describe, it, expect } from 'vitest'
import { render, screen, within, waitForElementToBeRemoved } from '@testing-library/react'
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

  it('picking only a home team already shows the Predict button (BUG recorded on purpose — #43 will change this)', async () => {
    answerWithPremierLeague()

    render(<Standings competition="PL" />)

    await screen.findByText('Matchday 7')
    const [home, away] = screen.getAllByRole('combobox')
    await userEvent.selectOptions(home, 'Liverpool FC')
    expect(screen.getByText('Predict this match')).toBeInTheDocument()           // away was filled in by itself...
    expect(away).toHaveDisplayValue('Arsenal FC')                                 // ...with whoever is 2nd in the table
  })

  it('shows an empty table when the backend fails (BUG recorded on purpose — #42 will change this)', async () => {
    server.use(http.get('/api/football/standings', () => HttpResponse.json({ detail: 'busy' }, { status: 503 })))

    render(<Standings competition="PL" />)

    await waitForElementToBeRemoved(() => screen.queryByText('Loading standings...'))
    expect(screen.getAllByRole('row')).toHaveLength(1)                            // only the header row — and no message
  })
})
