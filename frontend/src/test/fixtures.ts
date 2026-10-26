// fixtures.ts — test data for the frontend tests
// standingsPL and scorersPL are the REAL football-data.org answers recorded in ticket #4
// (tests/fixtures/football/). The backend passes them through unchanged, so they're exactly what React receives.
import standingsPL from '../../../tests/fixtures/football/standings_PL_200.json'
import scorersPL from '../../../tests/fixtures/football/scorers_PL_200.json'

export { standingsPL, scorersPL }

// builds one live match, shaped like one item of /football/live
export function liveMatch(id: number, home: string, away: string, homeScore: number | null, awayScore: number | null, competition = 'Premier League') {
  return {
    id,
    homeTeam: { name: home, crest: `https://crests.example/${id}-home.png` },
    awayTeam: { name: away, crest: `https://crests.example/${id}-away.png` },
    score: { fullTime: { home: homeScore, away: awayScore } },
    status: 'IN_PLAY',
    competition: { name: competition },
    utcDate: '2026-10-25T19:00:00Z',
  }
}

