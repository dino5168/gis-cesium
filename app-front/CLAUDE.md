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
│   ├── App.tsx                         # Root: custom title bar + page router
│   ├── index.css                       # Tailwind v4 theme tokens (OKLCH)
│   ├── lib/
│   │   ├── api.ts                      # chatStream() SSE client → backend
│   │   └── utils.ts                    # cn() helper (clsx + tailwind-merge)
│   ├── pages/
│   │   └── AiChat.tsx                  # Chat UI with streaming & abort
│   └── components/
│       ├── sidebar/
│       │   ├── nav-config.ts           # NavItemKey type + NAV_SECTIONS data
│       │   └── AppSidebar.tsx          # Collapsible sidebar, expand/collapse
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

There is no router library. `App.tsx` holds `activeItem: NavItemKey` in state and maps it to a component in `PAGES`:

```ts
const PAGES: Record<NavItemKey, React.ReactNode> = {
  chat: <AiChat />,
};
```

`AppSidebar` calls `onActiveChange(key)` on click → `App` swaps the rendered page.

### Adding a New Page

1. Create `src/pages/MyPage.tsx`.
2. Add its key to `NavItemKey` in `nav-config.ts` (extend the union type).
3. Add a nav entry to `NAV_SECTIONS` in `nav-config.ts`.
4. Add the mapping in `App.tsx`'s `PAGES` record.

## Navigation Config (`src/components/sidebar/nav-config.ts`)

`NavItemKey` is the union of all valid page keys — keep it in sync with `PAGES`.

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

## AiChat Page (`src/pages/AiChat.tsx`)

State:
- `messages: Message[]` — full conversation history rendered in the bubble list.
- `input: string` — textarea value.
- `streaming: boolean` — gate to prevent concurrent sends.
- `error: string | null` — shown in a banner above the input bar.

Key refs:
- `scrollRef` — scrolls to bottom after every message update.
- `abortRef` — holds the `AbortController`; set on send, cleared in `finally`.
- `streamingIdRef` — tracks the in-flight assistant bubble id for the blinking cursor.

`send()` flow:
1. Snapshots `history` from current messages + new user message.
2. Appends `userMsg` + empty `assistantMsg` to state.
3. Iterates `chatStream(history)` and appends each chunk to the assistant bubble via functional update.
4. On `AbortError` — silently ignored (user-initiated stop).
5. On other errors — sets `error` and removes the empty assistant bubble.

`Enter` sends; `Shift+Enter` inserts a newline.

## Tauri IPC (`src-tauri/src/lib.rs`)

Call Rust from TypeScript:
```ts
import { invoke } from "@tauri-apps/api/core";
const result = await invoke<string>("greet", { name: "world" });
```

Add a new command:
1. Annotate a Rust function with `#[tauri::command]`.
2. Register it in `tauri::generate_handler![greet, your_new_cmd]` in `lib.rs`.

The current registered command is `greet` (returns a greeting string — placeholder only).

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
