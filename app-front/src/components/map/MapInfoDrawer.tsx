import { useState } from "react";
import * as Cesium from "cesium";
import { Layers, Info, SlidersHorizontal, X } from "lucide-react";
import { Button } from "@/components/ui/button";
import {
  Drawer,
  DrawerClose,
  DrawerContent,
  DrawerDescription,
  DrawerFooter,
  DrawerHeader,
  DrawerTitle,
  DrawerTrigger,
} from "@/components/ui/drawer";
import CameraInfoContent from "./DrawerContent/CameraInfoContent";
import LayersContent     from "./DrawerContent/LayersContent";
import SettingsContent   from "./DrawerContent/SettingsContent";

type ActivePanel = "camera" | "layers" | "settings";

const PANEL_META: Record<ActivePanel, { title: string; description: string }> = {
  camera:   { title: "相機資訊", description: "目前視角位置與方位" },
  layers:   { title: "圖層管理", description: "目前載入的底圖圖層" },
  settings: { title: "地圖說明", description: "操作方式與快捷鍵" },
};

export default function MapInfoDrawer({ viewer }: { viewer: Cesium.Viewer | null }) {
  const [activePanel, setActivePanel] = useState<ActivePanel>("camera");

  const { title, description } = PANEL_META[activePanel];

  return (
    <Drawer direction="right">
      {/* ── Trigger: button group, bottom-left above LayerSwitcher ── */}
      <div className="absolute bottom-20 left-4 z-10 flex flex-col overflow-hidden rounded-lg border bg-background/90 shadow-lg backdrop-blur-sm">
        <DrawerTrigger asChild>
          <Button variant="ghost" size="icon" title="圖層管理" onClick={() => setActivePanel("layers")}>
            <Layers className="size-4" />
          </Button>
        </DrawerTrigger>
        <div className="border-t" />
        <DrawerTrigger asChild>
          <Button variant="ghost" size="icon" title="相機資訊" onClick={() => setActivePanel("camera")}>
            <Info className="size-4" />
          </Button>
        </DrawerTrigger>
        <div className="border-t" />
        <DrawerTrigger asChild>
          <Button variant="ghost" size="icon" title="地圖說明" onClick={() => setActivePanel("settings")}>
            <SlidersHorizontal className="size-4" />
          </Button>
        </DrawerTrigger>
      </div>

      {/* ── Drawer panel ── */}
      <DrawerContent>
        <DrawerHeader className="flex flex-row items-start justify-between">
          <div>
            <DrawerTitle>{title}</DrawerTitle>
            <DrawerDescription>{description}</DrawerDescription>
          </div>
          <DrawerClose asChild>
            <Button variant="ghost" size="icon" className="-mt-1 -mr-1">
              <X className="size-4" />
            </Button>
          </DrawerClose>
        </DrawerHeader>

        {activePanel === "camera"   && <CameraInfoContent viewer={viewer} />}
        {activePanel === "layers"   && <LayersContent     viewer={viewer} />}
        {activePanel === "settings" && <SettingsContent />}

        <DrawerFooter>
          <DrawerClose asChild>
            <Button variant="outline">關閉</Button>
          </DrawerClose>
        </DrawerFooter>
      </DrawerContent>
    </Drawer>
  );
}
