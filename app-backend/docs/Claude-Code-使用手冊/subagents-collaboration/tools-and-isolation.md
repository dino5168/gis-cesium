# 工具範圍與 isolation 模式

> 工具範圍限定 agent 能用什麼；isolation 決定它在哪份 repo 動工。

## 內容

設計 subagent 時兩個維度要先講清楚：「能做什麼動作」（tools）與「在哪裡做」（isolation）。配錯了——權限太寬會破壞主分支，隔離太重會白白慢三倍。

### 工具範圍：最小特權原則

`tools` frontmatter 是白名單。沒列的工具，agent 絕對不能用。常見配方：

| Agent 類型 | 建議工具集 |
|------------|------------|
| Explore / 研究 | `Read, Grep, Glob, WebFetch` — 唯讀，不能改檔 |
| Reviewer | `Read, Grep, Bash(git diff*), Bash(git log*)` — 只看 diff，不能 commit |
| Refactor 執行者 | `Read, Edit, Write, Bash(pnpm test)` — 能改但能驗證 |
| Deploy | `Bash(kubectl*), Bash(helm*)` — 限定到特定指令 |

特殊語法 `*` 表示「所有工具」，只給徹底信任、限定使用情境的 agent。

### Isolation 模式

主 agent spawn subagent 時可選 isolation：

- **無 isolation（預設）**：subagent 在主 session 的 cwd 跑，所有檔案變更立即影響主分支
- **`worktree` isolation**：自動建立 git worktree（一個 detached 分支 + 獨立目錄），subagent 在那邊跑；完成後可看 diff 決定是否合併回主分支

### 何時用 worktree

選 worktree 當：

- subagent 會大規模改檔（refactor、批次重寫）
- 你想「先看結果再決定要不要採用」
- 平行跑多個 subagent 改同一個 repo——避免互相覆寫

不選 worktree 當：

- 唯讀任務（Explore、Reviewer）——白白建 worktree 浪費磁碟與時間
- 微小單檔改動——直接改省事
- 需要主 session 立刻看到結果繼續推進

### 設計範例

`agents/refactor-large.md`：

```markdown
---
name: refactor-large
description: Large multi-file refactor (>5 files). Use worktree isolation.
tools: Read, Edit, Write, Grep, Glob, Bash(pnpm test), Bash(pnpm typecheck)
---

You will receive a refactor task. Work in your isolated worktree:
1. Read the relevant files
2. Make changes in passes (one logical change per pass)
3. Run `pnpm typecheck && pnpm test` between passes
4. Report the final diff summary and test status
```

主 agent spawn 時帶 `isolation: "worktree"`，這個 agent 就會在獨立分支動工，完成後返回 worktree 路徑與 diff 給你裁決。

---

← [何時該開新 agent，何時不該](when-to-spawn.md) | → [平行 vs 序列 spawn 策略](parallel-vs-sequential.md)
