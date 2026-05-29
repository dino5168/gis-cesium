# 面積量測實作規劃

## 元件位置
`src/components/map/MeasureToolbar.tsx`

DrawToolbar 移除自身 absolute 定位，由 DemoCesium 的容器統一管理：
```tsx
<div className="absolute left-4 top-36 z-10 flex flex-col gap-2">
  <DrawToolbar viewer={viewer} />
  <MeasureToolbar viewer={viewer} />
</div>
```

---

## 三個步驟對應實作

| Step | 狀態 | 視覺 | 行為 |
|------|------|------|------|
| 01 | `active = false` | 量測按鈕（未啟用） | 點擊 Ruler 按鈕 → `active = true` |
| 02 | `active = true`，繪製中 | 虛線多邊形預覽 + 各線段距離 label | LEFT_CLICK 新增頂點；MOUSE_MOVE 即時預覽 |
| 03 | 完成 | 實線多邊形 + 面積 label | RIGHT_CLICK / DOUBLE_CLICK 完成；ESC 取消 |

---

## 狀態設計

```ts
interface MState {
  positions:  Cesium.Cartesian3[];   // 已確認的頂點
  mousePos:   Cesium.Cartesian3 | null;
  previewEnt: Cesium.Entity | null;  // 虛線預覽 (polygon + polyline)
  segLabels:  Cesium.Entity[];       // 線段距離 label
  handler:    Cesium.ScreenSpaceEventHandler | null;
}
```

---

## 面積演算法（ENU Projection + Shoelace）

1. 計算頂點重心作為 ENU 原點
2. `Cesium.Transforms.eastNorthUpToFixedFrame` 取得 local frame
3. 所有頂點透過 `Matrix4.inverseTransformation` 投影到 ENU 2D 平面 (x=East, y=North)
4. Shoelace 公式計算 2D 面積（平方公尺）
5. 顯示：< 1 km² 用 `m²`，≥ 1 km² 用 `km²`

---

## Entity 生命週期

**繪製中（Step 02）**
- `previewEnt`: `PolylineDashMaterialProperty` (虛線) + 半透明 `polygon`，全部用 `CallbackProperty` 即時更新
- `segLabels`: 每新增一個頂點就加一個 label entity 在線段中點

**完成（Step 03）**
1. 移除 `previewEnt` 和所有 `segLabels`
2. 新增永久 `polygon`（實線 polyline + 透明填充）
3. 新增 area label entity 於重心位置

**取消（ESC）**
- 移除所有臨時 entity，`active = false`

---

## 共用函式

- `geodesicDist` 從 `drawStrategies.ts` export（已修改）
- `centroid`, `computeArea`, `fmtDist`, `fmtArea` 定義於 `MeasureToolbar.tsx`

---

## 色彩

- 藍色系 `#3b82f6`，與繪圖工具的琥珀色 `#f59e0b` 明確區分
- Label 背景：`rgba(0.1, 0.3, 0.8, 0.75)`（深藍半透明）
- `disableDepthTestDistance: Infinity` 確保 label 永不被地形遮擋
