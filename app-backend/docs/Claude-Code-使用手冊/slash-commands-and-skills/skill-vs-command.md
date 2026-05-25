# Skills 與 Commands 的本質差異

> Skill 是 LLM 自動偵測情境而觸發；Command 是使用者手動下指令。

## 內容

很多人把 Skill 跟 Slash Command 視為「兩種寫法做同一件事」，這誤解會讓你過度使用 command、錯失 skill 的能力。兩者的根本差異在「觸發者」與「資訊量」。

### 對照表

| 面向 | Slash Command | Skill |
|------|---------------|-------|
| 觸發者 | 使用者打 `/name` | LLM 判斷情境匹配自動觸發 |
| 主要欄位 | `description`, `argument-hint` | `description`（給 LLM 用的判斷依據）, `allowed-tools` |
| 適用情境 | 固定步驟、明確意圖 | 條件式、隱含意圖 |
| 資訊量 | 人記得住的少量參數 | 可附 reference 檔、scripts、範例 |
| 範例 | `/commit`、`/review` | 自動加 caching、自動跑 verify |

### 何時用 command，何時用 skill

**選 Slash Command 當**：

- 動作有明確「我現在要做這件事」的時刻（commit、review、deploy）
- 不希望模型自作主張啟動
- 流程短、不需要附帶大量範例或腳本

**選 Skill 當**：

- 動作該在「情境符合時自動啟動」（看到 import openai 就觸發 LLM 整合指南）
- 涉及多個檔案、scripts、範例需要綁在一起
- 觸發條件難用「指令名稱」描述（例如「正在改測試檔且使用某個框架時」）

### 寫 skill description 的關鍵

Skill 的 `description` 不是給人看的，是給 LLM 判斷「現在情境是否符合」的提示。寫法跟 command 不同：

```markdown
---
name: claude-api
description: |
  Build, debug, and optimize Claude API / Anthropic SDK apps.
  TRIGGER when: code imports `anthropic`/`@anthropic-ai/sdk`; user asks for
  the Claude API or Anthropic SDK; user adds/modifies Claude features.
  SKIP: file imports `openai`/other-provider SDK, provider-neutral code.
---
```

注意「TRIGGER when」與「SKIP」明寫條件，這樣 LLM 才不會在錯誤情境觸發。Command 的 description 反過來是給人選的，要簡短、動作導向：「Review staged diff for bugs」。

---

← [Slash Commands 撰寫格式](command-format.md) | → [args 與 frontmatter 進階技巧](args-and-frontmatter.md)
