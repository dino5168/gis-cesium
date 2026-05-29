import { useEffect, useRef, useState } from "react";
import * as Cesium from "cesium";
import "cesium/Build/Cesium/Widgets/widgets.css";
import { TILE_LAYERS, DEFAULT_LAYER_KEY, INITIAL_CAMERA } from "@/config/cesium";
import LayerSwitcher from "@/components/map/LayerSwitcher";
import ZoomControl from "@/components/map/ZoomControl";
import ScaleBar from "@/components/map/ScaleBar";
import DrawToolbar from "@/components/map/DrawToolbar";
import MeasureToolbar from "@/components/map/MeasureToolbar";
import CompassWidget from "@/components/map/CompassWidget";
import MapInfoDrawer from "@/components/map/MapInfoDrawer";
import CoordDisplay from "@/components/map/CoordDisplay";

export default function DemoCesium() {
  const containerRef = useRef<HTMLDivElement>(null);
  const viewerRef = useRef<Cesium.Viewer | null>(null);
  const [viewer, setViewer] = useState<Cesium.Viewer | null>(null);

  useEffect(() => {
    if (!containerRef.current || viewerRef.current) return;

    const v = new Cesium.Viewer(containerRef.current, {
      baseLayer: false,
      baseLayerPicker: false,
      terrainProvider: undefined,
      animation: false,
      timeline: false,
      navigationHelpButton: false,
      homeButton: false,
      geocoder: false,
      sceneModePicker: false,
      fullscreenButton: false,
      infoBox: false,            // 關閉 entity 點擊彈窗（避免顯示 UUID）
      selectionIndicator: false, // 關閉 entity 選取框
    });

    v.cesiumWidget.creditContainer.setAttribute("style", "display:none");

    const defaultCfg = TILE_LAYERS[DEFAULT_LAYER_KEY];
    v.imageryLayers.add(
      new Cesium.ImageryLayer(
        new Cesium.UrlTemplateImageryProvider({
          url: defaultCfg.url,
          subdomains: [...defaultCfg.subdomains],
          minimumLevel: defaultCfg.minimumLevel,
          maximumLevel: defaultCfg.maximumLevel,
          credit: defaultCfg.credit,
        }),
      ),
    );

    v.camera.flyTo({
      destination: Cesium.Cartesian3.fromDegrees(
        INITIAL_CAMERA.longitude,
        INITIAL_CAMERA.latitude,
        INITIAL_CAMERA.height,
      ),
      duration: 0,
    });

    viewerRef.current = v;
    setViewer(v);

    return () => {
      if (viewerRef.current && !viewerRef.current.isDestroyed()) {
        viewerRef.current.destroy();
        viewerRef.current = null;
      }
      setViewer(null);
    };
  }, []);

  return (
    <div className="relative h-full w-full">
      <div ref={containerRef} className="h-full w-full" />
      <ZoomControl viewer={viewer} />
      {/* Draw + Measure toolbars share the same left column */}
      <div className="absolute left-4 top-36 z-10 flex flex-col gap-2">
        <DrawToolbar viewer={viewer} />
        <MeasureToolbar viewer={viewer} />
      </div>
      <CompassWidget viewer={viewer} />
      <MapInfoDrawer viewer={viewer} />
      <LayerSwitcher viewer={viewer} />
      <ScaleBar viewer={viewer} />
      <CoordDisplay viewer={viewer} />
    </div>
  );
}
