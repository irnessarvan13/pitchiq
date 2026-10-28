/*
format.ts — small helpers that turn data into text for the screen.
*/

// formatScore — "2 - 1", or "–" when football-data.org doesn't have a score yet (#29)
// before #29 a missing score (null) was shown as "0 - 0", which looks like a real score
export function formatScore(home: number | null, away: number | null): string {
  if (home === null || away === null) return '–'
  return `${home} - ${away}`
}
