import * as Cesium from "cesium";
import { Plus, Minus, LocateFixed } from "lucide-react";
import { Button } from "@/components/ui/button";
import { INITIAL_CAMERA } from "@/config/cesium";

interface ZoomControlProps {
  viewer: Cesium.Viewer | null;
}

export default function ZoomControl({ viewer }: ZoomControlProps) {
  function zoomIn() {
    if (!viewer) return;
    const height = viewer.camera.positionCartographic.height;
    viewer.camera.zoomIn(height * 0.5);
  }

  function zoomOut() {
    if (!viewer) return;
    const height = viewer.camera.positionCartographic.height;
    viewer.camera.zoomOut(height);
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

  return (
    <div className="absolute left-4 top-4 z-10 flex flex-col overflow-hidden rounded-lg border bg-background/90 shadow-lg backdrop-blur-sm">
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
  );
}
