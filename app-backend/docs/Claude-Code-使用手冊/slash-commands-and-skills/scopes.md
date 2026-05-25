# 全域 / 專案 / plugin 三種作用域

> 三種作用域決定一個 command 是個人、團隊還是套件等級的能力。

## 內容

同一個 command 可以放在三個位置，差別不只是「對誰可見」，還包括版本控制、權限、覆寫優先序。理解這三層是設計 command 庫的基本功。

### 三個位置

| 作用域 | 路徑 | 對誰生效 | 入版控？ |
|--------|------|----------|----------|
| User（全域） | `~/.claude/commands/<name>.md` | 你個人所有專案 | 否 |
| Project | `<repo>/.claude/commands/<name>.md` | 此 repo 所有貢獻者 | 是 |
| Plugin | `<plugin>/commands/<name>.md` | 安裝該 plugin 的人 | 由 plugin 倉庫管 |

### 覆寫順序

當同名 command 出現在多層時，**較窄的作用域勝出**：

```
plugin < user < project
```

所以你可以在 user settings 寫一個通用 `/test`，在某個專案用 project 的 `/test` 覆寫它（比方說該專案測試需要先起 docker）。

### 設計建議：用作用域表達「誰擁有這個動作」

- **User commands**：你個人的偏好、寫法、跨專案通用工具
  - `/commit-conventional`、`/lint-fix-all`
- **Project commands**：團隊規範、與此專案綁定的操作
  - `/deploy-staging`、`/migrate-db`、`/seed`
- **Plugin commands**：可發佈、給社群使用的工具集
  - `/security-audit`（屬於某個 security plugin）

### 何時把 user command 升級到 project

決策點：「其他人也應該用同一個版本嗎？」

- 如果是——升到 project，入版控
- 如果只有你會用——留在 user
- 如果完全通用、應該開源——抽成 plugin

進階開發者常見的「升級節奏」：

1. 寫第一版在 user
2. 在某專案調整後發現「這個團隊都該用」→ 複製到 project
3. 在第三個專案還是想用 → 抽成 plugin 發佈

不要為了「以後可能會 share」直接寫成 plugin。維護 plugin 的成本（版本、發佈、文件）會壓死還沒成熟的點子。

---

← [args 與 frontmatter 進階技巧](args-and-frontmatter.md) | 章節末篇
