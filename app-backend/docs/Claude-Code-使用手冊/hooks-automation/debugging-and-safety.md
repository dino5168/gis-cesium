# Hook 偵錯、退出碼與安全紅線

> 退出碼決定 hook 放行或阻擋，安全紅線在 stdin 訊號通道。

## 內容

Hook 在沒 console 的子行程裡執行，又有 LLM 的回應路徑當訊號通道，偵錯比一般腳本複雜。掌握退出碼語義與安全紅線是讓 hook 從「會跑」進階到「跑得對且安全」的關鍵。

### 退出碼語義

| 退出碼 | 行為 |
|--------|------|
| `0` | 放行；hook 處理完畢 |
| `2` | 阻擋當前事件（適用 PreToolUse / UserPromptSubmit） |
| 其他 | 一般錯誤；Claude Code 會 log 但不阻擋 |

**critical**：別用 `exit 1` 來阻擋——那會被視為 hook 本身執行失敗，而不是「規則拒絕」。`exit 2` 才有阻擋語義。

### stdin / stdout 是訊號通道

Hook 與 Claude Code 的溝通透過：

- **stdin**：事件 JSON（hook 讀）
- **stdout**：JSON 控制指令（hook 寫，Claude Code 解析）
- **stderr**：自由文字訊息（hook 寫，被當錯誤回給 LLM）

最容易踩雷的兩件事：

1. **不要把 debug print 寫到 stdout**：你的 `echo "checking..."` 會被 Claude Code 嘗試當 JSON 解析，可能整個失效
2. **debug 一律寫 stderr**：`echo "debug: ..." >&2`，這樣不影響協議又能被 log 撈到

### 偵錯三招

1. **第一次跑前手測 stdin 輸入**：

   ```bash
   echo '{"tool_name":"Bash","tool_input":{"command":"ls"}}' | ./my-hook.sh
   echo "exit: $?"
   ```

2. **加 trace log**：

   ```bash
   exec 2>>"$HOME/.claude/hooks/debug.log"
   set -x
   ```

3. **查 Claude Code 的 hook 執行記錄**：通常在 session log 看得到 hook 觸發時間與輸出，搭配 `/config` 確認設定有被讀到

### 安全紅線

Hook 拿到的 stdin 是 LLM 可能間接影響的資料（例如 tool_input 的 command 是 LLM 寫的）。處理時：

1. **絕對不要 `eval` 或 `bash -c "$INPUT"`**：把 LLM 字串當 shell 跑等於把 prompt injection 直接提權
2. **解析 JSON 用 `jq`，不要正則**：避免邊界 case 被特製字串繞過
3. **限制 hook 的權限**：用 `chmod 700`，放在不可寫的目錄
4. **時間限制**：在 hook 開頭加 `timeout 5s` 防止無限迴圈卡住整個 Claude Code

### 常見錯誤排查

| 症狀 | 可能原因 |
|------|----------|
| hook 沒被觸發 | matcher 寫錯（工具名拼寫）、settings.json 沒生效（重新開 session） |
| 阻擋不成功 | 用了 `exit 1` 而非 `exit 2` |
| stdout 被當亂碼 | 寫了非 JSON 內容到 stdout，改成 stderr |
| 效能差 | hook 內呼叫網路 / 大量 IO；改為背景任務 + 快取 |

---

← [UserPromptSubmit 與 SessionStart hook](prompt-and-session.md) | 章節末篇
