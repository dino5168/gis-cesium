import * as Cesium from "cesium";
import {
  pickPos, geodesicDist,
  toRect, rectCorners, circlePolylinePositions,
} from "@/lib/unimath";

// ── Public types ───────────────────────────────────────────────────────────

export type DrawTool =
  | "line"        // 線段 (2點)
  | "polyline"    // 折線 (多點)
  | "rectLine"    // 矩形輪廓 (無填充)
  | "circleLine"  // 圓輪廓 (無填充)
  | "polygon"     // 多邊形 (填充)
  | "rectangle"   // 矩形 (填充)
  | "circle";     // 圓 (填充)

export interface DrawState {
  positions: Cesium.Cartesian3[];
  mousePos: Cesium.Cartesian3 | null;
  previewEntity: Cesium.Entity | null;
  handler: Cesium.ScreenSpaceEventHandler | null;
}

interface ToolStrategy {
  setup(
    viewer: Cesium.Viewer,
    handler: Cesium.ScreenSpaceEventHandler,
    state: DrawState,
    finish: () => void,
  ): void;
}

// ── Style constants ────────────────────────────────────────────────────────

const COLOR   = Cesium.Color.fromCssColorString("#f59e0b");
const FILL    = COLOR.withAlpha(0.25);
const PREVIEW = COLOR.withAlpha(0.6);
const W       = 2;

// ── Commit helpers (permanent entities) ────────────────────────────────────

function commitLine(viewer: Cesium.Viewer, pts: Cesium.Cartesian3[]) {
  if (pts.length < 2) return;
  viewer.entities.add({
    polyline: {
      positions: [...pts],
      width: W,
      material: new Cesium.ColorMaterialProperty(COLOR),
      clampToGround: true,
    },
  });
}

function commitPolygon(viewer: Cesium.Viewer, pts: Cesium.Cartesian3[]) {
  if (pts.length < 3) return;
  viewer.entities.add({
    polygon: {
      hierarchy: new Cesium.PolygonHierarchy([...pts]),
      material: new Cesium.ColorMaterialProperty(FILL),
    },
    polyline: {
      positions: [...pts, pts[0]],
      width: W,
      material: new Cesium.ColorMaterialProperty(COLOR),
      clampToGround: true,
    },
  });
}

function commitRectangle(viewer: Cesium.Viewer, p1: Cesium.Cartesian3, p2: Cesium.Cartesian3) {
  viewer.entities.add({
    rectangle: {
      coordinates: toRect(p1, p2),
      material: new Cesium.ColorMaterialProperty(FILL),
      outline: true,
      outlineColor: COLOR,
      outlineWidth: W,
    },
  });
}

function commitRectLine(viewer: Cesium.Viewer, p1: Cesium.Cartesian3, p2: Cesium.Cartesian3) {
  viewer.entities.add({
    polyline: {
      positions: rectCorners(p1, p2),
      width: W,
      material: new Cesium.ColorMaterialProperty(COLOR),
      clampToGround: true,
    },
  });
}

function commitCircle(viewer: Cesium.Viewer, center: Cesium.Cartesian3, radius: number) {
  viewer.entities.add({
    position: center,
    ellipse: {
      semiMajorAxis: radius,
      semiMinorAxis: radius,
      material: new Cesium.ColorMaterialProperty(FILL),
      outline: true,
      outlineColor: COLOR,
      outlineWidth: W,
    },
  });
}

function commitCircleLine(viewer: Cesium.Viewer, center: Cesium.Cartesian3, radius: number) {
  viewer.entities.add({
    polyline: {
      positions: circlePolylinePositions(center, radius),
      width: W,
      material: new Cesium.ColorMaterialProperty(COLOR),
      clampToGround: true,
    },
  });
}

// ── Strategies ─────────────────────────────────────────────────────────────

const lineStrategy: ToolStrategy = {
  setup(viewer, handler, st, finish) {
    st.previewEntity = viewer.entities.add({
      polyline: {
        positions: new Cesium.CallbackProperty(() => {
          const pts = [...st.positions];
          if (st.mousePos) pts.push(st.mousePos);
          return pts.length >= 2 ? pts : [];
        }, false),
        width: W,
        material: new Cesium.ColorMaterialProperty(PREVIEW),
        clampToGround: true,
      },
    });

    handler.setInputAction(
      (e: Cesium.ScreenSpaceEventHandler.PositionedEvent) => {
        const pos = pickPos(viewer, e.position);
        if (!pos) return;
        st.positions.push(pos);
        if (st.positions.length === 2) { commitLine(viewer, st.positions); finish(); }
      },
      Cesium.ScreenSpaceEventType.LEFT_CLICK,
    );
  },
};

const polylineStrategy: ToolStrategy = {
  setup(viewer, handler, st, finish) {
    st.previewEntity = viewer.entities.add({
      polyline: {
        positions: new Cesium.CallbackProperty(() => {
          const pts = [...st.positions];
          if (st.mousePos) pts.push(st.mousePos);
          return pts.length >= 2 ? pts : [];
        }, false),
        width: W,
        material: new Cesium.ColorMaterialProperty(PREVIEW),
        clampToGround: true,
      },
    });

    handler.setInputAction(
      (e: Cesium.ScreenSpaceEventHandler.PositionedEvent) => {
        const pos = pickPos(viewer, e.position);
        if (pos) st.positions.push(pos);
      },
      Cesium.ScreenSpaceEventType.LEFT_CLICK,
    );
    handler.setInputAction(
      () => { commitLine(viewer, st.positions.slice(0, -1)); finish(); },
      Cesium.ScreenSpaceEventType.LEFT_DOUBLE_CLICK,
    );
    handler.setInputAction(
      () => { commitLine(viewer, st.positions); finish(); },
      Cesium.ScreenSpaceEventType.RIGHT_CLICK,
    );
  },
};

const rectLineStrategy: ToolStrategy = {
  setup(viewer, handler, st, finish) {
    handler.setInputAction(
      (e: Cesium.ScreenSpaceEventHandler.PositionedEvent) => {
        const pos = pickPos(viewer, e.position);
        if (!pos) return;

        if (st.positions.length === 0) {
          st.positions.push(pos);
          st.previewEntity = viewer.entities.add({
            polyline: {
              positions: new Cesium.CallbackProperty(() => {
                if (!st.positions[0] || !st.mousePos) return [];
                return rectCorners(st.positions[0], st.mousePos);
              }, false),
              width: W,
              material: new Cesium.ColorMaterialProperty(PREVIEW),
              clampToGround: true,
            },
          });
        } else {
          commitRectLine(viewer, st.positions[0], pos);
          finish();
        }
      },
      Cesium.ScreenSpaceEventType.LEFT_CLICK,
    );
  },
};

const circleLineStrategy: ToolStrategy = {
  setup(viewer, handler, st, finish) {
    handler.setInputAction(
      (e: Cesium.ScreenSpaceEventHandler.PositionedEvent) => {
        const pos = pickPos(viewer, e.position);
        if (!pos) return;

        if (st.positions.length === 0) {
          st.positions.push(pos);
          st.previewEntity = viewer.entities.add({
            polyline: {
              positions: new Cesium.CallbackProperty(() => {
                if (!st.positions[0] || !st.mousePos) return [];
                const r = Math.max(geodesicDist(st.positions[0], st.mousePos), 1);
                return circlePolylinePositions(st.positions[0], r);
              }, false),
              width: W,
              material: new Cesium.ColorMaterialProperty(PREVIEW),
              clampToGround: true,
            },
          });
        } else {
          commitCircleLine(viewer, st.positions[0],
            Math.max(geodesicDist(st.positions[0], pos), 1));
          finish();
        }
      },
      Cesium.ScreenSpaceEventType.LEFT_CLICK,
    );
  },
};

const polygonStrategy: ToolStrategy = {
  setup(viewer, handler, st, finish) {
    st.previewEntity = viewer.entities.add({
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
          if (pts.length >= 2) pts.push(pts[0]);
          return pts;
        }, false),
        width: W,
        material: new Cesium.ColorMaterialProperty(PREVIEW),
        clampToGround: true,
      },
    });

    handler.setInputAction(
      (e: Cesium.ScreenSpaceEventHandler.PositionedEvent) => {
        const pos = pickPos(viewer, e.position);
        if (pos) st.positions.push(pos);
      },
      Cesium.ScreenSpaceEventType.LEFT_CLICK,
    );
    handler.setInputAction(
      () => { commitPolygon(viewer, st.positions.slice(0, -1)); finish(); },
      Cesium.ScreenSpaceEventType.LEFT_DOUBLE_CLICK,
    );
    handler.setInputAction(
      () => { commitPolygon(viewer, st.positions); finish(); },
      Cesium.ScreenSpaceEventType.RIGHT_CLICK,
    );
  },
};

const rectangleStrategy: ToolStrategy = {
  setup(viewer, handler, st, finish) {
    handler.setInputAction(
      (e: Cesium.ScreenSpaceEventHandler.PositionedEvent) => {
        const pos = pickPos(viewer, e.position);
        if (!pos) return;

        if (st.positions.length === 0) {
          st.positions.push(pos);
          st.previewEntity = viewer.entities.add({
            rectangle: {
              coordinates: new Cesium.CallbackProperty(() => {
                if (!st.positions[0] || !st.mousePos) return new Cesium.Rectangle();
                return toRect(st.positions[0], st.mousePos);
              }, false),
              material: new Cesium.ColorMaterialProperty(FILL),
              outline: true,
              outlineColor: COLOR,
              outlineWidth: W,
            },
          });
        } else {
          commitRectangle(viewer, st.positions[0], pos);
          finish();
        }
      },
      Cesium.ScreenSpaceEventType.LEFT_CLICK,
    );
  },
};

const circleStrategy: ToolStrategy = {
  setup(viewer, handler, st, finish) {
    handler.setInputAction(
      (e: Cesium.ScreenSpaceEventHandler.PositionedEvent) => {
        const pos = pickPos(viewer, e.position);
        if (!pos) return;

        if (st.positions.length === 0) {
          st.positions.push(pos);
          st.previewEntity = viewer.entities.add({
            position: pos,
            ellipse: {
              semiMajorAxis: new Cesium.CallbackProperty(() => {
                if (!st.positions[0] || !st.mousePos) return 1;
                return Math.max(geodesicDist(st.positions[0], st.mousePos), 1);
              }, false),
              semiMinorAxis: new Cesium.CallbackProperty(() => {
                if (!st.positions[0] || !st.mousePos) return 1;
                return Math.max(geodesicDist(st.positions[0], st.mousePos), 1);
              }, false),
              material: new Cesium.ColorMaterialProperty(FILL),
              outline: true,
              outlineColor: COLOR,
              outlineWidth: W,
            },
          });
        } else {
          commitCircle(viewer, st.positions[0],
            Math.max(geodesicDist(st.positions[0], pos), 1));
          finish();
        }
      },
      Cesium.ScreenSpaceEventType.LEFT_CLICK,
    );
  },
};

// ── Registry ───────────────────────────────────────────────────────────────

export const STRATEGIES: Record<DrawTool, ToolStrategy> = {
  line:       lineStrategy,
  polyline:   polylineStrategy,
  rectLine:   rectLineStrategy,
  circleLine: circleLineStrategy,
  polygon:    polygonStrategy,
  rectangle:  rectangleStrategy,
  circle:     circleStrategy,
};
