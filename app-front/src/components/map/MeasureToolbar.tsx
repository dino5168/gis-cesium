import { useEffect, useRef, useState } from "react";
import * as Cesium from "cesium";
import { Ruler, Maximize2, Trash2 } from "lucide-react";
import { Button } from "@/components/ui/button";
import { geodesicDist } from "./drawStrategies";

// ── Types ──────────────────────────────────────────────────────────────────

type MeasureTool = "distance" | "area";

// ── Constants ──────────────────────────────────────────────────────────────

const COLOR   = Cesium.Color.fromCssColorString("#3b82f6");
const FILL    = COLOR.withAlpha(0.15);
const PREVIEW = COLOR.withAlpha(0.7);
const W       = 2;

// ── Geometry helpers ───────────────────────────────────────────────────────

function pickPos(viewer: Cesium.Viewer, px: Cesium.Cartesian2): Cesium.Cartesian3 | undefined {
  return viewer.scene.camera.pickEllipsoid(px, viewer.scene.globe.ellipsoid);
}

function centroid(pts: Cesium.Cartesian3[]): Cesium.Cartesian3 {
  const c = new Cesium.Cartesian3();
  pts.forEach(p => Cesium.Cartesian3.add(c, p, c));
  return Cesium.Cartesian3.multiplyByScalar(c, 1 / pts.length, new Cesium.Cartesian3());
}

function computeArea(pts: Cesium.Cartesian3[]): number {
  if (pts.length < 3) return 0;
  const origin = centroid(pts);
  const tf  = Cesium.Transforms.eastNorthUpToFixedFrame(origin);
  const inv = Cesium.Matrix4.inverseTransformation(tf, new Cesium.Matrix4());
  const p2  = pts.map(p => {
    const l = Cesium.Matrix4.multiplyByPoint(inv, p, new Cesium.Cartesian3());
    return { x: l.x, y: l.y };
  });
  let area = 0;
  for (let i = 0; i < p2.length; i++) {
    const j = (i + 1) % p2.length;
    area += p2[i].x * p2[j].y - p2[j].x * p2[i].y;
  }
  return Math.abs(area) / 2;
}

// ── Format helpers ─────────────────────────────────────────────────────────

function fmtDist(m: number): string {
  return m >= 1000 ? `${(m / 1000).toFixed(2)} km` : `${m.toFixed(0)} m`;
}

function fmtArea(m2: number): string {
  return m2 >= 1_000_000
    ? `${(m2 / 1_000_000).toFixed(2)} km²`
    : `${m2.toFixed(2)} m²`;
}

// ── Label styles ───────────────────────────────────────────────────────────

const LABEL_BASE: Cesium.LabelGraphics.ConstructorOptions = {
  font:                     "12px 'system-ui', sans-serif",
  fillColor:                Cesium.Color.WHITE,
  outlineColor:             Cesium.Color.BLACK,
  outlineWidth:             2,
  style:                    Cesium.LabelStyle.FILL_AND_OUTLINE,
  showBackground:           true,
  backgroundColor:          new Cesium.Color(0.1, 0.3, 0.8, 0.75),
  backgroundPadding:        new Cesium.Cartesian2(6, 3),
  verticalOrigin:           Cesium.VerticalOrigin.BOTTOM,
  horizontalOrigin:         Cesium.HorizontalOrigin.CENTER,
  disableDepthTestDistance: Number.POSITIVE_INFINITY,
};

const SUMMARY_LABEL: Cesium.LabelGraphics.ConstructorOptions = {
  ...LABEL_BASE,
  font:              "14px 'system-ui', sans-serif",
  backgroundColor:   new Cesium.Color(0.1, 0.3, 0.8, 0.9),
  backgroundPadding: new Cesium.Cartesian2(10, 6),
  verticalOrigin:    Cesium.VerticalOrigin.BOTTOM,
  pixelOffset:       new Cesium.Cartesian2(0, -4),
};

// ── Internal state ─────────────────────────────────────────────────────────

interface MState {
  positions:         Cesium.Cartesian3[];
  mousePos:          Cesium.Cartesian3 | null;
  previewEnt:        Cesium.Entity | null;
  segLabels:         Cesium.Entity[];          // live segment labels during drawing
  committedEntities: Cesium.Entity[];          // all permanent result entities
  handler:           Cesium.ScreenSpaceEventHandler | null;
}

// ── Component ──────────────────────────────────────────────────────────────

export default function MeasureToolbar({ viewer }: { viewer: Cesium.Viewer | null }) {
  const [activeTool, setActiveTool] = useState<MeasureTool | null>(null);
  const m = useRef<MState>({
    positions: [], mousePos: null,
    previewEnt: null, segLabels: [], committedEntities: [], handler: null,
  });

  // Clears only in-progress drawing state
  function resetDrawing() {
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

  // Removes all committed result entities
  function clearCommitted() {
    const st = m.current;
    if (viewer && !viewer.isDestroyed())
      st.committedEntities.forEach(e => viewer.entities.remove(e));
    st.committedEntities = [];
  }

  function addSegLabel(p1: Cesium.Cartesian3, p2: Cesium.Cartesian3) {
    if (!viewer || viewer.isDestroyed()) return;
    const mid = Cesium.Cartesian3.midpoint(p1, p2, new Cesium.Cartesian3());
    m.current.segLabels.push(
      viewer.entities.add({ position: mid, label: { ...LABEL_BASE, text: fmtDist(geodesicDist(p1, p2)) } }),
    );
  }

  // ── Commit: distance ────────────────────────────────────────────────────

  function commitDistance(pts: Cesium.Cartesian3[]) {
    if (!viewer || viewer.isDestroyed() || pts.length < 2) {
      resetDrawing(); setActiveTool(null); return;
    }
    resetDrawing();

    const lineEnt = viewer.entities.add({
      polyline: {
        positions:     [...pts],
        width:         W,
        material:      new Cesium.ColorMaterialProperty(COLOR),
        clampToGround: true,
      },
    });

    // Permanent segment labels + total at last point
    let total = 0;
    const permLabels: Cesium.Entity[] = [];
    for (let i = 0; i < pts.length - 1; i++) {
      const d   = geodesicDist(pts[i], pts[i + 1]);
      total    += d;
      const mid = Cesium.Cartesian3.midpoint(pts[i], pts[i + 1], new Cesium.Cartesian3());
      permLabels.push(viewer.entities.add({ position: mid, label: { ...LABEL_BASE, text: fmtDist(d) } }));
    }
    const totalEnt = viewer.entities.add({
      position: pts[pts.length - 1],
      label: { ...SUMMARY_LABEL, text: `總計 ${fmtDist(total)}` },
    });

    m.current.committedEntities.push(lineEnt, ...permLabels, totalEnt);
    setActiveTool(null);
  }

  // ── Commit: area ────────────────────────────────────────────────────────

  function commitArea(pts: Cesium.Cartesian3[]) {
    if (!viewer || viewer.isDestroyed() || pts.length < 3) {
      resetDrawing(); setActiveTool(null); return;
    }
    resetDrawing();

    const polyEnt = viewer.entities.add({
      polygon: {
        hierarchy: new Cesium.PolygonHierarchy([...pts]),
        material:  new Cesium.ColorMaterialProperty(FILL),
      },
      polyline: {
        positions:     [...pts, pts[0]],
        width:         W,
        material:      new Cesium.ColorMaterialProperty(COLOR),
        clampToGround: true,
      },
    });
    const labelEnt = viewer.entities.add({
      position: centroid(pts),
      label:    { ...SUMMARY_LABEL, text: fmtArea(computeArea(pts)), verticalOrigin: Cesium.VerticalOrigin.CENTER },
    });

    m.current.committedEntities.push(polyEnt, labelEnt);
    setActiveTool(null);
  }

  // ── Effect ──────────────────────────────────────────────────────────────

  useEffect(() => {
    resetDrawing();
    if (!viewer || !activeTool) return;

    const st      = m.current;
    const handler = new Cesium.ScreenSpaceEventHandler(viewer.scene.canvas);
    st.handler    = handler;

    handler.setInputAction(
      (e: Cesium.ScreenSpaceEventHandler.MotionEvent) => {
        st.mousePos = viewer.scene.camera.pickEllipsoid(e.endPosition) ?? null;
      },
      Cesium.ScreenSpaceEventType.MOUSE_MOVE,
    );

    handler.setInputAction(
      (e: Cesium.ScreenSpaceEventHandler.PositionedEvent) => {
        const pos = pickPos(viewer, e.position);
        if (!pos) return;
        if (st.positions.length > 0) addSegLabel(st.positions[st.positions.length - 1], pos);
        st.positions.push(pos);

        if (!st.previewEnt) {
          if (activeTool === "distance") {
            st.previewEnt = viewer.entities.add({
              polyline: {
                positions: new Cesium.CallbackProperty(() => {
                  const pts = [...st.positions];
                  if (st.mousePos) pts.push(st.mousePos);
                  return pts;
                }, false),
                width:         W,
                material:      new Cesium.PolylineDashMaterialProperty({ color: PREVIEW, dashLength: 14 }),
                clampToGround: true,
              },
            });
          } else {
            // area
            st.previewEnt = viewer.entities.add({
              polygon: {
                hierarchy: new Cesium.CallbackProperty(() => {
                  const pts = [...st.positions];
                  if (st.mousePos) pts.push(st.mousePos);
                  return pts.length >= 3 ? new Cesium.PolygonHierarchy(pts) : new Cesium.PolygonHierarchy([]);
                }, false),
                material: new Cesium.ColorMaterialProperty(FILL),
              },
              polyline: {
                positions: new Cesium.CallbackProperty(() => {
                  const pts = [...st.positions];
                  if (st.mousePos) pts.push(st.mousePos);
                  if (pts.length >= 2) pts.push(pts[0]);
                  return pts;
                }, false),
                width:         W,
                material:      new Cesium.PolylineDashMaterialProperty({ color: PREVIEW, dashLength: 14 }),
                clampToGround: true,
              },
            });
          }
        }
      },
      Cesium.ScreenSpaceEventType.LEFT_CLICK,
    );

    if (activeTool === "distance") {
      handler.setInputAction(
        () => commitDistance(st.positions.slice(0, -1)),
        Cesium.ScreenSpaceEventType.LEFT_DOUBLE_CLICK,
      );
      handler.setInputAction(
        () => commitDistance([...st.positions]),
        Cesium.ScreenSpaceEventType.RIGHT_CLICK,
      );
    } else {
      handler.setInputAction(
        () => commitArea(st.positions.slice(0, -1)),
        Cesium.ScreenSpaceEventType.LEFT_DOUBLE_CLICK,
      );
      handler.setInputAction(
        () => commitArea([...st.positions]),
        Cesium.ScreenSpaceEventType.RIGHT_CLICK,
      );
    }

    const onKey = (e: KeyboardEvent) => { if (e.key === "Escape") { resetDrawing(); setActiveTool(null); } };
    window.addEventListener("keydown", onKey);

    return () => {
      resetDrawing();
      window.removeEventListener("keydown", onKey);
    };
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [viewer, activeTool]);

  // ── UI ──────────────────────────────────────────────────────────────────

  function toggle(tool: MeasureTool) {
    setActiveTool(prev => (prev === tool ? null : tool));
  }

  function btnCls(tool: MeasureTool) {
    return activeTool === tool
      ? "rounded-none bg-primary text-primary-foreground hover:bg-primary/90 hover:text-primary-foreground"
      : "rounded-none";
  }

  return (
    <div className="flex flex-col overflow-hidden rounded-lg border bg-background/90 shadow-lg backdrop-blur-sm">
      <div className="border-b px-2 py-0.5 text-center text-[10px] font-medium text-muted-foreground">
        量測
      </div>
      <Button variant="ghost" size="icon" title="距離量測 — 右鍵完成"
        onClick={() => toggle("distance")} className={btnCls("distance")}>
        <Ruler className="size-4" />
      </Button>
      <div className="border-t" />
      <Button variant="ghost" size="icon" title="面積量測 — 右鍵完成"
        onClick={() => toggle("area")} className={btnCls("area")}>
        <Maximize2 className="size-4" />
      </Button>
      <div className="border-t" />
      <Button variant="ghost" size="icon" title="清除所有量測結果"
        onClick={() => { resetDrawing(); clearCommitted(); setActiveTool(null); }}
        className="rounded-none">
        <Trash2 className="size-4" />
      </Button>
    </div>
  );
}
