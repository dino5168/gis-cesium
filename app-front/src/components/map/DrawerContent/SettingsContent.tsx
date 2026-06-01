export default function SettingsContent() {
  return (
    <div className="no-scrollbar overflow-y-auto px-4">
      <p className="mb-2 text-xs font-semibold uppercase tracking-wide text-muted-foreground">
        說明
      </p>
      <div className="mb-4 space-y-2 rounded-lg border bg-muted/30 p-3">
        <p className="text-xs leading-relaxed text-muted-foreground">
          使用滑鼠左鍵拖曳平移地圖，右鍵或中鍵旋轉視角，滾輪縮放。
        </p>
        <p className="text-xs leading-relaxed text-muted-foreground">
          左側工具列可切換繪圖工具，右上角羅盤可旋轉並重設正北方向。
        </p>
      </div>
    </div>
  );
}
