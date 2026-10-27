/*
Standings.tsx — displays the league standings table.
1. Call getStandings() when it loads or when competition changes
2. Store the data, matchday, and competition name in state
3. Show a loading message while waiting
4. Render a table with position, team crest, team name, played, won, drawn, lost, GD, points
5. Shows current matchday in the header

Props: receives competition from App.tsx — re-fetches when competition changes
*/

import { useState, useEffect } from 'react'
import { getStandings } from '../api/football'
import MatchPrediction from './MatchPrediction'        // AI prediction component
import SectionError from './SectionError'              // the error message + Try again button (#42)

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

interface StandingsProps {
  competition: string
}

// get zone class based on competition and position
function getZoneClass(position: number, competition: string, index: number, total: number): string {
  const fromBottom = total - index  // how many teams from the bottom (1 = last, 2 = second to last)

  switch(competition) {
    case 'PL':
      if (position <= 4) return 'position-top4'
      if (position === 5) return 'position-europa'
      if (fromBottom <= 3) return 'position-relegation'   // bottom 3 rows
      return ''
    case 'BL1':
      if (position <= 4) return 'position-top4'
      if (position === 5) return 'position-europa'
      if (fromBottom === 3) return 'position-playoff'     // 3rd from bottom
      if (fromBottom <= 2) return 'position-relegation'   // bottom 2 rows
      return ''
    case 'PD':
      if (position <= 4) return 'position-top4'
      if (position <= 6) return 'position-europa'
      if (fromBottom <= 3) return 'position-relegation'   // bottom 3 rows
      return ''
    case 'FL1':
      if (position <= 3) return 'position-top4'
      if (position <= 5) return 'position-europa'
      if (fromBottom === 3) return 'position-playoff'     // 3rd from bottom
      if (fromBottom <= 2) return 'position-relegation'   // bottom 2 rows
      return ''
    default:
      if (position <= 4) return 'position-top4'
      if (fromBottom <= 3) return 'position-relegation'
      return ''
  }
}

function Standings({ competition }: StandingsProps) {
  const [standings, setStandings] = useState<StandingEntry[]>([])
  const [matchday, setMatchday] = useState<number | null>(null)
  const [loading, setLoading] = useState(true)
  const [error, setError] = useState(false)                // true when the request FAILED (#42)
  const [attempt, setAttempt] = useState(0)                // goes up by 1 on every Try again — that re-runs the useEffect below
  const [competitionName, setCompetitionName] = useState('')                  // the league's full name, e.g. "Premier League" — sent to Claude (#43)
  const [homeTeam, setHomeTeam] = useState<StandingEntry | null>(null)        // the home team the user picked — null until they pick one
  const [awayTeam, setAwayTeam] = useState<StandingEntry | null>(null)        // the away team the user picked — null until they pick one

  useEffect(() => {
    setLoading(true)
    getStandings(competition)
      .then(data => {
        setStandings(data.table)
        setMatchday(data.matchday)
        setCompetitionName(data.competition)           // e.g. "Premier League" — getStandings already returns it
        setHomeTeam(null)                              // a new table means the old picks no longer apply (#43) —
        setAwayTeam(null)                              // otherwise last league's teams could be sent with this league
        setError(false)                                // it worked — clear any error from an earlier try or league
        setLoading(false)
      })
      .catch(err => {
        console.error('Error fetching standings:', err)
        setError(true)                                 // remember that it FAILED, so we show an error, not an empty table
        setLoading(false)
      })
  }, [competition, attempt])                           // re-runs when the league changes, or on Try again

  // Try again — changing attempt re-runs the useEffect above
  function retry() {
    setAttempt(attempt + 1)
  }

  if (loading) return (
    <div className="card">
      <h2>Standings</h2>
      <p className="loading">Loading standings...</p>
    </div>
  )

  // the request failed — say so, instead of an empty table, legend and team pickers
  if (error) return (
    <div className="card">
      <h2>Standings</h2>
      <SectionError message="Couldn't load standings right now." onRetry={retry} />
    </div>
  )

  return (
    <div className="card">
      <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: '16px', paddingBottom: '12px', borderBottom: '1px solid var(--line)' }}>
        <h2 style={{ margin: 0, border: 'none', padding: 0 }}>Standings</h2>
        {matchday && (
          <span style={{ color: 'var(--ink-muted)', fontSize: '13px' }}>
            Matchday {matchday}
          </span>
        )}
      </div>
      <table className="standings-table">
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
          {standings.map((entry, index) => (
            <tr key={index}>
              <td className={getZoneClass(entry.position, competition, index, standings.length)}>{entry.position}</td>
              <td>
                <div className="team-cell">
                  <img src={entry.team.crest} alt={entry.team.name} width={24} />
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

      {/* Zone legend */}
      <div className="zone-legend">
        <div className="zone-legend-item">
          <div className="zone-legend-dot" style={{ background: 'var(--pitch)' }}></div>
          Champions League
        </div>
        <div className="zone-legend-item">
          <div className="zone-legend-dot" style={{ background: 'var(--blue)' }}></div>
          Europa League
        </div>
        {(competition === 'BL1' || competition === 'FL1') && (
          <div className="zone-legend-item">
            <div className="zone-legend-dot" style={{ background: 'var(--gold)' }}></div>
            Relegation Playoff
          </div>
        )}
        <div className="zone-legend-item">
          <div className="zone-legend-dot" style={{ background: 'var(--red)' }}></div>
          Relegation
        </div>
      </div>

      {/* AI Match Prediction section */}
      <div style={{ marginTop: '24px', borderTop: '1px solid var(--line)', paddingTop: '20px' }}>
        <h3 className="prediction-section-title">
          Ask Claude to call this one
        </h3>

        {/* team selectors */}
        <div style={{ display: 'flex', gap: '12px', alignItems: 'center', flexWrap: 'wrap', marginBottom: '12px' }}>
          {/* each picker only sets ITS OWN team — nothing gets filled in automatically (#43) */}
          {/* picking "Home team" again finds no match, so ?? null clears the pick */}
          <select
            className="team-select"
            value={homeTeam?.position ?? ''}
            onChange={e => setHomeTeam(standings.find(s => s.position === Number(e.target.value)) ?? null)}
          >
            <option value="">Home team</option>
            {standings.map(s => (
              // disabled = the team already picked as away can't be picked here too — a team can't play itself
              <option key={s.position} value={s.position} disabled={s.position === awayTeam?.position}>{s.team.name}</option>
            ))}
          </select>

          <span style={{ color: '#8b95a5' }}>vs</span>

          <select
            className="team-select"
            value={awayTeam?.position ?? ''}
            onChange={e => setAwayTeam(standings.find(s => s.position === Number(e.target.value)) ?? null)}
          >
            <option value="">Away team</option>
            {standings.map(s => (
              // disabled = the team already picked as home can't be picked here too
              <option key={s.position} value={s.position} disabled={s.position === homeTeam?.position}>{s.team.name}</option>
            ))}
          </select>
        </div>

        {/* show prediction component only after the user picked BOTH teams themselves (#43) */}
        {homeTeam && awayTeam && (
          <MatchPrediction
            homeTeam={homeTeam.team.name}
            awayTeam={awayTeam.team.name}
            competition={competitionName}
            homePosition={homeTeam.position}
            awayPosition={awayTeam.position}
            homePoints={homeTeam.points}
            awayPoints={awayTeam.points}
            homeGd={homeTeam.goalDifference}
            awayGd={awayTeam.goalDifference}
            matchday={matchday ?? 1}
          />
        )}
      </div>
    </div>
  )
}

export default Standings
