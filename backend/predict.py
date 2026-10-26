'''
predict.py has one job: 
take match data, build a smart prompt with standings context, call Claude, return the prediction.
'''

import anthropic                          # Claude API library
import os                                 # reads environment variables
from functools import lru_cache           # remembers a function's result — so the client is only created once
from dotenv import load_dotenv            # reads .env file so os.getenv() can find our API key

load_dotenv()                             # actually reads the .env file — must be called before os.getenv()

ANTHROPIC_API_KEY = os.getenv("ANTHROPIC_API_KEY")  # reads Claude API key from .env 

# get_claude_client() — a dependency: FastAPI calls it and hands the client to /predict
# @lru_cache = create the client the FIRST time it's asked for, then reuse that same one every time after
# tests can swap it for a fake with app.dependency_overrides — so they never call the real Claude
@lru_cache
def get_claude_client():
        return anthropic.AsyncAnthropic(api_key=ANTHROPIC_API_KEY)  # the ASYNC Claude client — its calls can be awaited, so they don't block the server

async def get_prediction(
    client,                   # the Claude client — handed in by main.py instead of created at the top of this file
    home_team: str,           # home team name
    away_team: str,           # away team name
    competition: str,         # competition name e.g. Premier League
    home_position: int,       # home team league position
    away_position: int,       # away team league position
    home_points: int,         # home team points
    away_points: int,         # away team points
    home_gd: int,             # home team goal difference
    away_gd: int,             # away team goal difference
    matchday: int             # current matchday
) -> str:
    # build the prompt — the better the prompt the better the prediction
    # we feed Claude real standings data so predictions are grounded in actual form
    prompt = f"""You are an expert football analyst. Analyze this upcoming match and give a prediction.

Competition: {competition}
Matchday: {matchday}

Home team: {home_team}
- League position: {home_position}
- Points: {home_points}
- Goal difference: {home_gd}

Away team: {away_team}
- League position: {away_position}
- Points: {away_points}
- Goal difference: {away_gd}

Based on this data provide:
1. Who you think will win and why
2. Predicted score
3. One key factor that could decide the match
4. Confidence level: Low / Medium / High

Keep your analysis under 150 words. Be specific and insightful."""

    # await = "start the Claude call, and while we wait, let the server handle other requests"
    message = await client.messages.create(
        model="claude-sonnet-4-6",        # use Claude Sonnet — smart and fast
        max_tokens=300,                    # limit response length — we don't need an essay
        messages=[
            {
                "role": "user",            # we are the user sending the prompt
                "content": prompt          # the prompt we built above
            }
        ]
    )

    # extract the text from Claude's response and return it
    return message.content[0].text        # response is a list of content blocks — we want the first text block