import { useState } from "react";
import * as Cesium from "cesium";
import { Layers, ChevronUp, ChevronDown } from "lucide-react";
import { TILE_LAYERS, DEFAULT_LAYER_KEY, type TileLayerKey } from "@/config/cesium";

interface LayerSwitcherProps {
  viewer: Cesium.Viewer | null;
}

export default function LayerSwitcher({ viewer }: LayerSwitcherProps) {
  const [activeKey, setActiveKey] = useState<TileLayerKey>(DEFAULT_LAYER_KEY);
  const [expanded, setExpanded] = useState(false);

  function switchLayer(key: TileLayerKey) {
    if (!viewer) return;
    const cfg = TILE_LAYERS[key];
    viewer.imageryLayers.removeAll();
    viewer.imageryLayers.add(
      new Cesium.ImageryLayer(
        new Cesium.UrlTemplateImageryProvider({
          url: cfg.url,
          subdomains: [...cfg.subdomains],
          minimumLevel: cfg.minimumLevel,
          maximumLevel: cfg.maximumLevel,
          credit: cfg.credit,
        }),
      ),
    );
    setActiveKey(key);
    setExpanded(false);
  }

  const layerKeys = Object.keys(TILE_LAYERS) as TileLayerKey[];

  return (
    <div className="absolute bottom-4 left-4 z-10 flex flex-col items-start gap-0">
      {/* 展開面板（往上彈出） */}
      {expanded && (
        <div className="mb-1 w-44 rounded-lg border bg-background/90 shadow-lg backdrop-blur-sm">
          {layerKeys.map((key) => (
            <button
              key={key}
              onClick={() => switchLayer(key)}
              className={[
                "flex w-full items-center gap-2 px-3 py-2 text-sm transition-colors",
                "first:rounded-t-lg last:rounded-b-lg",
                "hover:bg-muted",
                activeKey === key
                  ? "font-medium text-primary"
                  : "text-muted-foreground",
              ].join(" ")}
            >
              {/* Radio indicator */}
              <span className="flex size-4 shrink-0 items-center justify-center">
                {activeKey === key ? (
                  <span className="size-3 rounded-full bg-primary" />
                ) : (
                  <span className="size-3 rounded-full border border-muted-foreground" />
                )}
              </span>
              {TILE_LAYERS[key].label}
            </button>
          ))}
        </div>
      )}

      {/* 收合按鈕 */}
      <button
        onClick={() => setExpanded((v) => !v)}
        className="flex h-9 w-44 items-center gap-2 rounded-lg border bg-background/90 px-3 shadow-lg backdrop-blur-sm transition-colors hover:bg-muted"
      >
        <Layers className="size-4 shrink-0 text-muted-foreground" />
        <span className="flex-1 text-left text-sm font-medium">
          {TILE_LAYERS[activeKey].label}
        </span>
        {expanded ? (
          <ChevronDown className="size-4 text-muted-foreground" />
        ) : (
          <ChevronUp className="size-4 text-muted-foreground" />
        )}
      </button>
    </div>
  );
}
