# Subagent 設定檔結構

> Subagent 用 markdown 檔描述名稱、工具集、行為指令。

## 內容

Subagent 是一個 frontmatter + prompt body 的 markdown 檔——格式與 slash command 很像，但角色完全不同：slash command 是「給人用的觸發詞」，subagent 是「給主 agent spawn 出去的子 worker」。

### 檔案位置

- 個人全域：`~/.claude/agents/<name>.md`
- 專案層級：`<repo>/.claude/agents/<name>.md`

### Frontmatter 結構

```markdown
---
name: code-reviewer
description: |
  Independent review of staged diffs. Use when the user wants a
  second opinion separate from the main session's context.
tools: Read, Grep, Glob, Bash(git diff*)
model: claude-opus-4-7
---

You are an independent code reviewer. The user has just made changes
and wants a second opinion separate from the main session.

Steps:
1. Run `git diff --staged` to see what's changing
2. Identify bugs, missing tests, style issues
3. Report as a numbered list with file:line references

Be concise. Don't suggest stylistic preferences unless they affect correctness.
```

| 欄位 | 用途 |
|------|------|
| `name` | 識別字，呼叫時用這個名稱 |
| `description` | 給主 agent 判斷「何時該呼叫這個 subagent」 |
| `tools` | 允許子 agent 使用的工具白名單 |
| `model` | 子 agent 用的模型（可獨立於主 session） |

### body：是 system prompt

frontmatter 後的 markdown 是子 agent 的 system prompt。寫法跟一般 instruction prompt 一樣，但要記得：

- **子 agent 啟動時是冷的**：你看到的對話歷史它看不到，工作目錄、檔案狀態都要在 prompt 裡或 spawn 時的 task description 裡明示
- **指令導向，不要描述**：「You will receive a list of files. For each one, do X」優於「You are an agent that handles file lists」
- **明寫輸出格式**：子 agent 回傳的是「一段文字結果」，要明確告訴它怎麼結構化輸出

### 與 plugin 的關係

Plugin 可以帶自己的 agents，安裝後就出現在可用 agent 清單。設計時若考慮「我這個 agent 想分享給社群」，直接放進 plugin 的 `agents/` 目錄即可。

---

← 章節首篇 | → [何時該開新 agent，何時不該](when-to-spawn.md)
