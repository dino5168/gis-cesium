# 系統簡介

本系統為 **十方資源科技** 開發的 GIS 空間分析桌面應用，整合 AI 聊天輔助與地理資料視覺化功能。

## 核心功能

- **AI 聊天機器人** — 透過本地 Ollama 模型進行自然語言問答
- **空間資料分析** — 支援 EPSG:4326 / EPSG:3857 坐標系統
- **主題切換** — 淺色、深色、深藍三種主題，支援跟隨系統設定

## 技術架構

| 層級 | 技術 |
|------|------|
| 桌面框架 | Tauri v2 (Rust) |
| 前端 | React 19 + TypeScript + Tailwind v4 |
| 後端 | FastAPI + Python 3.12 |
| AI 推論 | Ollama (本地模型) |

## 快速開始

### 啟動後端

```bash
cd app-backend
uv run uvicorn app.main:app --reload --port 8000
```

### 啟動前端開發視窗

```bash
cd app-front
pnpm run tauri dev
```

> 第一次啟動 Tauri 需要編譯 Rust，約需 2 分鐘。

## 注意事項

- Vite dev server 固定使用 **port 1420**，請勿更改
- 使用前請確認 Ollama 服務已在本機 `http://localhost:11434` 運行
- 生產環境部署前請收緊 `tauri.conf.json` 的 CSP 設定
