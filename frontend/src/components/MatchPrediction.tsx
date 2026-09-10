/*
MatchPrediction.tsx — AI match prediction component.
Takes two teams and their standings data, sends to Claude API via FastAPI,
displays the prediction in a clean card.
Uses the predictMatch function from football.ts.
*/

import { useState } from 'react'                      // useState to store prediction and loading state
import { predictMatch } from '../api/football'         // import the prediction function

// defines the props this component accepts
interface MatchPredictionProps {
  homeTeam: string                                     // home team name
  awayTeam: string                                     // away team name
  competition: string                                  // competition name e.g. Premier League
  homePosition: number                                 // home team league position
  awayPosition: number                                 // away team league position
  homePoints: number                                   // home team points
  awayPoints: number                                   // away team points
  homeGd: number                                       // home team goal difference
  awayGd: number                                       // away team goal difference
  matchday: number                                     // current matchday
}

function MatchPrediction({
  homeTeam, awayTeam, competition,
  homePosition, awayPosition,
  homePoints, awayPoints,
  homeGd, awayGd, matchday
}: MatchPredictionProps) {

  const [prediction, setPrediction] = useState<string | null>(null)  // stores Claude's prediction
  const [loading, setLoading] = useState(false)                       // true while waiting for Claude
  const [error, setError] = useState<string | null>(null)             // stores error if API call fails

  // called when user clicks Predict button
  async function handlePredict() {
    setLoading(true)                                   // show loading state
    setError(null)                                     // clear any previous error
    setPrediction(null)                                // clear previous prediction

    try {
      const result = await predictMatch({
        home_team: homeTeam,
        away_team: awayTeam,
        competition,
        home_position: homePosition,
        away_position: awayPosition,
        home_points: homePoints,
        away_points: awayPoints,
        home_gd: homeGd,
        away_gd: awayGd,
        matchday
      })
      setPrediction(result)                            // store Claude's prediction
    } catch (err) {
      setError('Failed to get prediction. Please try again.')
    } finally {
      setLoading(false)                                // hide loading state
    }
  }

  return (
    <div className="prediction-container">
      {/* predict button — triggers Claude API call */}
      {!prediction && (
        <button
          className="predict-btn"
          onClick={handlePredict}
          disabled={loading}                           // disable while loading
        >
          {loading ? '⚽ Analyzing...' : '🤖 AI Predict'}
        </button>
      )}

      {/* loading state */}
      {loading && (
        <div className="prediction-loading">
          <p>Claude is analyzing the match...</p>
        </div>
      )}

      {/* error state */}
      {error && (
        <div className="prediction-error">
          <p>{error}</p>
          <button className="predict-btn" onClick={handlePredict}>Try again</button>
        </div>
      )}

      {/* prediction result */}
      {prediction && (
        <div className="prediction-card">
          <div className="prediction-header">
            <span className="prediction-badge">🤖 AI Prediction</span>
            <button
              className="predict-again-btn"
              onClick={() => setPrediction(null)}      // reset to show button again
            >
              ✕
            </button>
          </div>
          <div className="prediction-text">
            {/* render prediction — split by newlines for formatting */}
            {prediction.split('\n').map((line, i) => (
              <p key={i} style={{ margin: '4px 0' }}>{line}</p>
            ))}
          </div>
        </div>
      )}
    </div>
  )
}

export default MatchPrediction