// TopScorers.test.tsx — characterization tests (#41): what TopScorers does TODAY
import { describe, it, expect } from 'vitest'
import { render, screen, within, waitForElementToBeRemoved } from '@testing-library/react'
import { http, HttpResponse } from 'msw'
import { server } from '../test/server'
import { scorersPL } from '../test/fixtures'
import TopScorers from './TopScorers'

describe('TopScorers', () => {
  it('shows a loading message, then each scorer: rank, flag and name, team, goals, assists', async () => {
    server.use(http.get('/api/football/scorers', () => HttpResponse.json(scorersPL)))

    render(<TopScorers competition="PL" />)

    expect(screen.getByText('Loading top scorers...')).toBeInTheDocument()
    const haaland = (await screen.findByText(/Erling Haaland/)).closest('tr')!    // the whole table row for Haaland
    const cells = within(haaland).getAllByRole('cell')                            // its 5 cells: #, player, team, goals, assists
    expect(cells[0]).toHaveTextContent('1')
    expect(cells[1]).toHaveTextContent('🇳🇴 Erling Haaland')                       // flag emoji (#46 will switch to an image)
    expect(cells[2]).toHaveTextContent('Manchester City FC')
    expect(cells[3]).toHaveTextContent('8')
    expect(cells[4]).toHaveTextContent('N/A')                                      // assists are null → "N/A"
  })

  it('shows a real assists number when there is one', async () => {
    server.use(http.get('/api/football/scorers', () => HttpResponse.json(scorersPL)))

    render(<TopScorers competition="PL" />)

    const joao = (await screen.findByText(/João Pedro/)).closest('tr')!
    expect(within(joao).getAllByRole('cell')[4]).toHaveTextContent('3')
  })

  it('asks the backend for the league it was given', async () => {
    let askedFor = ''
    server.use(http.get('/api/football/scorers', ({ request }) => {
      askedFor = new URL(request.url).searchParams.get('competition') ?? ''     // remember which league was asked for
      return HttpResponse.json(scorersPL)
    }))

    render(<TopScorers competition="BL1" />)

    await screen.findByText(/Erling Haaland/)
    expect(askedFor).toBe('BL1')
  })

  it('shows an empty table when the backend fails (BUG recorded on purpose — #42 will change this)', async () => {
    server.use(http.get('/api/football/scorers', () => HttpResponse.json({ detail: 'busy' }, { status: 503 })))

    render(<TopScorers competition="PL" />)

    await waitForElementToBeRemoved(() => screen.queryByText('Loading top scorers...'))   // wait until loading is over
    expect(screen.getAllByRole('row')).toHaveLength(1)                            // only the header row — and no message
  })
})

