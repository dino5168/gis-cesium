# permissions 精細控管設計

> permissions 用 allow/deny/ask 三條規則，把工具呼叫精準切片。

## 內容

`permissions` 是 settings 裡最值得花時間打磨的區塊。它決定 Claude Code 哪些動作可以「無聲執行」、哪些必須「請示再做」、哪些「絕對禁止」。

對日常使用者來說，許可的目標是：**把高頻、低風險的工具呼叫變得無感，把不可逆動作擋下來確認**。三條規則對應這三種意圖：

- `allow`：自動放行，不彈確認框
- `deny`：直接拒絕，連問都不問
- `ask`：每次彈框確認

`permissions` 是物件，鍵是規則陣列，例如：

```json
{
  "permissions": {
    "allow": ["Bash(pnpm install)", "Bash(pnpm run *)", "Read"],
    "deny": ["Bash(rm -rf *)", "Bash(git push --force*)"],
    "ask": ["WebFetch", "Bash(gh pr merge*)"]
  }
}
```

規則匹配是「最具體優先」：`deny` > `ask` > `allow`，同類規則中更精確的字串勝出。

### allow/deny/ask 規則語法

規則語法是 `<ToolName>(<arg-pattern>)`，arg-pattern 支援 glob 萬用字元：

- `Bash(pnpm test)` — 完全比對
- `Bash(pnpm run *)` — 萬用尾端
- `Bash(git status*)` — 字串開頭比對（注意 `*` 接 0+ 字元）
- `Bash` — 整個工具，任意參數
- `Read(./src/**)` — 限定目錄
- `WebFetch(domain:github.com)` — 用 `domain:` 限定網域
- `mcp__<server>__<tool>` — MCP 工具用雙底線分隔的命名

**設計時兩個守則**：

1. **先寫 deny，再寫 allow**：deny 是你的紅線（force push、rm 危險路徑、寫入 secret 檔），永遠優先寫定
2. **allow 從窄到寬**：先放行 `Bash(pnpm test)` 這種具體指令，確認穩定後再泛化到 `Bash(pnpm *)`

### 工具特定權限模式

不同工具的 arg-pattern 形狀不同，常見的：

| 工具 | 規則範例 | 說明 |
|------|----------|------|
| `Bash` | `Bash(npm run lint)` | 對指令字串做 prefix/glob 比對 |
| `Read` / `Write` / `Edit` | `Read(./src/**)` | 對檔案路徑做 glob 比對 |
| `WebFetch` | `WebFetch(domain:docs.anthropic.com)` | 用 `domain:` 限制網域 |
| MCP 工具 | `mcp__filesystem__read_file` | 完整工具名稱直接列名 |
| `Agent` | `Agent(claude-code-guide)` | 限定可 spawn 的 subagent 類型 |

**進階技巧**：在 user settings 設「通用 deny」（例如禁止任何 force push、禁止寫入 `.env`），在 project settings 設「該專案放寬的 allow」（例如此專案的 `pnpm test` 可放行）。這樣換專案不必重設安全紅線。

---

← [settings.json 三層階層解析](settings-hierarchy.md) | → [環境變數與模型切換策略](env-and-model.md)
