# AI 教材生成器實作規劃

## 目標

以 AI（gemma4:e2b via Ollama）自動生成教材：
1. 使用者輸入主題 → AI 產生 `chapters.json`（章節目錄）
2. 依 `chapters.json` → AI 逐章產生 markdown 文件

輸出格式與現有 `Claude-Code-使用手冊` 完全相容，可直接被 DocPage 瀏覽。

---

## 架構總覽

```
使用者輸入主題
     │
     ▼
[Planner] ── AI prompt ──► chapters.json
     │
     ▼
[Generator] ── AI prompt ──► markdown content × N chapters
     │
     ▼
[Writer] ──► docs/{book_slug}/
              ├── chapters.json
              └── {chapter_slug}/
                  ├── README.md
                  ├── {page1}.md
                  └── {page2}.md
```

---

## Backend 模組

### 1. `app/textbook/schemas.py`

資料契約，所有模組共用：

```python
class PlanRequest(BaseModel):
    topic: str                      # 教材主題（例：國中英語文法）
    grade: str = "國中"            # 適用年級
    language: str = "zh-TW"        # 輸出語言
    num_chapters: int = 6           # 章節數量
    pages_per_chapter: int = 3      # 每章子頁數量

class ChapterMeta(BaseModel):
    id: int
    title: str
    slug: str                       # 英文小寫，用於目錄命名
    description: str

class ChaptersJson(BaseModel):
    chapters: list[ChapterMeta]

class GenerateRequest(BaseModel):
    book_slug: str                  # 書本目錄名稱
    plan: ChaptersJson
    pages_per_chapter: int = 3

class GenerateResult(BaseModel):
    book_slug: str
    files_written: list[str]        # 相對路徑清單

class RunRequest(BaseModel):        # 一次執行完整 pipeline
    topic: str
    grade: str = "國中"
    language: str = "zh-TW"
    num_chapters: int = 6
    pages_per_chapter: int = 3
```

---

### 2. `app/textbook/planner.py`

**責任**：主題 → chapters.json（純 AI 呼叫 + JSON 解析）

```
input : PlanRequest
output: ChaptersJson

流程：
  1. 組建 system prompt（要求輸出嚴格 JSON）
  2. 呼叫 ollama_svc.chat()
  3. 從回應中提取 JSON（regex 擷取 ```json ... ``` 區塊，或直接 json.loads）
  4. validate → ChaptersJson
  5. 依 topic 產生 book_slug（slugify: 移除非 ASCII + 空白轉 -）
  6. 回傳 (book_slug, ChaptersJson)

錯誤處理：
  - JSON 解析失敗 → 重試最多 2 次（不同 temperature）
  - 仍失敗 → 拋出 TextbookPlanError
```

**Prompt 策略**：
```
你是教材設計專家。請為「{topic}」（{grade}學生）規劃 {num_chapters} 個章節。
必須以下列 JSON 格式回答，不得包含其他文字：
{
  "chapters": [
    {"id": 1, "title": "...", "slug": "kebab-case-english", "description": "..."}
  ]
}
```

---

### 3. `app/textbook/generator.py`

**責任**：單一章節 → markdown 文件清單（純 AI 呼叫 + 文字整理）

```
input : ChapterMeta, pages_per_chapter: int, language: str
output: dict[filename: str, content: str]
        {"README.md": "...", "page1-slug.md": "...", ...}

流程（每章執行一次）：
  1. [AI call 1] 生成 README.md
     - Prompt：章節總覽、子頁目錄（必須列出 pages_per_chapter 個子頁標題 + slug）
     - Parse 出子頁清單
  2. [AI call 2..N] 逐頁生成內容
     - Prompt：子頁標題 + 上下文（章節 description）→ 完整 markdown 內容
  3. 回傳 filename→content dict
```

**README.md Prompt**：
```
章節標題：{chapter.title}
說明：{chapter.description}

請生成本章的 README.md，包含：
1. H1 標題（= 章節標題）
2. 一段摘要介紹
3. 子頁目錄（{pages_per_chapter} 個項目），格式：
   ## 本章節目
   - [{子頁標題}]({slug}.md)
請同時在回答末尾附上子頁清單（JSON）：
{"pages": [{"title": "...", "slug": "..."}]}
```

---

### 4. `app/textbook/writer.py`

**責任**：純檔案 I/O，不含 AI 邏輯

```
函數：
  write_book(
    docs_root: Path,
    book_slug: str,
    plan: ChaptersJson,
    chapters_content: dict[chapter_slug: str, dict[filename: str, content: str]]
  ) -> list[str]  # 寫入的相對路徑清單

流程：
  1. mkdir docs_root / book_slug（exist_ok=True）
  2. 寫 chapters.json
  3. 對每章：
     mkdir book_slug / chapter.slug
     寫入各 .md 檔案（asyncio.to_thread 包裝）
  4. 回傳所有相對路徑
```

---

### 5. `app/textbook/orchestrator.py`

**責任**：協調 planner → generator → writer，不含任何 AI 或 I/O 細節

```python
async def run_pipeline(req: RunRequest, docs_root: Path) -> GenerateResult:
    # 1. Plan
    book_slug, plan = await planner.generate_plan(req)

    # 2. Generate（可並行，但 gemma4:e2b 單執行，保守用 sequential）
    chapters_content = {}
    for chapter in plan.chapters:
        pages = await generator.generate_chapter(chapter, req.pages_per_chapter, req.language)
        chapters_content[chapter.slug] = pages

    # 3. Write
    files = await writer.write_book(docs_root, book_slug, plan, chapters_content)

    return GenerateResult(book_slug=book_slug, files_written=files)
```

---

### 6. `app/routers/textbook.py`

```
POST /textbook/plan
  Body: PlanRequest
  Response: { book_slug: str, plan: ChaptersJson }
  → 只規劃，不寫檔，讓使用者確認

POST /textbook/generate
  Body: GenerateRequest
  Response: GenerateResult
  → 依已有 plan 寫入檔案

POST /textbook/run
  Body: RunRequest
  Response: GenerateResult (SSE streaming 進度)
  → 完整 pipeline，每章完成後 emit 一個 SSE event
```

**SSE 進度格式**：
```json
{"event": "chapter_done", "chapter": "settings-and-permissions", "files": ["README.md", "page1.md"]}
{"event": "done", "book_slug": "junior-english-grammar", "total_files": 18}
```

---

## Frontend 模組

### 7. `pages/TextbookPage.tsx`

**三個階段 UI**：

```
[IDLE]
  Form：主題輸入、年級選擇、章節數、每章子頁數
  → 送出後進入 PLANNING

[PLANNING]
  Loading spinner
  → AI 回傳 chapters.json 後進入 REVIEW

[REVIEW]
  顯示 chapters.json 樹狀預覽（章節清單）
  按鈕：「開始生成」→ 進入 GENERATING

[GENERATING]
  SSE 進度條：每章完成打勾
  完成後顯示：「查看教材」按鈕（切換到 DocPage）
```

### 8. `lib/api.ts` 新增函數

```typescript
planTextbook(req: PlanRequest): Promise<PlanResponse>
generateTextbook(req: GenerateRequest): Promise<GenerateResult>
runTextbookStream(req: RunRequest): AsyncGenerator<TextbookEvent>
```

### 9. `nav-config.ts` 新增

```typescript
{ key: "textbook", label: "nav.textbook", icon: BookMarked }
```

---

## 目錄結構（新增檔案）

```
app-backend/src/app/
├── textbook/
│   ├── __init__.py
│   ├── schemas.py
│   ├── planner.py
│   ├── generator.py
│   ├── writer.py
│   └── orchestrator.py
└── routers/
    └── textbook.py

app-front/src/
├── pages/
│   └── TextbookPage.tsx
└── lib/
    └── api.ts          (新增 textbook 函數)
```

---

## 模組依賴圖

```
textbook.router
    └─► orchestrator
            ├─► planner    ──► ollama_svc (chat)
            ├─► generator  ──► ollama_svc (chat)
            └─► writer     ──► asyncio.to_thread (file I/O)

schemas  ◄──── 被所有模組使用（無依賴）
```

> **規則**：schemas ← 無依賴；writer ← 無 AI 依賴；planner/generator ← 只依賴 ollama_svc；orchestrator ← 只依賴三個子模組；router ← 只依賴 orchestrator + schemas。

---

## 錯誤策略

| 層級 | 錯誤 | 處理 |
|------|------|------|
| planner | JSON 解析失敗 | 重試 2 次（提示 AI 修正格式） |
| generator | 內容為空 | 重試 1 次，仍空則用 description 作為 fallback |
| generator | 子頁清單 JSON 解析失敗 | fallback：自動命名 `page-1.md` ~ `page-N.md`，不重試（穩定降級） |
| writer | 磁碟錯誤 | 拋出 500，部分寫入的資料夾保留（冪等重試安全） |
| router | 逾時 | SSE 連線中斷，前端顯示已完成章節 |

---

## 實作順序

```
Phase 1（後端核心）
  schemas.py → planner.py → generator.py → writer.py → orchestrator.py → router

Phase 2（API 整合）
  main.py 註冊 router → 手動 curl 測試 /textbook/plan

Phase 3（前端）
  api.ts → TextbookPage.tsx（IDLE+PLANNING+REVIEW 三態）→ GENERATING+SSE

Phase 4（整合測試）
  端對端：輸入主題 → 確認 chapters.json → 生成 → DocPage 瀏覽
```
