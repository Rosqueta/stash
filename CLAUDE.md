# Stash — Development Guide

## Project Overview

Stash is a minimalist, offline-first macOS app for saving, organizing, and using AI prompts.
Built with Tauri v2 (Rust backend) + React 19 + TypeScript + Tailwind v4 (frontend).

Core philosophy: prompts are first-class citizens, not text files. Every prompt has structure
(variables, collection, model target, versions, notes) and is designed to be used, not just stored.

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
```

## Stack

- Tauri v2 + Rust backend (all file I/O and clipboard via invoke())
- React 19 + TypeScript (strict)
- Tailwind v4 (CSS custom properties via @theme)
- Radix UI (dialogs, menus, tooltips)
- Sonner (toasts)
- @tauri-apps/plugin-clipboard-manager (copying prompts)

NOT used (unlike Scratch): TipTap, Tantivy, dnd-kit, git integration.
Search is handled in JS over the in-memory prompt list.

## Architecture

### Frontend → Backend boundary
All persistence and clipboard operations go through Tauri commands via `invoke()`.
Frontend never reads/writes files directly.

```typescript
// Always use invoke for backend operations
import { invoke } from "@tauri-apps/api/core";

const prompts = await invoke<Prompt[]>("list_prompts");
await invoke("save_prompt", { prompt });
await invoke("copy_to_clipboard", { text: resolvedContent });
```

### Data model

```typescript
// Core prompt structure
interface Prompt {
  id: string;                    // UUID
  title: string;
  content: string;               // Raw text with {{variable}} placeholders
  collectionId: string | null;
  tags: string[];                // Auto-suggested + user-defined
  modelTarget: ModelTarget;      // "claude-sonnet" | "claude-opus" | "gpt-4o" | "gemini" | "any"
  isFavorite: boolean;
  createdAt: number;             // Unix timestamp
  updatedAt: number;
  lastUsedAt: number | null;
  useCount: number;
  versions: PromptVersion[];
  notes: string;
}

interface PromptVersion {
  id: string;
  content: string;
  createdAt: number;
  note: string;                  // "Añadí el parámetro de tono"
  rating: 1 | 2 | 3 | null;    // Quick score: bad / ok / good
}

interface Collection {
  id: string;
  name: string;
  color: string;                 // Hex — used as dot color in sidebar
  promptCount: number;
}

// Variable detection: extract {{variable}} patterns from content
function extractVariables(content: string): string[] {
  const matches = content.matchAll(/\{\{(\w+)\}\}/g);
  return [...new Set([...matches].map(m => m[1]))];
}
```

### Storage
All data stored in a single `stash.json` file at `{APP_DATA}/stash.json`.
Structure: `{ prompts: Prompt[], collections: Collection[], version: number }`.
Never store to localStorage or sessionStorage.

### Context pattern (same as Scratch's dual context)

```typescript
// Separate data and actions for performance
const PromptsDataContext = createContext<PromptsData>(...)
const PromptsActionsContext = createContext<PromptsActions>(...)

// Consumers only re-render when their slice changes
function usePromptsData() { return useContext(PromptsDataContext) }
function usePromptsActions() { return useContext(PromptsActionsContext) }
```

## Key Components

```
src/
  components/
    global-palette/      # ⌘⇧P overlay — search + warm up trigger
    warm-up/             # Variable fill modal before copying
    prompt-list/         # Sidebar list of prompts
    prompt-detail/       # Right panel — content, versions, notes
    collections/         # Sidebar collection tree
    settings/            # Settings page
    ui/                  # Button, Input, Tooltip, AlertDialog, Toaster
    icons/               # SVG icon components
  context/
    PromptsContext.tsx   # Dual context (data + actions)
    ThemeContext.tsx      # Light/dark/system
  services/
    storage.ts           # invoke() wrappers for all backend calls
    variables.ts         # extractVariables(), resolveVariables()
    autoTag.ts           # Keyword-based tag suggestions
  types/
    prompt.ts            # All TypeScript interfaces
  lib/
    platform.ts          # mod key detection (Cmd vs Ctrl)
    utils.ts             # clsx helpers, etc.
```

## Coding Conventions (same as Scratch)

- Clean, minimal code. No commented-out code or TODOs in production.
- Proper React patterns: contexts, hooks, memoization.
- Type-safe TypeScript throughout — no `any`.
- `React.memo` for list item components (PromptCard).
- `useCallback`/`useMemo` for performance-critical paths.
- Debounces: search 150ms, auto-save 300ms.
- All backend operations async with error handling + sonner toast feedback.
- Use `clsx` / `tailwind-merge` for conditional classes.

## Theming System (copied from Scratch)

CSS custom properties in `src/App.css`, registered with Tailwind `@theme`:

```css
:root {
  --color-bg: #ffffff;
  --color-bg-secondary: #fafaf9;
  --color-bg-muted: rgba(28, 25, 23, 0.06);
  --color-text: #1c1917;
  --color-text-muted: #78716c;
  --color-border: rgba(28, 25, 23, 0.08);
  --color-accent: #1c1917;
  /* Stash accent — squirrel amber */
  --color-stash: #d97706;
}

.dark {
  --color-bg: rgb(22, 20, 19);
  --color-text: #fafaf9;
  --color-border: rgba(250, 249, 249, 0.07);
  --color-stash: #f59e0b;
}
```

Always use CSS variables for colors, never hardcode hex in components.

## macOS Native Details (critical — copy from Scratch exactly)

In `src-tauri/tauri.conf.json`:
```json
{
  "windows": [{
    "titleBarStyle": "Overlay",
    "hiddenTitle": true,
    "trafficLightPosition": { "x": 16, "y": 24 },
    "width": 1080,
    "height": 720,
    "minWidth": 600,
    "minHeight": 400,
    "visible": false
  }]
}
```

`visible: false` on launch prevents flash — show window after data loads.

## Global Palette (⌘⇧P)

The most important UX surface. Implementation based on Scratch's CommandPalette:

- Fixed overlay `z-50`, centered, max-w-2xl
- `animate-slide-down` on open
- Input debounced 150ms, filters prompt list by title + content
- Keyboard: ↑↓ navigate, Enter select, Escape close
- `scrollIntoView({ block: "center", behavior: "smooth" })` on selection change
- If selected prompt has variables → opens Warm Up modal
- If no variables → copies directly + sonner toast "Copiado ✓"
- Shortcut hint shown at bottom: ⌘⇧P

## Warm Up Modal

Shown when a prompt has `{{variables}}`. Key interaction: variables are **inline editable chips** directly in the prompt text — NOT a separate form with inputs. The user edits inside the text, always seeing full context.

### Parsing
Split the prompt content into segments before rendering:
```typescript
type Segment = { type: 'text'; value: string } | { type: 'var'; name: string };

function parseSegments(content: string): Segment[] {
  const parts = content.split(/(\{\{\w+\}\})/g);
  return parts.map(p => {
    const match = p.match(/^\{\{(\w+)\}\}$/);
    return match ? { type: 'var', name: match[1] } : { type: 'text', value: p };
  });
}
```

### Rendering
- `text` segments → plain text nodes (preserve line breaks with `<br>`)
- `var` segments → `<VarChip>` component with three states:
  - **empty** — amber background, variable name in italic, cursor pointer
  - **editing** — inline `<input>` at the same position, amber border, no background
  - **filled** — green background, value text + green tick, cursor pointer to re-edit

### State
```typescript
const [values, setValues] = useState<Record<string, string>>({});
const [editingKey, setEditingKey] = useState<string | null>(null); // "varname_segmentIndex"
```

Repeated variables (e.g. `{{tono}}` twice) share the same slot in `values` — editing one updates all chips with that name simultaneously.

### Behaviour
- On open: auto-focus first empty variable
- Enter / Tab: confirm value, jump to next empty variable
- Escape: cancel edit without losing previous value
- Copy button: always active — unfilled variables stay as `{{variable}}` in output
- Footer shows: "2 de 3 variables" → "Todo listo ✓" when all filled

### Variable resolution
```typescript
function resolveVariables(content: string, values: Record<string, string>): string {
  return content.replace(/\{\{(\w+)\}\}/g, (_, key) => values[key] ?? `{{${key}}}`);
}
```

## Auto-tagging

On prompt save, suggest tags based on keyword matching (no AI required):

```typescript
const TAG_RULES: Record<string, string[]> = {
  "código":    ["función", "código", "debug", "react", "typescript", "python", "refactor", "test"],
  "redacción": ["email", "redacta", "escribe", "artículo", "post", "newsletter", "copy"],
  "diseño":    ["componente", "ui", "ux", "figma", "diseño", "layout", "color"],
  "análisis":  ["analiza", "resume", "extrae", "informe", "datos", "métricas"],
  "reunión":   ["transcripción", "reunión", "meeting", "agenda", "acta"],
};

function suggestTags(content: string): string[] { ... }
```

## Versioning

- Every save creates a new version if content changed.
- Max 10 versions per prompt (oldest pruned automatically).
- Each version: `{ id, content, createdAt, note, rating }`.
- Version note and rating are set by user after saving, not required.
- UI shows versions list with rating dots (● = good, ○ = empty, ✕ = bad).

## Keyboard Shortcuts

| Shortcut | Action |
|---|---|
| ⌘⇧P | Open global palette (from any app) |
| ⌘N | New prompt |
| ⌘F | Search in sidebar |
| ⌘, | Settings |
| ⌘\ | Toggle sidebar |
| ↑/↓ | Navigate prompt list |
| Enter | Open selected prompt |
| Escape | Close modal/palette |

## Referencias

- `./scratch/` — repo local de referencia. Leer antes de empezar, no modificar.
- Tauri v2 docs — https://v2.tauri.app
- plugin-global-shortcut — registro del shortcut global ⌘⇧P
- plugin-clipboard-manager — copiar al portapapeles desde Rust

## Releasing

1. Bump version in `package.json` and `src-tauri/tauri.conf.json`
2. Commit to `main`, tag and push: `git tag v0.1.0 && git push origin v0.1.0`
3. Build: `npm run tauri build`
