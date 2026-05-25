# 平行 vs 序列 spawn 策略

> 平行給獨立任務、序列給有依賴的任務，並非越多越好。

## 內容

決定了「該 spawn」之後，下一個問題：spawn 一個還是多個？多個的話要平行還是序列？選錯會放大 spawn 的成本而不放大價值。

### 平行 spawn

平行的本質是：在同一個訊息裡發出多個 Agent 呼叫。Claude Code 會同時啟動它們，所有子 agent 跑完才返回。

**適用情境**：

- 任務 A 與任務 B 結果都需要、彼此無依賴
- 例：同時 review 前端 PR + 跑 security audit
- 例：在 3 個檔案目錄各跑一次 Explore agent 找不同關鍵字

**不適用情境**：

- B 的輸入是 A 的輸出
- 共享狀態（同一個 git 分支、同一個 DB）的寫入工作
- 三個 agent 工作其實是同一件事的細切，合併回主 agent 後仍要整合——不如直接讓主 agent 做

**平行的隱性成本**：每個 subagent 都用獨立 context window，總 token 消耗約等於各 agent 之和；如果你 spawn 五個各跑 3000 token，這次「同步」要花 15k tokens 與相應的時間。

### 序列 spawn

序列就是：主 agent spawn A 等結果、根據結果決定要不要 spawn B、再 spawn B。

**適用情境**：

- 「先研究、再決定要不要重構」這類條件分支
- A 的輸出是 B 的關鍵輸入

**用 SendMessage 接力**：序列裡若 B 的工作其實是「延續 A 的脈絡」，可用 `SendMessage` 把訊息傳給已存在的 A，讓它接手新任務。這比 spawn 一個新 agent 省下冷啟動。

### 三種常見組合

1. **單 spawn、隔離研究**：主 agent 不動，spawn 一個 Explore 把結果摘要回來
2. **平行廣度搜尋**：同時 spawn 三個 Explore 探不同子題，主 agent 整合
3. **序列「審-改-驗」**：spawn reviewer → 主 agent 看 review → spawn refactor agent → 主 agent 跑測試

### 決策摘要

| 情境 | 策略 |
|------|------|
| 兩件事完全獨立、都要結果 | 平行 |
| B 依賴 A 結果 | 序列 |
| 想擴展同一個 agent 的工作 | SendMessage 給已存在的 agent，別 spawn 新的 |
| 工作小於 5 分鐘 | 不 spawn，主 agent 自己做 |

**反模式**：把所有任務拆成 N 個 agent 平行跑「以求快」。整合輸出的成本與 token 開銷往往讓淨速度更慢。

---

← [工具範圍與 isolation 模式](tools-and-isolation.md) | 章節末篇
