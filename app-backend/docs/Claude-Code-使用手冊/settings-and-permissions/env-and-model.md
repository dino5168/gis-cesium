# 環境變數與模型切換策略

> env 與 model 是切換成本、能力配比的兩個主旋鈕。

## 內容

`env` 與 `model` 看起來像「就那兩個 key」，但用對了能省下大量 token 成本，也能讓你在不同任務間切換最適模型。

### model：選對主力與 fallback

`model` 欄位可以接受具體模型 ID（如 `claude-opus-4-7`）或 alias（如 `opus`、`sonnet`、`haiku`、`default`）。實務上的選擇邏輯：

| 任務類型 | 建議模型 | 理由 |
|----------|----------|------|
| 架構規劃、難 bug、跨檔案重構 | Opus 4.7 | 推理深度與全局視野 |
| 日常 CRUD、寫測試、修小錯 | Sonnet 4.6 | 性價比最佳 |
| 大量檔案批改、樣板生成 | Haiku 4.5 | 速度快、便宜 |

**進階做法**：不要在 user settings 寫死 model，改用 `/model` 在 session 中切換。需要規劃時用 `/model opus`，落地實作切回 `/model sonnet`。

### env：把秘密與行為旗標放對位置

`env` 物件設定的環境變數會注入到 Claude Code 啟動的子行程裡。它最常見的三種用途：

```json
{
  "env": {
    "ANTHROPIC_API_KEY": "...",
    "BASH_DEFAULT_TIMEOUT_MS": "180000",
    "DISABLE_TELEMETRY": "1"
  }
}
```

1. **覆寫預設行為**：例如 `BASH_DEFAULT_TIMEOUT_MS` 拉長 Bash 預設逾時、`MAX_THINKING_TOKENS` 給模型更多思考預算
2. **連線到企業代理**：`HTTPS_PROXY`、`NO_PROXY` 控制網路走向
3. **將 secret 從 shell rc 移走**：API key、雲端 token 寫進 `~/.claude/settings.json` 比寫進 `.bashrc` 安全（前者不會被 shell 自動印出）

**安全紅線**：`env` 裡若放真實 secret，**必須只放在 user settings（單機）或 local settings（單機+單專案）**，絕不放進入版控的 project settings。

### 切換策略：給不同情境配不同組合

實務上會在三層 settings 安排不同的 env/model 組合：

- **User**：個人預設（model = sonnet、API key、telemetry off）
- **Project**：團隊共識（強制 model = opus 給 code review 專案）
- **Local**：個人實驗（暫時切到 haiku 跑大量小任務）

這樣切換不靠 CLI flag、不靠 shell alias，三層 JSON 就足以表達意圖。

---

← [permissions 精細控管設計](permissions-design.md) | → [statusLine 與終端體驗客製](statusline-customization.md)
