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
import SectionError from './SectionError'           // the error message + Try again button (#42)

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
    'Bosnia-Herzegovina': '🇧🇦',
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
  const [error, setError] = useState(false)                 // true when the request FAILED (#42)
  const [attempt, setAttempt] = useState(0)                 // goes up by 1 on every Try again — that re-runs the useEffect below

   // re-runs every time competition changes
  // [competition, attempt] in dependency array = re-run when either value changes
  useEffect(() => {
    let ignore = false                              // becomes true when this request is out of date (#45)
    setLoading(true)                                // reset loading when competition changes
    getTopScorers(competition)                      // calls football.ts → FastAPI → football-data.org
      .then(data => {
        if (ignore) return                          // the league changed while we waited — throw this old answer away
        console.log('Nationalities:', data.map((s: any) => s.player.nationality))  // temporary debug — remove after fixing
        setScorers(data)                            // store scorers in state
        setError(false)                             // it worked — clear any error from an earlier try or league
        setLoading(false)                           // hide loading message
      })
      .catch(err => {
        if (ignore) return                          // an old request failing doesn't matter anymore either
        console.error('Error fetching top scorers:', err)
        setError(true)                              // remember that it FAILED, so we show an error, not an empty table
        setLoading(false)                           // stop loading even on error
      })

    // cleanup function — React runs this right BEFORE the effect runs again (league changed or Try again)
    // and when the component is removed, so the request above knows it's out of date (#45)
    return () => {
      ignore = true
    }
  }, [competition, attempt])                        // re-runs when the league changes, or on Try again

  // Try again — changing attempt re-runs the useEffect above
  function retry() {
    setAttempt(attempt + 1)
  }

  // early return — show loading message while fetching
  if (loading) return (
    <div className="card">
      <h2>Top Scorers</h2>
      <p className="loading">Loading top scorers...</p>
    </div>
  )

  // early return — the request failed, so say so (instead of showing an empty table)
  if (error) return (
    <div className="card">
      <h2>Top Scorers</h2>
      <SectionError message="Couldn't load top scorers right now." onRetry={retry} />
    </div>
  )

    return (
    <div className="card">
      <h2>Top Scorers</h2>
      <table className="scorers-table">
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
              <td style={{ fontFamily: 'var(--font-score)', fontSize: '16px', color: 'var(--ink)' }}>{index + 1}</td>
              <td><strong>{getFlag(scorer.player.nationality)} {scorer.player.name}</strong></td>
              <td style={{ color: 'var(--ink-muted)' }}>{scorer.team.name}</td>
              <td><strong>{scorer.goals}</strong></td>
              <td>{scorer.assists ?? 'N/A'}</td>
            </tr>
          ))}
        </tbody>
      </table>
    </div>
  )
}

// export default makes TopScorers importable in App.tsx
export default TopScorers

