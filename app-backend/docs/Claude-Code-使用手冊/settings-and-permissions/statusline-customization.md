# statusLine 與終端體驗客製

> statusLine 把終端底部變成你的即時工作儀表板。

## 內容

`statusLine` 是 settings.json 裡常被忽略卻價值很高的欄位。它讓 Claude Code 在每次回應後渲染一行自訂訊息——可以是 git 狀態、token 用量、目前 model，或任何 shell 能輸出的資訊。

### 基本格式

```json
{
  "statusLine": {
    "type": "command",
    "command": "echo \"$(git branch --show-current 2>/dev/null) | $CLAUDE_MODEL\""
  }
}
```

執行端會把這個 shell command 跑起來，stdout 就是你看到的那行訊息。

Claude Code 會注入幾個可用的環境變數給你的 command：

- `CLAUDE_MODEL` — 當前模型 ID
- `CLAUDE_SESSION_ID` — 當前 session
- `CLAUDE_CWD` — 工作目錄

### 三個高 ROI 的 statusLine 用法

1. **即時看到當前 model**：避免「我以為在 opus，其實在 haiku」的小事故

   ```bash
   echo "🤖 $CLAUDE_MODEL"
   ```

2. **顯示 git 上下文**：分支 + 是否 dirty，比手動 `git status` 順得多

   ```bash
   echo "$(git branch --show-current) $(git status --porcelain | wc -l) changes"
   ```

3. **追蹤 token / 成本**：搭配自製腳本讀取 session log，渲染本次 session 已用 token

   ```bash
   echo "$(my-token-counter $CLAUDE_SESSION_ID) tokens"
   ```

### 設定時的兩個小坑

- **command 必須跑得快**：每次 Claude 回應後都會執行，超過 100ms 就會明顯感覺卡頓。把昂貴查詢丟進背景 daemon、statusLine 只讀快取
- **輸出單行**：多行 stdout 會被截斷，視覺亂掉；用 `tr -d '\n'` 或 `head -1` 保險
- **跨平台留意**：team settings 若入版控，Windows 同事跑不了 bash 指令。改用更通用的 PowerShell 寫法或乾脆放 user settings

statusLine 的設計哲學是「少即是多」——終端寬度有限，留下最常看一眼的資訊即可。

---

← [環境變數與模型切換策略](env-and-model.md) | 章節末篇
