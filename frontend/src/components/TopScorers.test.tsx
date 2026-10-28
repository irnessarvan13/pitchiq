// TopScorers.test.tsx — characterization tests (#41) + the error state (#42)
import { describe, it, expect } from 'vitest'
import { render, screen, within } from '@testing-library/react'
import userEvent from '@testing-library/user-event'
import { http, HttpResponse, delay } from 'msw'
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
    expect(cells[1]).toHaveTextContent('Erling Haaland')
    expect(within(cells[1]).getByRole('img', { name: 'Norway' })).toHaveAttribute('src', 'https://flagcdn.com/w20/no.png')   // a flag image, not an emoji (#46)
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

  // #42: a failed request shows an error, not an empty table — checked for each error the backend can send
  it.each([503, 502, 504])('shows an error and a Try again button instead of the table when the backend answers %i', async (status) => {
    server.use(http.get('/api/football/scorers', () => HttpResponse.json({ detail: 'failed' }, { status })))

    render(<TopScorers competition="PL" />)

    expect(await screen.findByText("Couldn't load top scorers right now.")).toBeInTheDocument()
    expect(screen.getByRole('button', { name: 'Try again' })).toBeInTheDocument()
    expect(screen.queryByRole('table')).toBeNull()                                // no empty table
  })

  it('Try again fetches again and shows the scorers once the backend recovers', async () => {
    let calls = 0
    server.use(http.get('/api/football/scorers', () => {
      calls += 1
      if (calls === 1) return HttpResponse.json({ detail: 'busy' }, { status: 503 })   // 1st request fails
      return HttpResponse.json(scorersPL)                                              // 2nd request works
    }))

    render(<TopScorers competition="PL" />)

    await userEvent.click(await screen.findByRole('button', { name: 'Try again' }))
    expect(await screen.findByText(/Erling Haaland/)).toBeInTheDocument()
    expect(screen.queryByText("Couldn't load top scorers right now.")).toBeNull()
    expect(calls).toBe(2)
  })

  it('switching to another league after an error loads that league normally', async () => {
    server.use(http.get('/api/football/scorers', ({ request }) => {
      const competition = new URL(request.url).searchParams.get('competition')
      if (competition === 'PL') return HttpResponse.json({ detail: 'busy' }, { status: 503 })   // the Premier League fails
      return HttpResponse.json(scorersPL)                                                        // every other league works
    }))

    const { rerender } = render(<TopScorers competition="PL" />)
    await screen.findByText("Couldn't load top scorers right now.")

    rerender(<TopScorers competition="BL1" />)                                    // the user picks the Bundesliga

    expect(await screen.findByText(/Erling Haaland/)).toBeInTheDocument()
    expect(screen.queryByText("Couldn't load top scorers right now.")).toBeNull()   // the old error didn't stick around
  })

  // #45: a race condition — the OLD league's answer arrives AFTER the new one
  it('a slow answer for the previous league never replaces the new league\'s scorers', async () => {
    const bundesliga = { ...scorersPL, scorers: scorersPL.scorers.slice(1) }      // same list without Haaland, so we can tell them apart
    server.use(http.get('/api/football/scorers', async ({ request }) => {
      const competition = new URL(request.url).searchParams.get('competition')
      if (competition === 'PL') {
        await delay(300)                                                          // the Premier League answer is slow...
        return HttpResponse.json(scorersPL)                                       // ...and has Haaland at the top
      }
      return HttpResponse.json(bundesliga)                                        // the Bundesliga answer is fast — no Haaland
    }))

    const { rerender } = render(<TopScorers competition="PL" />)                  // asks for the Premier League (slow)
    rerender(<TopScorers competition="BL1" />)                                    // switch to the Bundesliga before it answers

    expect(await screen.findByText(/João Pedro/)).toBeInTheDocument()            // the Bundesliga list arrives first
    await new Promise(resolve => setTimeout(resolve, 500))                        // wait until the slow Premier League answer has arrived too

    expect(screen.queryByText(/Erling Haaland/)).toBeNull()                      // the old answer was ignored
  })

  // #48 (found by coverage): the cleanup from #45 also covers an OLD request that FAILS late
  it('a slow failure for the previous league never shows an error over the new league\'s scorers', async () => {
    server.use(http.get('/api/football/scorers', async ({ request }) => {
      if (new URL(request.url).searchParams.get('competition') === 'PL') {
        await delay(300)
        return HttpResponse.json({ detail: 'busy' }, { status: 503 })            // the old league's request fails — late
      }
      return HttpResponse.json(scorersPL)
    }))

    const { rerender } = render(<TopScorers competition="PL" />)
    rerender(<TopScorers competition="BL1" />)

    expect(await screen.findByText(/Erling Haaland/)).toBeInTheDocument()
    await new Promise(resolve => setTimeout(resolve, 500))                        // wait until the old failure has arrived

    expect(screen.getByText(/Erling Haaland/)).toBeInTheDocument()               // the new list is still there...
    expect(screen.queryByText("Couldn't load top scorers right now.")).toBeNull()   // ...and no error for an old request
  })
})
