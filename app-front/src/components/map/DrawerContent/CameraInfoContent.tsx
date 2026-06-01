import { useEffect, useRef, useState } from "react";
import * as Cesium from "cesium";

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

function InfoRow({ label, value }: { label: string; value: string }) {
  return (
    <div className="flex items-center justify-between rounded-md px-2 py-1.5 hover:bg-muted/50">
      <span className="text-xs text-muted-foreground">{label}</span>
      <span className="font-mono text-xs">{value}</span>
    </div>
  );
}

export default function CameraInfoContent({ viewer }: { viewer: Cesium.Viewer | null }) {
  const cam = useCameraInfo(viewer);

  return (
    <div className="no-scrollbar overflow-y-auto px-4">
      <p className="mb-2 text-xs font-semibold uppercase tracking-wide text-muted-foreground">
        相機
      </p>
      <div className="mb-4 rounded-lg border bg-muted/30 p-1">
        <InfoRow label="緯度 Lat"       value={`${cam.lat} °`} />
        <InfoRow label="經度 Lng"       value={`${cam.lng} °`} />
        <InfoRow label="高度 Alt"       value={`${cam.alt} km`} />
        <InfoRow label="方位角 Heading" value={`${cam.heading} °`} />
      </div>
    </div>
  );
}
