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

function Standings({ competition }: StandingsProps) {
  const [standings, setStandings] = useState<StandingEntry[]>([])
  const [matchday, setMatchday] = useState<number | null>(null)
  const [loading, setLoading] = useState(true)

  useEffect(() => {
    setLoading(true)
    getStandings(competition)
      .then(data => {
        setStandings(data.table)
        setMatchday(data.matchday)
        setLoading(false)
      })
      .catch(err => {
        console.error('Error fetching standings:', err)
        setLoading(false)
      })
  }, [competition])

  if (loading) return (
    <div className="card">
      <h2>Standings</h2>
      <p className="loading">Loading standings...</p>
    </div>
  )

  return (
    <div className="card">
      <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: '16px', paddingBottom: '12px', borderBottom: '1px solid #2d3250' }}>
        <h2 style={{ margin: 0 }}>Standings</h2>
        {matchday && (
          <span style={{ color: '#8b95a5', fontSize: '13px' }}>
            Matchday {matchday}
          </span>
        )}
      </div>
      <table>
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
            <tr key={entry.position}>
              <td className={
                entry.position <= 4 ? 'position-top4' :
                entry.position >= 18 ? 'position-relegation' : ''
              }>{entry.position}</td>
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
    </div>
  )
}

export default Standings