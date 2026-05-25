# Backend 實作規劃

## 目標
在 `app-backend/` 建立 FastAPI 服務，整合本機 Ollama（模型 `gemma4b:e4b`），供前端 Tauri app 呼叫。

## 技術選型
| 層次 | 工具 |
|------|------|
| 套件管理 | uv |
| Web 框架 | FastAPI + Uvicorn |
| Ollama 客戶端 | `ollama` Python SDK |
| 設定管理 | `pydantic-settings` + `.env` |
| 測試 | pytest + pytest-asyncio + httpx |

## 專案結構
```
app-backend/
├── pyproject.toml
├── .python-version          # 固定 Python 版本
├── .env.example
├── src/
│   └── app/
│       ├── main.py          # FastAPI app + lifespan
│       ├── config.py        # Settings (pydantic-settings)
│       ├── routers/
│       │   └── chat.py      # /chat 端點
│       └── services/
│           └── ollama.py    # Ollama 封裝
└── tests/
    └── test_chat.py
```

## API 端點設計
| Method | Path | 說明 |
|--------|------|------|
| GET | `/health` | 健康檢查，回傳 Ollama 連線狀態 |
| POST | `/chat` | 單次對話（非串流） |
| POST | `/chat/stream` | 串流對話（SSE） |

### POST /chat 請求/回應
```json
// Request
{ "messages": [{"role": "user", "content": "Hello"}], "model": "gemma4b:e4b" }

// Response
{ "message": {"role": "assistant", "content": "..."}, "model": "gemma4b:e4b", "done": true }
```

## 執行步驟

### Step 1 — uv 初始化專案
```powershell
cd D:\repo-tauri\pro-en\app-backend
uv init --no-workspace
uv python pin 3.12
```

### Step 2 — 安裝依賴
```powershell
uv add fastapi "uvicorn[standard]" ollama pydantic-settings
uv add --dev pytest pytest-asyncio httpx
```

### Step 3 — 建立原始碼（src/app/）
- `config.py`：從 `.env` 讀取 `OLLAMA_HOST`、`DEFAULT_MODEL`
- `services/ollama.py`：封裝 `ollama.AsyncClient`
- `routers/chat.py`：`/chat` 與 `/chat/stream`
- `main.py`：組裝 app，掛載 router

### Step 4 — 測試
```powershell
uv run pytest
```

### Step 5 — 啟動
```powershell
uv run uvicorn app.main:app --reload --port 8000
```
