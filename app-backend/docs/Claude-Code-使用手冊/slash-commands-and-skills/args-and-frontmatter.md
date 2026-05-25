# args 與 frontmatter 進階技巧

> args 與 frontmatter 把單檔 command 變成可帶參、有權限邊界的能力。

## 內容

寫到第 5 個 command 你會發現需要：傳參、限定可呼叫工具、引用其他檔案、條件分支。這些都是 frontmatter 與 `$ARGUMENTS` 的領域。

### Frontmatter 完整欄位

```markdown
---
description: Run vitest on changed files with optional --watch
argument-hint: [--watch] [path]
allowed-tools: Bash(pnpm vitest*), Read(./src/**)
disallowed-tools: Bash(git push*)
model: claude-haiku-4-5-20251001
---
```

| 欄位 | 用途 |
|------|------|
| `description` | 給人選的說明 |
| `argument-hint` | 在輸入框顯示的參數提示 |
| `allowed-tools` | 這個 command 執行期間額外允許的工具（與 settings allow 合併） |
| `disallowed-tools` | 強制禁止的工具，比 settings 高優先級 |
| `model` | 覆寫此 command 使用的模型（適合大量小任務用 haiku） |

### `$ARGUMENTS` 變數

body 裡的 `$ARGUMENTS` 會被替換成使用者輸入的所有參數字串。

```markdown
---
description: Refactor a function to use async/await
argument-hint: <file-path> <function-name>
---

Open `$ARGUMENTS` and refactor the named function:

1. Convert callbacks to async/await
2. Add proper error handling with try/catch
3. Update all callers in the same file
```

要區分多參數，靠 prompt 本身明示「第一個是檔案、第二個是函式名」，模型會理解。

### 引用其他檔案：`@` 語法

Command body 內用 `@<path>` 會把該檔案內容嵌入 prompt：

```markdown
---
description: Generate a PR description from CHANGELOG
---

Read @CHANGELOG.md, then produce a PR description summarising the last entry.
```

`@` 解析發生在「送出 prompt 給模型前」，所以對模型而言檔案內容已經就在訊息裡。注意：

- 路徑相對於 cwd
- 大檔案會吃掉大量 context，避免 `@node_modules/...`
- 不支援 glob

### 允許工具的「最小特權」原則

寫 command 時把 `allowed-tools` 設成「這個任務需要的最小集合」。例如 `/review` 應該只放 `Read` 跟 `Bash(git diff*)`，不該放 `Edit`、`Write`、`Bash(git push*)`。

這樣即使模型誤判，也無法做出超出 command 設計目的的破壞性動作——這是 command 安全性的核心。

---

← [Skills 與 Commands 的本質差異](skill-vs-command.md) | → [全域 / 專案 / plugin 三種作用域](scopes.md)
