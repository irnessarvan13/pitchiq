# football-data.org fixtures

Real responses recorded from the football-data.org v4 API on **Oct 21, 2026** (free plan).
Tests replay these with a fake API (respx) so they never call the real API, never use the rate limit, and never need a real key.

## Files

| File | Endpoint | Status | Notes |
|---|---|---|---|
| `standings_PL_200.json` | `/competitions/PL/standings` | 200 | |
| `matches_PL_200.json` | `/competitions/PL/matches` | 200 | Trimmed to the first 5 matches (`resultSet.count` set to 5) |
| `scorers_PL_200.json` | `/competitions/PL/scorers` | 200 | |
| `live_empty_200.json` | `/matches?status=LIVE` | 200 | No live matches at the time: `"count": 0`, `"matches": []` |
| `match_560542_200.json` | `/matches/560542` | 200 | |
| `team_57_200.json` | `/teams/57` | 200 | Arsenal |
| `matches_EL_403.json` (+ headers) | `/competitions/EL/matches` | 403 | Competition not on the free plan |
| `match_1_403.json` (+ headers) | `/matches/1` | 403 | Match exists, but isn't on the free plan |
| `match_999999999_400.json` (+ headers) | `/matches/999999999` | 400 | Match doesn't exist |
| `rate_limit_429.json` (+ headers) | `/competitions/PL/standings` | 429 | Over the request limit |

## What we learned about this API

- **403** means the resource exists but isn't on our plan.
- **Not found comes back as 400, not 404.** The body says `"The resource you are looking for does not exist."`
- **429** came after 11 requests in about a minute. The body says `"Wait N seconds."` There is **no `Retry-After` header**; use `X-RequestCounter-Reset` (seconds until the limit resets).
- Every response includes `x-requests-available-minute` (requests left this minute) and `X-RequestCounter-Reset`.
- `status=LIVE` means `IN_PLAY` + `PAUSED`. Dates in responses are in UTC.

## How to re-record

Load the key without typing it, then save the body, headers and status code:

```bash
set -a; source .env; set +a
curl -s -o <file>.json -D <file>_headers.txt -w "%{http_code}\n" \
  -H "X-Auth-Token: $FOOTBALL_API_KEY" "https://api.football-data.org/v4/<path>"
```

Before committing, make sure the key isn't in any file (this should print nothing):

```bash
grep -rl "$FOOTBALL_API_KEY" tests/fixtures
```
