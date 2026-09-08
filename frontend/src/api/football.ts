/*
This file is the frontend version of football.py on the backend.
It has one job — make HTTP requests to our FastAPI backend using axios.
Every time a React component needs data it calls a function from this file.
The component never makes HTTP requests directly. Same separation of concerns we used in the backend.
*/

import axios from 'axios'                // axios = Python httpx equivalent. Makes HTTP requests from React to FastAPI.

const API_BASE = '/api'                  // base URL for all API calls — Vite proxy forwards /api to http://localhost:8000

// ─────────────────────────────────────────────
// INTERFACES — define what the data looks like
// TypeScript uses these to catch errors and provide autocomplete
// ─────────────────────────────────────────────

// defines what a match from our local PostgreSQL database looks like
interface Match {
  id: number                             // unique id auto-assigned by PostgreSQL
  home_team: string                      // home team name
  away_team: string                      // away team name
  home_score: number                     // current home score
  away_score: number                     // current away score
  status: string                         // scheduled | live | finished
  created_at: string                     // when the match was created
}

// defines what a live match from football-data.org looks like
interface LiveMatch {
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
interface StandingEntry {
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
interface TopScorer {
  player: { name: string; nationality: string }  // player name and nationality
  team: { name: string }                         // team the player plays for
  goals: number                                  // total goals scored
  assists: number | null                         // assists — can be null if not tracked
}

// ─────────────────────────────────────────────
// API FUNCTIONS
// Each function: calls FastAPI backend via axios, returns TypeScript-typed data
// export = makes function available to import in components
// async = function is asynchronous — it awaits an HTTP request
// Promise<Type> = TypeScript return type — what the promise resolves to
// ─────────────────────────────────────────────

// get all matches from our local PostgreSQL database
export async function getMatches(): Promise<Match[]> {
  const response = await axios.get(`${API_BASE}/matches`)  // GET /api/matches → FastAPI → PostgreSQL
  return response.data                                     // response.data contains the JSON body
}

// get live matches from football-data.org via our backend
export async function getLiveMatches(): Promise<LiveMatch[]> {
  const response = await axios.get(`${API_BASE}/football/live`)
  return response.data.matches           // football-data.org wraps matches inside a matches key — extract just the array
}

// get Premier League standings — defaults to PL, pass 'BL1' for Bundesliga etc.
export async function getStandings(competition: string = 'PL'): Promise<StandingEntry[]> {
  const response = await axios.get(`${API_BASE}/football/standings`, {
    params: { competition }              // axios adds ?competition=PL to the URL automatically
  })
  return response.data.standings[0].table  // standings nested deep — [0] = first group, .table = the array
}

// get top scorers — defaults to PL, pass 'BL1' for Bundesliga etc.
export async function getTopScorers(competition: string = 'PL'): Promise<TopScorer[]> {
  const response = await axios.get(`${API_BASE}/football/scorers`, {
    params: { competition }              // axios adds ?competition=PL to the URL automatically
  })
  return response.data.scorers           // scorers array nested inside scorers key — extract just the array
}