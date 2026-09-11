# PitchIQ ⚽

A live soccer analytics dashboard built with FastAPI, React, PostgreSQL, Redis, and the Claude AI API. Pull real-time data from four European leagues, get AI-powered match predictions, and view dedicated Champions League analytics.

🔗 **Live Demo:** http://13.52.240.231:5173

---

## Features

- **Live Standings** — real-time league tables for Premier League, Bundesliga, Ligue 1, and La Liga with color-coded qualification zones (Champions League, Europa League, Relegation)
- **Live Matches** — real-time scores for matches happening right now
- **Top Scorers** — leaderboard with player nationality flags
- **AI Match Predictions** — powered by Claude API. Select any two teams and get an intelligent prediction with reasoning, predicted score, and confidence level
- **Champions League Page** — dedicated UCL page with dark blue/gold aesthetic, league stage standings, top scorers, and live UCL matches
- **Competition Selector** — switch between 4 leagues instantly with debounced requests to prevent rate limiting
- **Redis Caching** — API responses cached for 60 seconds (30s for live matches) to handle rate limits and improve performance
- **Mobile Responsive** — works on all screen sizes

---

## Tech Stack

| Layer | Technology |
|---|---|
| Frontend | React + TypeScript + Vite |
| Backend | Python + FastAPI + Uvicorn |
| Database | PostgreSQL + SQLAlchemy ORM |
| Validation | Pydantic |
| Cache | Redis |
| External API | football-data.org |
| AI | Claude API (claude-sonnet-4-6) |
| Containerization | Docker + docker-compose |
| Deployment | AWS EC2 |
| CI/CD | GitHub Actions |

---

## Project Structure

```
pitchiq/
├── backend/
│   ├── database.py      # PostgreSQL connection, SessionLocal, Base, get_db()
│   ├── models.py        # SQLAlchemy table definitions
│   ├── schemas.py       # Pydantic validation schemas
│   ├── main.py          # FastAPI app, CORS, all endpoints
│   ├── football.py      # football-data.org API integration + Redis caching
│   └── predict.py       # Claude AI match predictions
├── frontend/
│   └── src/
│       ├── api/
│       │   └── football.ts       # axios API layer
│       ├── components/
│       │   ├── Standings.tsx     # league table with zone colors + AI prediction
│       │   ├── LiveMatches.tsx   # live match scores
│       │   ├── TopScorers.tsx    # top scorers with nationality flags
│       │   ├── MatchPrediction.tsx # AI prediction component
│       │   └── Navbar.tsx        # sticky navbar with active link detection
│       ├── pages/
│       │   └── ChampionsLeague.tsx # dedicated UCL page
│       └── App.tsx               # root component + competition selector
├── .github/
│   └── workflows/
│       └── deploy.yml            # GitHub Actions CI/CD pipeline
├── docker-compose.yml            # defines all 4 containers
└── requirements.txt
```

---

## API Endpoints

### Local Database
| Method | Endpoint | Description |
|---|---|---|
| GET | `/` | Health check |
| GET | `/matches` | All matches from PostgreSQL |
| GET | `/matches/{id}` | One specific match |
| POST | `/matches` | Create a match |

### Football API (live data)
| Method | Endpoint | Description |
|---|---|---|
| GET | `/football/matches` | Competition matches |
| GET | `/football/standings` | League table |
| GET | `/football/scorers` | Top scorers |
| GET | `/football/live` | All live matches |
| GET | `/football/matches/{id}` | Match details |
| GET | `/football/teams/{id}` | Team info and squad |

### AI
| Method | Endpoint | Description |
|---|---|---|
| POST | `/predict` | Claude AI match prediction |

---

## Running Locally

### Prerequisites
- Python 3.12+
- Node.js 20+
- PostgreSQL 16
- Redis
- Docker (optional)

### With Docker (recommended)

```bash
git clone https://github.com/irnessarvan13/pitchiq.git
cd pitchiq

# create .env file
cp .env.example .env
# add your API keys to .env

docker-compose up --build
```

Visit `http://localhost:5173`

### Without Docker

```bash
# Backend
cd pitchiq
python3 -m venv venv
source venv/bin/activate
pip3 install -r requirements.txt

brew services start postgresql@16
brew services start redis
createdb pitchiq

uvicorn backend.main:app --reload

# Frontend (new terminal)
cd frontend
npm install
npm run dev
```

Visit `http://localhost:5173`

---

## Environment Variables

Create a `.env` file in the root directory:

```
DATABASE_URL=postgresql://localhost/pitchiq
FOOTBALL_API_KEY=your_football_data_api_key
ANTHROPIC_API_KEY=your_anthropic_api_key
```

Get your football API key at [football-data.org](https://www.football-data.org)  
Get your Anthropic API key at [console.anthropic.com](https://console.anthropic.com)

---

## Key Technical Decisions

**Redis Caching** — The football-data.org free tier limits to 10 requests/minute. Redis caching stores API responses (60s TTL for standings/scorers, 30s for live matches) so thousands of users can hit the dashboard with only one API call per minute.

**Debouncing** — The competition selector uses a 500ms debounce delay. Rapid clicks only fire one API call after the user stops clicking, preventing rate limit errors.

**Cache-aside pattern** — Check Redis first. Cache hit = return immediately. Cache miss = fetch from API, save to Redis, return data.

**Separation of concerns** — football.py handles all external API calls. predict.py handles AI calls. Components never make HTTP requests directly — all calls go through src/api/football.ts.

---

## CI/CD

Pushing to `main` automatically deploys to AWS EC2 via GitHub Actions:

1. GitHub Actions detects push to main
2. SSHes into EC2 server
3. Pulls latest code
4. Rebuilds Docker containers
5. App updated with zero downtime

---

## Author

Irnes — CS Graduate, CSUEB  
[GitHub](https://github.com/irnessarvan13) | [LinkedIn](https://www.linkedin.com/in/irnes-sarvan-b85a52191/)