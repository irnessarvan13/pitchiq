import httpx
import os
from dotenv import load_dotenv


load_dotenv()
API_KEY = os.getenv("FOOTBALL_API_KEY")
BASE_URL = "https://api.football-data.org/v4" #Stores the base URL of the football-data.org


#An async function that calls football-data.org and returns match data for a specific competition.
async def get_matches(competition="PL"):        #competition="PL" is a default parameter.
    url = f"{BASE_URL}/competitions/{competition}/matches"  #builds the full URL. 
    headers = {"X-Auth-Token": API_KEY}   #football-data.org requires your API key in the request headers.
                                          #X-Auth-Token is the specific header name they use.
    
    async with httpx.AsyncClient() as client:   #creates an async HTTP client.
        response = await client.get(url, headers=headers)   #sends the GET request to football-data.org and waits for the response
        return response.json()                  #converts the response from football-data.org into a Python dictionary


