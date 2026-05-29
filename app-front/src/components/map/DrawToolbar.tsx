import { useEffect, useRef, useState } from "react";
import * as Cesium from "cesium";
import { Minus, Spline, Square, Circle, Hexagon, RectangleHorizontal, Disc } from "lucide-react";
import type { LucideIcon } from "lucide-react";
import { Button } from "@/components/ui/button";
import { STRATEGIES, type DrawTool, type DrawState } from "./drawStrategies";

// ── Tool group definitions ─────────────────────────────────────────────────

interface ToolConfig {
  key: DrawTool;
  icon: LucideIcon;
  title: string;
}

const LINE_TOOLS: ToolConfig[] = [
  { key: "line",       icon: Minus,               title: "線段 — 點 2 下完成" },
  { key: "polyline",   icon: Spline,              title: "折線 — 右鍵完成" },
  { key: "rectLine",   icon: Square,              title: "矩形輪廓 — 點 2 下完成" },
  { key: "circleLine", icon: Circle,              title: "圓輪廓 — 點 2 下完成" },
];

const AREA_TOOLS: ToolConfig[] = [
  { key: "polygon",    icon: Hexagon,             title: "多邊形填充 — 右鍵完成" },
  { key: "rectangle",  icon: RectangleHorizontal, title: "矩形填充 — 點 2 下完成" },
  { key: "circle",     icon: Disc,                title: "圓填充 — 點 2 下完成" },
];

// ── Shared button group UI ─────────────────────────────────────────────────

function ToolGroup({
  label,
  tools,
  activeTool,
  onToolClick,
}: {
  label: string;
  tools: ToolConfig[];
  activeTool: DrawTool | null;
  onToolClick: (key: DrawTool) => void;
}) {
  return (
    <div className="flex flex-col overflow-hidden rounded-lg border bg-background/90 shadow-lg backdrop-blur-sm">
      <div className="border-b px-2 py-0.5 text-center text-[10px] font-medium text-muted-foreground">
        {label}
      </div>
      {tools.map((t, i) => (
        <div key={t.key}>
          {i > 0 && <div className="border-t" />}
          <Button
            variant="ghost"
            size="icon"
            title={t.title}
            onClick={() => onToolClick(t.key)}
            className={
              activeTool === t.key
                ? "rounded-none bg-primary text-primary-foreground hover:bg-primary/90 hover:text-primary-foreground"
                : "rounded-none"
            }
          >
            <t.icon className="size-4" />
          </Button>
        </div>
      ))}
    </div>
  );
}

// ── Component ──────────────────────────────────────────────────────────────

export default function DrawToolbar({ viewer }: { viewer: Cesium.Viewer | null }) {
  const [activeTool, setActiveTool] = useState<DrawTool | null>(null);
  const s = useRef<DrawState>({
    positions: [],
    mousePos: null,
    previewEntity: null,
    vertexMarkers: [],
    handler: null,
  });

  function resetState() {
    const st = s.current;
    if (st.handler) { st.handler.destroy(); st.handler = null; }
    if (viewer && !viewer.isDestroyed()) {
      if (st.previewEntity) viewer.entities.remove(st.previewEntity);
      st.vertexMarkers.forEach(e => viewer.entities.remove(e));
    }
    st.previewEntity = null;
    st.vertexMarkers = [];
    st.positions     = [];
    st.mousePos      = null;
  }

  useEffect(() => {
    resetState();
    if (!viewer || !activeTool) return;

    const st = s.current;
    const handler = new Cesium.ScreenSpaceEventHandler(viewer.scene.canvas);
    st.handler = handler;

    handler.setInputAction(
      (e: Cesium.ScreenSpaceEventHandler.MotionEvent) => {
        st.mousePos = viewer.scene.camera.pickEllipsoid(e.endPosition) ?? null;
      },
      Cesium.ScreenSpaceEventType.MOUSE_MOVE,
    );

    const finish = () => { resetState(); setActiveTool(null); };
    STRATEGIES[activeTool].setup(viewer, handler, st, finish);

    const onKeyDown = (e: KeyboardEvent) => { if (e.key === "Escape") finish(); };
    window.addEventListener("keydown", onKeyDown);

    return () => {
      resetState();
      window.removeEventListener("keydown", onKeyDown);
    };
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [viewer, activeTool]);

  function handleToolClick(key: DrawTool) {
    setActiveTool(prev => (prev === key ? null : key));
  }

  return (
    <div className="flex flex-col gap-2">
      <ToolGroup
        label="線"
        tools={LINE_TOOLS}
        activeTool={activeTool}
        onToolClick={handleToolClick}
      />
      <ToolGroup
        label="面"
        tools={AREA_TOOLS}
        activeTool={activeTool}
        onToolClick={handleToolClick}
      />
    </div>
  );
}
