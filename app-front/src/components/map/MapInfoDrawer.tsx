import { useEffect, useRef, useState } from "react";
import * as Cesium from "cesium";
import { Layers, Info, SlidersHorizontal, X } from "lucide-react";
import { Button } from "@/components/ui/button";
import {
  Drawer,
  DrawerClose,
  DrawerContent,
  DrawerDescription,
  DrawerFooter,
  DrawerHeader,
  DrawerTitle,
  DrawerTrigger,
} from "@/components/ui/drawer";

// ── Camera info updated via postRender ─────────────────────────────────────

interface CameraInfo {
  lat: string;
  lng: string;
  alt: string;
  heading: string;
}

function useCameraInfo(viewer: Cesium.Viewer | null): CameraInfo {
  const [info, setInfo] = useState<CameraInfo>({ lat: "--", lng: "--", alt: "--", heading: "--" });
  const frameRef = useRef(0);

  useEffect(() => {
    if (!viewer || viewer.isDestroyed()) return;
    const remove = viewer.scene.postRender.addEventListener(() => {
      // sample every 10 frames to avoid excess re-renders
      frameRef.current = (frameRef.current + 1) % 10;
      if (frameRef.current !== 0) return;
      const cart = viewer.camera.positionCartographic;
      setInfo({
        lat:     Cesium.Math.toDegrees(cart.latitude).toFixed(5),
        lng:     Cesium.Math.toDegrees(cart.longitude).toFixed(5),
        alt:     (cart.height / 1000).toFixed(1),
        heading: Cesium.Math.toDegrees(viewer.camera.heading).toFixed(1),
      });
    });
    return () => remove();
  }, [viewer]);

  return info;
}

// ── Row helper ─────────────────────────────────────────────────────────────

function InfoRow({ label, value }: { label: string; value: string }) {
  return (
    <div className="flex items-center justify-between rounded-md px-2 py-1.5 hover:bg-muted/50">
      <span className="text-xs text-muted-foreground">{label}</span>
      <span className="font-mono text-xs">{value}</span>
    </div>
  );
}

// ── Main component ─────────────────────────────────────────────────────────

export default function MapInfoDrawer({ viewer }: { viewer: Cesium.Viewer | null }) {
  const cam = useCameraInfo(viewer);

  return (
    <Drawer direction="right">
      {/* ── Trigger: button group, bottom-left above LayerSwitcher ── */}
      <div className="absolute bottom-20 left-4 z-10 flex flex-col overflow-hidden rounded-lg border bg-background/90 shadow-lg backdrop-blur-sm">
        <DrawerTrigger asChild>
          <Button variant="ghost" size="icon" title="圖層與資訊">
            <Layers className="size-4" />
          </Button>
        </DrawerTrigger>
        <div className="border-t" />
        <DrawerTrigger asChild>
          <Button variant="ghost" size="icon" title="相機資訊">
            <Info className="size-4" />
          </Button>
        </DrawerTrigger>
        <div className="border-t" />
        <DrawerTrigger asChild>
          <Button variant="ghost" size="icon" title="地圖設定">
            <SlidersHorizontal className="size-4" />
          </Button>
        </DrawerTrigger>
      </div>

      {/* ── Drawer panel ── */}
      <DrawerContent>
        <DrawerHeader className="flex flex-row items-start justify-between">
          <div>
            <DrawerTitle>地圖資訊</DrawerTitle>
            <DrawerDescription>目前相機位置與地圖狀態</DrawerDescription>
          </div>
          <DrawerClose asChild>
            <Button variant="ghost" size="icon" className="-mt-1 -mr-1">
              <X className="size-4" />
            </Button>
          </DrawerClose>
        </DrawerHeader>

        <div className="no-scrollbar overflow-y-auto px-4">
          {/* Camera section */}
          <p className="mb-2 text-xs font-semibold uppercase tracking-wide text-muted-foreground">
            相機
          </p>
          <div className="mb-4 rounded-lg border bg-muted/30 p-1">
            <InfoRow label="緯度 Lat"     value={`${cam.lat} °`} />
            <InfoRow label="經度 Lng"     value={`${cam.lng} °`} />
            <InfoRow label="高度 Alt"     value={`${cam.alt} km`} />
            <InfoRow label="方位角 Heading" value={`${cam.heading} °`} />
          </div>

          {/* Layer section */}
          <p className="mb-2 text-xs font-semibold uppercase tracking-wide text-muted-foreground">
            圖層
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

          {/* Info section */}
          <p className="mb-2 text-xs font-semibold uppercase tracking-wide text-muted-foreground">
            說明
          </p>
          <div className="mb-4 space-y-2 rounded-lg border bg-muted/30 p-3">
            <p className="text-xs leading-relaxed text-muted-foreground">
              使用滑鼠左鍵拖曳平移地圖，右鍵或中鍵旋轉視角，滾輪縮放。
            </p>
            <p className="text-xs leading-relaxed text-muted-foreground">
              左側工具列可切換繪圖工具，右上角羅盤可旋轉並重設正北方向。
            </p>
          </div>
        </div>

        <DrawerFooter>
          <DrawerClose asChild>
            <Button variant="outline">關閉</Button>
          </DrawerClose>
        </DrawerFooter>
      </DrawerContent>
    </Drawer>
  );
}
