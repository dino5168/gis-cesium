# 常用 MCP server 介紹

> 幾個 MCP server 解掉檔案、git、DB、瀏覽器的日常九成需求。

## 內容

MCP 生態雖然百花齊放，進階使用者實務上會固定使用一小群「日常神器」。這節介紹四類我會列為「值得花時間裝」的 server，與選擇時的判斷依據。

### filesystem

Anthropic 官方維護的檔案系統 server。比 Claude Code 內建 Read/Write/Edit 多的能力：跨多個外部目錄、批次操作、ACL 限制。

```json
{
  "mcpServers": {
    "filesystem": {
      "type": "stdio",
      "command": "npx",
      "args": [
        "-y",
        "@modelcontextprotocol/server-filesystem",
        "/Users/me/documents",
        "/Users/me/code"
      ]
    }
  }
}
```

**何時用**：當你想讓 Claude 在「不是當前 cwd 的目錄」做事（例如同時看 docs 倉庫與 code 倉庫）。

### github

最常裝的第三方 server。能 list/read issue、PR，create/comment，read repo files。

**何時用**：當 PR review、issue triage 是日常工作。比起每次寫 `gh` Bash 指令，直接 `mcp__github__create_pull_request_review` 更語意化。

**安全建議**：給它的 GITHUB_TOKEN 用 fine-grained PAT，限定到必要 repo + 必要 scope（issues:write、pull-requests:read 等）。

### postgres / sqlite

對需要常與 DB 對話的工程師超實用。LLM 拿到「query DB」工具，能回答「使用者表有幾欄」「找昨天最慢的查詢」這類問題。

```json
{
  "mcpServers": {
    "postgres-readonly": {
      "type": "stdio",
      "command": "npx",
      "args": ["-y", "@modelcontextprotocol/server-postgres",
               "postgresql://readonly_user@localhost:5432/myapp"]
    }
  }
}
```

**critical**：給 LLM 的 DB 連線一律用 **read-only role**，永遠不要把 write 權限交出去。生產資料庫絕對絕對不接。

### puppeteer / playwright（瀏覽器自動化）

讓 Claude 開瀏覽器、抓畫面、點按鈕。最有用的場景：自動驗證自己改的 UI（搭配 verify skill 一氣呵成）。

**何時用**：你正在做前端，希望 Claude 能「跑開 dev server、開瀏覽器、截圖驗證」。

### 選擇 server 的三個判斷

1. **官方 vs 社群**：能用官方就用官方，協議更新時保證跟上；社群維護者跑路風險高
2. **權限粒度**：選工具粒度細的 server（read_file vs do_anything），這樣 permissions 才好控
3. **是否需要 secret**：需要 token 的 server 多一層風險，問自己「能不能用本地 read-only 代替」

### 不建議裝的 server 類型

- 「萬能 shell exec」server：等同把整個 shell 給 LLM
- 直接連生產資料庫（即使號稱唯讀）
- 不開源、不知道在做什麼的封閉 server

---

← [設定與信任 MCP server](server-setup.md) | → [自製 MCP server 入門](build-your-own.md)
