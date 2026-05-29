import { useEffect, useRef, useState } from "react";
import * as Cesium from "cesium";
import { Ruler } from "lucide-react";
import { Button } from "@/components/ui/button";
import { geodesicDist } from "./drawStrategies";

// ── Constants ──────────────────────────────────────────────────────────────

const COLOR   = Cesium.Color.fromCssColorString("#3b82f6");
const FILL    = COLOR.withAlpha(0.15);
const PREVIEW = COLOR.withAlpha(0.7);
const W       = 2;

// ── Geometry helpers ───────────────────────────────────────────────────────

function pickPos(
  viewer: Cesium.Viewer,
  px: Cesium.Cartesian2,
): Cesium.Cartesian3 | undefined {
  return viewer.scene.camera.pickEllipsoid(px, viewer.scene.globe.ellipsoid);
}

function centroid(pts: Cesium.Cartesian3[]): Cesium.Cartesian3 {
  const c = new Cesium.Cartesian3();
  pts.forEach(p => Cesium.Cartesian3.add(c, p, c));
  return Cesium.Cartesian3.multiplyByScalar(c, 1 / pts.length, new Cesium.Cartesian3());
}

/** Signed area via ENU projection + Shoelace (accurate for typical GIS scale) */
function computeArea(pts: Cesium.Cartesian3[]): number {
  if (pts.length < 3) return 0;
  const origin = centroid(pts);
  const tf     = Cesium.Transforms.eastNorthUpToFixedFrame(origin);
  const inv    = Cesium.Matrix4.inverseTransformation(tf, new Cesium.Matrix4());
  const p2     = pts.map(p => {
    const l = Cesium.Matrix4.multiplyByPoint(inv, p, new Cesium.Cartesian3());
    return { x: l.x, y: l.y };
  });
  let area = 0;
  const n = p2.length;
  for (let i = 0; i < n; i++) {
    const j = (i + 1) % n;
    area += p2[i].x * p2[j].y - p2[j].x * p2[i].y;
  }
  return Math.abs(area) / 2;
}

// ── Format helpers ─────────────────────────────────────────────────────────

function fmtDist(m: number): string {
  return m >= 1000
    ? `${(m / 1000).toFixed(2)} km`
    : `${m.toFixed(0)} m`;
}

function fmtArea(m2: number): string {
  return m2 >= 1_000_000
    ? `${(m2 / 1_000_000).toFixed(4)} km²`
    : `${m2.toFixed(0)} m²`;
}

// ── Shared label style ─────────────────────────────────────────────────────

const LABEL_BASE: Cesium.LabelGraphics.ConstructorOptions = {
  font:                    "12px 'system-ui', sans-serif",
  fillColor:               Cesium.Color.WHITE,
  outlineColor:            Cesium.Color.BLACK,
  outlineWidth:            2,
  style:                   Cesium.LabelStyle.FILL_AND_OUTLINE,
  showBackground:          true,
  backgroundColor:         new Cesium.Color(0.1, 0.3, 0.8, 0.75),
  backgroundPadding:       new Cesium.Cartesian2(6, 3),
  verticalOrigin:          Cesium.VerticalOrigin.BOTTOM,
  horizontalOrigin:        Cesium.HorizontalOrigin.CENTER,
  disableDepthTestDistance: Number.POSITIVE_INFINITY,
};

const AREA_LABEL_BASE: Cesium.LabelGraphics.ConstructorOptions = {
  ...LABEL_BASE,
  font:              "14px 'system-ui', sans-serif",
  backgroundColor:   new Cesium.Color(0.1, 0.3, 0.8, 0.85),
  backgroundPadding: new Cesium.Cartesian2(10, 6),
  verticalOrigin:    Cesium.VerticalOrigin.CENTER,
};

// ── Internal state ─────────────────────────────────────────────────────────

interface MState {
  positions:     Cesium.Cartesian3[];
  mousePos:      Cesium.Cartesian3 | null;
  previewEnt:    Cesium.Entity | null;
  segLabels:     Cesium.Entity[];
  handler:       Cesium.ScreenSpaceEventHandler | null;
}

// ── Component ──────────────────────────────────────────────────────────────

export default function MeasureToolbar({ viewer }: { viewer: Cesium.Viewer | null }) {
  const [active, setActive] = useState(false);
  const m = useRef<MState>({
    positions: [], mousePos: null,
    previewEnt: null, segLabels: [], handler: null,
  });

  function reset() {
    const st = m.current;
    if (st.handler) { st.handler.destroy(); st.handler = null; }
    if (viewer && !viewer.isDestroyed()) {
      if (st.previewEnt) viewer.entities.remove(st.previewEnt);
      st.segLabels.forEach(e => viewer.entities.remove(e));
    }
    st.previewEnt = null;
    st.segLabels  = [];
    st.positions  = [];
    st.mousePos   = null;
  }

  function addSegLabel(p1: Cesium.Cartesian3, p2: Cesium.Cartesian3) {
    if (!viewer || viewer.isDestroyed()) return;
    const mid = Cesium.Cartesian3.midpoint(p1, p2, new Cesium.Cartesian3());
    const ent = viewer.entities.add({
      position: mid,
      label: { ...LABEL_BASE, text: fmtDist(geodesicDist(p1, p2)) },
    });
    m.current.segLabels.push(ent);
  }

  function commit(pts: Cesium.Cartesian3[]) {
    if (!viewer || viewer.isDestroyed() || pts.length < 3) { reset(); setActive(false); return; }

    // remove preview + segment labels
    if (m.current.previewEnt) viewer.entities.remove(m.current.previewEnt);
    m.current.segLabels.forEach(e => viewer.entities.remove(e));
    m.current.previewEnt = null;
    m.current.segLabels  = [];

    // permanent polygon (solid)
    viewer.entities.add({
      polygon: {
        hierarchy:   new Cesium.PolygonHierarchy([...pts]),
        material:    new Cesium.ColorMaterialProperty(FILL),
      },
      polyline: {
        positions:   [...pts, pts[0]],
        width:       W,
        material:    new Cesium.ColorMaterialProperty(COLOR),
        clampToGround: true,
      },
    });

    // area label at centroid
    viewer.entities.add({
      position: centroid(pts),
      label: { ...AREA_LABEL_BASE, text: fmtArea(computeArea(pts)) },
    });

    reset();
    setActive(false);
  }

  useEffect(() => {
    reset();
    if (!viewer || !active) return;

    const st      = m.current;
    const handler = new Cesium.ScreenSpaceEventHandler(viewer.scene.canvas);
    st.handler    = handler;

    // Mouse move — update preview
    handler.setInputAction(
      (e: Cesium.ScreenSpaceEventHandler.MotionEvent) => {
        st.mousePos = viewer.scene.camera.pickEllipsoid(e.endPosition) ?? null;
      },
      Cesium.ScreenSpaceEventType.MOUSE_MOVE,
    );

    // Left click — add point
    handler.setInputAction(
      (e: Cesium.ScreenSpaceEventHandler.PositionedEvent) => {
        const pos = pickPos(viewer, e.position);
        if (!pos) return;

        // add segment label between previous and new point
        if (st.positions.length > 0)
          addSegLabel(st.positions[st.positions.length - 1], pos);

        st.positions.push(pos);

        // create or update preview entity
        if (!st.previewEnt) {
          st.previewEnt = viewer.entities.add({
            polygon: {
              hierarchy: new Cesium.CallbackProperty(() => {
                const pts = [...st.positions];
                if (st.mousePos) pts.push(st.mousePos);
                return pts.length >= 3
                  ? new Cesium.PolygonHierarchy(pts)
                  : new Cesium.PolygonHierarchy([]);
              }, false),
              material: new Cesium.ColorMaterialProperty(FILL),
            },
            polyline: {
              positions: new Cesium.CallbackProperty(() => {
                const pts = [...st.positions];
                if (st.mousePos) pts.push(st.mousePos);
                if (pts.length >= 2) pts.push(pts[0]); // close loop
                return pts;
              }, false),
              width: W,
              material: new Cesium.PolylineDashMaterialProperty({
                color:      PREVIEW,
                dashLength: 14,
              }),
              clampToGround: true,
            },
          });
        }
      },
      Cesium.ScreenSpaceEventType.LEFT_CLICK,
    );

    // Double-click — finish (slice off duplicate last point)
    handler.setInputAction(
      () => commit(st.positions.slice(0, -1)),
      Cesium.ScreenSpaceEventType.LEFT_DOUBLE_CLICK,
    );

    // Right-click — finish
    handler.setInputAction(
      () => commit([...st.positions]),
      Cesium.ScreenSpaceEventType.RIGHT_CLICK,
    );

    const onKey = (e: KeyboardEvent) => {
      if (e.key === "Escape") { reset(); setActive(false); }
    };
    window.addEventListener("keydown", onKey);

    return () => {
      reset();
      window.removeEventListener("keydown", onKey);
    };
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [viewer, active]);

  return (
    <div className="flex flex-col overflow-hidden rounded-lg border bg-background/90 shadow-lg backdrop-blur-sm">
      <div className="border-b px-2 py-0.5 text-center text-[10px] font-medium text-muted-foreground">
        量測
      </div>
      <Button
        variant="ghost"
        size="icon"
        title="面積量測 — 右鍵完成"
        onClick={() => setActive(prev => !prev)}
        className={
          active
            ? "rounded-none bg-primary text-primary-foreground hover:bg-primary/90 hover:text-primary-foreground"
            : "rounded-none"
        }
      >
        <Ruler className="size-4" />
      </Button>
    </div>
  );
}
