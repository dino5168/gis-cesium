# 實作規劃：MapInfoDrawer 開啟 Shapefile

## 可行性結論：完全可行

### 技術路線

```
使用者點擊「開啟圖檔」
    → JS 呼叫 tauri-plugin-dialog 開檔對話框（前端選檔）
    → 取得 .shp 路徑後 invoke("read_shapefile", { path })
    → Rust 讀取 .shp + .dbf → 轉為 GeoJSON string
    → 前端 Cesium.GeoJsonDataSource.load(geojson) 加入 viewer
```

### 優化決策

| 項目 | 決策 | 理由 |
|------|------|------|
| 對話框開啟方 | 前端 JS（tauri-plugin-dialog） | 比 Rust invoke 簡潔，不需序列化 window handle |
| 座標系處理 | 讀取 .prj；若非 WGS84 回傳警告，不做重投影 | `proj` C 套件依賴過重，V1 不引入；台灣政府資料多有 WGS84 版本 |
| GeoJSON 轉換 | Rust（shapefile + geojson crates） | 不在前端處理二進位解析 |
| 載入後的圖層列表 | LayersContent 新增「向量圖層」區塊，讀取 viewer.dataSources | 利用現有 viewer prop，不需新增全域狀態 |
| 檔案過濾 | 僅顯示 `.shp` 檔案 | 防止使用者誤選 .dbf/.prj |

---

## 執行步驟

### Step 1 — Rust 依賴

**`src-tauri/Cargo.toml`** 新增：
```toml
tauri-plugin-dialog = "2"
shapefile = "0.6"
geojson = "0.24"
```

### Step 2 — Rust 模組：shapefile 解析器

新建 `src-tauri/src/shapefile/mod.rs`：

```
功能：read_shapefile(path: String) -> Result<String, String>
流程：
  1. shapefile::Reader::from_path(&path) 開啟 .shp + .dbf
  2. 逐筆迭代 shape + record
  3. 依 Shape variant 轉為 geojson::Value：
     - Shape::Point       → Value::Point([x, y])
     - Shape::Polyline    → Value::MultiLineString
     - Shape::Polygon     → Value::MultiPolygon
  4. record 欄位轉為 serde_json::Map（properties）
  5. 組合為 FeatureCollection，序列化為 JSON string 回傳
  6. 順帶讀取同目錄 .prj，若存在且非 WGS84/EPSG:4326，
     回傳 Err("座標系非 WGS84，請先轉換後再載入") 提示
```

### Step 3 — lib.rs 更新

```rust
mod shapefile;            // 新增模組宣告

tauri::Builder::default()
    .plugin(tauri_plugin_dialog::init())   // 新增
    .plugin(tauri_plugin_opener::init())
    .invoke_handler(tauri::generate_handler![greet, shapefile::read_shapefile])
```

### Step 4 — 前端依賴與 Capabilities

**`package.json`** 新增：
```json
"@tauri-apps/plugin-dialog": "^2"
```

**`capabilities/default.json`** 新增 permissions：
```json
"dialog:allow-open",
"core:fs:allow-read-file",
"core:path:default"
```

### Step 5 — LayersContent.tsx 更新

```
新增：
  - import { open } from "@tauri-apps/plugin-dialog"
  - import { invoke } from "@tauri-apps/api/core"
  - useState<string | null>(null) — 錯誤訊息
  - useState<number>(0) — loadCount（觸發重新渲染以更新圖層列表）

新增 UI 區塊：
  ┌─────────────────────────────────────┐
  │ 向量圖層                             │
  │  [載入 Shapefile 按鈕]              │
  │  ─────────────────────────────────  │
  │  • 已載入圖層 1（shapefile 名稱）  │
  │  • 已載入圖層 2                     │
  └─────────────────────────────────────┘

handleOpen():
  1. open({ filters: [{ name: "Shapefile", extensions: ["shp"] }] })
  2. 若 path === null 則 return（使用者取消）
  3. invoke<string>("read_shapefile", { path })
  4. GeoJsonDataSource.load(geojson, { clampToGround: true })
  5. viewer.dataSources.add(datasource)
     datasource.name = 取 path basename（去掉副檔名）
  6. setLoadCount(c => c + 1)  // 觸發重新渲染
  7. catch → setError(e.message)

圖層列表：
  Array.from({ length: viewer.dataSources.length }, (_, i) => {
    const ds = viewer.dataSources.get(i);
    顯示 ds.name + 顯示/隱藏 toggle
  })
```

### Step 6 — 驗證

```powershell
# 1. Rust compile check（在 app-front 目錄）
pnpm run tauri build --debug -- --no-bundle 2>&1 | Select-String "error"

# 2. TypeScript check
pnpm run build

# 3. 手動測試（需要 pnpm run tauri dev）
#    - 點擊 Layers 按鈕開啟 Drawer
#    - 點擊「載入 Shapefile」，選取 .shp 檔案
#    - 確認圖層顯示在 CesiumJS viewer
#    - 確認圖層名稱出現在向量圖層清單
```

---

## 已知限制（V1）

- 僅支援 WGS84（EPSG:4326）座標系。其他 CRS 顯示錯誤提示，不自動轉換。
- 大型 shapefile（> 10 萬筆 feature）可能導致 CesiumJS 渲染卡頓，V1 不處理分批載入。
- 不支援多圖層 Z-order 調整或透明度控制（可在後續迭代中加入）。
- `.shx` 與 `.prj` 必須與 `.shp` 同目錄，shapefile crate 自動讀取。
