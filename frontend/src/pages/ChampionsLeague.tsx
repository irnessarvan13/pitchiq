/*
ChampionsLeague.tsx — dedicated page for the UEFA Champions League.
Special dark blue and gold aesthetic — the crown jewel of club football.
Shows live UCL matches, group standings, and top scorers.
Uses React Router's Link for navigation back to the main dashboard.
*/

import { useState, useEffect } from 'react'
import { Link } from 'react-router-dom'          // for navigation back to dashboard
import { getStandings, getTopScorers, getLiveMatches } from '../api/football'
import SectionError from '../components/SectionError'   // the error message + Try again button (#42)
import Flag from '../components/Flag'                   // the player's flag image (#46)
import type { StandingEntry, TopScorer, LiveMatch } from '../types'   // shared data shapes, see types.ts (#47)

// UCL competition code
const UCL = 'CL'


// each section of the page is tracked on its own (#42): still loading, failed, or ready
// so one failed request can't hide the sections that loaded fine
type SectionStatus = 'loading' | 'error' | 'ready'


function ChampionsLeague() {
  const [standings, setStandings] = useState<StandingEntry[]>([])
  const [scorers, setScorers] = useState<TopScorer[]>([])
  const [liveMatches, setLiveMatches] = useState<LiveMatch[]>([])
  const [matchday, setMatchday] = useState<number | null>(null)
  const [loading, setLoading] = useState(true)            // true until the first try of all 3 requests has finished
  const [standingsStatus, setStandingsStatus] = useState<SectionStatus>('loading')
  const [scorersStatus, setScorersStatus] = useState<SectionStatus>('loading')
  const [liveStatus, setLiveStatus] = useState<SectionStatus>('loading')

  // one load function per section — each one catches its OWN error,
  // so a failure only marks its own section as 'error' and leaves the others alone (#42)
  function loadStandings() {
    return getStandings(UCL)
      .then(data => {
        setStandings(data.table)
        setMatchday(data.matchday)
        setStandingsStatus('ready')
      })
      .catch(err => {
        console.error('Error fetching UCL standings:', err)
        setStandingsStatus('error')
      })
  }

  function loadScorers() {
    return getTopScorers(UCL)
      .then(data => {
        setScorers(data)
        setScorersStatus('ready')
      })
      .catch(err => {
        console.error('Error fetching UCL top scorers:', err)
        setScorersStatus('error')
      })
  }

  function loadLive() {
    return getLiveMatches()
      .then(data => {
        // filter to ONLY UCL live matches
        setLiveMatches(data.filter((m: LiveMatch) => m.competition.name === 'UEFA Champions League'))
        setLiveStatus('ready')
      })
      .catch(err => {
        console.error('Error fetching live matches:', err)
        setLiveStatus('error')
      })
  }

  useEffect(() => {
    // fetch UCL standings, scorers, and live matches simultaneously
    // Promise.allSettled waits until ALL 3 have finished — whether each one worked or failed —
    // then we hide the page's loading message. (The old Promise.all gave up the moment ONE failed,
    // so the whole page showed an error even when the other two had loaded fine.)
    Promise.allSettled([loadStandings(), loadScorers(), loadLive()])
      .then(() => setLoading(false))
  }, [])

  // Try again buttons — show that section's loading message, then fetch ONLY that section again
  function retryStandings() {
    setStandingsStatus('loading')
    loadStandings()
  }

  function retryScorers() {
    setScorersStatus('loading')
    loadScorers()
  }

  function retryLive() {
    setLiveStatus('loading')
    loadLive()
  }

  if (loading) return (
    <div className="ucl-page">
      <div className="ucl-loading">
        <div className="ucl-stars">★ ★ ★ ★ ★ ★ ★ ★</div>
        <p>Loading Champions League data...</p>
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

        {/* Live request failed — say so here, so it can't hide the sections below (#42) */}
        {liveStatus === 'error' && (
          <div className="ucl-card">
            <h2 className="ucl-card-title">Live Now</h2>
            <SectionError message="Couldn't load live matches right now." onRetry={retryLive} />
          </div>
        )}

        {/* Try again was clicked — checking for live matches again */}
        {liveStatus === 'loading' && (
          <div className="ucl-card">
            <h2 className="ucl-card-title">Live Now</h2>
            <p className="loading">Loading live matches...</p>
          </div>
        )}

        {/* Live UCL Matches — only shows when UCL matches are live */}
        {liveStatus === 'ready' && liveMatches.length > 0 && (
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
          {standingsStatus === 'error' && (
            <SectionError message="Couldn't load standings right now." onRetry={retryStandings} />
          )}
          {standingsStatus === 'loading' && <p className="loading">Loading standings...</p>}
          {standingsStatus === 'ready' && (
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
          )}
        </div>

        {/* UCL Top Scorers with nationality flags */}
        <div className="ucl-card">
          <h2 className="ucl-card-title">Top Scorers</h2>
          {scorersStatus === 'error' && (
            <SectionError message="Couldn't load top scorers right now." onRetry={retryScorers} />
          )}
          {scorersStatus === 'loading' && <p className="loading">Loading top scorers...</p>}
          {scorersStatus === 'ready' && (
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
                    <td style={{ fontFamily: 'var(--font-score)', fontSize: '16px', color: 'var(--gold)' }}>{index + 1}</td>
                    <td><strong><Flag nationality={scorer.player.nationality} />{scorer.player.name}</strong></td>
                    <td style={{ color: 'var(--ink-muted)' }}>{scorer.team.name}</td>
                    <td><strong style={{ color: 'var(--gold)' }}>{scorer.goals}</strong></td>
                    <td>{scorer.assists ?? 'N/A'}</td>
                  </tr>
                ))}
              </tbody>
            </table>
          )}
        </div>

      </div>
    </div>
  )
}

export default ChampionsLeague
