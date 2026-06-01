use geojson::{Feature, FeatureCollection, GeoJson, Geometry, Value};
use serde_json::{Map, Value as JsonValue};
use std::path::Path;

#[tauri::command]
pub fn read_shapefile(path: String, srs: String) -> Result<String, String> {
    // For EPSG:4326 keep the .prj guard; for EPSG:3826 we transform, so skip it.
    if srs == "EPSG:4326" {
        check_crs(&path)?;
    }

    let needs_transform = srs == "EPSG:3826";

    let mut reader = shapefile::Reader::from_path(&path)
        .map_err(|e| format!("無法開啟 shapefile：{e}"))?;

    const MAX_FEATURES: usize = 100_000;
    let mut features: Vec<Feature> = Vec::new();

    for result in reader.iter_shapes_and_records() {
        if features.len() >= MAX_FEATURES {
            return Err(format!(
                "圖層資料量超過上限（{MAX_FEATURES} 筆），載入已中止。\
                 請先以 GIS 軟體篩選後再載入。"
            ));
        }
        let Ok((shape, record)) = result else { continue };
        let Some(raw) = shape_to_value(shape) else { continue };
        let value = if needs_transform {
            transform_coords(raw, &tm2_to_wgs84)
        } else {
            raw
        };
        features.push(Feature {
            bbox: None,
            geometry: Some(Geometry::new(value)),
            id: None,
            properties: Some(record_to_properties(record)),
            foreign_members: None,
        });
    }

    let collection = FeatureCollection {
        bbox: None,
        features,
        foreign_members: None,
    };

    serde_json::to_string(&GeoJson::FeatureCollection(collection))
        .map_err(|e| format!("JSON 序列化失敗：{e}"))
}

// ── EPSG:3826 (TWD97 / TM2 zone 121) → EPSG:4326 ─────────────────────────────
// Implements EPSG GN7-2 §1.3.1 inverse Transverse Mercator.
// TWD97 datum ≡ WGS84 for practical purposes (shift < 1 m).
fn tm2_to_wgs84(easting: f64, northing: f64) -> (f64, f64) {
    const DEG: f64 = std::f64::consts::PI / 180.0;

    // GRS80 parameters (EPSG:3826)
    let a: f64 = 6_378_137.0;
    let f: f64 = 1.0 / 298.257_222_101;
    let k0: f64 = 0.999_9;
    let lambda0: f64 = 121.0 * DEG; // central meridian
    let fe: f64 = 250_000.0;        // false easting; false northing = 0

    let e2 = 2.0 * f - f * f;
    let ep2 = e2 / (1.0 - e2); // e'²

    // e₁ for footprint-latitude series
    let e1 = (1.0 - (1.0 - e2).sqrt()) / (1.0 + (1.0 - e2).sqrt());

    // Meridian arc denominator (latitude of origin = 0 → M₀ = 0)
    let m_denom = a * (1.0 - e2 / 4.0 - 3.0 * e2 * e2 / 64.0 - 5.0 * e2 * e2 * e2 / 256.0);
    let mu = northing / (k0 * m_denom); // northing = N - FN (FN = 0)

    // Footprint latitude φ₁ (Helmert series)
    let e1_2 = e1 * e1;
    let e1_3 = e1_2 * e1;
    let e1_4 = e1_3 * e1;
    let phi1 = mu
        + (3.0 * e1 / 2.0 - 27.0 * e1_3 / 32.0) * (2.0 * mu).sin()
        + (21.0 * e1_2 / 16.0 - 55.0 * e1_4 / 32.0) * (4.0 * mu).sin()
        + (151.0 * e1_3 / 96.0) * (6.0 * mu).sin()
        + (1097.0 * e1_4 / 512.0) * (8.0 * mu).sin();

    let sin1 = phi1.sin();
    let cos1 = phi1.cos();
    let tan1 = phi1.tan();
    let t1 = tan1 * tan1;
    let c1 = ep2 * cos1 * cos1;
    let w = 1.0 - e2 * sin1 * sin1;
    let nu1 = a / w.sqrt();          // radius of curvature, prime vertical
    let rho1 = a * (1.0 - e2) / w.powf(1.5); // radius of curvature, meridian

    let d = (easting - fe) / (nu1 * k0);
    let d2 = d * d;
    let d3 = d2 * d;
    let d4 = d3 * d;
    let d5 = d4 * d;
    let d6 = d5 * d;

    // Latitude φ
    let phi = phi1
        - (nu1 * tan1 / rho1)
            * (d2 / 2.0
                - (5.0 + 3.0 * t1 + 10.0 * c1 - 4.0 * c1 * c1 - 9.0 * ep2) * d4 / 24.0
                + (61.0 + 90.0 * t1 + 298.0 * c1 + 45.0 * t1 * t1
                    - 252.0 * ep2
                    - 3.0 * c1 * c1)
                    * d6
                    / 720.0);

    // Longitude λ
    let lambda = lambda0
        + (d - (1.0 + 2.0 * t1 + c1) * d3 / 6.0
            + (5.0 - 2.0 * c1 + 28.0 * t1 - 3.0 * c1 * c1 + 8.0 * ep2 + 24.0 * t1 * t1) * d5
                / 120.0)
            / cos1;

    (lambda / DEG, phi / DEG) // (longitude°, latitude°)
}

// ── Walk a GeoJSON Value tree and apply a coordinate transform ────────────────
fn transform_coords(value: Value, proj: &impl Fn(f64, f64) -> (f64, f64)) -> Value {
    let pt = |c: Vec<f64>| -> Vec<f64> {
        let (x, y) = proj(c[0], c[1]);
        vec![x, y]
    };
    match value {
        Value::Point(c) => Value::Point(pt(c)),
        Value::MultiPoint(cs) => Value::MultiPoint(cs.into_iter().map(pt).collect()),
        Value::LineString(cs) => Value::LineString(cs.into_iter().map(pt).collect()),
        Value::MultiLineString(lines) => Value::MultiLineString(
            lines.into_iter().map(|l| l.into_iter().map(pt).collect()).collect(),
        ),
        Value::Polygon(rings) => Value::Polygon(
            rings.into_iter().map(|r| r.into_iter().map(pt).collect()).collect(),
        ),
        Value::MultiPolygon(polys) => Value::MultiPolygon(
            polys
                .into_iter()
                .map(|poly| poly.into_iter().map(|r| r.into_iter().map(pt).collect()).collect())
                .collect(),
        ),
        other => other,
    }
}

// ── CRS guard (only invoked for EPSG:4326 path) ───────────────────────────────
fn check_crs(shp_path: &str) -> Result<(), String> {
    let prj_path = Path::new(shp_path).with_extension("prj");
    if !prj_path.exists() {
        return Ok(());
    }
    let content = std::fs::read_to_string(&prj_path)
        .map_err(|e| format!("無法讀取 .prj：{e}"))?;
    let upper = content.to_uppercase();
    if upper.contains("WGS_1984")
        || upper.contains("WGS 1984")
        || upper.contains("WGS84")
        || upper.contains("EPSG:4326")
    {
        return Ok(());
    }
    Err(format!(
        "座標系非 WGS84，無法正確顯示。\
         請切換為 EPSG:3826 或先將資料轉換為 EPSG:4326。\n.prj：{}",
        content.chars().take(200).collect::<String>()
    ))
}

// ── Shape → GeoJSON Value ─────────────────────────────────────────────────────
fn shape_to_value(shape: shapefile::Shape) -> Option<Value> {
    use shapefile::Shape;
    match shape {
        Shape::NullShape => None,
        Shape::Point(p) => Some(Value::Point(vec![p.x, p.y])),
        Shape::PointM(p) => Some(Value::Point(vec![p.x, p.y])),
        Shape::PointZ(p) => Some(Value::Point(vec![p.x, p.y, p.z])),
        Shape::Multipoint(mp) => {
            let coords = mp.points().iter().map(|p| vec![p.x, p.y]).collect();
            Some(Value::MultiPoint(coords))
        }
        Shape::MultipointM(mp) => {
            let coords = mp.points().iter().map(|p| vec![p.x, p.y]).collect();
            Some(Value::MultiPoint(coords))
        }
        Shape::MultipointZ(mp) => {
            let coords = mp.points().iter().map(|p| vec![p.x, p.y]).collect();
            Some(Value::MultiPoint(coords))
        }
        Shape::Polyline(pl) => {
            let lines: Vec<Vec<Vec<f64>>> = pl
                .parts()
                .iter()
                .map(|part| part.iter().map(|p| vec![p.x, p.y]).collect())
                .collect();
            match lines.len() {
                1 => Some(Value::LineString(lines.into_iter().next().unwrap())),
                _ => Some(Value::MultiLineString(lines)),
            }
        }
        Shape::PolylineM(pl) => {
            let lines = pl
                .parts()
                .iter()
                .map(|part| part.iter().map(|p| vec![p.x, p.y]).collect())
                .collect();
            Some(Value::MultiLineString(lines))
        }
        Shape::PolylineZ(pl) => {
            let lines = pl
                .parts()
                .iter()
                .map(|part| part.iter().map(|p| vec![p.x, p.y]).collect())
                .collect();
            Some(Value::MultiLineString(lines))
        }
        Shape::Polygon(pg) => rings_to_geojson(pg.rings().iter().map(|r| match r {
            shapefile::PolygonRing::Outer(pts) => {
                (false, pts.iter().map(|p| vec![p.x, p.y]).collect::<Vec<_>>())
            }
            shapefile::PolygonRing::Inner(pts) => {
                (true, pts.iter().map(|p| vec![p.x, p.y]).collect())
            }
        })),
        Shape::PolygonM(pg) => rings_to_geojson(pg.rings().iter().map(|r| match r {
            shapefile::PolygonRing::Outer(pts) => {
                (false, pts.iter().map(|p| vec![p.x, p.y]).collect::<Vec<_>>())
            }
            shapefile::PolygonRing::Inner(pts) => {
                (true, pts.iter().map(|p| vec![p.x, p.y]).collect())
            }
        })),
        Shape::PolygonZ(pg) => rings_to_geojson(pg.rings().iter().map(|r| match r {
            shapefile::PolygonRing::Outer(pts) => {
                (false, pts.iter().map(|p| vec![p.x, p.y]).collect::<Vec<_>>())
            }
            shapefile::PolygonRing::Inner(pts) => {
                (true, pts.iter().map(|p| vec![p.x, p.y]).collect())
            }
        })),
        Shape::Multipatch(_) => None,
    }
}

fn rings_to_geojson(
    rings: impl Iterator<Item = (bool, Vec<Vec<f64>>)>,
) -> Option<Value> {
    let mut polygons: Vec<Vec<Vec<Vec<f64>>>> = Vec::new();
    for (is_inner, coords) in rings {
        if is_inner {
            if let Some(last) = polygons.last_mut() {
                last.push(coords);
            }
        } else {
            polygons.push(vec![coords]);
        }
    }
    match polygons.len() {
        0 => None,
        1 => Some(Value::Polygon(polygons.into_iter().next().unwrap())),
        _ => Some(Value::MultiPolygon(polygons)),
    }
}

// ── DBF record → JSON properties ─────────────────────────────────────────────
fn record_to_properties(record: shapefile::dbase::Record) -> Map<String, JsonValue> {
    record
        .into_iter()
        .map(|(name, value)| (name, field_to_json(value)))
        .collect()
}

fn field_to_json(v: shapefile::dbase::FieldValue) -> JsonValue {
    use shapefile::dbase::FieldValue;
    match v {
        FieldValue::Character(s) => s.map(JsonValue::String).unwrap_or(JsonValue::Null),
        FieldValue::Numeric(n) => n.map(|v| serde_json::json!(v)).unwrap_or(JsonValue::Null),
        FieldValue::Logical(b) => b.map(JsonValue::Bool).unwrap_or(JsonValue::Null),
        FieldValue::Date(d) => d
            .map(|date| {
                JsonValue::String(format!(
                    "{:04}-{:02}-{:02}",
                    date.year(),
                    date.month(),
                    date.day()
                ))
            })
            .unwrap_or(JsonValue::Null),
        FieldValue::Float(f) => f.map(|v| serde_json::json!(v)).unwrap_or(JsonValue::Null),
        FieldValue::Integer(i) => serde_json::json!(i),
        FieldValue::Currency(c) => serde_json::json!(c),
        FieldValue::Double(d) => serde_json::json!(d),
        FieldValue::DateTime(dt) => {
            let d = dt.date();
            let t = dt.time();
            JsonValue::String(format!(
                "{:04}-{:02}-{:02}T{:02}:{:02}:{:02}",
                d.year(),
                d.month(),
                d.day(),
                t.hours(),
                t.minutes(),
                t.seconds()
            ))
        }
        FieldValue::Memo(s) => JsonValue::String(s),
        #[allow(unreachable_patterns)]
        _ => JsonValue::Null,
    }
}
