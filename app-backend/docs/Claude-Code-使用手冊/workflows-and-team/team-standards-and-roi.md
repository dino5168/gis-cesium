# 團隊規範、共享設定與量測 ROI

> 團隊規範靠版控、共享設定靠 plugin、量測 ROI 靠 log 統計。

## 內容

當 Claude Code 從「個人加速器」變成「團隊基礎設施」，三件事浮上檯面：規範要怎麼推、設定要怎麼共享、效益要怎麼證明。這節是整本指南的收尾——把前面學到的東西組裝成「團隊規模可運作」的形態。

### 團隊規範要寫進版控

把這些檔案入版控，讓 Claude Code 在每位團隊成員的開發機上行為一致：

- `<repo>/CLAUDE.md`：技術規範、do/don't
- `<repo>/.claude/settings.json`：團隊共識的權限、hook、MCP server
- `<repo>/.claude/commands/*.md`：團隊共用的 slash command
- `<repo>/.claude/agents/*.md`：團隊共用的 subagent

新人 clone repo 後，這些自動生效——不必教學文件、不必口頭傳承。

### Plugin 是共享設定的單位

當共享設定跨多個 repo（例如公司所有後端服務都該有同一套 hook + command），抽成 plugin 比複製貼上強：

```bash
claude plugin install github:my-org/claude-backend-standards
```

plugin 內可帶 commands、agents、hooks、skills、MCP server 設定。一處更新，所有使用者下次拉到新版本。

設計 plugin 的三個守則：

1. **語意化版本**：規範改動就升 major，否則使用者升級會懵
2. **可關閉**：每個 hook/command 都該有「停用」開關，不該假設所有專案都吃得下
3. **文件**：plugin README 必寫「裝這個會自動發生什麼事」

### 量測 ROI：從感覺到資料

「Claude Code 真的有幫助嗎」是團隊主管會問的，光憑感覺說不過。三種可量化指標：

**1. 直接時間**

- 每位工程師每週用 Claude Code 多少 session、多少分鐘
- 平均一個 PR 從開到合的時間（裝 Claude Code 前後對比）

**2. 品質指標**

- 自動 review 抓到的 bug / 後續 review 才找到的 bug 比例
- 由 Claude 產生的 commit 在 production 出問題的頻率（相對於人工）

**3. 成本對照**

- 每月 API 花費 / 每月節省的工程師小時 × 平均薪資
- 用 hook 在 Stop 事件 log 每次 session 的 token 用量，匯總到團隊 dashboard

### 推廣節奏

新團隊導入 Claude Code 的常見節奏：

1. **試點（1–2 週）**：兩三個志願者各自用、分享心得
2. **規範化（2–4 週）**：把試點期間驗證好的 hook/command 寫進 project settings 入版控
3. **plugin 化（1–2 月）**：跨團隊共通部分抽 plugin
4. **量測（持續）**：監控成本與品質，定期回顧調整

不要一開始就強推全套——團隊成員對工具的信任要慢慢建立。先讓「能擋下 force push」「能自動 review PR」這類好處顯現，再談更深的整合。

### 收尾

從這六章走下來，你應該已經能：

- 用 settings 三層精細控制 Claude Code 的行為與權限
- 用 slash command / skill 把高頻任務一鍵化
- 用 hook 讓自動行為烙進工作流而非靠 LLM 記
- 用 subagent 把大任務拆給隔離的 worker
- 用 MCP 連接外部工具與內部 API
- 用 CI/CD 整合與 plugin 把這一切擴展到團隊

Claude Code 的進階使用本質上不是「更會 prompt」，而是「更會設計人機協作的邊界」——你掌握的不是 LLM，而是 LLM 與你既有工作流之間的介面。

---

← [headless mode 與 CI/CD 應用](headless-and-cicd.md) | 章節末篇
