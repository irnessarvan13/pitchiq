/*
types.ts — the shapes of the data our app works with, written ONCE and shared (#47).
Before #47, LiveMatch, StandingEntry and TopScorer were written out in api/football.ts
AND again inside each component that used them. If football-data.org changed a field,
we'd have had to fix it in up to four places. Now there's one place.

"export interface" = define a shape and let other files import it.
Components import these with "import type { ... } from '../types'".
*/

// TypeScript uses these to catch errors and provide autocomplete

// defines what a match from our local PostgreSQL database looks like
export interface Match {
  id: number                             // unique id auto-assigned by PostgreSQL
  home_team: string                      // home team name
  away_team: string                      // away team name
  home_score: number                     // current home score
  away_score: number                     // current away score
  status: string                         // scheduled | live | finished
  created_at: string                     // when the match was created
}

// defines what a live match from football-data.org looks like
export interface LiveMatch {
  id: number                             // match id from football-data.org
  homeTeam: { name: string; crest: string }   // nested object — team name and crest image URL
  awayTeam: { name: string; crest: string }   // nested object — team name and crest image URL
  score: {
    fullTime: { home: number | null; away: number | null }  // number | null — can be null before match starts
  }
  status: string                         // SCHEDULED | IN_PLAY | PAUSED | FINISHED
  competition: { name: string }          // which competition this match belongs to
  utcDate: string                        // match date and time in UTC
}

// defines what one row in the standings table looks like
export interface StandingEntry {
  position: number                       // league position
  team: { name: string; crest: string }  // team name and crest image URL
  playedGames: number                    // total games played
  won: number                            // total wins
  draw: number                           // total draws
  lost: number                           // total losses
  points: number                         // total points
  goalDifference: number                 // goals scored minus goals conceded
}

// defines what a top scorer entry looks like
export interface TopScorer {
  player: { name: string; nationality: string }  // player name and nationality
  team: { name: string }                         // team the player plays for
  goals: number                                  // total goals scored
  assists: number | null                         // assists — can be null if not tracked
}
