/*
LiveMatches.tsx — displays all matches currently being played right now.
Calls getLiveMatches() which hits /football/live endpoint.
Shows competition, home team, score, away team for each live match.
Follows the same pattern as Standings: useState → useEffect → render
*/

import { useState, useEffect } from 'react'          // useState = stores data | useEffect = fetches on load
import { getLiveMatches } from '../api/football'      // import API function — ../ goes up to src then into api/football

// defines the shape of one live match from football-data.org
interface LiveMatch {
  id: number                                          // unique match id
  homeTeam: { name: string; crest: string }          // home team name and badge image URL
  awayTeam: { name: string; crest: string }          // away team name and badge image URL
  score: {
    fullTime: { home: number | null; away: number | null }  // number | null — null before match starts
  }
  status: string                                      // IN_PLAY | PAUSED | FINISHED
  competition: { name: string }                       // which competition this match belongs to
  utcDate: string                                     // match date and time in UTC
}

function LiveMatches() {
  const [matches, setMatches] = useState<LiveMatch[]>([])  // matches = data | starts as empty array
  const [loading, setLoading] = useState(true)             // true while fetching | false when data arrives or on error

  // useEffect runs once when component first loads — [] = run once only, no infinite loop
  useEffect(() => {
    getLiveMatches()                                  // calls football.ts → FastAPI → football-data.org
      .then(data => {
        setMatches(data)                              // store matches in state — React re-renders automatically
        setLoading(false)                             // hide loading message — show the matches
      })
      .catch(err => {
        console.error('Error fetching live matches:', err)  // log error for debugging
        setLoading(false)                             // stop loading even on error — don't show spinner forever
      })
  }, [])                                              // empty array = run once on mount only

  // early return — show loading message while API call is in progress
  if (loading) return (
    <div className="card">
      <h2>Live Matches</h2>
      <p className="loading">Loading live matches...</p>
    </div>
  )

  if (matches.length === 0) return (
    <div className="card">
      <h2>Live Matches</h2>
      <p className="no-data">No matches live right now.</p>
    </div>
  )

    if (matches.length === 0) return (
    <div className="card">
      <h2>Live Matches</h2>
      <p className="no-data">No matches live right now.</p>
    </div>
  )

  return (
    <div className="card">
      <h2>Live Matches <span className="live-badge">Live</span></h2>
      {matches.map(match => (
        <div key={match.id} className="match-card">
          <div className="team-row">
            <img src={match.homeTeam.crest} alt={match.homeTeam.name} width={24} />
            <span>{match.homeTeam.name}</span>
          </div>
          <div className="score">
            {match.score.fullTime.home ?? 0} - {match.score.fullTime.away ?? 0}
          </div>
          <div className="team-row away">
            <span>{match.awayTeam.name}</span>
            <img src={match.awayTeam.crest} alt={match.awayTeam.name} width={24} />
          </div>
        </div>
      ))}
    </div>
  )
}

// export default makes LiveMatches importable in App.tsx
export default LiveMatches