# 實作計劃：Google 風格底部設定列

## 目標

在 `AppSidebar.tsx` 最底部加入：
1. 用戶資訊列（頭像 + 名稱 + 齒輪圖示）
2. 點擊齒輪 → 向上彈出設定 popup 選單

## 視覺示意

**展開狀態（w-60）底部列：**
```
┌─────────────────────────┐
│  👤 用戶名稱        ⚙   │
└─────────────────────────┘
```

**點擊 ⚙ 後（popup 向上展開）：**
```
┌─────────────────────────┐
│  活動記錄                │
│  主題              ►    │  ← 子選單展開: 系統 / 淺色 / 深色
│  說明                    │
└─────────────────────────┘
│  👤 用戶名稱        ⚙   │  ← footer 仍在
└─────────────────────────┘
```

**收合狀態（w-16）：**
```
┌──────┐
│  ⚙   │  ← 只顯示齒輪，置中
└──────┘
```

## 執行步驟

### Step 1 — 新增 import
```ts
import { Menu, ChevronRight, ChevronDown, Settings, User } from "lucide-react";
import { useState, useRef, useEffect } from "react";
```

### Step 2 — 新增 state
```ts
const [settingsOpen, setSettingsOpen] = useState(false);
const [theme, setTheme] = useState<"system" | "light" | "dark">("system");
const settingsRef = useRef<HTMLDivElement>(null);
```

### Step 3 — Theme 副作用 + Click-outside 關閉
```ts
// 套用主題到 document root
useEffect(() => {
  const root = document.documentElement;
  if (theme === "dark") root.classList.add("dark");
  else root.classList.remove("dark");
  // "system" 使用 media query 判斷（可擴充）
}, [theme]);

// 點擊 popup 外部關閉
useEffect(() => {
  if (!settingsOpen) return;
  const handler = (e: MouseEvent) => {
    if (settingsRef.current && !settingsRef.current.contains(e.target as Node)) {
      setSettingsOpen(false);
    }
  };
  document.addEventListener("mousedown", handler);
  return () => document.removeEventListener("mousedown", handler);
}, [settingsOpen]);
```

### Step 4 — Settings popup JSX（`absolute bottom-full`）
放在 `</aside>` 前，`relative` 容器包裹整個 footer：
- `absolute bottom-full left-0 right-0` 讓 popup 貼著 footer 向上展開
- popup 包含：活動記錄、主題（有子選單）、說明
- 主題子選單內嵌展開（不做第二層 popup，直接 inline 展示 3 個選項）

### Step 5 — Footer bar JSX
位置：`</nav>` 後、`</aside>` 前

```tsx
<div ref={settingsRef} className="relative shrink-0 border-t border-sidebar-border">
  {/* Popup */}
  {settingsOpen && <SettingsPopup />}

  {/* Footer bar */}
  <div className="flex items-center gap-2 px-3 py-3">
    {!collapsed && (
      <>
        <div className="...avatar..." />   {/* User icon */}
        <span className="flex-1 truncate text-sm">用戶</span>
      </>
    )}
    <button
      onClick={() => setSettingsOpen(v => !v)}
      className={cn("...", collapsed && "mx-auto")}
    >
      <Settings size={16} />
    </button>
  </div>
</div>
```

## 合理性檢核

| 檢查點 | 結果 |
|--------|------|
| 不引入額外套件（radix Popover 等） | ✅ 純 state + CSS absolute 定位 |
| click-outside 用 `useRef` + document listener | ✅ 標準模式，cleanup 正確 |
| 主題切換直接操作 `document.documentElement.classList` | ✅ 與 `index.css` `.dark` 策略一致 |
| 收合時只顯示齒輪圖示 | ✅ 與 header hamburger 相同邏輯 |
| TypeScript strict 相容 | ✅ 所有 state 有明確型別 |
| Props interface 不變，`App.tsx` 不動 | ✅ |

## 修改範圍

- `app-front/src/components/sidebar/AppSidebar.tsx`（唯一修改檔）
