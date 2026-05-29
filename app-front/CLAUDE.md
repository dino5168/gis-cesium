# app-front

Tauri v2 desktop app — React 19 + TypeScript frontend with a local FastAPI backend.

## Commands

```powershell
# Full Tauri dev window (first Rust compile ~2 min)
pnpm run tauri dev

# Frontend only — Vite at http://localhost:1420 (no Tauri window)
pnpm run dev

# Type-check + bundle frontend
pnpm run build

# Bundle Tauri release installer
pnpm run tauri build

# Add a shadcn component
pnpm dlx shadcn@latest add <component-name>
```

No test runner is configured yet.

## Source Layout

```
app-front/
├── src/
│   ├── main.tsx                        # React root mount
│   ├── App.tsx                         # Root: custom title bar + page switch
│   ├── index.css                       # Tailwind v4 theme tokens (OKLCH)
│   ├── config/
│   │   └── cesium.ts                   # TILE_LAYERS, DEFAULT_LAYER_KEY, INITIAL_CAMERA
│   ├── lib/
│   │   ├── api.ts                      # chatStream() SSE client → backend
│   │   └── utils.ts                    # cn() helper (clsx + tailwind-merge)
│   ├── pages/
│   │   ├── AiChat.tsx                  # Chat UI with streaming & abort
│   │   ├── DocPage.tsx                 # Markdown doc viewer with sidebar
│   │   ├── ToolChat.tsx                # Tool-assisted chat page
│   │   ├── TextbookPage.tsx            # Textbook / lesson browser
│   │   └── DemoCesium.tsx              # CesiumJS 3D map page
│   └── components/
│       ├── sidebar/
│       │   ├── nav-config.ts           # NavItemKey type + NAV_SECTIONS data
│       │   └── AppSidebar.tsx          # Collapsible sidebar, expand/collapse
│       ├── map/
│       │   ├── DrawToolbar.tsx         # Drawing tool button groups (線/面)
│       │   ├── drawStrategies.ts       # Strategy implementations (pure TS)
│       │   ├── LayerSwitcher.tsx       # Tile layer switcher (bottom-left)
│       │   ├── ZoomControl.tsx         # Zoom +/− / reset buttons (top-left)
│       │   └── ScaleBar.tsx            # Geodesic scale bar (bottom-right)
│       └── ui/                         # shadcn components (button, textarea…)
└── src-tauri/
    ├── src/
    │   ├── lib.rs                      # Tauri commands + invoke_handler!
    │   └── main.rs                     # Binary entry point
    ├── tauri.conf.json                 # Window config, CSP, bundle targets
    └── Cargo.toml                      # Rust dependencies
```

## Window & Title Bar

The window is **frameless** (`decorations: false`, `maximized: true` in `tauri.conf.json`). `App.tsx` renders a custom `<header>` that:

- Uses `data-tauri-drag-region` for native dragging.
- Provides minimize / toggle-maximize / close buttons via `@tauri-apps/api/window`.
- Tracks maximize state via `win.onResized()` to swap the maximize/restore icon.

Dark mode: add/remove the `.dark` class on any ancestor element. The CSS custom variant is defined in `index.css`:
```css
@custom-variant dark (&:is(.dark *));
```

## Page Routing

There is no router library. `App.tsx` holds `activeItem: NavItemKey` in state and conditionally renders pages:

```tsx
{activeItem === "chat"     && <AiChat />}
{activeItem === "docs"     && <DocPage bookPath={docBook} />}
{activeItem === "tools"    && <ToolChat />}
{activeItem === "textbook" && <TextbookPage onOpenDoc={openDoc} />}
{activeItem === "cesium"   && <DemoCesium />}
```

`AppSidebar` calls `onActiveChange(key)` on click → `App` swaps the rendered page.

### Adding a New Page

1. Create `src/pages/MyPage.tsx`.
2. Add its key to `NavItemKey` in `nav-config.ts` (extend the union type).
3. Add a nav entry to `NAV_SECTIONS` in `nav-config.ts`.
4. Add i18n keys to both `en.json` and `zh-TW.json`.
5. Add the conditional in `App.tsx`'s `<main>` block.

## Navigation Config (`src/components/sidebar/nav-config.ts`)

`NavItemKey = "chat" | "docs" | "tools" | "textbook" | "cesium"` — keep in sync with `App.tsx`.

`NAV_SECTIONS` is the sidebar data tree. Supports two item shapes:
- **Leaf** — `{ key, label, icon }` — navigates directly on click.
- **Parent** — `{ key, label, icon, children: LeafNavItem[] }` — expands/collapses; child leaves navigate independently.

`isParentNavItem(item)` is the type-guard used by `AppSidebar`.

## Backend API Client (`src/lib/api.ts`)

`API_BASE` is hardcoded to `http://localhost:8000` (FastAPI dev server).

```ts
export async function* chatStream(
  messages: ChatMessage[],
  signal?: AbortSignal,
): AsyncGenerator<ChatChunk>
```

Reads the SSE `text/event-stream` response via `ReadableStream`, accumulates a line buffer, and yields each `data: {...}` line as a parsed `ChatChunk`.

**To add a non-streaming endpoint:** write a plain `async function` that `fetch()`es the endpoint and returns typed data. Do not use Axios — native `fetch` is sufficient.

## CesiumJS Integration

CesiumJS (v1.141.0) is bundled via `vite-plugin-cesium` in `vite.config.ts`. The plugin copies static assets and sets `CESIUM_BASE_URL` automatically — no manual configuration needed.

```ts
// vite.config.ts
import cesium from "vite-plugin-cesium";
plugins: [react(), tailwindcss(), cesium()],
```

Widget CSS must be imported explicitly in the page file:
```ts
import "cesium/Build/Cesium/Widgets/widgets.css";
```

### Viewer Init Pattern

`DemoCesium.tsx` uses a dual ref/state approach:
- `viewerRef` — `useRef<Cesium.Viewer>` for non-reactive internal use.
- `viewer` — `useState<Cesium.Viewer>` passed to child components to trigger re-render when ready.

Key flags to disable Cesium's built-in UI:
```ts
const v = new Cesium.Viewer(containerRef.current, {
  baseLayer: false,          // replaces deprecated imageryProvider: false (v1.104+)
  baseLayerPicker: false,
  animation: false,
  timeline: false,
  navigationHelpButton: false,
  homeButton: false,
  geocoder: false,
  sceneModePicker: false,
  fullscreenButton: false,
  infoBox: false,            // prevents UUID popup when clicking drawn entities
  selectionIndicator: false,
});
v.cesiumWidget.creditContainer.setAttribute("style", "display:none"); // hide watermark
```

## Map Config (`src/config/cesium.ts`)

Central configuration for all map-related constants:

```ts
TILE_LAYERS        // Record<string, TileLayerConfig> — 11 tile providers
TileLayerKey       // keyof typeof TILE_LAYERS
DEFAULT_LAYER_KEY  // "osm"
INITIAL_CAMERA     // { longitude: 121.57, latitude: 25.04, height: 50_000 }
```

Available tile providers: `osm`, `arcgisImagery`, `arcgisHillshade`, `esriOcean`, `stadiaWatercolor`, `stadiaToner`, `stadiaSmooth`, `stadiaSmoothDark`, `cartoDark`, `topo`, `nlscPhoto`.

URL template note: ESRI/NLSC tiles use `{z}/{y}/{x}` order; OSM/Stadia/Carto use `{z}/{x}/{y}`.

## Map Components

All map components accept `{ viewer: Cesium.Viewer | null }` and guard against `null` / destroyed viewers internally.

### LayerSwitcher (`components/map/LayerSwitcher.tsx`)

Position: `absolute bottom-4 left-4 z-10`. Expand/collapse toggle showing current layer name.

On switch: `viewer.imageryLayers.removeAll()` then re-add the selected provider via `UrlTemplateImageryProvider`.

### ZoomControl (`components/map/ZoomControl.tsx`)

Position: `absolute left-4 top-4 z-10`. Three shadcn `Button variant="ghost" size="icon"` buttons:
- **+** → `camera.zoomIn(height * 0.5)`
- **−** → `camera.zoomOut(height)`
- **⊕** → `camera.flyTo(INITIAL_CAMERA, duration: 1)`

### ScaleBar (`components/map/ScaleBar.tsx`)

Position: `absolute bottom-4 right-4 z-10`. Updates on `camera.changed` and initial `scene.postRender`.

Algorithm (geodesic, Cesium forum approach):
1. `camera.getPickRay()` on two adjacent pixels at bottom-center.
2. `globe.pick()` on each ray → two `Cartesian3` points.
3. `EllipsoidGeodesic.surfaceDistance` for accurate surface distance.
4. Snap to nearest value in `DISTANCES_M` (1/2/3/5×10^n series, max bar width 150 px).

Bar style: 4-segment alternating `bg-foreground` / `bg-background` with flex label row (0, mid, end).

### DrawToolbar (`components/map/DrawToolbar.tsx`)

Position: `absolute left-4 top-36 z-10`. Two button groups using `ToolGroup` sub-component:

| Group | Tools |
|-------|-------|
| 線 (outline) | line, polyline, rectLine, circleLine |
| 面 (filled) | polygon, rectangle, circle |

Active tool highlighted with `bg-primary`. Click active tool again to deactivate. ESC key cancels.

State is managed via `useRef<DrawState>` (not useState — avoids re-renders during drawing).

`DrawState`:
```ts
interface DrawState {
  positions: Cesium.Cartesian3[];
  mousePos: Cesium.Cartesian3 | null;
  previewEntity: Cesium.Entity | null;
  handler: Cesium.ScreenSpaceEventHandler | null;
}
```

## Drawing Strategies (`components/map/drawStrategies.ts`)

Pure TypeScript — no React. Implements the Strategy pattern via a `Record<DrawTool, ToolStrategy>` registry.

```ts
export type DrawTool =
  | "line"        // 線段 — 2 clicks
  | "polyline"    // 折線 — right-click or double-click to finish
  | "rectLine"    // 矩形輪廓 — 2 clicks, committed as closed polyline
  | "circleLine"  // 圓輪廓 — 2 clicks, transparent-fill ellipse
  | "polygon"     // 多邊形填充 — right-click or double-click to finish
  | "rectangle"   // 矩形填充 — 2 clicks
  | "circle";     // 圓填充 — 2 clicks
```

```ts
interface ToolStrategy {
  setup(viewer, handler, state, finish): void;
}

export const STRATEGIES: Record<DrawTool, ToolStrategy> = { ... };
```

Key implementation details:
- Preview entities use `CallbackProperty` (polling) for live mouse-follow rendering.
- Double-click event fires LEFT_CLICK twice then LEFT_DOUBLE_CLICK. Use `slice(0, -1)` to drop the duplicate last point (not `slice(0, -2)`).
- `commitRectLine` uses `rectCorners()` helper that returns 5 points (closed loop).
- `commitCircleLine` uses a transparent-fill ellipse with visible outline only.

### Adding a New Draw Tool

1. Add the key to `DrawTool` union in `drawStrategies.ts`.
2. Write a `const myStrategy: ToolStrategy = { setup(...) { ... } }`.
3. Add the entry to `STRATEGIES`.
4. Add a `ToolConfig` entry to `LINE_TOOLS` or `AREA_TOOLS` in `DrawToolbar.tsx`.

## Tauri IPC (`src-tauri/src/lib.rs`)

Call Rust from TypeScript:
```ts
import { invoke } from "@tauri-apps/api/core";
const result = await invoke<string>("greet", { name: "world" });
```

Add a new command:
1. Annotate a Rust function with `#[tauri::command]`.
2. Register it in `tauri::generate_handler![greet, your_new_cmd]` in `lib.rs`.

The current registered command is `greet` (placeholder only).

## Styling

Tailwind v4 is wired via the `@tailwindcss/vite` plugin — **no `tailwind.config.js`**. All theme tokens are CSS custom properties in `index.css` using OKLCH, bridged into Tailwind's `@theme inline` block.

- **shadcn/ui** variables are imported via `@import "shadcn/tailwind.css"`.
- `cn(...classes)` in `src/lib/utils.ts` — standard clsx + tailwind-merge helper.
- Components from shadcn land in `src/components/ui/`.
- `@/` alias resolves to `src/` (TypeScript `paths` + Vite `resolve.alias`).

### Theme Tokens

Token categories in `index.css`: `background`, `foreground`, `card`, `popover`, `primary`, `secondary`, `muted`, `accent`, `destructive`, `border`, `input`, `ring`, `chart-1…5`, `sidebar-*`, `radius`.

Both `:root` (light) and `.dark` variants are defined.

## Key Constraints

- Vite dev server **must** run on port **1420** — Tauri hardcodes this.
- CSP is currently `null` in `tauri.conf.json` — tighten before production.
- `strict: true` TypeScript — `any` is prohibited; `noUnusedLocals` and `noUnusedParameters` are on.
- `infoBox: false` and `selectionIndicator: false` are required in Viewer init — without them, clicking any drawn entity opens a UUID popup.
