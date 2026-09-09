/*
TopScorers.tsx — displays the top scorers.
Calls getTopScorers() which hits /football/scorers endpoint.
Shows player name, team, goals, and assists for each scorer.
Follows the same pattern: useState → useEffect → render
*/

import { useState, useEffect } from 'react'          // useState = stores data | useEffect = fetches on load
import { getTopScorers } from '../api/football'      // import API function — ../ goes up to src then into api/football



// defines the shape of one top scorer entry from football-data.org
interface TopScorer {
  player: { name: string; nationality: string }       // player name and nationality
  team: { name: string }                              // team the player plays for
  goals: number                                       // total goals scored
  assists: number | null                              // assists — can be null if not tracked
}



function TopScorers() {
  const [scorers, setScorers] = useState<TopScorer[]>([])  // scorers = data | starts as empty array
  const [loading, setLoading] = useState(true)              // true while fetching | false when done

  // runs once when component first loads
  useEffect(() => {
    getTopScorers()                                   // calls football.ts → FastAPI → football-data.org
      .then(data => {
        setScorers(data)                              // store scorers in state
        setLoading(false)                             // hide loading message
      })
      .catch(err => {
        console.error('Error fetching top scorers:', err)
        setLoading(false)                             // stop loading even on error
      })
  }, [])                                              // empty array = run once on mount only

  // show loading message while fetching
  if (loading) return <div>Loading top scorers...</div>

  return (
    <div>
      <h2>Top Scorers — Premier League</h2>
      <table>
        <thead>
          <tr>
            <th>Player</th>
            <th>Team</th>
            <th>Goals</th>
            <th>Assists</th>
          </tr>
        </thead>
        <tbody>
          {scorers.map((scorer, index) => (
            // index used as key since scorers don't have a unique id at top level
            <tr key={index}>
              <td>{scorer.player.name}</td>           {/* player name */}
              <td>{scorer.team.name}</td>             {/* team name */}
              <td>{scorer.goals}</td>                 {/* total goals */}
              <td>{scorer.assists ?? 'N/A'}</td>      {/* assists — N/A if null */}
            </tr>
          ))}
        </tbody>
      </table>
    </div>
  )
}

// export default makes TopScorers importable in App.tsx
export default TopScorers