import { useEffect, useState } from "react";
import * as Cesium from "cesium";

interface Coords { lat: number; lng: number }

function fmt(deg: number, pos: string, neg: string): string {
  return `${Math.abs(deg).toFixed(5)}° ${deg >= 0 ? pos : neg}`;
}

export default function CoordDisplay({ viewer }: { viewer: Cesium.Viewer | null }) {
  const [coords, setCoords] = useState<Coords | null>(null);

  useEffect(() => {
    if (!viewer || viewer.isDestroyed()) return;

    const handler = new Cesium.ScreenSpaceEventHandler(viewer.scene.canvas);
    handler.setInputAction(
      (e: Cesium.ScreenSpaceEventHandler.MotionEvent) => {
        const pos = viewer.scene.camera.pickEllipsoid(e.endPosition);
        if (!pos) { setCoords(null); return; }
        const c = Cesium.Cartographic.fromCartesian(pos);
        setCoords({
          lat: Cesium.Math.toDegrees(c.latitude),
          lng: Cesium.Math.toDegrees(c.longitude),
        });
      },
      Cesium.ScreenSpaceEventType.MOUSE_MOVE,
    );

    return () => { if (!handler.isDestroyed()) handler.destroy(); };
  }, [viewer]);

  return (
    <div className="absolute bottom-4 left-1/2 z-10 -translate-x-1/2 rounded-md border bg-background/90 px-3 py-1 shadow-md backdrop-blur-sm">
      <span className="font-mono text-xs tabular-nums text-foreground/80">
        {coords
          ? `${fmt(coords.lng, "E", "W")}  ${fmt(coords.lat, "N", "S")}`
          : "-- ° --  -- ° --"}
      </span>
    </div>
  );
}
