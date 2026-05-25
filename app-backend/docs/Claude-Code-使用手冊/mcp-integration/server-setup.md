# 設定與信任 MCP server

> 設定 MCP server 是給 Claude Code 一份外掛工具與安全邊界。

## 內容

裝 MCP server 不是執行 `npm install` 就結束——你還要決定它跑在哪一層 settings、它能做什麼、出問題怎麼撤回。這節談的是「裝對」與「裝安全」。

### 三個層級的 server 設定

跟 settings 一樣，mcpServers 可放在三個位置：

| 層級 | 位置 | 用途 |
|------|------|------|
| User | `~/.claude/settings.json` | 個人跨專案：個人 GitHub token、個人 LLM API server |
| Project | `<repo>/.claude/settings.json` | 團隊共用：公司內 MCP、團隊 DB read-only |
| Local | `<repo>/.claude/settings.local.json` | 個人在此 repo 的實驗 server |

**critical**：帶 secret（API token、DB credential）的 server **絕對放 user 或 local**，不入版控的 project settings。

### 基本設定範例

```json
{
  "mcpServers": {
    "github": {
      "type": "stdio",
      "command": "npx",
      "args": ["-y", "@modelcontextprotocol/server-github"],
      "env": {
        "GITHUB_PERSONAL_ACCESS_TOKEN": "${GITHUB_TOKEN}"
      }
    },
    "postgres": {
      "type": "stdio",
      "command": "npx",
      "args": ["-y", "@modelcontextprotocol/server-postgres", "postgresql://readonly@localhost/mydb"]
    }
  }
}
```

`${GITHUB_TOKEN}` 會從環境變數讀取——這比直接把 token 寫進 JSON 安全得多。

### 權限與信任邊界

MCP 工具名稱是 `mcp__<server>__<tool>`，你可以用 settings 的 `permissions` 進一步控管：

```json
{
  "permissions": {
    "allow": ["mcp__filesystem__read_file"],
    "deny": ["mcp__filesystem__write_file"],
    "ask": ["mcp__github__create_issue", "mcp__postgres__execute_query"]
  }
}
```

**信任分級的實務建議**：

- **唯讀工具**：放 `allow`，反正不會破壞東西
- **寫入工具**：放 `ask`，每次都確認
- **不該動的工具**：明確 `deny`，預防誤觸

### 驗證 server 是否載入成功

裝完後在 Claude Code 內：

1. `/config` 查看 mcpServers 是否被讀到
2. 在新 session 試呼叫一個工具（例如 `mcp__filesystem__list_directory`）
3. 看 stdout / stderr log——server 啟動失敗會在這裡顯示原因

常見失敗：

- `command not found`：MCP server 的 binary 不存在（沒裝、PATH 沒設）
- 無回應：server 啟動了但沒實作 protocol handshake
- 工具沒出現：server 的 tool registration 失敗

### 撤回 server

「我裝了一個 server 結果它一直亂回答」的時候：

1. 從 settings.json 移除該 server 區塊
2. 重啟 Claude Code（mcpServers 在 session 啟動時初始化）
3. 如果是 npm-installed 工具，視需要 `npm uninstall -g`

不需要的 server 留著不關沒立即危害，但每個 server 都增加 LLM 可選工具集，理論上會稍微稀釋工具選擇的判斷力。

---

← [MCP 架構與傳輸方式](architecture.md) | → [常用 MCP server 介紹](popular-servers.md)
