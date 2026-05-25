# tauri-template-01

Tauri v2 桌面應用程式模板，前端使用 React 19 + TypeScript + Tailwind v4，後端使用 FastAPI + Ollama。

## 技術棧

| 層 | 技術 |
|---|---|
| 桌面框架 | Tauri v2 (Rust) |
| 前端 | React 19 + TypeScript 5.8 + Vite 7 |
| 樣式 | Tailwind CSS v4 + shadcn/ui |
| 多語系 | react-i18next（繁體中文 / English） |
| 後端 | FastAPI + Uvicorn |
| AI 模型 | Ollama（本地推論） |
| 套件管理 | pnpm（前端）、uv（Python） |

---

## 前置需求

| 工具 | 最低版本 | 安裝 |
|------|----------|------|
| Node.js | 20+ | https://nodejs.org |
| pnpm | 9+ | `npm i -g pnpm` |
| Rust + Cargo | 1.80+ | https://rustup.rs |
| VS 2022 Build Tools | — | Windows 必要，含 C++ 工作負載 |
| WebView2 Runtime | — | Windows 11 已內建 |
| Python | 3.12+ | https://python.org |
| uv | 0.4+ | `pip install uv` 或 https://docs.astral.sh/uv |
| Ollama | 最新 | https://ollama.com |

---

## Clone 後的安裝步驟

```powershell
git clone https://github.com/dino5168/tauri-template-01.git
cd tauri-template-01
```

### 1. 安裝前端相依套件

```powershell
cd app-front
pnpm install
cd ..
```

### 2. 安裝後端相依套件

```powershell
cd app-backend
uv sync
cd ..
```

### 3. 設定後端環境變數

```powershell
cd app-backend
copy .env.example .env   # Windows
# 或 cp .env.example .env  (PowerShell / bash)
```

`.env` 可修改的設定：

```env
OLLAMA_HOST=http://localhost:11434
DEFAULT_MODEL=gemma4:e2b
```

### 4. 下載 Ollama 模型（首次）

```powershell
ollama pull gemma4:e2b
```

---

## 啟動後端

```powershell
cd app-backend
uv run uvicorn app.main:app --reload --port 8000
```

啟動後可存取：
- API 文件：`http://localhost:8000/docs`
- 健康檢查：`http://localhost:8000/health`

---

## 啟動前端

### 方式一：Tauri 完整桌面視窗（推薦）

```powershell
cd app-front
pnpm run tauri dev
```

> 首次 Rust 編譯約需 2–5 分鐘，後續熱更新即時生效。

### 方式二：僅瀏覽器預覽（不含 Tauri 視窗）

```powershell
cd app-front
pnpm run dev
```

開啟瀏覽器：`http://localhost:1420`

---

## 建構正式版本

### 前端 type-check + 打包

```powershell
cd app-front
pnpm run build
```

### Tauri 完整安裝包

```powershell
cd app-front
pnpm run tauri build
```

產出位置：`app-front/src-tauri/target/release/bundle/`

---

## 專案結構

```
tauri-template-01/
├── app-front/              # Tauri 前端（React + TypeScript）
│   ├── src/
│   │   ├── i18n/           # 多語系設定（zh-TW / en）
│   │   ├── pages/          # 頁面元件
│   │   ├── components/     # 共用元件（sidebar、ui）
│   │   └── lib/            # API client、工具函式
│   └── src-tauri/          # Rust 後端（Tauri commands）
├── app-backend/            # FastAPI 服務
│   └── src/app/
│       ├── routers/        # API 路由
│       ├── services/       # Ollama 整合
│       └── config.py       # 環境設定
├── tasks/                  # 開發任務文件
└── setup-tauri.ps1         # 新專案 scaffold 腳本
```

---

## 常用指令速查

```powershell
# 後端
uv run uvicorn app.main:app --reload --port 8000   # 啟動
uv run pytest -v                                    # 測試
uv add <package>                                    # 新增套件

# 前端
pnpm run tauri dev          # Tauri 開發模式
pnpm run dev                # 瀏覽器模式
pnpm run build              # 型別檢查 + 打包
pnpm run tauri build        # 產生安裝包
pnpm dlx shadcn@latest add <component>  # 新增 shadcn 元件
```
