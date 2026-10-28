/*
This file is the frontend version of football.py on the backend.
It has one job — make HTTP requests to our FastAPI backend using axios.
Every time a React component needs data it calls a function from this file.
The component never makes HTTP requests directly. Same separation of concerns we used in the backend.
*/

import axios from 'axios'                // axios = Python httpx equivalent. Makes HTTP requests from React to FastAPI.

const API_BASE = '/api'                  // base URL for all API calls — Vite proxy forwards /api to http://localhost:8000

// the shapes of the data (Match, LiveMatch, StandingEntry, TopScorer) live in types.ts (#47)
// "import type" = we only use these for type checking — they disappear when the app is built
import type { Match, LiveMatch, StandingEntry, TopScorer } from '../types'


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

// get standings — returns table, current matchday, and competition name
export async function getStandings(competition: string = 'PL'): Promise<{ table: StandingEntry[]; matchday: number; competition: string }> {
  const response = await axios.get(`${API_BASE}/football/standings`, {
    params: { competition }
  })
  return {
    table: response.data.standings[0].table,          // standings array
    matchday: response.data.season.currentMatchday,    // current matchday number
    competition: response.data.competition.name        // competition name
  }
}

// get top scorers
export async function getTopScorers(competition: string = 'PL'): Promise<TopScorer[]> {
  const response = await axios.get(`${API_BASE}/football/scorers`, {
    params: { competition }
  })
  return response.data.scorers                        // extract scorers array from full response
}


// send match data to FastAPI which calls Claude API for a prediction
export async function predictMatch(matchData: {
  home_team: string
  away_team: string
  competition: string
  home_position: number
  away_position: number
  home_points: number
  away_points: number
  home_gd: number
  away_gd: number
  matchday: number
}): Promise<string> {
  const response = await axios.post(`${API_BASE}/predict`, matchData)
  return response.data.prediction    // returns Claude's prediction text
}