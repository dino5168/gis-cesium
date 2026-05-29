# 實作規劃：地圖縮放控制組 (ZoomControl)

## 目標

在 DemoCesium 頁面左上角新增一個 Leaflet 風格的垂直 button group，
提供縮放與回到初始位置功能。

---

## 異動清單

### Step 1 — 建立元件

**新增檔案**: `src/components/map/ZoomControl.tsx`

#### Props

```ts
interface ZoomControlProps {
  viewer: Cesium.Viewer | null;
}
```

#### 按鈕定義

| 按鈕 | Icon (lucide) | 行為 |
|------|---------------|------|
| 放大 | `Plus`        | `camera.zoomIn(height * 0.5)` |
| 縮小 | `Minus`       | `camera.zoomOut(height)` |
| 歸位 | `LocateFixed` | `camera.flyTo({ destination: fromDegrees(INITIAL_CAMERA), duration: 1 })` |

#### Zoom 邏輯

```ts
function zoomIn() {
  if (!viewer) return;
  const height = viewer.camera.positionCartographic.height;
  viewer.camera.zoomIn(height * 0.5);   // 移近 50% 當前高度
}

function zoomOut() {
  if (!viewer) return;
  const height = viewer.camera.positionCartographic.height;
  viewer.camera.zoomOut(height);         // 移遠 100% 當前高度（高度約翻倍）
}

function resetView() {
  if (!viewer) return;
  viewer.camera.flyTo({
    destination: Cesium.Cartesian3.fromDegrees(
      INITIAL_CAMERA.longitude,
      INITIAL_CAMERA.latitude,
      INITIAL_CAMERA.height,
    ),
    duration: 1,
  });
}
```

#### UI 結構

```tsx
// absolute top-4 left-4 z-10
<div className="absolute top-4 left-4 z-10 flex flex-col overflow-hidden rounded-lg border bg-background/90 shadow-lg backdrop-blur-sm">
  <Button variant="ghost" size="icon" onClick={zoomIn} title="放大">
    <Plus className="size-4" />
  </Button>
  <div className="border-t" />
  <Button variant="ghost" size="icon" onClick={zoomOut} title="縮小">
    <Minus className="size-4" />
  </Button>
  <div className="border-t" />
  <Button variant="ghost" size="icon" onClick={resetView} title="回初始位置">
    <LocateFixed className="size-4" />
  </Button>
</div>
```

樣式重點：
- `overflow-hidden` + `rounded-lg` 讓按鈕角落裁切正確
- `bg-background/90 backdrop-blur-sm` 與 LayerSwitcher 風格一致
- shadcn `Button variant="ghost" size="icon"` = 36×36px，無背景，hover 有 muted 底色

---

### Step 2 — 掛載至 DemoCesium

**檔案**: `src/pages/DemoCesium.tsx`

1. import `ZoomControl`
2. 在 return JSX 中加入：

```tsx
return (
  <div className="relative h-full w-full">
    <div ref={containerRef} className="h-full w-full" />
    <ZoomControl viewer={viewer} />      {/* top-4 left-4 */}
    <LayerSwitcher viewer={viewer} />    {/* bottom-4 left-4 */}
  </div>
);
```

---

## 最終佈局

```
地圖畫面
┌─────────────────────────────────────┐
│ ┌───┐                               │
│ │ + │  ZoomControl (top-left)       │
│ ├───┤                               │
│ │ − │                               │
│ ├───┤                               │
│ │ ⌖ │                               │
│ └───┘                               │
│                                     │
│ ┌────────────────┐                  │
│ │ 🗺 OpenStreet ▲│  LayerSwitcher   │
│ └────────────────┘  (bottom-left)   │
└─────────────────────────────────────┘
```

---

## 不在本次範圍

- 連續按住縮放（mousedown 重複觸發）
- Tooltip 元件（用 HTML `title` 屬性即可）
- 鍵盤快捷鍵
