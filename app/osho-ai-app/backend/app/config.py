"""App configuration."""

import os

APP_NAME = "Osho AI API"
APP_VERSION = "1.0.0"

# CORS origins — configurable via the CORS_ORIGINS env var (comma-separated).
# Falls back to the default Vite dev-server origins.
_DEFAULT_ORIGINS = "http://localhost:5173,http://127.0.0.1:5173"
CORS_ORIGINS = [
    o.strip()
    for o in os.environ.get("CORS_ORIGINS", _DEFAULT_ORIGINS).split(",")
    if o.strip()
]
