# Stash

<img src="docs/app-icon.png" alt="Stash" width="128" height="128" style="border-radius: 22px; margin-bottom: 8px;">

A minimalist, offline-first prompt manager for macOS.

Stash helps you keep your best AI prompts close at hand. Organize them with variables, collections, tags, and notes, then open them from anywhere on your Mac and copy them when you need them.

[Website](https://stash.app) · [Releases](https://github.com/Rosqueta/stash/releases) · [Feedback](https://tally.so/r/pb0LZZ)

## Why Stash

- **Your prompts, properly organized** — Variables, collections, tags, and notes are built in
- **Ready from any app** — Open your prompt palette with a global shortcut and stay in your flow
- **Less copy-paste friction** — Fill variables before copying so prompts are ready to use
- **Offline-first by default** — No account, no cloud, your prompt library stays on your Mac
- **Made for everyday work** — Lightweight, focused, and designed for fast repeat use

## See it in action

![Screenshot](docs/screenshot.png)

## Download

Download the latest `.dmg` from [Releases](https://github.com/Rosqueta/stash/releases), open it, and drag Stash to Applications.

## Run locally

**Prerequisites:** Node.js 18+ and Rust

```bash
git clone https://github.com/Rosqueta/stash.git
cd stash
npm install
npm run tauri dev
npm run tauri build
```

## Core shortcuts

These are the quickest ways to get started with Stash.

| Shortcut | Action |
| --- | --- |
| `Cmd+Shift+P` | Open global palette |
| `Cmd+N` | New prompt |
| `Cmd+F` | Search prompts |
| `Cmd+,` | Open settings |

## Built with

[Tauri](https://tauri.app/) · [React](https://react.dev/) · [TypeScript](https://www.typescriptlang.org/) · [Tailwind CSS](https://tailwindcss.com/)

## Contributing

Ideas, bug reports, and small improvements are welcome. If you want to share product feedback, use the [feedback form](https://tally.so/r/pb0LZZ). For larger changes, please open an issue first.

## License

MIT
