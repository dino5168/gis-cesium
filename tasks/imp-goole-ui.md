# 實作計劃：Google 風格側邊欄收合

## 目標差異對比

| 項目 | 現況 | Google 風格 |
|------|------|-------------|
| 收合觸發位置 | 底部文字按鈕 | 頂部 hamburger icon（`Menu`） |
| 收合按鈕外觀 | ChevronLeft ＋「關閉側邊欄」文字 | `Menu` icon（無文字） |
| 展開狀態頂部 | logo badge ＋ 標題 | hamburger icon ＋ logo badge ＋ 標題 |
| 收合狀態頂部 | 只剩 logo badge | 只剩 hamburger icon |

## 視覺示意

**展開（w-60）**
```
┌───────────────────────┐
│ ☰  [十方] 報告自動化  │
│ ─────────────────── │
│  主選單               │
│  💬 AI聊天機器人      │
│  📊 儀表板 ›          │
└───────────────────────┘
```

**收合（w-16）**
```
┌──────┐
│  ☰   │
│ ─── │
│  💬  │
│  📊  │
└──────┘
```

## 執行步驟

### Step 1 — 修改 import
- 新增 `Menu` 到 lucide-react import
- 移除 `ChevronLeft`（底部按鈕已不需要）
- 保留 `ChevronRight`、`ChevronDown`（子項展開仍用）

### Step 2 — 重構 Header 區塊
**現況結構：**
```tsx
<div className="flex items-center gap-3 px-4 py-5">
  <div> {/* logo badge */} </div>
  {!collapsed && <div> {/* 標題文字 */} </div>}
</div>
```

**修改為：**
```tsx
<div className="flex items-center gap-3 px-3 py-3">
  {/* hamburger toggle — 永遠可見 */}
  <button onClick={() => setCollapsed(v => !v)} ...>
    <Menu size={20} />
  </button>

  {/* logo badge + 標題 — 僅展開時顯示 */}
  {!collapsed && (
    <>
      <div> {/* logo badge */} </div>
      <div> {/* 標題文字 */} </div>
    </>
  )}
</div>
```

### Step 3 — 移除底部 Collapse Toggle 按鈕
刪除整個底部 `<button>` 區塊（第 125-137 行）。

### Step 4 — 調整 aside padding
底部不再需要為按鈕預留空間，`pb` 可從 `mb-3` 移除或縮小。

## 合理性檢核

| 檢查點 | 結果 |
|--------|------|
| `collapsed` state 邏輯不變 | ✅ 僅移動觸發位置，state 本身不動 |
| `expandedItems` 子選單展開邏輯不變 | ✅ 未觸及 |
| 收合時 icon-only nav 行為不變 | ✅ `{!collapsed && ...}` 判斷仍保留 |
| 外部 Props interface 不變 | ✅ `App.tsx` 不需改動 |
| TypeScript strict 相容 | ✅ 無型別變更 |

## 修改範圍

- `app-front/src/components/sidebar/AppSidebar.tsx`（唯一修改檔）
