import { useState } from "react";
import * as Cesium from "cesium";
import { open } from "@tauri-apps/plugin-dialog";
import { invoke } from "@tauri-apps/api/core";
import { FolderOpen } from "lucide-react";
import { Button } from "@/components/ui/button";
import { cn } from "@/lib/utils";

type SrsOption = "EPSG:4326" | "EPSG:3826";

const SRS_OPTIONS: { value: SrsOption; label: string; title: string }[] = [
  { value: "EPSG:4326", label: "4326", title: "WGS84（全球通用）" },
  { value: "EPSG:3826", label: "3826", title: "TWD97 / TM2（台灣政府資料）" },
];

export default function LayersContent({ viewer }: { viewer: Cesium.Viewer | null }) {
  const [selectedSrs, setSelectedSrs] = useState<SrsOption>("EPSG:4326");
  // Re-render trigger: viewer.dataSources is a Cesium object outside React's reactivity.
  const [, setTick] = useState(0);
  const [error, setError] = useState<string | null>(null);
  const [loading, setLoading] = useState(false);

  function bump() {
    setTick((n) => n + 1);
  }

  async function handleOpenShapefile() {
    if (!viewer) return;
    setError(null);

    const result = await open({
      title: "選擇 Shapefile",
      multiple: false,
      filters: [{ name: "Shapefile", extensions: ["shp"] }],
    });

    const filePath = typeof result === "string" ? result : null;
    if (!filePath) return;

    setLoading(true);
    try {
      const geojson = await invoke<string>("read_shapefile", {
        path: filePath,
        srs: selectedSrs,
      });
      const ds = await Cesium.GeoJsonDataSource.load(JSON.parse(geojson), {
        clampToGround: true,
        stroke: Cesium.Color.YELLOW,
        fill: Cesium.Color.YELLOW.withAlpha(0.4),
        strokeWidth: 2,
      });
      ds.name =
        filePath.split(/[/\\]/).pop()?.replace(/\.shp$/i, "") ?? "shapefile";
      await viewer.dataSources.add(ds);
      viewer.flyTo(ds);
      bump();
    } catch (e) {
      setError(typeof e === "string" ? e : e instanceof Error ? e.message : String(e));
    } finally {
      setLoading(false);
    }
  }

  function toggleLayerVisibility(index: number) {
    if (!viewer) return;
    const ds = viewer.dataSources.get(index);
    ds.show = !ds.show;
    bump();
  }

  // Read directly from viewer.dataSources so state survives panel switches.
  const dsCount = viewer?.dataSources.length ?? 0;

  return (
    <div className="no-scrollbar overflow-y-auto px-4">
      {/* 底圖 */}
      <p className="mb-2 text-xs font-semibold uppercase tracking-wide text-muted-foreground">
        底圖
      </p>
      <div className="mb-4 space-y-1 rounded-lg border bg-muted/30 p-1">
        {viewer
          ? Array.from({ length: viewer.imageryLayers.length }, (_, i) => {
              const layer = viewer.imageryLayers.get(i);
              return (
                <div
                  key={i}
                  className="flex items-center justify-between rounded-md px-2 py-1.5 hover:bg-muted/50"
                >
                  <span className="text-xs">底圖 {i + 1}</span>
                  <span className="text-xs text-muted-foreground">
                    {layer.show ? "顯示" : "隱藏"}
                  </span>
                </div>
              );
            })
          : <p className="px-2 py-1.5 text-xs text-muted-foreground">載入中…</p>
        }
      </div>

      {/* 向量圖層 */}
      <p className="mb-2 text-xs font-semibold uppercase tracking-wide text-muted-foreground">
        向量圖層
      </p>

      {/* CRS toggle + 開啟按鈕 */}
      <div className="mb-2 flex items-center gap-2">
        <div className="flex overflow-hidden rounded-md border text-xs">
          {SRS_OPTIONS.map(({ value, label, title }) => (
            <button
              key={value}
              title={title}
              onClick={() => setSelectedSrs(value)}
              className={cn(
                "px-2 py-1 transition-colors",
                selectedSrs === value
                  ? "bg-primary text-primary-foreground"
                  : "text-muted-foreground hover:bg-muted/60",
              )}
            >
              {label}
            </button>
          ))}
        </div>

        <Button
          variant="ghost"
          size="sm"
          className="h-6 flex-1 px-2 text-xs"
          disabled={!viewer || loading}
          onClick={handleOpenShapefile}
        >
          <FolderOpen className="mr-1 size-3" />
          {loading ? "載入中…" : "開啟 Shapefile"}
        </Button>
      </div>

      {error && (
        <p className="mb-3 rounded-md bg-destructive/10 px-2 py-1.5 text-xs text-destructive leading-relaxed">
          {error}
        </p>
      )}

      {/* 已載入圖層清單（來自 viewer.dataSources，跨面板切換不遺失） */}
      <div className="mb-4 space-y-1 rounded-lg border bg-muted/30 p-1">
        {dsCount === 0 ? (
          <p className="px-2 py-1.5 text-xs text-muted-foreground">
            尚未載入任何圖層
          </p>
        ) : (
          Array.from({ length: dsCount }, (_, i) => {
            const ds = viewer!.dataSources.get(i);
            return (
              <div
                key={i}
                className="flex items-center justify-between rounded-md px-2 py-1.5 hover:bg-muted/50"
              >
                <span
                  className="max-w-[140px] truncate text-xs"
                  title={ds.name}
                >
                  {ds.name || `圖層 ${i + 1}`}
                </span>
                <input
                  type="checkbox"
                  checked={ds.show}
                  onChange={() => toggleLayerVisibility(i)}
                  className="size-3.5 cursor-pointer accent-primary"
                />
              </div>
            );
          })
        )}
      </div>
    </div>
  );
}
