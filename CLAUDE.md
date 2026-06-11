# Stash — Development Guide

## Project Overview

Stash is a minimalist, offline-first macOS app for saving, organizing, and using AI prompts.
Built with Tauri v2 (Rust backend) + React 19 + TypeScript + Tailwind v4 (frontend).

Core philosophy: prompts are first-class citizens, not text files. Every prompt has structure
(variables, collection, tags, notes) and is designed to be used, not just stored.

Reference app: ./scratch/ (local clone of github.com/erictli/scratch) — before making any
changes, read and study:
- ./scratch/src/App.css (theming system)
- ./scratch/src/components/command-palette/CommandPalette.tsx (palette implementation)
- ./scratch/src-tauri/tauri.conf.json (macOS native window config)
- ./scratch/src-tauri/src/lib.rs (Rust backend patterns)
- ./scratch/src/types/note.ts (data model patterns)

## Commands

```bash
npm run dev          # Start Vite dev server only
npm run tauri dev    # Run full app in development mode
npm run build        # Build frontend (tsc + vite)
npm run tauri build  # Build production app
npm run tauri icon <file.png>  # Regenerate all icon sizes from a 1024x1024 PNG
```

## Stack

- Tauri v2 + Rust backend (all file I/O and clipboard via invoke())
- React 19 + TypeScript (strict)
- Tailwind v4 (CSS custom properties via @theme)
- Radix UI (dialogs, menus, tooltips)
- Sonner (toasts)
- @tauri-apps/plugin-clipboard-manager (copying prompts)
- @tauri-apps/plugin-global-shortcut (global ⌘⇧P palette shortcut)
- @phosphor-icons/react (icons)

NOT used (unlike Scratch): TipTap, Tantivy, dnd-kit, git integration.
Search is handled in JS over the in-memory prompt list.

## Architecture

### Frontend → Backend boundary
All persistence and clipboard operations go through Tauri commands via `invoke()`.
Frontend never reads/writes files directly.

```typescript
import { invoke } from "@tauri-apps/api/core";

const prompts = await invoke<Prompt[]>("list_prompts");
await invoke("save_prompt", { prompt });
await invoke("copy_to_clipboard", { text: resolvedContent });
```

### Data model

```typescript
interface Prompt {
  id: string;                    // UUID
  title: string;
  content: string;               // Raw text with {{variable}} placeholders
  collectionId: string | null;
  tags: string[];
  modelTarget: string;           // "claude-sonnet" | "claude-opus" | "gpt-4o" | "gemini" | "any"
  isPinned: boolean;             // was isFavorite — serde alias handles old JSON
  createdAt: number;             // Unix timestamp
  updatedAt: number;
  lastUsedAt: number | null;
  useCount: number;
  notes: string;
}

// NOTE: Versioning is out of scope for v1. The Rust struct still has a `versions` field
// with `#[serde(default)]` for backwards compatibility, but it is not used in the frontend.

interface Collection {
  id: string;
  name: string;
  color: string;                 // Hex — used as dot color in sidebar
}
```

### Settings model (persisted to `{APP_DATA}/settings.json`)

```typescript
interface AppSettings {
  theme: "light" | "dark" | "system";   // default: "system"
  globalShortcut: string;               // default: "Super+Shift+KeyP"
  dataDir: string | null;               // default: null → resolves to the app data dir
}
```

### Storage
`stash.json` is stored in the app data directory by default (`{APP_DATA}` —
`~/Library/Application Support/com.stash.app/` on macOS). This avoids the macOS privacy
prompt that appears when an app touches `~/Documents` unprompted. The user can change this
path from Settings > Data (via the system folder picker, which grants access without a
prompt); the custom path is persisted as `dataDir`
in `settings.json`. Structure: `{ prompts: Prompt[], collections: Collection[], tags: string[], version: number }`.
Tags persist independently of prompts: deleting the last prompt that uses a tag does NOT
delete the tag. The `tags` field has `#[serde(default)]` for backwards compat; `list_tags`
merges stored tags with any found on prompts.
Settings stored separately at `{APP_DATA}/settings.json` (always fixed location).
Never store to localStorage or sessionStorage.

### Context pattern (dual context, same as Scratch)

```typescript
const PromptsDataContext = createContext<PromptsData>(...)
const PromptsActionsContext = createContext<PromptsActions>(...)

function usePromptsData() { return useContext(PromptsDataContext) }
function usePromptsActions() { return useContext(PromptsActionsContext) }
```

## Layout

Default 3-panel layout:

| Panel | Width | Component |
|---|---|---|
| Sidebar | 220px | `collections/Sidebar.tsx` |
| Prompt list | 284px | `prompt-list/PromptList.tsx` |
| Prompt detail | flex: 1 | `prompt-detail/PromptDetail.tsx` |

When `activeCollectionId === "library"`, the center + detail panels are replaced by
`LibraryPanel` (full-width). The sidebar remains visible.

Full-width titlebar strip (`h-[52px]`) sits above the panels in `App.tsx` — never add
per-panel drag regions, only the top-level strip uses `data-tauri-drag-region`.

## Windows

Only **two** native windows are defined in `tauri.conf.json`:

| Label | Purpose |
|---|---|
| `main` | Main app (1080×720, visible: false until data loads) |
| `palette` | Global search palette (640×420, transparent, always-on-top) |

**Settings is NOT a separate window** — it's an in-app modal overlay rendered inside `AppShell`
via React state (`settingsOpen`). Backdrop: `rgba(0,0,0,0.35)` + `backdrop-filter: blur(6px)`.

## Key Components

```
src/
  assets/
    empty-state-prompts.png       # Illustration for empty prompt list (light)
    dark-empty-state-prompts.png  # Illustration for empty prompt list (dark)
    about.png                     # Squirrel illustration used in Settings > About
    library.png                   # Hero illustration for the Library panel
    icono.png                     # Source app icon (1024x1024, rounded corners)
  components/
    search/
      SearchSpotlight.tsx         # ⌘F search overlay
    prompt-list/
      PromptList.tsx              # Center panel — header (view title + New prompt), filtered list, empty state
      PromptCard.tsx              # Single prompt row (title + optional pin)
    prompt-detail/
      PromptDetail.tsx            # Right panel — title, content, notes, actions
      VariableEditor.tsx          # contenteditable editor with inline {{variable}} chips
    collections/
      Sidebar.tsx                 # Left panel — collections, quick views, search, settings
    global-palette/
      GlobalPalette.tsx           # Floating palette opened via ⌘⇧P from any app
    warm-up/
      WarmUp.tsx                  # Variable-filling modal shown before copying a prompt
    settings/
      Settings.tsx                # In-app settings modal (4 sections: Appearance, Shortcuts, Data, About)
    library/
      LibraryPanel.tsx            # Full-width panel replacing center+detail when Library is active
      TemplateModal.tsx           # Preview/import modal for a single template
    ui/
      index.tsx                   # IconButton, Tooltip, ConfirmDialog
  context/
    PromptsContext.tsx            # Dual context (data + actions)
    ThemeContext.tsx              # Light/dark/system theme, persisted to settings.json
  services/
    storage.ts                    # invoke() wrappers for all backend calls
    templateService.ts            # fetchTemplates(), buildPromptFromTemplate()
  types/
    prompt.ts                     # Prompt, Collection, StashData interfaces
    template.ts                   # Template, TemplatesData, TemplateCategory, Lang interfaces
  lib/
    utils.ts                      # cn() helper (clsx + tailwind-merge)
web/
  index.html                      # Marketing landing page (static, no build step)
```

## Settings Modal

Opened via `⌘,` or the "Settings" button at the bottom of the sidebar.
Rendered as an overlay inside `AppShell` — not a native window.
Closed via `Escape`, `⌘,` again, the ✕ button, or clicking outside.

### Sections

| Section | Content |
|---|---|
| Appearance | Theme toggle: Light / Dark / System. Calls `save_theme` invoke. Emits `settings:theme-changed` event so main window updates in real time. |
| Shortcuts | Configurable global shortcut (click to record). Lists real in-app shortcuts only: ⌘N, ⌘F, ⌘,. |
| Data | Shows data file path, prompt count, collection count. "Show in Finder" button. |
| About | App logo, version, description, external links (Website, Feedback, GitHub). |

## VariableEditor

`src/components/prompt-detail/VariableEditor.tsx` — contenteditable div that renders
`{{variable}}` patterns as inline chip `<span data-var="name">` elements.

### Interactions
- **Single click on chip** → enters inline edit mode. Cursor placed at click position via `document.caretRangeFromPoint`. Enter/Escape/blur confirm or cancel.
- **Double click on chip** → confirms any pending edit, then shows "Remove variable" popover.
- **Select plain text** → shows "Convert to variable" popover near selection (adaptive placement).
- **Select text containing a chip** → no popover (avoid ambiguity).

### Popover positioning
The popover is rendered via `createPortal` to `document.body` with `position: fixed` and
viewport coordinates. This avoids clipping from `overflow:hidden` / `overflow-y-auto`
parents in `PromptDetail`. Placement is adaptive: appears above the selection when there
is enough room in the viewport, below otherwise. X is clamped to stay within the viewport.
Enters with a directional slide-in animation (6px, 120ms, `ease-out forwards`):
- `animate-popover-in-top` — slides upward
- `animate-popover-in-bottom` — slides downward

### Key functions
```typescript
valueToHTML(str)   // converts "hello {{name}}" → HTML with chip spans
htmlToValue(el)    // reads DOM back to "hello {{name}}"
```

### CSS (App.css)
```css
[data-var] {
  display: inline;
  background: var(--color-bg-muted);
  padding: 1px 6px;
  border-radius: 4px;
  cursor: pointer;
}
[contenteditable][data-placeholder]:empty::before {
  content: attr(data-placeholder);
  color: color-mix(in srgb, var(--color-text-muted) 50%, transparent);
  pointer-events: none;
}
```

## Global Palette (⌘⇧P)

`src/components/global-palette/GlobalPalette.tsx` — floating overlay accessible from any macOS app.
- Shortcut registered via `plugin-global-shortcut` at app startup (reads from `settings.json`).
- Shortcut is user-configurable from Settings > Shortcuts.
- Saves the frontmost app PID before showing, restores focus on close via AppleScript.
- Prompts with variables → opens Warm Up modal before copying.
- Prompts without variables → copies directly + closes.

## Warm Up Modal

`src/components/warm-up/WarmUp.tsx` — variable-filling step shown from the global palette
when a selected prompt contains `{{variable}}` placeholders.

## Library Panel

`src/components/library/LibraryPanel.tsx` — accessed via "Library" in the sidebar.
Replaces the center + detail panels entirely when active.

- Fetches templates from `https://raw.githubusercontent.com/Rosqueta/stash-templates/main/dist/templates.json`
  on every open; falls back to the last successful response cached via `get_templates_cache` / `set_templates_cache` Tauri commands.
- Displays templates in a 3-column grid, filterable by category.
- Language toggle (ES / EN) in the top-right of the filter bar — switches titles, content, and variable names.
- Clicking a card opens `TemplateModal` for preview and import.
- The `+` button on hover imports directly without opening the modal.
- Importing creates a new `Prompt` via `buildPromptFromTemplate(template, collectionId, lang)`.

### Template types (`src/types/template.ts`)

```typescript
type Lang = "es" | "en";

interface Template {
  id: string;
  title_es: string;
  title_en: string;
  category: string;
  tags?: string[];
  variables_es?: string[];
  variables_en?: string[];
  content_es: string;
  content_en: string;
}
```

## Empty States

### Prompt list (center panel)
- Shown when filtered list is empty (all views including collections).
- Illustration: `src/assets/empty-state-prompts.png` (light) / `dark-empty-state-prompts.png` (dark) at `w-28 h-28`.
- Text: "Your stash is empty" + "Create your first prompt and access it from any app."
- Button: "New prompt ⌘N" — creates prompt assigned to active collection.

### Prompt detail (right panel)
- Shown when no prompt is selected.
- Icon: `<Notepad size={48} weight="thin" />` in placeholder color.
- Text: "Select a prompt / or create a new one to get started" in placeholder color.
- Placeholder color: `color-mix(in srgb, var(--color-text-muted) 50%, transparent)`.

## Icon conventions

- **Prompt concept** (sidebar item, search results, detail empty state): `Notepad`
- **Library view**: `Books`
- **Notes section divider** in PromptDetail: `Note`
- **Collections**: `Folder` / `FolderOpen` colored with `collection.color`
- **Pin/Favorite**: `PushPin`
- **Settings**: `Gear`
- **Actions**: `Copy` (copy), `Trash` (delete)
- All icons `weight="regular"` unless specified. Never change weight on selection/active state.

## Theming System

CSS custom properties in `src/App.css`, registered with Tailwind `@theme`:

```css
:root {
  --color-bg: #ffffff;
  --color-bg-secondary: #fafaf9;
  --color-bg-muted: rgba(28, 25, 23, 0.06);
  --color-bg-emphasis: rgba(28, 25, 23, 0.09);
  --color-text: #1c1917;
  --color-text-muted: #78716c;
  --color-border: rgba(28, 25, 23, 0.08);
  --color-stash: #d97706;   /* amber brand */
}
.dark {
  --color-bg: rgb(22, 20, 19);
  --color-text: #fafaf9;
  --color-border: rgba(250, 249, 249, 0.07);
  --color-stash: #f59e0b;
}
```

Always use CSS variables for colors, never hardcode hex in components.

## Typography & Buttons

- All interactive items (buttons, sidebar items, prompt cards): `font-medium`.
- Labels/section headers (e.g. "Collections", "NOTES"): `font-semibold uppercase tracking-wider`.
- Prompt title in detail: `text-2xl font-bold`.
- Placeholders: `placeholder:text-[var(--color-text-muted)]/50`.

## macOS Native Details

In `src-tauri/tauri.conf.json` — main window config:
```json
{
  "titleBarStyle": "Overlay",
  "hiddenTitle": true,
  "trafficLightPosition": { "x": 16, "y": 24 },
  "width": 1080,
  "height": 720,
  "minWidth": 600,
  "minHeight": 400,
  "visible": false
}
```

`visible: false` on launch — window shown via `show_window` Tauri command after data loads.

After changing `src-tauri/icons/` (e.g. via `npm run tauri icon`), touch `src-tauri/src/lib.rs`
to force Cargo to relink and embed the new icon.

## Sidebar

- **"New prompt"** button lives in the PromptList header (amber square `+`), NOT in the sidebar. ⌘N still works globally (handler lives in Sidebar since it's always mounted) and creates a prompt assigned to the active collection (not Pinned or Library views).
- **"Search"** button: opens SearchSpotlight overlay (`⌘F`).
- **"Settings"** button: opens Settings modal (`⌘,`). No border separator above it.
- Quick views: **Prompts** (all), **Pinned**, **Library** — `activeCollectionId` is `null`, `"pinned"`, or `"library"` respectively.
- Collections: inline creation (folder icon + transparent input at top of list), autosaved on Enter or blur (blur with empty name dismisses; Escape always dismisses).
- New collections prepend to the list (not append).
- Collections accept drops of prompt cards (native HTML5 drag & drop, type `application/x-stash-prompt`) to move prompts between collections. Drop target highlights with an amber inset ring.
- Deleting a collection asks for confirmation (`ConfirmDialog`); its prompts are kept without a collection. Deleting a prompt or a tag also confirms first.

## SearchSpotlight (⌘F)

- Overlay with search input, filters prompts by title + content (debounced 150ms).
- Enter: copies prompt + selects it in main panel.
- ⌘Enter: selects prompt without copying.
- Escape: closes.

## Keyboard Shortcuts

| Shortcut | Action |
|---|---|
| ⌘⇧P | Open global palette (from any app — configurable) |
| ⌘N | New prompt |
| ⌘F | Open search spotlight |
| ⌘, | Open settings modal |
| Escape | Close modal/overlay |

## Out of scope for v1

- Versioning (removed — Rust struct retains `versions` field with `#[serde(default)]` for compat)
- Auto-tagging (rules exist in PRD but not implemented)
- Onboarding flow
- Export / import `stash.json`
- ⌘S save, ⌘D duplicate, ⌘\ toggle sidebar (not implemented — don't show in Settings shortcuts list)

## Releasing

1. Bump version in `package.json` and `src-tauri/tauri.conf.json`
2. Commit to `main`, tag: `git tag v0.1.0 && git push origin v0.1.0`
3. Build: `npm run tauri build`
