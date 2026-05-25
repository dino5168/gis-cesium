# app-backend

FastAPI service bridging the Tauri frontend to a local Ollama instance.

## Commands

```powershell
# Dev server (port 8000, auto-reload)
uv run uvicorn app.main:app --reload --port 8000

# Run tests
uv run pytest -v

# Add a dependency
uv add <package>

# Add a dev dependency
uv add --dev <package>
```

Copy `.env.example` → `.env` before first run.

## Package Layout

```
app-backend/
├── src/app/
│   ├── main.py          # FastAPI app, lifespan, CORS, router registration
│   ├── config.py        # pydantic-settings (reads .env)
│   ├── routers/
│   │   └── chat.py      # POST /chat and POST /chat/stream
│   └── services/
│       └── ollama.py    # Ollama async client wrappers
├── tests/
│   └── test_chat.py     # pytest + httpx TestClient
├── pyproject.toml
└── .env.example
```

The `app` package is installed as editable via `uv sync` — import path is `from app.xxx import ...`.

## API Endpoints

| Method | Path | Description |
|--------|------|-------------|
| GET | `/health` | Ollama connectivity check; returns available model names |
| POST | `/chat` | Non-streaming chat; returns full JSON `ChatResponse` |
| POST | `/chat/stream` | SSE stream; each `data:` event is a JSON-encoded partial `ChatResponse` |

### Request / Response Shapes

**POST /chat**
```json
// Request
{ "messages": [{"role": "user", "content": "Hello"}], "model": "gemma4:e2b" }

// Response
{ "message": {"role": "assistant", "content": "..."}, "model": "gemma4:e2b", "done": true }
```

**POST /chat/stream** — same request body; response is `text/event-stream`:
```
data: {"message": {"role": "assistant", "content": "chunk"}, "model": "...", "done": false}

data: {"message": {"role": "assistant", "content": "last"}, "model": "...", "done": true}
```

## Configuration (`src/app/config.py`)

Uses `pydantic-settings`; values read from `.env` at the project root.

| Env var | Default | Description |
|---------|---------|-------------|
| `OLLAMA_HOST` | `http://localhost:11434` | Ollama base URL |
| `DEFAULT_MODEL` | `gemma4:e2b` | Model used when request omits `model` field |

To add a setting: add a typed field to `Settings` — it is picked up automatically.

## Ollama Service (`src/app/services/ollama.py`)

Three async functions; each constructs a fresh `ollama.AsyncClient` per call:

- `chat(messages, model)` → `ollama.ChatResponse` — non-streaming
- `chat_stream(messages, model)` → `AsyncIterator[ollama.ChatResponse]` — streaming generator
- `list_models()` → `list[ollama.ListResponse.Model]` — used by `/health` and startup log

## CORS

`main.py` allows `http://localhost:1420` (Tauri dev frontend). Add origins to the `allow_origins` list in `app.add_middleware(CORSMiddleware, ...)` when needed.

## Testing

Tests use `fastapi.testclient.TestClient` (sync) with `unittest.mock` to patch Ollama calls — no live Ollama instance required.

```powershell
uv run pytest -v               # all tests
uv run pytest tests/test_chat.py -k health  # single test
```

New tests go in `tests/`. Use `@pytest.mark.asyncio` for async tests (mode is `auto` in `pyproject.toml`).

## Adding a New Endpoint

1. Create `src/app/routers/<name>.py` with an `APIRouter`
2. Add Ollama service helpers to `src/app/services/ollama.py` if needed
3. Register the router in `main.py`: `app.include_router(<name>.router)`
4. Add tests in `tests/test_<name>.py`
