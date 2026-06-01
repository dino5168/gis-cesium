# 實作規劃：MapInfoDrawer 分離 DrawerContent

## 架構說明

shadcn `<Drawer>` 設計為單一 `<DrawerContent>`，不支援多個並存。
因此採用 **activePanel state + 條件渲染**：3 個 trigger 按鈕各自設定 `activePanel`，
單一 `DrawerContent` 依 state 渲染對應 panel 元件。

```
components/map/
├── MapInfoDrawer.tsx           ← 僅保留骨架、state、title 對應表
└── DrawerContent/
    ├── CameraInfoContent.tsx   ← 相機座標 panel (含 useCameraInfo hook + InfoRow)
    ├── LayersContent.tsx       ← 圖層列表 panel
    └── SettingsContent.tsx     ← 地圖說明 / 設定 panel
```

## 執行步驟

### Step 1 — 建立目錄與 CameraInfoContent.tsx
- 從 `MapInfoDrawer.tsx` 抽出 `useCameraInfo` hook 與 `InfoRow` 元件
- Props: `{ viewer: Cesium.Viewer | null }`
- 輸出：完整相機資訊區塊（section 標題 + InfoRow 列表）

### Step 2 — 建立 LayersContent.tsx
- 從 `MapInfoDrawer.tsx` 抽出圖層列表邏輯
- Props: `{ viewer: Cesium.Viewer | null }`
- 輸出：圖層清單（section 標題 + 每層 show/hide 列）

### Step 3 — 建立 SettingsContent.tsx
- 從 `MapInfoDrawer.tsx` 抽出說明文字區塊
- Props: 無（純靜態）
- 輸出：操作說明段落（可未來擴充為地圖設定控制項）

### Step 4 — 重構 MapInfoDrawer.tsx
1. 新增 `activePanel` state，型別 `"camera" | "layers" | "settings"`，預設 `"camera"`
2. 各 `DrawerTrigger` 的子 `<Button>` 加 `onClick={() => setActivePanel(...)}`
3. `DrawerHeader` 依 `activePanel` 顯示對應 title / description：
   | panel     | title    | description        |
   |-----------|----------|--------------------|
   | camera    | 相機資訊 | 目前視角位置與方位 |
   | layers    | 圖層管理 | 目前載入的底圖圖層 |
   | settings  | 地圖說明 | 操作方式與快捷鍵   |
4. `DrawerContent` 內容區改為條件渲染 3 個 panel 元件
5. 移除已抽出的 `useCameraInfo`、`InfoRow`、所有 inline section JSX

### Step 5 — 驗證
- `pnpm run build` 確認 TypeScript 無錯誤
- 手動確認 3 個按鈕各自打開對應 panel，title/description 正確切換
