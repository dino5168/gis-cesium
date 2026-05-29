import * as Cesium from "cesium";

// ── Picking ────────────────────────────────────────────────────────────────

export function pickPos(
  viewer: Cesium.Viewer,
  px: Cesium.Cartesian2,
): Cesium.Cartesian3 | undefined {
  return viewer.scene.camera.pickEllipsoid(px, viewer.scene.globe.ellipsoid);
}

// ── Distance ───────────────────────────────────────────────────────────────

export function geodesicDist(a: Cesium.Cartesian3, b: Cesium.Cartesian3): number {
  const ca = Cesium.Cartographic.fromCartesian(a);
  const cb = Cesium.Cartographic.fromCartesian(b);
  return new Cesium.EllipsoidGeodesic(ca, cb).surfaceDistance;
}

// ── Rectangle ──────────────────────────────────────────────────────────────

export function toRect(p1: Cesium.Cartesian3, p2: Cesium.Cartesian3): Cesium.Rectangle {
  const c1 = Cesium.Cartographic.fromCartesian(p1);
  const c2 = Cesium.Cartographic.fromCartesian(p2);
  return new Cesium.Rectangle(
    Math.min(c1.longitude, c2.longitude),
    Math.min(c1.latitude,  c2.latitude),
    Math.max(c1.longitude, c2.longitude),
    Math.max(c1.latitude,  c2.latitude),
  );
}

/** 矩形四個角點，形成閉合迴圈（供 polyline 使用） */
export function rectCorners(p1: Cesium.Cartesian3, p2: Cesium.Cartesian3): Cesium.Cartesian3[] {
  const c1 = Cesium.Cartographic.fromCartesian(p1);
  const c2 = Cesium.Cartographic.fromCartesian(p2);
  const fromRad = Cesium.Cartesian3.fromRadians;
  return [
    fromRad(c1.longitude, c1.latitude),
    fromRad(c2.longitude, c1.latitude),
    fromRad(c2.longitude, c2.latitude),
    fromRad(c1.longitude, c2.latitude),
    fromRad(c1.longitude, c1.latitude), // 閉合
  ];
}

// ── Circle ─────────────────────────────────────────────────────────────────

/** 以 ENU 局部座標系生成圓形閉合點列（供 polyline 使用） */
export function circlePolylinePositions(
  center: Cesium.Cartesian3,
  radius: number,
  segments = 64,
): Cesium.Cartesian3[] {
  const transform = Cesium.Transforms.eastNorthUpToFixedFrame(center);
  const pts: Cesium.Cartesian3[] = [];
  for (let i = 0; i <= segments; i++) {
    const angle = (i / segments) * Cesium.Math.TWO_PI;
    const local = new Cesium.Cartesian3(Math.cos(angle) * radius, Math.sin(angle) * radius, 0);
    pts.push(Cesium.Matrix4.multiplyByPoint(transform, local, new Cesium.Cartesian3()));
  }
  return pts;
}

// ── Area ───────────────────────────────────────────────────────────────────

export function centroid(pts: Cesium.Cartesian3[]): Cesium.Cartesian3 {
  const c = new Cesium.Cartesian3();
  pts.forEach(p => Cesium.Cartesian3.add(c, p, c));
  return Cesium.Cartesian3.multiplyByScalar(c, 1 / pts.length, new Cesium.Cartesian3());
}

/** ENU 投影 + Shoelace 公式（對典型 GIS 尺度精度足夠） */
export function computeArea(pts: Cesium.Cartesian3[]): number {
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

// ── Format ─────────────────────────────────────────────────────────────────

export function fmtDist(m: number): string {
  return m >= 1000 ? `${(m / 1000).toFixed(2)} km` : `${m.toFixed(0)} m`;
}

export function fmtArea(m2: number): string {
  return m2 >= 1_000_000
    ? `${(m2 / 1_000_000).toFixed(2)} km²`
    : `${m2.toFixed(2)} m²`;
}
