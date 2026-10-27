// MatchPrediction.test.tsx — characterization tests (#41): what MatchPrediction does TODAY
import { describe, it, expect } from 'vitest'
import { render, screen } from '@testing-library/react'
import userEvent from '@testing-library/user-event'
import { http, HttpResponse, delay } from 'msw'
import { server } from '../test/server'
import MatchPrediction from './MatchPrediction'

// the props Standings passes in for Arsenal (2nd) vs Chelsea (4th) — since #43, competition is the league's name
const ARSENAL_VS_CHELSEA = {
  homeTeam: 'Arsenal FC', awayTeam: 'Chelsea FC', competition: 'Premier League',
  homePosition: 2, awayPosition: 4, homePoints: 18, awayPoints: 13,
  homeGd: 6, awayGd: 4, matchday: 7,
}

describe('MatchPrediction', () => {
  it('shows a Predict button, a loading message, then Claude\'s prediction one line per paragraph', async () => {
    server.use(http.post('/api/predict', async () => {
      await delay(50)                                                             // a short wait, so the loading message is visible
      return HttpResponse.json({ prediction: 'Arsenal win 2-1\nKey factor: home form' })
    }))

    render(<MatchPrediction {...ARSENAL_VS_CHELSEA} />)

    await userEvent.click(screen.getByText('Predict this match'))
    expect(screen.getByText('Claude is analyzing the match...')).toBeInTheDocument()
    expect(await screen.findByText('Arsenal win 2-1')).toBeInTheDocument()
    expect(screen.getByText('Key factor: home form')).toBeInTheDocument()       // each line is its own paragraph
    expect(screen.queryByText('Predict this match')).toBeNull()                  // the button hides while a prediction shows
  })

  it('sends the matchup to /predict exactly as it was given', async () => {
    let sent: unknown = null
    server.use(http.post('/api/predict', async ({ request }) => {
      sent = await request.json()                                                 // remember exactly what the app sent
      return HttpResponse.json({ prediction: 'Arsenal win 2-1' })
    }))

    render(<MatchPrediction {...ARSENAL_VS_CHELSEA} />)

    await userEvent.click(screen.getByText('Predict this match'))
    await screen.findByText('Arsenal win 2-1')
    expect(sent).toEqual({
      home_team: 'Arsenal FC', away_team: 'Chelsea FC', competition: 'Premier League',
      home_position: 2, away_position: 4, home_points: 18, away_points: 13,
      home_gd: 6, away_gd: 4, matchday: 7,
    })
  })

  it('shows an error and a Try again button when the prediction fails, and Try again can succeed', async () => {
    let calls = 0
    server.use(http.post('/api/predict', () => {
      calls += 1
      if (calls === 1) return HttpResponse.json({ detail: 'Predictions are unavailable right now.' }, { status: 503 })
      return HttpResponse.json({ prediction: 'Draw 1-1' })                        // the 2nd try works
    }))

    render(<MatchPrediction {...ARSENAL_VS_CHELSEA} />)

    await userEvent.click(screen.getByText('Predict this match'))
    expect(await screen.findByText('Failed to get prediction. Please try again.')).toBeInTheDocument()
    await userEvent.click(screen.getByText('Try again'))
    expect(await screen.findByText('Draw 1-1')).toBeInTheDocument()
  })

  it('the ✕ button clears the prediction and brings the Predict button back', async () => {
    server.use(http.post('/api/predict', () => HttpResponse.json({ prediction: 'Arsenal win 2-1' })))

    render(<MatchPrediction {...ARSENAL_VS_CHELSEA} />)

    await userEvent.click(screen.getByText('Predict this match'))
    await screen.findByText('Arsenal win 2-1')
    await userEvent.click(screen.getByText('✕'))
    expect(screen.queryByText('Arsenal win 2-1')).toBeNull()
    expect(screen.getByText('Predict this match')).toBeInTheDocument()
  })

  it('keeps the old prediction after the teams change (BUG recorded on purpose — #44 will change this)', async () => {
    server.use(http.post('/api/predict', () => HttpResponse.json({ prediction: 'Arsenal win 2-1' })))

    const { rerender } = render(<MatchPrediction {...ARSENAL_VS_CHELSEA} />)

    await userEvent.click(screen.getByText('Predict this match'))
    await screen.findByText('Arsenal win 2-1')
    rerender(<MatchPrediction {...ARSENAL_VS_CHELSEA} homeTeam="Liverpool FC" awayTeam="Everton FC" />)   // new matchup, same component
    expect(screen.getByText('Arsenal win 2-1')).toBeInTheDocument()             // the Arsenal prediction is still there
  })
})

