# 自製 MCP server 入門

> 自製 MCP server 把你自己的 API 變成 LLM 一句話就能用的工具。

## 內容

當現成 server 不夠用——你公司有內部 API、你想讓 LLM 操作 Notion/Linear/自家平台——自製 server 是答案。MCP SDK 把通訊細節包好了，你只需聚焦「工具長什麼樣」。

### 用 Python SDK 寫一個最小 server

```bash
uv add mcp
```

```python
# my_server.py
from mcp.server.fastmcp import FastMCP

mcp = FastMCP("issue-tracker")

@mcp.tool()
def list_open_issues(assignee: str | None = None) -> list[dict]:
    """List open issues, optionally filtered by assignee.

    Args:
        assignee: Username to filter by. If None, returns all open issues.

    Returns:
        List of issue dicts with keys: id, title, assignee, created_at.
    """
    # 真實實作會打你的 API
    return [{"id": 42, "title": "Fix login bug", "assignee": "alice"}]

@mcp.tool()
def create_issue(title: str, body: str) -> dict:
    """Create a new issue.

    Args:
        title: Short issue title.
        body: Markdown body.

    Returns:
        Created issue dict with id and url.
    """
    return {"id": 99, "url": "https://issues.local/99"}

if __name__ == "__main__":
    mcp.run()
```

### 註冊到 Claude Code

```json
{
  "mcpServers": {
    "issue-tracker": {
      "type": "stdio",
      "command": "uv",
      "args": ["--directory", "/path/to/server", "run", "python", "my_server.py"]
    }
  }
}
```

重啟 Claude Code，新工具就出現為 `mcp__issue-tracker__list_open_issues` 與 `mcp__issue-tracker__create_issue`。

### 寫對 docstring，LLM 才用得對

LLM 是看 docstring 來判斷「這個工具能幹嘛、什麼時候該用」。Docstring 的兩個要點：

1. **動詞開頭、結果導向**：「List open issues...」優於「This function lists...」
2. **參數寫清楚邊界**：「If None, returns all open issues」這類條件分支寫明，LLM 才不會誤傳

### 設計工具時的三條原則

1. **小而專一**：`create_issue` 一個工具做一件事，比 `do_issue_thing(action, ...)` 容易讓 LLM 用對
2. **回傳結構化資料**：dict / list，不要回 free-form text；LLM 對 JSON 的處理穩定許多
3. **錯誤要可讀**：raise Exception 時帶清楚訊息，LLM 看到後能調整重試

### 進階：資源與提示

除了 tools，MCP 還有兩種能力：

- **resources**：可讀的「上下文資料」，例如 `issue://42` 代表某張 issue 的內容
- **prompts**：可被 client 觸發的「模板 prompt」

進階使用者初期專注做好 tools 即可，resources/prompts 等真實場景出現再加。

### 從本地走向團隊共用

server 寫到順手後，常見演進：

1. 本地 stdio，個人用
2. 抽出成 internal package，團隊各自跑本地 stdio
3. 部署成 HTTP/SSE，多人共用同一個 server 實例
4. 開源到社群，成為 plugin 一部分

每升級一步就要重新評估「auth/權限/log」的設計——MCP server 一旦多人共用，等於對 LLM 開放了內部 API。

---

← [常用 MCP server 介紹](popular-servers.md) | 章節末篇
