"""
fake_football_api.py — a pretend football-data.org for the end-to-end test (#48).

It answers the same URLs as the real API, but with the responses we recorded in tests/fixtures/football/.
The e2e test runs the REAL backend against this server, so it never calls the real football API:
no key, no rate limit, and the same data on every run.

Uses only Python's standard library, so there's nothing to install.
"""

import json
import os
import re
from http.server import BaseHTTPRequestHandler, HTTPServer
from pathlib import Path
from urllib.parse import urlparse

# where the recorded responses are — docker-compose.e2e.yml mounts tests/fixtures/football at /fixtures
FIXTURES = Path(os.getenv("FIXTURES_DIR", "/fixtures"))

# which recorded file answers which URL — {} is filled in with the league code, e.g. standings_PL_200.json
ROUTES = [
    (re.compile(r"^/v4/competitions/(\w+)/standings$"), "standings_{}_200.json"),
    (re.compile(r"^/v4/competitions/(\w+)/scorers$"), "scorers_{}_200.json"),
    (re.compile(r"^/v4/competitions/(\w+)/matches$"), "matches_{}_200.json"),
    (re.compile(r"^/v4/matches$"), "live_empty_200.json"),                     # live matches: none right now
]


class FakeFootballAPI(BaseHTTPRequestHandler):
    def do_GET(self):
        path = urlparse(self.path).path                                         # drop the ?query part, e.g. ?status=LIVE
        for pattern, file_name in ROUTES:
            match = pattern.match(path)
            if match:
                fixture = FIXTURES / file_name.format(*match.groups())
                if fixture.exists():
                    return self.send_json(200, fixture.read_bytes())
        # anything we haven't recorded gets a 404, like the real API for an unknown resource
        self.send_json(404, json.dumps({"message": f"The fake API has no recording for {path}"}).encode())

    def send_json(self, status, body):
        self.send_response(status)
        self.send_header("Content-Type", "application/json")
        self.end_headers()
        self.wfile.write(body)


if __name__ == "__main__":
    print("Fake football-data.org listening on port 8080", flush=True)
    HTTPServer(("0.0.0.0", 8080), FakeFootballAPI).serve_forever()
