# Hook 生命週期事件總覽

> Hook 是 Claude Code 在固定事件點呼叫的 shell command。

## 內容

Hook 與 skill/command 的根本差別：**hook 是「harness 行為」，由 Claude Code 自己執行，不在 LLM 的可選工具集裡**。LLM 不知道 hook 存在；hook 只在 harness 經過某個事件點時被呼叫。

這也是為什麼「想自動化」的需求一律要靠 hook，不能靠 prompt 或 memory——LLM 即使想「每次都做 X」，沒有 harness 推它一把就會忘。

### 主要事件點

| 事件 | 何時觸發 | 常見用途 |
|------|---------|----------|
| `SessionStart` | Claude Code 啟動 / `/clear` 後 | 注入專案上下文、檢查環境 |
| `UserPromptSubmit` | 使用者送出 prompt 之前 | 改寫 prompt、加 metadata、阻擋敏感字 |
| `PreToolUse` | LLM 將呼叫工具，尚未執行 | 阻擋危險指令、改寫參數 |
| `PostToolUse` | 工具執行完，結果尚未回給 LLM | 後處理輸出、log、觸發後續動作 |
| `Stop` | LLM 一個 turn 結束 | 通知、產生摘要、自動 commit |
| `Notification` | Claude Code 想通知使用者 | 桌面通知、Slack 訊息 |

### 設定位置

Hook 在 settings.json 的 `hooks` 物件：

```json
{
  "hooks": {
    "PreToolUse": [
      {
        "matcher": "Bash",
        "hooks": [
          { "type": "command", "command": "~/.claude/hooks/check-bash.sh" }
        ]
      }
    ]
  }
}
```

- `matcher` 是工具名稱（PreToolUse/PostToolUse 才用）
- `hooks` 是一組 command，依序執行
- `type: "command"` 表示這是 shell command

### Hook 的輸入與輸出

每個 hook command 透過 stdin 收到 JSON，描述當前事件：

```json
{
  "session_id": "...",
  "hook_event_name": "PreToolUse",
  "tool_name": "Bash",
  "tool_input": { "command": "rm -rf /" }
}
```

Hook 透過兩條通道回應：

- **退出碼 0**：放行
- **退出碼 2**：阻擋（會把 stderr 內容餵回 LLM 當錯誤）
- **stdout JSON**：可進階控制（修改參數、注入訊息）

進階使用者最常用 `PreToolUse + 退出碼 2` 來阻擋指令模式，用 `UserPromptSubmit + stdout` 注入上下文。

---

← 章節首篇 | → [PreToolUse / PostToolUse 攔截實戰](pre-post-tool-use.md)
