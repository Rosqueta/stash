# Stash

Minimalist macOS app for saving, organizing, and using AI prompts. Built with Tauri v2 + React + TypeScript.

## Features

- Save and organize prompts with collections and tags
- `{{variable}}` placeholders with inline editing
- Global palette (⌘⇧P) to search and copy prompts from any app
- Prompt library with curated templates
- Light / dark / system theme
- Menubar icon for quick access

## Development

```bash
npm install
npm run tauri dev       # run in development mode
npm run tauri build     # build production app
```

## Known limitations

### Global palette over fullscreen apps

The global palette (⌘⇧P) does not appear when the active app is in fullscreen mode (its own macOS Space).

This is a macOS-level restriction: the system only allows `NSPanel` windows to overlay a fullscreen Space, but Tauri creates standard `NSWindow` instances. No amount of window-level or collection-behavior configuration on an `NSWindow` bypasses this restriction.

**Workaround:** exit fullscreen before using the palette.

**Future fix:** migrate the palette window to `NSPanel` using [`tauri-nspanel`](https://github.com/ahkohd/tauri-nspanel). Tracked in the issues.

## Stack

- [Tauri v2](https://tauri.app) — Rust backend, native macOS integration
- [React 19](https://react.dev) + TypeScript
- [Tailwind CSS v4](https://tailwindcss.com)
- [Radix UI](https://radix-ui.com) — accessible primitives
- [Sonner](https://sonner.emilkowal.ski) — toasts
- [@phosphor-icons/react](https://phosphoricons.com) — icons
