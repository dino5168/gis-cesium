# 任務：載入 Shapefile 時支援選擇坐標系

## 問題描述

目前 `read_shapefile` 預設以 EPSG:4326（WGS84）讀取資料，
台灣政府常用的 EPSG:3826（TWD97 / TM2 121°E）圖檔無法直接載入。

---

## 實作規劃

### 技術決策

| 項目 | 決策 |
|------|------|
| EPSG:3826 → 4326 轉換 | Rust 純數學實作 TM2 反投影，不引入 `proj` C 依賴 |
| TWD97 與 WGS84 誤差 | 兩者 datum 偏差 < 1 m，V1 直接等同處理，無需 datum shift |
| CRS 選擇時機 | 在 Drawer 常駐顯示選擇器（不彈 dialog），使用者先選再開檔 |
| 放寬 .prj 檢查 | 使用者已明確選 CRS 時，跳過 .prj 強制阻擋，改為警告訊息 |

### EPSG:3826 參數（GRS80, TM2 zone 121）

```
a   = 6_378_137.0          # semi-major axis (m)
f   = 1 / 298.257_222_101  # flattening
k₀  = 0.9999               # scale factor
λ₀  = 121° (= 121π/180 rad) # central meridian
FE  = 250_000 m            # false easting
FN  = 0 m                  # false northing
```

---

## 執行步驟

### Step 1 — Rust：新增 `tm2_to_wgs84` 轉換函式

在 `src-tauri/src/shapefile/mod.rs` 新增：

```rust
// TM2 (EPSG:3826) inverse projection → geographic WGS84 (lon, lat in degrees)
fn tm2_to_wgs84(easting: f64, northing: f64) -> (f64, f64)
```

實作標準 Transverse Mercator 反投影（EPSG Guidance Note 7 Part 2, §1.3.1）：
1. 由 (E-FE, N-FN) 計算 footprint latitude φ₁（Bowring's series）
2. 用 φ₁ 計算 ν、ρ、η² 等橢球輔助量
3. 解算 φ（緯度）與 λ（經度）
4. 回傳 (lon_deg, lat_deg)

### Step 2 — Rust：修改 `read_shapefile` 簽名

```rust
// 新增 srs 參數
#[tauri::command]
pub fn read_shapefile(path: String, srs: String) -> Result<String, String>
```

- `srs == "EPSG:4326"`：保持現有行為（座標直接使用）
- `srs == "EPSG:3826"`：跳過 .prj WGS84 強制檢查，對每個座標呼叫 `tm2_to_wgs84`
- `check_crs` 改為回傳 `Option<String>`（警告訊息），不再 `Err` 阻擋

### Step 3 — 前端：`LayersContent.tsx` 加入 CRS 選擇器

在「向量圖層」標題列加入 CRS toggle：

```
向量圖層          [EPSG:4326 ▼]  [開啟 Shapefile]
```

- 使用 shadcn `<Select>` 元件，選項：
  - `EPSG:4326` — WGS84（預設）
  - `EPSG:3826` — TWD97 / TM2
- `selectedSrs` state，傳入 `invoke("read_shapefile", { path, srs: selectedSrs })`

### Step 4 — 驗證

```powershell
# Rust compile check
cd "D:\repo-tauri\pro-gis\app-front\src-tauri"
cargo check

# TypeScript build
cd "D:\repo-tauri\pro-gis\app-front"
pnpm run build
```

手動測試：
- 選 EPSG:4326，載入 WGS84 shapefile → 位置正確
- 選 EPSG:3826，載入台灣 TWD97 shapefile → 位置落在台灣

---

## 已知限制（V1）

- 僅支援 EPSG:4326 與 EPSG:3826，其他 CRS 不處理
- TWD97 ↔ WGS84 datum 偏差不補償（< 1 m，GIS 應用可接受）
