"""FastAPI entrypoint."""

from contextlib import asynccontextmanager

from fastapi import FastAPI
from fastapi.middleware.cors import CORSMiddleware

from app.config import APP_NAME, APP_VERSION, CORS_ORIGINS
from app.api.routes import router
from app.services import rag_service


@asynccontextmanager
async def lifespan(app: FastAPI):
    # Warm up the RAG engine on startup so the first question is fast.
    # Failures here (e.g. missing index) are logged, not fatal: /health stays
    # up and /chat returns a clear message instead of the server refusing to boot.
    try:
        rag_service.ensure_loaded()
    except Exception as exc:  # noqa: BLE001
        print(f"[startup] RAG warm-up skipped: {exc}")
    yield


app = FastAPI(title=APP_NAME, version=APP_VERSION, lifespan=lifespan)

app.add_middleware(
    CORSMiddleware,
    allow_origins=CORS_ORIGINS,
    allow_credentials=True,
    allow_methods=["*"],
    allow_headers=["*"],
)

app.include_router(router, prefix="/api")
