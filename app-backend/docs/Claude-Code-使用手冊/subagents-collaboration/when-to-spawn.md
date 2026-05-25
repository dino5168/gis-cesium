# 何時該開新 agent，何時不該

> 開新 agent 換得隔離的 context，但付雙倍冷啟動成本。

## 內容

Subagent 看起來「越多越好」——平行、隔離、各司其職。實際上每 spawn 一個 subagent 就是一次「冷啟動」：它要重新讀檔、重新理解需求、重新建立工作上下文。誤判時機會讓你的 token 帳單翻三倍而生產力沒提升。

### 該 spawn 的三種情境

1. **保護主 context window**：研究類任務（在 50 個檔案裡找某個 pattern）會餵回大量內容，丟給 Explore agent 用「報告 < 300 字」回來，主 session 不被噪音淹沒
2. **真正獨立的平行工作**：你要同時做「分析前端 bundle」+「重寫後端 migration」，兩條路無依賴——這時平行 spawn 兩個 agent 是淨贏
3. **取得第二意見**：code-reviewer agent 跑時看不到主 session 的推理，能給「未被你的想法污染」的判斷

### 不該 spawn 的情境

1. **任務已經目標明確**：你知道要改哪個檔的哪幾行——直接 Edit，不要繞 subagent
2. **單一查詢**：「這個函式定義在哪」用 Grep 一次搞定，不需 Explore agent
3. **連續多步、後步依賴前步結果**：序列依賴的工作主 agent 自己做更順——subagent 拿不到主 session 的中途狀態
4. **使用者沒明說要的「徹底分析」**：「全面檢查」「多角度」這類修飾語不等於要 spawn agent；先用內建工具，撐不住再升級

### 決策捷徑

問自己三個問題：

1. 這個工作有可能塞爆主 context 嗎？（會 → spawn）
2. 這個工作可以跟另一件事真正同步進行嗎？（會 → 平行 spawn）
3. 我需要「不知道我推理過什麼」的獨立判斷嗎？（要 → spawn reviewer agent）

三題都「否」，就用主 agent 內建工具完成，省下冷啟動成本。

### Spawn 成本不只是 token

每個 subagent：

- 冷啟動延遲（讀設定、解析 prompt、第一次 tool call）
- token 重複（描述任務的 prompt 要重發一次）
- 認知成本（你要為 subagent 寫好 self-contained prompt，比直接做還累）

如果工作 5 分鐘內可自己做完，spawn agent 反而拖慢進度。

---

← [Subagent 設定檔結構](config-structure.md) | → [工具範圍與 isolation 模式](tools-and-isolation.md)
