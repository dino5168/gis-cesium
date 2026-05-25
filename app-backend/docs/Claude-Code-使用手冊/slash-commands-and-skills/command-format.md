# Slash Commands 撰寫格式

> Slash Command 是放在指定資料夾、用 frontmatter 設定的可觸發 prompt。

## 內容

進階使用者第一個該擁有的不是更厲害的 prompt 技巧，而是一份「自己的 slash command 集」。原因很簡單——你會發現 80% 的日常請求其實在重複同一句話：「review 這份 diff 找 bug」、「把這段 code 改寫成 async」、「用 vitest 補測試」。Slash command 就是把這些重複壓進一個檔案，從此 `/review`、`/asyncify`、`/test` 一鍵呼叫。

### 檔案位置

- 個人全域：`~/.claude/commands/<name>.md`
- 專案層級：`<repo>/.claude/commands/<name>.md`
- Plugin：在 plugin 的 `commands/` 目錄

檔名（去掉 `.md`）就是觸發詞。`commands/review.md` 對應 `/review`。子目錄會變成命名空間：`commands/git/cleanup.md` 對應 `/git:cleanup`。

### 基本格式

一個 command 檔本質是「frontmatter + prompt body」：

```markdown
---
description: Review the current diff for common bugs
argument-hint: [--strict]
---

You are reviewing the staged diff. Run `git diff --staged` first, then:

1. Identify obvious bugs (null deref, off-by-one, wrong async handling)
2. Flag missing tests
3. Output as a bulleted list

If `$ARGUMENTS` contains `--strict`, also flag style issues.
```

執行 `/review --strict` 時：

- frontmatter 被 Claude Code 解析（不會餵給模型）
- body 變成 user message 注入 conversation
- `$ARGUMENTS` 變數會被 `--strict` 取代

### 撰寫時的三個守則

1. **command 是 prompt，不是腳本**：別在裡面寫 shell command 期望被執行，要明寫「請執行 X」讓模型去呼叫工具
2. **每個 command 一個任務**：不要把 review + fix + commit 全塞一份。拆成 `/review`、`/fix`、`/commit-fix` 三個讓使用者組合
3. **frontmatter 的 `description` 必填**：使用者在輸入 `/` 看到的選單就是這串；模糊的 description = 沒人會用的 command

---

← 章節首篇 | → [Skills 與 Commands 的本質差異](skill-vs-command.md)
