# UserPromptSubmit 與 SessionStart hook

> 這兩個 hook 讓你在 prompt 進場前與 session 啟動時動手。

## 內容

`PreToolUse/PostToolUse` 處理「LLM 與工具之間」的時刻；`UserPromptSubmit` 與 `SessionStart` 處理「使用者與 LLM 之間」與「session 邊界」的時刻。

### SessionStart：開場注入

`SessionStart` 在 Claude Code 啟動或 `/clear` 後觸發。最常見用法是「每次都把專案重要上下文打進去」，比 CLAUDE.md 更動態。

```json
{
  "hooks": {
    "SessionStart": [
      { "hooks": [{ "type": "command", "command": "~/.claude/hooks/session-init.sh" }] }
    ]
  }
}
```

範例 `session-init.sh`：

```bash
#!/usr/bin/env bash
GIT_STATUS=$(git status --porcelain 2>/dev/null | head -5)
TODO_COUNT=$(grep -rn "TODO" src 2>/dev/null | wc -l)
cat <<EOF
{
  "additionalContext": "Working tree:\n$GIT_STATUS\nOpen TODOs: $TODO_COUNT"
}
EOF
```

這比寫在 CLAUDE.md 強的地方是：**內容是當下計算的，不是死板靜態**。

### UserPromptSubmit：prompt 的最後一道把關

`UserPromptSubmit` 在使用者輸入送出、進入 LLM 前觸發。三種主要用途：

1. **阻擋敏感資訊**：偵測 prompt 含 secret 樣式（API key、JWT），擋下並提醒使用者改寫
2. **改寫 prompt**：把「短語」展開成「完整指示」（例如使用者輸入 `fix it`，hook 自動改成「Fix the most recent error in the test output」）
3. **加 metadata**：把當前分支、時間、CI 狀態附在 prompt 後讓 LLM 知情

範例：把 `fix` 自動展開為更具體的請求：

```bash
#!/usr/bin/env bash
INPUT=$(cat)
PROMPT=$(echo "$INPUT" | jq -r '.prompt')

if [[ "$PROMPT" == "fix" ]]; then
  jq -n '{ "prompt": "Look at the most recent test failure or error in the terminal and propose a fix." }'
fi
```

stdout 的 `prompt` 欄位會覆寫使用者輸入。

### 兩個常見組合

- **SessionStart 注入 git/環境狀態 + UserPromptSubmit 阻擋 secret**：適合需要保密的專案
- **SessionStart 載入 CLAUDE.md 補充 + UserPromptSubmit 加分支名**：適合多分支開發

### 設計守則

- **SessionStart 用 stdout JSON 注入上下文**，不要在裡面做重活
- **UserPromptSubmit 必須快**：使用者打完 Enter 到 LLM 啟動之間的延遲都來自這
- **不要在這兩個 hook 修改 git 狀態**——使用者期待 prompt 就是 prompt，session 就是 session，副作用會破壞心智模型

---

← [PreToolUse / PostToolUse 攔截實戰](pre-post-tool-use.md) | → [Hook 偵錯、退出碼與安全紅線](debugging-and-safety.md)
