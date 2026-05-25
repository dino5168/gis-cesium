# settings.json 三層階層解析

> 三層 settings 用 override 順序解決個人、專案、本地的設定衝突。

## 內容

Claude Code 的設定不是單一檔案，而是三層 JSON 疊加的結果。理解疊加順序是讓你「在哪裡放什麼」不再瞎猜的關鍵。

三個檔案位置（由低優先級到高優先級）：

| 層級 | 路徑 | 用途 |
|------|------|------|
| User | `~/.claude/settings.json` | 跨專案個人偏好（model、theme、全域 hook） |
| Project | `<repo>/.claude/settings.json` | 入版控、團隊共享的專案規範 |
| Local | `<repo>/.claude/settings.local.json` | 個人在本專案的覆寫（不入版控） |

疊加規則是「淺合併」（shallow merge）：頂層 key 後者覆蓋前者，但 `permissions.allow` 這類陣列是合併（union），不是覆蓋。理解這點就能避免「我把專案的 allow 規則寫在 user 結果被本地清空」這類困惑。

**進階使用者必懂的三個常見坑**：

1. **`.claude/settings.local.json` 必須加進 `.gitignore`**：這是放個人 secret-ish 設定（例如本地 MCP token、實驗性 hook）的地方，不該入版控
2. **想驗證最終生效設定**：在 Claude Code 內執行 `/config` 查看當前合併後的 settings
3. **修改 user settings 後立刻生效**：不必重啟 Claude Code，新 session 就會讀到，但已開啟的 session 不會熱重載

### 設計建議

- **入版控的 project settings** 只放團隊規範：強制使用某個 model、共用 slash commands 目錄、團隊 hook
- **個人偏好** 一律放 user settings：theme、字體、個人 MCP server
- **臨時實驗** 全放 local settings：你不會希望同事 pull 下來後突然 model 變了

---

← 章節首篇 | → [permissions 精細控管設計](permissions-design.md)
