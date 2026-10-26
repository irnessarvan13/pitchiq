// LiveMatches.test.tsx — the first frontend test (ticket #39)
import { describe, it, expect } from 'vitest'
import { render, screen } from '@testing-library/react'
import { http, HttpResponse } from 'msw'
import { server } from '../test/server'
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
})
