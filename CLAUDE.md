# CLAUDE.md

This file provides guidance to Claude Code (claude.ai/code) when working with code in this repository.

## Repository Layout

```
pro-en/
├── app-front/          # Tauri v2 desktop app (React 19 + TypeScript + Rust)
│   ├── src/            # React frontend
│   ├── src-tauri/      # Rust backend (Tauri)
│   └── ...
├── app-backend/        # FastAPI service (Python 3.12, uv)
│   ├── src/app/        # Application package
│   └── tests/          # pytest tests
└── setup-tauri.ps1     # Scaffolding script to bootstrap new Tauri projects
```

## Commands (run inside `app-front/`)

```powershell
# Dev (Tauri dev server — first Rust compile takes ~2 min)
pnpm run tauri dev

# Frontend only (no Tauri window, Vite at localhost:1420)
pnpm run dev

# Type-check + bundle frontend
pnpm run build

# Bundle Tauri release
pnpm run tauri build
```

No test runner is configured yet for the frontend.

## Commands (run inside `app-backend/`)

```powershell
# Dev server (port 8000, auto-reload)
uv run uvicorn app.main:app --reload --port 8000

# Run tests
uv run pytest -v

# Add a dependency
uv add <package>
```

Copy `.env.example` → `.env` to override `OLLAMA_HOST` or `DEFAULT_MODEL`.

## Architecture

### Backend Service (`app-backend/`)

FastAPI app with three endpoints:

| Method | Path | Description |
|--------|------|-------------|
| GET | `/health` | Ollama connectivity check, returns available model names |
| POST | `/chat` | Non-streaming chat completion, returns full JSON response |
| POST | `/chat/stream` | SSE streaming; each `data:` event is a JSON-encoded partial response |

**Package layout** uses `src/app/` — the `app` package is installed as editable via `uv sync`. Import path is `from app.xxx import ...`.

**Ollama integration** is in `src/app/services/ollama.py`. It constructs an `ollama.AsyncClient` per call using `OLLAMA_HOST` from settings. The default model is `gemma4:e2b` (override via `DEFAULT_MODEL` env var).

**Settings** (`src/app/config.py`) use `pydantic-settings`. Values are read from `.env` at the project root. Adding a new setting: add a field to `Settings`, it is picked up automatically.

**CORS** is configured in `main.py` to allow `http://localhost:1420` (Tauri dev frontend). Update `allow_origins` when adding other origins.

### Frontend → Rust IPC
The frontend calls Rust via `@tauri-apps/api`:
```ts
import { invoke } from "@tauri-apps/api/core";
const result = await invoke<string>("greet", { name: "world" });
```
Rust commands are registered in `src-tauri/src/lib.rs` using `invoke_handler!(...)`. Add new commands by annotating a function with `#[tauri::command]` and registering it.

### Tailwind CSS v4 Setup
Tailwind is wired through `@tailwindcss/vite` — there is **no `tailwind.config.js`**. All theme tokens live as CSS custom properties in `src/index.css` using OKLCH. The `shadcn` package provides its own CSS variables via `@import "shadcn/tailwind.css"`.

Dark mode uses a class strategy: `@custom-variant dark (&:is(.dark *))`. Toggle by adding/removing the `.dark` class on a parent element.

### shadcn/ui Integration
Components are added via CLI:
```powershell
pnpm dlx shadcn@latest add <component-name>
```
They land in `src/components/ui/`. `components.json` configures aliases (`@/components`, `@/components/ui`, `@/lib`, `@/hooks`). The `cn()` helper is at `src/lib/utils.ts`.

### Tauri Window Configuration
`src-tauri/tauri.conf.json` sets the window to `maximized: true, decorations: false` (frameless). The Vite dev server must run on port **1420** (strict — Tauri hardcodes this). CSP is currently `null`.

### Path Alias
`@/` resolves to `src/` in both TypeScript (`tsconfig.json` `paths`) and Vite (`resolve.alias`).

## Scaffolding New Projects

`setup-tauri.ps1` automates creating a new app with this exact stack:

```powershell
# Minimal
.\setup-tauri.ps1 -ProjectName my-app

# Full options
.\setup-tauri.ps1 -ProjectName my-app -TargetDir D:\code -Identifier com.acme.myapp -InstallSampleComponents

# Dry-run to preview what would happen
.\setup-tauri.ps1 -ProjectName my-app -DryRun
```

The script checks for Node 20+, pnpm, Rust toolchain, VS 2022 Build Tools, and WebView2 before running. It is PowerShell 5.1 compatible.

## TypeScript Configuration

`strict: true` with `noUnusedLocals`, `noUnusedParameters`, and `noFallthroughCasesInSwitch` enabled. `any` is prohibited by convention. Module resolution is `bundler` mode.
