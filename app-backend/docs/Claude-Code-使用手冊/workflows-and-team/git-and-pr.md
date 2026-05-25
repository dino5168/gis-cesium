# 整合 git workflow 與 PR review

> 把 Claude Code 插進 git 流程，PR review 與 commit 都能自動化。

## 內容

Claude Code 不是 git 客戶端，但它能跑 `git` 與 `gh`——這代表整個 git 流程都能變成「一句話完成」。重點在於設計幾個固定 slash command + hook，把高頻動作壓成單一觸發。

### 高 ROI 的 slash command 組合

**`/commit`**：分析 staged diff，產出符合團隊規範的 commit message，並執行 commit

```markdown
---
description: Commit staged changes with a conventional commit message
allowed-tools: Bash(git diff*), Bash(git log*), Bash(git commit*), Bash(git status*)
---

1. Run `git diff --staged` to see what's changing
2. Run `git log -5 --format="%s"` to see recent style
3. Draft a conventional commit message (under 72 chars subject)
4. Run `git commit -m "..."`
5. Report the resulting commit hash
```

**`/review`**：對當前分支跑「自我 review」，找出送 PR 前該修的問題

**`/pr`**：產出 PR 標題與 body，調用 `gh pr create`

### Hook 強制規範

```json
{
  "hooks": {
    "PreToolUse": [
      {
        "matcher": "Bash",
        "hooks": [
          { "type": "command", "command": "~/.claude/hooks/block-force-push.sh" }
        ]
      }
    ]
  }
}
```

`block-force-push.sh`：

```bash
#!/usr/bin/env bash
INPUT=$(cat)
CMD=$(echo "$INPUT" | jq -r '.tool_input.command')

if [[ "$CMD" == *"push --force"* || "$CMD" == *"push -f "* ]]; then
  echo "Force push blocked by policy. Use --force-with-lease and explicit confirmation." >&2
  exit 2
fi
exit 0
```

從此你不用每次擔心 LLM 一句 `git push -f` 把分支搞砸——hook 在 harness 層級擋下。

### PR review 工作流

Claude Code 內建 `/review` skill 與 `code-review` skill。實務組合：

1. **本地寫完功能**：跑 `/review` 自我審視
2. **送出 PR**：跑 `/pr` 自動產描述
3. **被 review 後**：把 review 留言貼給 Claude，請它逐條回應或修改
4. **合併前**：跑 `/security-review` 做最後一次安全檢查

### 與 git hook 的關係

別把 Claude Code 的 hook 跟 git 自己的 pre-commit hook 搞混：

- **Claude Code hook**：harness 層級，在 Claude 啟動工具呼叫時觸發
- **git hook**：git 層級，無論誰跑 git 都觸發（包括你手動）

兩者最好都有：Claude Code hook 擋下 LLM 的危險動作；git hook 擋下你自己手滑的危險動作。

### 一條建議

不要讓 Claude Code 直接決定 force push、刪 branch、改 protected branch 這類高風險動作。即使你信任它，hook 該擋還是擋——這層守護的成本極低，但避免的事故可能是工作日的下午全毀。

---

← [CLAUDE.md 設計：個人 vs 專案 vs 共享](claude-md-design.md) | → [headless mode 與 CI/CD 應用](headless-and-cicd.md)
