import { useCallback, useEffect, useRef, useState } from "react";
import {
  Sun, Keyboard, Folder, FolderOpen, Info, Globe, ChatTeardropDots, GithubLogo,
} from "@phosphor-icons/react";
import { invoke } from "@tauri-apps/api/core";
import { emitTo } from "@tauri-apps/api/event";
import { cn } from "../../lib/utils";
import { useTheme } from "../../context/ThemeContext";
import aboutImg from "../../assets/about.png";
import aboutImgDark from "../../assets/dark-about.png";

type Section = "appearance" | "shortcuts" | "data" | "about";

interface DataStats {
  promptCount: number;
  collectionCount: number;
  dataPath: string;
}

// ── Shortcut helpers ──────────────────────────────────────────────────────────

function formatShortcut(s: string): string {
  return s.split("+").map((p) => {
    switch (p) {
      case "Super": return "⌘";
      case "Shift": return "⇧";
      case "Alt": return "⌥";
      case "Control": return "^";
      default: return p.replace(/^Key/, "").replace(/^Digit/, "");
    }
  }).join("");
}

function keyEventToShortcut(e: KeyboardEvent): string | null {
  const modifiers: string[] = [];
  if (e.metaKey) modifiers.push("Super");
  if (e.shiftKey) modifiers.push("Shift");
  if (e.altKey) modifiers.push("Alt");
  if (e.ctrlKey) modifiers.push("Control");

  // Ignore pure modifier key presses
  if (["Meta", "Shift", "Alt", "Control"].includes(e.key)) return null;

  // Require at least one non-shift modifier
  if (!e.metaKey && !e.altKey && !e.ctrlKey) return null;

  return [...modifiers, e.code].join("+");
}

// ── In-app shortcuts table ────────────────────────────────────────────────────

const IN_APP_SHORTCUTS = [
  { label: "New prompt",  keys: ["⌘", "N"] },
  { label: "Search",      keys: ["⌘", "F"] },
  { label: "Settings",    keys: ["⌘", ","] },
];

// ── Section components ────────────────────────────────────────────────────────

function SectionTitle({ children }: { children: string }) {
  return <h2 className="text-xl font-bold text-[var(--color-text)] mb-6">{children}</h2>;
}

function SettingsGroup({ label, children }: { label?: string; children: React.ReactNode }) {
  return (
    <div className="mb-6">
      {label && (
        <p className="text-[10px] font-semibold uppercase tracking-wider text-[var(--color-text-muted)] mb-2 px-1">
          {label}
        </p>
      )}
      <div className="rounded-xl border border-[var(--color-border)] bg-[var(--color-bg)] divide-y divide-[var(--color-border)] overflow-hidden">
        {children}
      </div>
    </div>
  );
}

function SettingsRow({ label, description, children }: {
  label: string;
  description?: string;
  children?: React.ReactNode;
}) {
  return (
    <div className="flex items-center justify-between px-4 py-3 gap-4">
      <div className="min-w-0">
        <p className="text-sm font-medium text-[var(--color-text)]">{label}</p>
        {description && (
          <p className="text-xs text-[var(--color-text-muted)] mt-0.5">{description}</p>
        )}
      </div>
      {children && <div className="shrink-0">{children}</div>}
    </div>
  );
}

// ── Appearance ────────────────────────────────────────────────────────────────

function AppearanceSection() {
  const { mode, setMode } = useTheme();

  const handleThemeChange = useCallback(async (newMode: "light" | "dark" | "system") => {
    setMode(newMode);
    await invoke("save_theme", { theme: newMode });
    await emitTo("main", "settings:theme-changed", newMode);
  }, [setMode]);

  const options = [
    { value: "light", icon: <Sun size={13} />, label: "Light" },
    { value: "dark",  icon: <Sun size={13} />, label: "Dark" },
    { value: "system",icon: <Keyboard size={13} />, label: "System" },
  ] as const;

  return (
    <div>
      <SectionTitle>Appearance</SectionTitle>
      <SettingsGroup label="Theme">
        <SettingsRow label="Theme" description="Choose how Stash looks on your Mac">
          <div className="flex items-center rounded-lg border border-[var(--color-border)] bg-[var(--color-bg-secondary)] p-0.5 gap-0.5">
            {options.map((opt) => (
              <button
                key={opt.value}
                onClick={() => void handleThemeChange(opt.value)}
                className={cn(
                  "flex items-center gap-1.5 rounded-md px-3 py-1.5 text-xs font-medium transition-colors",
                  mode === opt.value
                    ? "bg-[var(--color-bg)] text-[var(--color-text)] shadow-sm"
                    : "text-[var(--color-text-muted)] hover:text-[var(--color-text)]"
                )}
              >
                {opt.label}
              </button>
            ))}
          </div>
        </SettingsRow>
      </SettingsGroup>
    </div>
  );
}

// ── Shortcuts ─────────────────────────────────────────────────────────────────

function ShortcutsSection({ globalShortcut, onShortcutChange }: {
  globalShortcut: string;
  onShortcutChange: (s: string) => void;
}) {
  const [recording, setRecording] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const btnRef = useRef<HTMLButtonElement>(null);

  useEffect(() => {
    if (!recording) return;
    function onKeyDown(e: KeyboardEvent) {
      e.preventDefault();
      e.stopPropagation();
      const combo = keyEventToShortcut(e);
      if (!combo) {
        setError("Use a combination with ⌘, ⌥ or ^");
        return;
      }
      setError(null);
      setRecording(false);
      invoke("update_global_shortcut", { shortcut: combo })
        .then(() => onShortcutChange(combo))
        .catch(console.error);
    }
    function onEscape(e: KeyboardEvent) {
      if (e.key === "Escape") { setRecording(false); setError(null); }
    }
    window.addEventListener("keydown", onKeyDown, true);
    window.addEventListener("keydown", onEscape);
    return () => {
      window.removeEventListener("keydown", onKeyDown, true);
      window.removeEventListener("keydown", onEscape);
    };
  }, [recording, onShortcutChange]);

  return (
    <div>
      <SectionTitle>Shortcuts</SectionTitle>

      <SettingsGroup label="Global">
        <SettingsRow label="Open palette" description="Open Stash from any app on your Mac">
          <div className="flex flex-col items-end gap-1">
            <button
              ref={btnRef}
              onClick={() => { setRecording(true); setError(null); }}
              className={cn(
                "rounded-lg border px-3 py-1.5 text-sm font-mono font-medium transition-colors min-w-[80px] text-center",
                recording
                  ? "border-[var(--color-stash)] text-[var(--color-stash)] bg-[var(--color-stash)]/5"
                  : "border-[var(--color-border)] bg-[var(--color-bg-secondary)] text-[var(--color-text)] hover:border-[var(--color-text-muted)]"
              )}
            >
              {recording ? "Recording..." : formatShortcut(globalShortcut)}
            </button>
            {error && <p className="text-[10px] text-[var(--color-text-muted)]">{error}</p>}
          </div>
        </SettingsRow>
      </SettingsGroup>

      <SettingsGroup label="In-app shortcuts">
        {IN_APP_SHORTCUTS.map((s, i) => (
          <div key={i} className="flex items-center justify-between px-4 py-2.5">
            <span className="text-sm text-[var(--color-text)]">{s.label}</span>
            <div className="flex items-center gap-1">
              {s.keys.map((k, j) => (
                <kbd
                  key={j}
                  className="inline-flex items-center justify-center rounded-md border border-[var(--color-border)] bg-[var(--color-bg-secondary)] px-2 py-1 text-xs font-mono text-[var(--color-text-muted)] min-w-[28px]"
                >
                  {k}
                </kbd>
              ))}
            </div>
          </div>
        ))}
      </SettingsGroup>
    </div>
  );
}

// ── Data ──────────────────────────────────────────────────────────────────────

function DataSection() {
  const [stats, setStats] = useState<DataStats | null>(null);

  const loadStats = () => {
    invoke<DataStats>("get_data_stats").then(setStats).catch(console.error);
  };

  useEffect(() => { loadStats(); }, []);

  const dataPath = stats?.dataPath ?? "~/Documents/Stash/stash.json";
  const displayPath = dataPath.replace(/^\/Users\/[^/]+/, "~");

  const handleChangeFolder = async () => {
    const newPath = await invoke<string | null>("change_data_folder");
    if (newPath !== null) loadStats();
  };

  return (
    <div>
      <SectionTitle>Data</SectionTitle>
      <SettingsGroup label="Storage">
        <SettingsRow label="Data file" description={displayPath}>
          <div className="flex items-center gap-2">
            <button
              onClick={() => void invoke("show_in_finder", { path: dataPath })}
              className="flex items-center gap-1.5 rounded-lg border border-[var(--color-border)] bg-[var(--color-bg-secondary)] px-3 py-1.5 text-xs font-medium text-[var(--color-text)] hover:bg-[var(--color-bg-muted)] transition-colors"
            >
              <Folder size={13} />
              Open folder
            </button>
            <button
              onClick={() => void handleChangeFolder()}
              className="flex items-center gap-1.5 rounded-lg border border-[var(--color-border)] bg-[var(--color-bg-secondary)] px-3 py-1.5 text-xs font-medium text-[var(--color-text)] hover:bg-[var(--color-bg-muted)] transition-colors"
            >
              <FolderOpen size={13} />
              Change folder
            </button>
          </div>
        </SettingsRow>
        <SettingsRow label="Prompts">
          <span className="text-sm font-semibold text-[var(--color-text)]">
            {stats?.promptCount ?? "—"}
          </span>
        </SettingsRow>
        <SettingsRow label="Collections">
          <span className="text-sm font-semibold text-[var(--color-text)]">
            {stats?.collectionCount ?? "—"}
          </span>
        </SettingsRow>
      </SettingsGroup>
    </div>
  );
}

// ── About ─────────────────────────────────────────────────────────────────────

function AboutSection() {
  const [version, setVersion] = useState("0.1.0");

  useEffect(() => {
    invoke<string>("get_app_version").then(setVersion).catch(console.error);
  }, []);

  const externalLinks = [
    { icon: <Globe size={15} />, label: "Website",       url: "https://stash.app" },
    { icon: <ChatTeardropDots size={15} />, label: "Send Feedback", url: "https://tally.so/r/pb0LZZ" },
    { icon: <GithubLogo size={15} />, label: "GitHub",   url: "https://github.com/Rosqueta/stash" },
  ];

  return (
    <div className="flex flex-1 flex-col items-center justify-center text-center px-8 pb-6">
      <img src={aboutImg} alt="Stash" className="w-28 h-28 object-contain mb-4 dark:hidden" />
      <img src={aboutImgDark} alt="Stash" className="w-28 h-28 object-contain mb-4 hidden dark:block" />
      <h2 className="text-xl font-bold text-[var(--color-text)]">Stash</h2>
      <p className="text-sm text-[var(--color-text-muted)] mt-1">Version {version}</p>
      <p className="text-sm text-[var(--color-text-muted)] mt-4 leading-relaxed">
        A minimalist prompt manager for macOS.<br />
        Offline-first, no account, no cloud. Your prompts, your files.
      </p>
      <p className="text-sm text-[var(--color-text-muted)] mt-3">
        Built by <strong className="text-[var(--color-text)]">Vero</strong> and her very organized squirrel,<br />
        who never loses a single acorn. 🐿️
      </p>
      <div className="flex items-center gap-2 mt-6">
        {externalLinks.map((link) => (
          <button
            key={link.label}
            onClick={() => void invoke("open_url", { url: link.url })}
            className="flex items-center gap-1.5 rounded-lg border border-[var(--color-border)] px-3 py-2 text-sm text-[var(--color-text-muted)] hover:text-[var(--color-text)] hover:bg-[var(--color-bg-muted)] transition-colors"
          >
            {link.icon}
            {link.label}
          </button>
        ))}
      </div>
    </div>
  );
}

// ── Main Settings component ───────────────────────────────────────────────────

const NAV_ITEMS: { id: Section; label: string; icon: React.ReactNode }[] = [
  { id: "appearance", label: "Appearance", icon: <Sun size={16} /> },
  { id: "shortcuts",  label: "Shortcuts",  icon: <Keyboard size={16} /> },
  { id: "data",       label: "Data",       icon: <Folder size={16} /> },
  { id: "about",      label: "About",      icon: <Info size={16} /> },
];

export function Settings() {
  const [section, setSection] = useState<Section>("appearance");
  const [globalShortcut, setGlobalShortcut] = useState("Super+Shift+KeyP");

  useEffect(() => {
    invoke<{ theme: string; globalShortcut: string }>("load_settings")
      .then((s) => setGlobalShortcut(s.globalShortcut))
      .catch(console.error);
  }, []);

  return (
    <div className="flex w-full h-full bg-[var(--color-bg-secondary)]">
      {/* Sidebar */}
      <aside className="w-[220px] shrink-0 flex flex-col pt-10 px-3 pb-4 border-r border-[var(--color-border)]">
        <p className="text-[10px] font-semibold uppercase tracking-wider text-[var(--color-text-muted)] px-2 mb-3">
          Settings
        </p>
        <nav className="space-y-0.5">
          {NAV_ITEMS.map((item) => (
            <button
              key={item.id}
              onClick={() => setSection(item.id)}
              className={cn(
                "flex w-full items-center gap-2.5 rounded-lg px-2.5 py-2 text-sm transition-colors",
                section === item.id
                  ? "bg-[var(--color-bg-muted)] text-[var(--color-text)] font-medium"
                  : "text-[var(--color-text-muted)] hover:bg-[var(--color-bg-muted)] hover:text-[var(--color-text)]"
              )}
            >
              {item.icon}
              {item.label}
            </button>
          ))}
        </nav>
      </aside>

      {/* Content */}
      <main className={cn(
        "flex-1 overflow-y-auto bg-[var(--color-bg)]",
        section === "about" ? "flex flex-col" : "px-8 py-8"
      )}>
        {section === "appearance" && <AppearanceSection />}
        {section === "shortcuts" && (
          <ShortcutsSection
            globalShortcut={globalShortcut}
            onShortcutChange={setGlobalShortcut}
          />
        )}
        {section === "data" && <DataSection />}
        {section === "about" && <AboutSection />}
      </main>
    </div>
  );
}
