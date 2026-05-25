from contextlib import asynccontextmanager
from typing import Any

import ollama
from fastapi import FastAPI
from fastapi.middleware.cors import CORSMiddleware

from app.config import settings
from app.routers import chat, docs
from app.services import ollama as ollama_svc


@asynccontextmanager
async def lifespan(app: FastAPI):
    # Verify Ollama is reachable at startup (non-fatal — just logs)
    try:
        models = await ollama_svc.list_models()
        names = [m.model for m in models]
        print(f"[startup] Ollama connected. Available models: {names}")
        if settings.default_model not in names:
            print(f"[startup] WARNING: default model '{settings.default_model}' not found in Ollama")
    except Exception as exc:  # noqa: BLE001
        print(f"[startup] WARNING: could not reach Ollama at {settings.ollama_host}: {exc}")
    yield


app = FastAPI(title="app-backend", version="0.1.0", lifespan=lifespan)

app.add_middleware(
    CORSMiddleware,
    allow_origins=["http://localhost:1420"],  # Tauri dev frontend
    allow_methods=["*"],
    allow_headers=["*"],
)

app.include_router(chat.router)
app.include_router(docs.router)


@app.get("/health")
async def health() -> dict[str, Any]:
    """Health check: returns Ollama connection status and available models.

    Returns:
        Dict with status, ollama_host, and model list (or error message).
    """
    try:
        models = await ollama_svc.list_models()
        return {
            "status": "ok",
            "ollama_host": settings.ollama_host,
            "models": [m.model for m in models],
        }
    except ollama.ResponseError as exc:
        return {"status": "degraded", "ollama_host": settings.ollama_host, "error": str(exc)}
