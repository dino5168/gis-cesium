# PreToolUse / PostToolUse 攔截實戰

> PreToolUse 攔工具呼叫；PostToolUse 在結果回傳前後處理。

## 內容

PreToolUse 與 PostToolUse 是日常最常用的兩個 hook，幾乎所有「我希望 Claude 在做 X 時自動做 Y」的需求都靠它們實現。差別只在「介入時機」：

- `PreToolUse`：LLM 已決定要呼叫工具，但尚未執行
- `PostToolUse`：工具已執行完，結果還沒餵回 LLM

### 共通結構

兩者都用 `matcher` 來選定工具：

```json
{
  "hooks": {
    "PreToolUse": [
      { "matcher": "Bash", "hooks": [{ "type": "command", "command": "..." }] },
      { "matcher": "Write|Edit", "hooks": [{ "type": "command", "command": "..." }] }
    ]
  }
}
```

`matcher` 支援多工具用 `|` 分隔；空字串或省略則對所有工具觸發。

### 阻擋危險指令

PreToolUse + 退出碼 2 是最直接的「最後一道防線」。範例：阻擋任何試圖在 `~/` 寫入 `.env*`：

```bash
#!/usr/bin/env bash
INPUT=$(cat)
PATH_ARG=$(echo "$INPUT" | jq -r '.tool_input.file_path')

if [[ "$PATH_ARG" == "$HOME/"* && "$(basename "$PATH_ARG")" == .env* ]]; then
  echo "Refused: writing .env files into HOME is blocked." >&2
  exit 2
fi
exit 0
```

設定：

```json
{
  "hooks": {
    "PreToolUse": [
      { "matcher": "Write|Edit", "hooks": [{ "type": "command", "command": "~/.claude/hooks/block-env.sh" }] }
    ]
  }
}
```

退出碼 2 會讓 Claude Code 取消這次工具呼叫，並把 stderr 內容餵回 LLM，LLM 會理解「這條路不通」並換策略。

### 注入額外上下文

PostToolUse 沒有「擋下結果」的概念，但可以「在結果回給 LLM 前附加資訊」。範例：每次 `Read` 一個檔案後，自動附上 git blame 摘要：

```bash
#!/usr/bin/env bash
INPUT=$(cat)
PATH_ARG=$(echo "$INPUT" | jq -r '.tool_input.file_path')

if [[ -f "$PATH_ARG" ]]; then
  BLAME=$(git log -1 --format="%an, %ar: %s" -- "$PATH_ARG" 2>/dev/null)
  jq -n --arg msg "Last commit: $BLAME" '{ "additionalContext": $msg }'
fi
```

stdout 輸出 `{"additionalContext": "..."}` 會被 Claude Code 接住，附加到工具結果裡。LLM 看到 Read 結果時就會多一行 git blame，作出更有依據的判斷。

### 設計時的取捨

- **PreToolUse 適合**：阻擋、改寫參數、log 即將執行的動作
- **PostToolUse 適合**：補充上下文、自動觸發後續行為（例如測試後自動跑 lint）
- **效能**：每個 hook 都會延遲對應的工具呼叫；保持 < 200ms

---

### 阻擋危險指令

上方「阻擋危險指令」段落已示範核心模式：用退出碼 2 + stderr 訊息回給 LLM。實務上會把這類規則集中在一個 `policy.sh`，讓 deny 規則一處管理。

### 注入額外上下文

上方「注入額外上下文」段落展示了 stdout JSON 的 `additionalContext` 用法。也可用 `{"decision": "block", "reason": "..."}` 等更結構化的回應，最新 schema 以官方文件為準。

---

← [Hook 生命週期事件總覽](lifecycle-events.md) | → [UserPromptSubmit 與 SessionStart hook](prompt-and-session.md)
