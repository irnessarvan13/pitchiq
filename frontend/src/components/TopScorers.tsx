/*
TopScorers.tsx — displays the top scorers leaderboard for the selected competition.
1. Call getTopScorers() when it loads or when competition changes
2. Store the data in state
3. Show a loading message while waiting
4. Render a table with player name, team, goals, assists

Props: receives competition from App.tsx — re-fetches when competition changes
*/

// useState = stores data | useEffect = fetches on load and when competition changes
import { useState, useEffect } from 'react'
import { getTopScorers } from '../api/football'     // import API function

// defines the shape of one top scorer entry from football-data.org
interface TopScorer {
  player: { name: string; nationality: string }     // player name and nationality
  team: { name: string }                            // team the player plays for
  goals: number                                     // total goals scored
  assists: number | null                            // assists — can be null if not tracked
}

// defines what props this component accepts from App.tsx
interface TopScorersProps {
  competition: string                               // competition code — 'PL', 'BL1', 'SA' etc.
}

// converts nationality name to flag emoji
function getFlag(nationality: string): string {
  const flags: Record<string, string> = {
    'Norway': '🇳🇴',
    'England': '🏴󠁧󠁢󠁥󠁮󠁧󠁿',
    'Portugal': '🇵🇹',
    'Germany': '🇩🇪',
    'France': '🇫🇷',
    'Spain': '🇪🇸',
    'Brazil': '🇧🇷',
    'Argentina': '🇦🇷',
    'Netherlands': '🇳🇱',
    'Belgium': '🇧🇪',
    'Italy': '🇮🇹',
    'Denmark': '🇩🇰',
    'Sweden': '🇸🇪',
    'Croatia': '🇭🇷',
    'Bosnia': '🇧🇦',
    'Poland': '🇵🇱',
    'Senegal': '🇸🇳',
    'Ghana': '🇬🇭',
    'Nigeria': '🇳🇬',
    'Ivory Coast': '🇨🇮',
    'Morocco': '🇲🇦',
    'Algeria': '🇩🇿',
    'Egypt': '🇪🇬',
    'Colombia': '🇨🇴',
    'Uruguay': '🇺🇾',
    'Mexico': '🇲🇽',
    'Austria': '🇦🇹',
    'Switzerland': '🇨🇭',
    'Scotland': '🏴󠁧󠁢󠁳󠁣󠁴󠁿',
    'Wales': '🏴󠁧󠁢󠁷󠁬󠁳󠁿',
    'Ireland': '🇮🇪',
    'Czech Republic': '🇨🇿',
    'Slovakia': '🇸🇰',
    'Hungary': '🇭🇺',
    'Greece': '🇬🇷',
    'Turkey': '🇹🇷',
    'Ukraine': '🇺🇦',
    'Russia': '🇷🇺',
    'Japan': '🇯🇵',
    'South Korea': '🇰🇷',
    'Australia': '🇦🇺',
    'United States': '🇺🇸',
    'Canada': '🇨🇦',
    'Jamaica': '🇯🇲',
  }
  return flags[nationality] || '🌍'  // default globe if not found
}

// TopScorers component — receives competition as a prop from App.tsx
function TopScorers({ competition }: TopScorersProps) {

  const [scorers, setScorers] = useState<TopScorer[]>([])  // scorers = data | starts as empty array
  const [loading, setLoading] = useState(true)              // true while fetching | false when done

  // re-runs every time competition changes
  // [competition] in dependency array = re-run when this value changes
  useEffect(() => {
    setLoading(true)                                // reset loading when competition changes
    getTopScorers(competition)                      // calls football.ts → FastAPI → football-data.org
      .then(data => {
        setScorers(data)                            // store scorers in state
        setLoading(false)                           // hide loading message
      })
      .catch(err => {
        console.error('Error fetching top scorers:', err)
        setLoading(false)                           // stop loading even on error
      })
  }, [competition])                                 // re-runs whenever competition prop changes

  // early return — show loading message while fetching
  if (loading) return (
    <div className="card">
      <h2>Top Scorers</h2>
      <p className="loading">Loading top scorers...</p>
    </div>
  )

  return (
    <div className="card">
      <h2>Top Scorers</h2>
      <table>
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
            // index used as key — scorers don't have a unique id at top level
            <tr key={index}>
              <td style={{ color: '#8b95a5' }}>{index + 1}</td>   {/* rank number */}
              <td><strong>{getFlag(scorer.player.nationality)} {scorer.player.name}</strong></td>
              <td style={{ color: '#8b95a5' }}>{scorer.team.name}</td>  {/* team name */}
              <td><strong>{scorer.goals}</strong></td>             {/* total goals */}
              <td>{scorer.assists ?? 'N/A'}</td>                  {/* N/A if assists is null */}
            </tr>
          ))}
        </tbody>
      </table>
    </div>
  )
}

// export default makes TopScorers importable in App.tsx
export default TopScorers





