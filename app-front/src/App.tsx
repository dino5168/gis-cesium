import { useState, useEffect, useCallback } from "react";
import { useTranslation } from "react-i18next";
import { getCurrentWindow } from "@tauri-apps/api/window";
import { Bot, Minus, Maximize2, Minimize2, X } from "lucide-react";
import { AppSidebar } from "@/components/sidebar/AppSidebar";
import { TooltipProvider } from "@/components/ui/tooltip";
import AiChat from "@/pages/AiChat";
import DocPage from "@/pages/DocPage";
import ToolChat from "@/pages/ToolChat";
import TextbookPage from "@/pages/TextbookPage";
import DemoCesium from "@/pages/DemoCesium";
import type { NavItemKey } from "@/components/sidebar/nav-config";

export default function App() {
  const { t } = useTranslation();
  const [activeItem, setActiveItem] = useState<NavItemKey>("chat");
  const [docBook, setDocBook] = useState("Claude-Code-使用手冊");
  const [isMaximized, setIsMaximized] = useState(true);

  const openDoc = useCallback((slug: string) => {
    setDocBook(slug);
    setActiveItem("docs");
  }, []);

  useEffect(() => {
    const win = getCurrentWindow();
    void win.isMaximized().then(setIsMaximized);
    let unlisten: (() => void) | undefined;
    void win.onResized(() => { void win.isMaximized().then(setIsMaximized); })
      .then((fn) => { unlisten = fn; });
    return () => { unlisten?.(); };
  }, []);

  return (
    <TooltipProvider delayDuration={300}>
    <div className="flex h-screen flex-col overflow-hidden">
      {/* Title bar */}
      <header
        data-tauri-drag-region
        className="flex h-10 shrink-0 select-none items-center border-b bg-background"
      >
        <div className="flex items-center gap-2 px-4 pointer-events-none">
          <Bot className="size-4 text-muted-foreground" />
          <span className="text-sm font-medium">{t("sidebar.companyName")}</span>
        </div>

        <div className="flex-1" data-tauri-drag-region />

        {/* Window controls */}
        <div className="flex items-center">
          <button
            onClick={() => void getCurrentWindow().minimize()}
            className="flex h-10 w-12 items-center justify-center text-muted-foreground transition-colors hover:bg-muted hover:text-foreground"
            aria-label="Minimize"
          >
            <Minus className="size-3.5" />
          </button>
          <button
            onClick={() => void getCurrentWindow().toggleMaximize()}
            className="flex h-10 w-12 items-center justify-center text-muted-foreground transition-colors hover:bg-muted hover:text-foreground"
            aria-label={isMaximized ? "Restore" : "Maximize"}
          >
            {isMaximized ? <Minimize2 className="size-3.5" /> : <Maximize2 className="size-3.5" />}
          </button>
          <button
            onClick={() => void getCurrentWindow().close()}
            className="flex h-10 w-12 items-center justify-center text-muted-foreground transition-colors hover:bg-destructive hover:text-white"
            aria-label="Close"
          >
            <X className="size-3.5" />
          </button>
        </div>
      </header>

      {/* Body */}
      <div className="flex flex-1 overflow-hidden">
        <AppSidebar activeItem={activeItem} onActiveChange={setActiveItem} />
        <main className="flex-1 overflow-hidden">
          {activeItem === "chat"     && <AiChat />}
          {activeItem === "docs"     && <DocPage bookPath={docBook} />}
          {activeItem === "tools"    && <ToolChat />}
          {activeItem === "textbook" && <TextbookPage onOpenDoc={openDoc} />}
          {activeItem === "cesium"   && <DemoCesium />}
        </main>
      </div>
    </div>
    </TooltipProvider>
  );
}
