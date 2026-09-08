/*
Standings.tsx has one job: display the Premier League standings table.
1. Call getStandings() when it loads
2. Store the data in state
3. Show a loading message while waiting
4. Render a table with position, team crest, team name, played, won, drawn, lost, GD, points

Component pattern: useState stores data → useEffect fetches it → render displays it
*/

// useState = stores data in the component | useEffect = runs code after component renders
import { useState, useEffect } from 'react'

// import the getStandings function from our API layer
// ../ goes up one folder from components to src, then into api/football
import { getStandings } from '../api/football'

// interface defines the shape of one standings row
// TypeScript uses this to catch errors and provide autocomplete
interface StandingEntry {
  position: number                        // league position 
  team: { name: string; crest: string }   // nested object — team name and badge image URL
  playedGames: number                     // total games played
  won: number                             // total wins
  draw: number                            // total draws
  lost: number                            // total losses
  points: number                          // total points
  goalDifference: number                  // goals scored minus goals conceded
}

// Standings component 
function Standings() {
  // standings = the data | setStandings = function to update it | starts as empty array
  // <StandingEntry[]> tells TypeScript this is an array of StandingEntry objects
  const [standings, setStandings] = useState<StandingEntry[]>([])

  // loading = true while fetching | false when data arrives or on error
  // used to show loading message while waiting for API response
  const [loading, setLoading] = useState(true)

  // useEffect runs once when the component first loads
  // [] at the end = dependency array — empty means run once only
  useEffect(() => {
    getStandings()                        // calls football.ts → FastAPI → football-data.org
      .then(data => {
        setStandings(data)                // store standings in state — React re-renders automatically
        setLoading(false)                 // hide loading message — show the table
      })
      .catch(err => {
        console.error('Error fetching standings:', err)  // log error for debugging
        setLoading(false)                 // stop loading even on error — don't show spinner forever
      })
  }, [])                                  // empty array = run once on mount only

  // early return — if still loading show message instead of empty table
  if (loading) return <div>Loading standings...</div>

  return (
    <div>
      <h2>Premier League Standings</h2>
      <table>
        <thead>
          <tr>
            {/* table headers — abbreviated like real standings tables */}
            <th>Pos</th>
            <th>Team</th>
            <th>P</th>   {/* played */}
            <th>W</th>   {/* won */}
            <th>D</th>   {/* draw */}
            <th>L</th>   {/* lost */}
            <th>GD</th>  {/* goal difference */}
            <th>Pts</th> {/* points */}
          </tr>
        </thead>
        <tbody>
          {/* map() loops through standings array and renders one row per team */}
          {standings.map(entry => (
            // key must be unique — React uses it to efficiently update the UI
            <tr key={entry.position}>
              <td>{entry.position}</td>
              <td>
                {/* team badge image from football-data.org CDN */}
                <img src={entry.team.crest} alt={entry.team.name} width={20} />
                {entry.team.name}
              </td>
              <td>{entry.playedGames}</td>
              <td>{entry.won}</td>
              <td>{entry.draw}</td>
              <td>{entry.lost}</td>
              <td>{entry.goalDifference}</td>
              <td>{entry.points}</td>
            </tr>
          ))}
        </tbody>
      </table>
    </div>
  )
}

// export default makes this component importable in App.tsx
// without this App.tsx cannot use Standings
export default Standings