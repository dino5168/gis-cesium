import { useEffect, useState } from "react";
import * as Cesium from "cesium";

interface ScaleBarProps {
  viewer: Cesium.Viewer | null;
}

interface ScaleState {
  widthPx: number;
  distance: number;
}

/**
 * 論壇方案距離序列：比 1/2/5×10^n 更細緻，涵蓋 3/30/300 等中間值。
 * 參考: https://community.cesium.com/t/scalebar-scaleline/11617
 */
const DISTANCES_M = [
  1, 2, 3, 5,
  10, 20, 30, 50,
  100, 200, 300, 500,
  1_000, 2_000, 3_000, 5_000,
  10_000, 20_000, 30_000, 50_000,
  100_000, 200_000, 300_000, 500_000,
  1_000_000, 2_000_000, 3_000_000, 5_000_000,
  10_000_000, 20_000_000, 30_000_000,
];

const MAX_BAR_PX = 150; // 目標最大刻度尺寬度（像素）
const SEGMENTS = 4;

function formatLabel(meters: number): string {
  if (meters >= 1_000) return `${meters / 1_000} km`;
  return `${meters} m`;
}

/**
 * 論壇核心算法：
 * 1. 在畫面底部中心取相鄰兩像素的 pick ray
 * 2. 用 globe.pick() 取得實際地球表面座標（比 pickEllipsoid 更準確）
 * 3. 用 EllipsoidGeodesic 計算測地線距離（沿地球表面，非歐氏直線）
 */
function getMetersPerPixel(scene: Cesium.Scene): number | undefined {
  const camera = scene.camera;
  const canvas = scene.canvas;
  const width = canvas.clientWidth;
  const height = canvas.clientHeight;

  // 底部中心取相鄰兩像素
  const cx = (width / 2) | 0;
  const cy = height - 1;

  const leftRay = camera.getPickRay(new Cesium.Cartesian2(cx, cy));
  const rightRay = camera.getPickRay(new Cesium.Cartesian2(cx + 1, cy));
  if (!leftRay || !rightRay) return undefined;

  const leftPos = scene.globe.pick(leftRay, scene);
  const rightPos = scene.globe.pick(rightRay, scene);
  if (!leftPos || !rightPos) return undefined;

  const ellipsoid = scene.globe.ellipsoid;
  const leftCarto = ellipsoid.cartesianToCartographic(leftPos);
  const rightCarto = ellipsoid.cartesianToCartographic(rightPos);

  const geodesic = new Cesium.EllipsoidGeodesic(leftCarto, rightCarto, ellipsoid);
  const distPerPx = geodesic.surfaceDistance;

  if (!isFinite(distPerPx) || distPerPx <= 0) return undefined;
  return distPerPx;
}

export default function ScaleBar({ viewer }: ScaleBarProps) {
  const [scale, setScale] = useState<ScaleState | null>(null);

  useEffect(() => {
    if (!viewer) return;

    function update() {
      const mpp = getMetersPerPixel(viewer!.scene);
      if (mpp === undefined) return;

      const maxMeters = MAX_BAR_PX * mpp;

      // 取 DISTANCES_M 中最大且不超過 maxMeters 的值
      let distance = DISTANCES_M[0];
      for (const d of DISTANCES_M) {
        if (d <= maxMeters) distance = d;
        else break;
      }

      const widthPx = Math.round(distance / mpp);
      if (widthPx < 2) return;

      setScale({ widthPx, distance });
    }

    const removeListener = viewer.camera.changed.addEventListener(update);
    const unsub = viewer.scene.postRender.addEventListener(() => {
      update();
      unsub();
    });

    return () => { removeListener(); };
  }, [viewer]);

  if (!scale) return null;

  const { widthPx, distance } = scale;
  const midLabel = formatLabel(distance / 2);
  const endLabel = formatLabel(distance);

  return (
    <div className="absolute bottom-4 right-4 z-10 rounded px-2 pt-1 pb-1.5 bg-background/80 backdrop-blur-sm">
      {/* 標籤列：flex 佈局確保父元素有高度 */}
      <div
        className="flex items-end mb-0.5 text-[10px] font-medium text-foreground leading-none"
        style={{ width: widthPx }}
      >
        <span className="flex-1 text-left">0</span>
        <span className="flex-1 text-center">{midLabel}</span>
        <span className="flex-1 text-right">{endLabel}</span>
      </div>

      {/* 黑白交錯刻度尺 */}
      <div
        className="flex overflow-hidden rounded-sm border border-foreground/60"
        style={{ width: widthPx, height: 10 }}
      >
        {Array.from({ length: SEGMENTS }).map((_, i) => (
          <div
            key={i}
            className={i % 2 === 0 ? "bg-foreground" : "bg-background"}
            style={{ flex: 1 }}
          />
        ))}
      </div>
    </div>
  );
}
