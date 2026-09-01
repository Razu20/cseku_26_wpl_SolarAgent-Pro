"""
Central configuration, loaded from environment variables (.env in local dev).
Keeping this in one place makes it obvious what needs to change for a real
deployment (API key, model name, allowed origins).
"""
import os
from dotenv import load_dotenv

load_dotenv()

ANTHROPIC_API_KEY = os.getenv("ANTHROPIC_API_KEY", "")
ANTHROPIC_MODEL = os.getenv("ANTHROPIC_MODEL", "claude-sonnet-5")
CORS_ORIGINS = [o.strip() for o in os.getenv("CORS_ORIGINS", "http://localhost:5173").split(",")]
AGENT_MAX_TOOL_ITERATIONS = int(os.getenv("AGENT_MAX_TOOL_ITERATIONS", "6"))

if not ANTHROPIC_API_KEY:
    # Don't crash at import time (lets the app boot, docs page load, etc.)
    # but every /chat call will fail fast with a clear error until this is set.
    import warnings
    warnings.warn(
        "ANTHROPIC_API_KEY is not set. Copy .env.example to .env and add your "
        "key, or the /chat endpoint will return errors.",
        stacklevel=2,
    )
