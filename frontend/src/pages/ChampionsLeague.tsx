/*
ChampionsLeague.tsx — dedicated page for the UEFA Champions League.
Shows live UCL matches, group standings, and top scorers.
Uses React Router's Link for navigation back to the main dashboard.
*/

import { useState, useEffect } from 'react'
import { Link } from 'react-router-dom'          // for navigation back to dashboard
import { getStandings, getTopScorers, getLiveMatches } from '../api/football'

// UCL competition code
const UCL = 'CL'

// defines shape of one standings entry
interface StandingEntry {
  position: number
  team: { name: string; crest: string }
  playedGames: number
  won: number
  draw: number
  lost: number
  points: number
  goalDifference: number
}

// defines shape of one scorer
interface TopScorer {
  player: { name: string; nationality: string }
  team: { name: string }
  goals: number
  assists: number | null
}

// defines shape of one live match
interface LiveMatch {
  id: number
  homeTeam: { name: string; crest: string }
  awayTeam: { name: string; crest: string }
  score: { fullTime: { home: number | null; away: number | null } }
  status: string
  competition: { name: string }
  utcDate: string
}

function ChampionsLeague() {
  const [standings, setStandings] = useState<StandingEntry[]>([])
  const [scorers, setScorers] = useState<TopScorer[]>([])
  const [liveMatches, setLiveMatches] = useState<LiveMatch[]>([])
  const [matchday, setMatchday] = useState<number | null>(null)
  const [loading, setLoading] = useState(true)
  const [error, setError] = useState<string | null>(null)

  useEffect(() => {
    // fetch UCL standings and scorers simultaneously
    Promise.all([
      getStandings(UCL),
      getTopScorers(UCL),
      getLiveMatches()
    ])
      .then(([standingsData, scorersData, liveData]) => {
        setStandings(standingsData.table)
        setMatchday(standingsData.matchday)
        setScorers(scorersData)
        // filter live matches to only UCL
        const uclLive = liveData.filter((m: LiveMatch) => m.competition.name === 'UEFA Champions League')
        setLiveMatches(uclLive)
        setLoading(false)
      })
      .catch(err => {
        console.error('Error fetching UCL data:', err)
        setError('Failed to load Champions League data. Please try again.')
        setLoading(false)
      })
  }, [])

    if (loading) return (
    <div className="ucl-page">
      <div className="ucl-loading">
        <div className="ucl-stars">★ ★ ★ ★ ★ ★ ★ ★</div>
        <p>Loading Champions League data...</p>
      </div>
    </div>
  )

  if (error) return (
    <div className="ucl-page">
      <div className="ucl-loading">
        <p style={{ color: '#f59e0b' }}>{error}</p>
        <Link to="/" className="ucl-back-btn">← Back to Dashboard</Link>
      </div>
    </div>
  )

  return (
    <div className="ucl-page">

      {/* UCL Header */}
      <div className="ucl-header">
        <Link to="/" className="ucl-back-btn">← Back to Dashboard</Link>
        <div className="ucl-title-row">
          <img
            src="https://crests.football-data.org/CL.png"
            alt="UEFA Champions League"
            className="ucl-logo"
          />
          <div>
            <h1 className="ucl-title">UEFA Champions League</h1>
            {matchday && <p className="ucl-matchday">Matchday {matchday}</p>}
          </div>
        </div>
      </div>

      <div className="ucl-content">

        {/* Live UCL Matches */}
        {liveMatches.length > 0 && (
          <div className="ucl-card">
            <h2 className="ucl-card-title">🔴 Live Now</h2>
            {liveMatches.map(match => (
              <div key={match.id} className="ucl-match">
                <div className="ucl-team">
                  <img src={match.homeTeam.crest} alt={match.homeTeam.name} width={24} />
                  <span>{match.homeTeam.name}</span>
                </div>
                <div className="ucl-score">
                  {match.score.fullTime.home ?? 0} - {match.score.fullTime.away ?? 0}
                </div>
                <div className="ucl-team ucl-team-away">
                  <span>{match.awayTeam.name}</span>
                  <img src={match.awayTeam.crest} alt={match.awayTeam.name} width={24} />
                </div>
              </div>
            ))}
          </div>
        )}

        {/* UCL Standings */}
        <div className="ucl-card">
          <h2 className="ucl-card-title">League Stage Standings</h2>
          <table className="ucl-table">
            <thead>
              <tr>
                <th>Pos</th>
                <th>Team</th>
                <th>P</th>
                <th>W</th>
                <th>D</th>
                <th>L</th>
                <th>GD</th>
                <th>Pts</th>
              </tr>
            </thead>
            <tbody>
              {standings.map(entry => (
                <tr key={entry.position} className={entry.position <= 8 ? 'ucl-qualify' : ''}>
                  <td>{entry.position}</td>
                  <td>
                    <div className="team-cell">
                      <img src={entry.team.crest} alt={entry.team.name} width={20} />
                      {entry.team.name}
                    </div>
                  </td>
                  <td>{entry.playedGames}</td>
                  <td>{entry.won}</td>
                  <td>{entry.draw}</td>
                  <td>{entry.lost}</td>
                  <td>{entry.goalDifference}</td>
                  <td><strong>{entry.points}</strong></td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>

        {/* UCL Top Scorers */}
        <div className="ucl-card">
          <h2 className="ucl-card-title">Top Scorers</h2>
          <table className="ucl-table">
            <thead>
              <tr>
                <th>#</th>
                <th>Player</th>
                <th>Team</th>
                <th>Goals</th>
                <th>Assists</th>
              </tr>
            </thead>
            <tbody>
              {scorers.map((scorer, index) => (
                <tr key={index}>
                  <td style={{ color: '#f59e0b' }}>{index + 1}</td>
                  <td><strong>{scorer.player.name}</strong></td>
                  <td style={{ color: '#8b95a5' }}>{scorer.team.name}</td>
                  <td><strong style={{ color: '#f59e0b' }}>{scorer.goals}</strong></td>
                  <td>{scorer.assists ?? 'N/A'}</td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>

      </div>
    </div>
  )
}

export default ChampionsLeague