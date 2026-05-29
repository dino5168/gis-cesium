import { useEffect, useRef } from "react";
import * as Cesium from "cesium";
import { RotateCcw, RotateCw } from "lucide-react";
import { Button } from "@/components/ui/button";

const STEP = Cesium.Math.toRadians(45);

export default function CompassWidget({ viewer }: { viewer: Cesium.Viewer | null }) {
  const needleRef = useRef<SVGGElement>(null);

  useEffect(() => {
    if (!viewer || viewer.isDestroyed()) return;
    const update = () => {
      if (!needleRef.current) return;
      const deg = Cesium.Math.toDegrees(viewer.camera.heading);
      needleRef.current.style.transform    = `rotate(${-deg}deg)`;
      needleRef.current.style.transformOrigin = "20px 20px";
    };
    update();
    const remove = viewer.scene.postRender.addEventListener(update);
    return () => remove();
  }, [viewer]);

  function flyTo(heading: number, duration = 0.35) {
    if (!viewer || viewer.isDestroyed()) return;
    viewer.camera.flyTo({
      destination: viewer.camera.positionWC,
      orientation: { heading, pitch: viewer.camera.pitch, roll: viewer.camera.roll },
      duration,
    });
  }

  return (
    <div className="absolute right-4 top-4 z-10 flex items-center gap-1">
      {/* Rotate CCW */}
      <Button
        variant="ghost"
        size="icon"
        title="向左旋轉 45°"
        onClick={() => viewer && flyTo(viewer.camera.heading - STEP)}
        className="rounded-lg border bg-background/90 shadow-lg backdrop-blur-sm"
      >
        <RotateCcw className="size-4" />
      </Button>

      {/* Compass — click to reset north */}
      <button
        type="button"
        title="點擊重設為正北"
        onClick={() => flyTo(0, 0.6)}
        className="size-10 cursor-pointer select-none rounded-full focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-ring"
        style={{ filter: "drop-shadow(0 1px 4px rgba(0,0,0,0.3))" }}
      >
        <svg viewBox="0 0 40 40" className="size-full">
          <circle cx="20" cy="20" r="19" className="fill-background/90 stroke-border" strokeWidth="1" />
          <g ref={needleRef}>
            <path d="M20,4 L16.5,21 L20,17.5 L23.5,21 Z" fill="#ef4444" />
            <path d="M20,36 L16.5,19 L20,22.5 L23.5,19 Z" className="fill-muted-foreground" />
            <text
              x="20" y="10"
              textAnchor="middle"
              dominantBaseline="middle"
              fontSize="6"
              fontWeight="bold"
              fill="#ef4444"
              style={{ fontFamily: "system-ui, sans-serif", pointerEvents: "none" }}
            >N</text>
          </g>
          <circle cx="20" cy="20" r="2.5" className="fill-background stroke-border" strokeWidth="0.75" />
        </svg>
      </button>

      {/* Rotate CW */}
      <Button
        variant="ghost"
        size="icon"
        title="向右旋轉 45°"
        onClick={() => viewer && flyTo(viewer.camera.heading + STEP)}
        className="rounded-lg border bg-background/90 shadow-lg backdrop-blur-sm"
      >
        <RotateCw className="size-4" />
      </Button>
    </div>
  );
}
