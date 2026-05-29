# 實作規劃：底圖切換 UI (LayerSwitcher)

## 目標

在 DemoCesium 頁面左下角新增一個浮動面板，讓使用者切換 Cesium 底圖。
所有圖層來源統一由設定檔管理，元件不 hardcode 任何 URL。

---

## 異動清單

### Step 1 — 擴充設定檔

**檔案**: `src/config/cesium.ts`

- 新增 `TILE_LAYERS` record，整合現有 `OSM_LAYER`，加入其他圖層
- 每個圖層項目包含：
  - `url`, `subdomains`, `minimumLevel`, `maximumLevel`, `credit` (Cesium 技術欄位)
  - `label` (中文顯示名，給 UI 使用)
- 新增 `DEFAULT_LAYER_KEY: TileLayerKey = "osm"`
- 新增 `TileLayerKey = keyof typeof TILE_LAYERS`
- 移除舊的 `OSM_LAYER`，改由 `TILE_LAYERS.osm` 取代

預計圖層：

| key         | label          | 來源                          |
|-------------|----------------|-------------------------------|
| `osm`       | OSM 標準       | openstreetmap.org             |
| `cartoDark` | 深色底圖       | basemaps.cartocdn.com         |
| `topo`      | 地形圖         | tile.opentopomap.org          |
| `nlscPhoto` | 國土影像       | wmts.nlsc.gov.tw (台灣衛星)   |

---

### Step 2 — 建立元件

**新增檔案**: `src/components/map/LayerSwitcher.tsx`

#### Props

```ts
interface LayerSwitcherProps {
  viewer: Cesium.Viewer | null;
}
```

#### State

```ts
const [activeKey, setActiveKey] = useState<TileLayerKey>(DEFAULT_LAYER_KEY);
const [expanded, setExpanded] = useState(false);
```

#### 切換邏輯

```ts
function switchLayer(key: TileLayerKey) {
  if (!viewer) return;
  const cfg = TILE_LAYERS[key];
  viewer.imageryLayers.removeAll();
  viewer.imageryLayers.add(
    new Cesium.ImageryLayer(new Cesium.UrlTemplateImageryProvider(cfg))
  );
  setActiveKey(key);
  setExpanded(false);
}
```

#### UI 結構（absolute，左下角）

```
position: absolute bottom-4 left-4 z-10

收合狀態：
┌────────────────────────┐
│  🗺  OSM 標準      ▲   │
└────────────────────────┘

展開狀態（面板往上展開）：
┌────────────────────────┐
│  ◉  OSM 標準           │  ← active
│  ○  深色底圖           │
│  ○  地形圖             │
│  ○  國土影像           │
├────────────────────────┤
│  🗺  OSM 標準      ▼   │
└────────────────────────┘
```

樣式重點：
- 面板背景：`bg-background/90 backdrop-blur-sm border rounded-lg shadow-lg`
- 選中項目：`text-primary font-medium` + 實心圓圈
- 未選項目：`text-muted-foreground` + 空心圓圈
- 按鈕寬度固定 `w-44` 保持一致

---

### Step 3 — 修改 DemoCesium 頁面

**檔案**: `src/pages/DemoCesium.tsx`

1. 新增 `viewer` state：
   ```ts
   const [viewer, setViewer] = useState<Cesium.Viewer | null>(null);
   ```

2. useEffect 初始化後呼叫 `setViewer(v)`

3. 初始圖層改用 `TILE_LAYERS[DEFAULT_LAYER_KEY]`（取代 `OSM_LAYER`）

4. return JSX 改為相對定位容器，疊放 LayerSwitcher：
   ```tsx
   return (
     <div className="relative w-full h-full">
       <div ref={containerRef} className="w-full h-full" />
       <LayerSwitcher viewer={viewer} />
     </div>
   );
   ```

---

## 不在本次範圍

- i18n（label 直接寫中文字串，無需翻譯 key）
- 圖層縮圖預覽（純文字列表即可）
- 多圖層疊加（本次僅支援單底圖切換）
