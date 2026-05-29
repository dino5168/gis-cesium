# gemma4:e2b 模型能力說明

## 基本規格

| 項目 | 值 |
|------|-----|
| 架構 | Gemma 4 (Google) |
| 實際參數量 | 5.1B |
| Context 長度 | **131,072 tokens**（128K） |
| Embedding 長度 | 1,536 |
| 量化格式 | Q4_K_M（4-bit，記憶體效率最佳化） |
| 磁碟大小 | 7.2 GB |
| 最低 Ollama 版本 | 0.20.0 |
| 授權 | Apache 2.0 |

---

## 五大核心能力

```
ollama show gemma4:e2b → Capabilities
  ✓ completion   文字生成與對話
  ✓ vision       圖像理解
  ✓ audio        音訊理解
  ✓ tools        Function Call（工具呼叫）
  ✓ thinking     推理鏈（Chain-of-Thought）
```

### 1. Completion — 文字生成
標準指令跟隨與多輪對話，支援繁體中文、英文等多語言。
128K context 使其可處理超長文件（約 10 萬中文字）。

### 2. Vision — 圖像理解
可接受 Base64 或 URL 格式圖片，回答圖像內容相關問題、
辨識圖表、解讀截圖、地圖分析（GIS 場景）。

### 3. Audio — 音訊理解
可處理音訊輸入，進行語音轉錄或語音問答（需 Ollama 0.20+）。

### 4. Tools — Function Call（工具呼叫）
**模型原生支援**。可以：
- 解析使用者意圖並決定呼叫哪個工具
- 生成符合 JSON Schema 的參數
- 在多輪對話中整合工具執行結果

### 5. Thinking — 推理鏈
在回答前進行內部推理步驟（`<think>...</think>`），
提升複雜問題的準確性。

---

## Function Call 可行性評估

**結論：完全可行。** `tools` 明確列在模型能力中。

### 運作流程

```
使用者輸入
    │
    ▼
模型分析意圖
    │
    ├─ 不需要工具 → 直接回覆
    │
    └─ 需要工具 → 回傳 tool_calls
                      │
                      ▼
              應用程式執行函式
                      │
                      ▼
              將結果送回模型
                      │
                      ▼
              模型整合結果並回覆
```

### Ollama API 呼叫格式

```python
response = await client.chat(
    model="gemma4:e2b",
    messages=[{"role": "user", "content": "台北現在幾度？"}],
    tools=[
        {
            "type": "function",
            "function": {
                "name": "get_weather",
                "description": "取得指定城市的即時天氣",
                "parameters": {
                    "type": "object",
                    "properties": {
                        "city": {
                            "type": "string",
                            "description": "城市名稱，例如：台北、高雄",
                        },
                    },
                    "required": ["city"],
                },
            },
        }
    ],
)

# 解析工具呼叫
if response.message.tool_calls:
    for call in response.message.tool_calls:
        fn_name = call.function.name        # "get_weather"
        fn_args = call.function.arguments  # {"city": "台北"}
        result = execute(fn_name, fn_args)  # 實際執行函式
```

---

## 在現有架構中實作 Function Call

現有後端路徑：`app-backend/src/app/`

### 步驟 1：在 `services/ollama.py` 新增工具呼叫函式

```python
from ollama import AsyncClient, Message, Tool
from app.config import settings

async def chat_with_tools(
    messages: list[Message],
    tools: list[Tool],
    model: str = settings.default_model,
) -> ollama.ChatResponse:
    """Single-turn chat with tool definitions."""
    client = AsyncClient(host=settings.ollama_host)
    return await client.chat(
        model=model,
        messages=messages,
        tools=tools,
    )
```

### 步驟 2：在 `routers/` 新增工具路由

```python
# routers/tools.py
from fastapi import APIRouter
from pydantic import BaseModel

router = APIRouter(prefix="/chat/tools", tags=["tools"])

class ToolDef(BaseModel):
    name: str
    description: str
    parameters: dict

class ToolChatRequest(BaseModel):
    messages: list[MessageIn]
    tools: list[ToolDef]
    model: str = settings.default_model

@router.post("")
async def chat_with_tools(body: ToolChatRequest):
    # 1. 送給模型
    # 2. 解析 tool_calls
    # 3. 執行本地函式
    # 4. 回傳整合結果
    ...
```

### 步驟 3：在 `main.py` 註冊

```python
from app.routers import chat, docs, tools
app.include_router(tools.router)
```

---

## 適合的 GIS 場景 Function Call

| 工具名稱 | 功能 | 輸入參數 |
|---------|------|---------|
| `query_spatial` | 空間查詢（範圍、相交） | `geom`, `layer`, `epsg` |
| `geocode` | 地址轉坐標 | `address` |
| `get_layer_info` | 取得圖層屬性 | `layer_name` |
| `buffer_analysis` | 緩衝區分析 | `point`, `radius_m` |
| `export_report` | 輸出分析報告 | `format`, `area_name` |

---

## 注意事項

1. **Thinking 模式開銷**：`thinking` 能力預設可能開啟，若追求速度可設 `"thinking": false`
2. **Tool 參數驗證**：模型回傳的 `arguments` 仍需在應用層做型別驗證，不可直接 `eval`
3. **多步工具鏈**：複雜任務需要多輪 tool_calls 時，要實作迴圈直到 `tool_calls` 為空
4. **Vision + Tools**：可同時傳圖片和工具定義，讓模型根據圖像內容決定呼叫哪個工具
5. **Context 充裕**：128K tokens 可容納大量對話歷史與工具結果，不需要早期截斷
