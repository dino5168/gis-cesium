# MCP 架構與傳輸方式

> MCP 是一套讓 LLM 通用呼叫外部工具的協議與三種傳輸。

## 內容

MCP（Model Context Protocol）是 Anthropic 推的開放協議，目標解決一個本來很雜亂的問題：每家 LLM 客戶端都要自己接 GitHub、檔案系統、資料庫，沒有共通標準。MCP 把「外部工具」抽象成 server，client（Claude Code、IDE、其他 LLM 應用）統一呼叫。

對進階使用者來說，MCP 的價值在三點：

1. **生態廣**：社群有大量現成 server 可即裝即用
2. **自己寫快**：協議簡單，半天能寫一個給自己 API 的 server
3. **跨 client**：同一個 server 在 Claude Code 與其他支援 MCP 的工具都能用

### 核心概念

- **Server**：提供工具（tools）、資源（resources）、提示（prompts）的外部行程
- **Client**：呼叫者，例如 Claude Code
- **Transport**：client/server 之間怎麼溝通——三種主流方式

工具名稱在 Claude Code 端會被命名為 `mcp__<server-name>__<tool-name>`，例如 `mcp__github__create_issue`。

### stdio 傳輸

最簡單也最常用。client 啟動一個子行程（local executable），透過該行程的 stdin/stdout 來回傳 JSON-RPC 訊息。

**特性**：

- 本機跑、權限隨 client 行程
- 啟動瞬間連上、不需網路
- 適合本地工具（操作檔案、git、本地 DB）

**典型設定**（在 settings.json）：

```json
{
  "mcpServers": {
    "filesystem": {
      "type": "stdio",
      "command": "npx",
      "args": ["-y", "@modelcontextprotocol/server-filesystem", "/Users/me/project"]
    }
  }
}
```

### http / sse 傳輸

當 server 不在本機（公司內 API、SaaS 端點），改用 HTTP-based transport：

- **streamable HTTP**（較新）：請求/回應走 HTTP，server 可串流多筆訊息
- **SSE**（Server-Sent Events，較舊）：類似但用 EventSource 規格

**特性**：

- 跨機器、跨服務
- 通常需要 auth header / OAuth
- 啟動稍慢（網路 handshake）

**典型設定**：

```json
{
  "mcpServers": {
    "company-tools": {
      "type": "http",
      "url": "https://mcp.company.com/v1",
      "headers": { "Authorization": "Bearer ${COMPANY_TOKEN}" }
    }
  }
}
```

### 選擇傳輸的判斷

| 條件 | 選 stdio | 選 http/sse |
|------|----------|-------------|
| Server 在本機 | ✓ |  |
| Server 在遠端 |  | ✓ |
| 需要團隊共用 server 實例 |  | ✓ |
| 開發中、頻繁改 server 代碼 | ✓ |  |
| 需 OAuth/多人認證 |  | ✓ |

---

### stdio 傳輸

上方「stdio 傳輸」段落已詳細說明。重點是 client 啟動子行程，stdin/stdout 走 JSON-RPC，適合本機本地工具。

### http / sse 傳輸

上方段落已說明遠端伺服器的設定方式。值得補充的：HTTP 與 SSE 在新 SDK 中由 streamable HTTP 統一，新建 server 直接用 streamable HTTP，舊 SSE 端點僅做相容性保留。

---

← 章節首篇 | → [設定與信任 MCP server](server-setup.md)
