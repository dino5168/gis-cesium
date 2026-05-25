# CLAUDE.md 設計：個人 vs 專案 vs 共享

> CLAUDE.md 用三層階層把個人偏好、專案規範、共享規範分開。

## 內容

CLAUDE.md 是 Claude Code 每個 session 都會載入的指令檔。寫得好，它是「不必每次 prompt 都重複的常識」；寫得差，它變成被忽略的雜訊堆。進階使用者該掌握的不是「寫多少」，而是「哪些東西該寫在哪一層」。

### 三層階層

| 階層 | 路徑 | 對象 | 入版控？ |
|------|------|------|----------|
| User | `~/.claude/CLAUDE.md` | 你個人，全部專案 | 否 |
| Project | `<repo>/CLAUDE.md` | 此 repo 所有貢獻者 | 是 |
| Subdirectory | `<repo>/<sub>/CLAUDE.md` | 該子目錄內的工作 | 是 |

三層都載入，內容累加（不是覆蓋）。

### 分層放對東西

**User CLAUDE.md**：

- 你的身分（資深工程師、偏好繁中、語氣直接）
- 個人技術偏好（用 uv、pnpm、嚴禁 any）
- 個人風格規則（commit message 慣例、註解風格）

**Project CLAUDE.md**：

- 此專案的架構摘要（用什麼框架、入口在哪）
- 團隊共識的規範（test 怎麼跑、deploy 怎麼觸發）
- 此專案特有的 do/don't（這個服務不要直接連 prod DB）

**Subdirectory CLAUDE.md**：

- 該子目錄的特殊規則（`/migrations/CLAUDE.md` 寫遷移檔的命名規則）
- 局部技術選擇（前端用 React 19 RSC、別亂用 hooks）

### 寫 CLAUDE.md 的四個守則

1. **指令式、不解釋**：「函式必須有 Google 風格 docstring」優於「我們建議用 Google 風格 docstring 因為...」
2. **可驗證的規則**：「禁止 any」可被 typecheck 驗證；「寫好讀的 code」沒辦法
3. **不重複常識**：別寫「請寫好註解」這種空話；該寫「複雜邏輯加行內註解說明 *為什麼*，不說明 *做什麼*」
4. **定期清理**：當規則沒被遵守時，先檢查是不是規則寫得不清楚或過時，而不是怪 LLM

### 何時把規則從 user 升到 project

判斷：「這個規則只跟我有關，還是跟所有貢獻者都有關？」

- 跟所有人都有關 → project
- 只你個人偏好（commit 訊息語氣）→ user
- 跨團隊（公司全局）→ 抽成 plugin 或共享 settings 套件

不要把純個人風格寫進 project CLAUDE.md——團隊其他人會覺得被強加，最後乾脆忽略整份檔案。

---

← 章節首篇 | → [整合 git workflow 與 PR review](git-and-pr.md)
