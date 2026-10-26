// LiveMatches.test.tsx — characterization tests (#41): what LiveMatches does TODAY
import { describe, it, expect } from 'vitest'
import { render, screen } from '@testing-library/react'
import { http, HttpResponse } from 'msw'
import { server } from '../test/server'
import { liveMatch } from '../test/fixtures'
import LiveMatches from './LiveMatches'

describe('LiveMatches', () => {
  it('shows a loading message, then "No matches live right now." when nothing is live', async () => {
    server.use(
      http.get('/api/football/live', () => HttpResponse.json({ matches: [] }))   // the fake backend: no live matches
    )

    render(<LiveMatches />)                                                       // put the component on the fake page

    expect(screen.getByText('Loading live matches...')).toBeInTheDocument()       // right away: the loading message
    expect(await screen.findByText('No matches live right now.')).toBeInTheDocument()   // after the answer arrives
  })

  it('shows each live match: both teams, their crests and the score', async () => {
    server.use(
      http.get('/api/football/live', () => HttpResponse.json({
        matches: [liveMatch(1, 'Arsenal FC', 'Chelsea FC', 2, 1), liveMatch(2, 'Liverpool FC', 'Everton FC', 1, 3)],
      }))
    )

    render(<LiveMatches />)

    expect(await screen.findByText('Arsenal FC')).toBeInTheDocument()
    expect(screen.getByText('Chelsea FC')).toBeInTheDocument()
    expect(screen.getByText('2 - 1')).toBeInTheDocument()
    expect(screen.getByRole('img', { name: 'Arsenal FC' })).toBeInTheDocument()   // the crest, with the team name as its alt text
    expect(screen.getByText('Liverpool FC')).toBeInTheDocument()
    expect(screen.getByText('1 - 3')).toBeInTheDocument()
  })

  it('shows "0 - 0" when a match has no score yet (BUG recorded on purpose — #29 will change this)', async () => {
    server.use(
      http.get('/api/football/live', () => HttpResponse.json({ matches: [liveMatch(1, 'Santos FC', 'EC Bahia', null, null)] }))
    )

    render(<LiveMatches />)

    expect(await screen.findByText('0 - 0')).toBeInTheDocument()                  // "no score" shows as a fake 0 - 0
  })

  it('says "No matches live right now." when the backend fails (BUG recorded on purpose — #42 will change this)', async () => {
    server.use(
      http.get('/api/football/live', () => HttpResponse.json({ detail: 'busy' }, { status: 503 }))
    )

    render(<LiveMatches />)

    expect(await screen.findByText('No matches live right now.')).toBeInTheDocument()   // an error looks like "nothing live"
  })
})

