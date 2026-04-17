import {
  createContext,
  useCallback,
  useContext,
  useEffect,
  useState,
  type ReactNode,
} from "react";
import { invoke } from "@tauri-apps/api/core";
import { listen } from "@tauri-apps/api/event";
import * as storage from "../services/storage";

type ThemeMode = "light" | "dark" | "system";

interface ThemeContextValue {
  mode: ThemeMode;
  setMode: (mode: ThemeMode) => void;
  resolved: "light" | "dark";
  hasSeenShortcutHint: boolean;
  hasSeenVariableHint: boolean;
  markHintSeen: (hint: "shortcut" | "variable") => void;
}

const ThemeContext = createContext<ThemeContextValue | null>(null);

export function ThemeProvider({ children }: { children: ReactNode }) {
  const [mode, setModeState] = useState<ThemeMode>("system");
  const [systemDark, setSystemDark] = useState(
    () => window.matchMedia("(prefers-color-scheme: dark)").matches
  );
  const [hasSeenShortcutHint, setHasSeenShortcutHint] = useState(true);
  const [hasSeenVariableHint, setHasSeenVariableHint] = useState(true);

  // Load initial theme and onboarding flags from settings.json
  useEffect(() => {
    invoke<{ theme: string; globalShortcut: string; hasSeenShortcutHint?: boolean; hasSeenVariableHint?: boolean }>("load_settings")
      .then((s) => {
        setModeState(s.theme as ThemeMode);
        setHasSeenShortcutHint(s.hasSeenShortcutHint ?? false);
        setHasSeenVariableHint(s.hasSeenVariableHint ?? false);
      })
      .catch(() => {});
  }, []);

  // Listen for theme changes from settings window
  useEffect(() => {
    const unlisten = listen<string>("settings:theme-changed", (event) => {
      setModeState(event.payload as ThemeMode);
    });
    return () => { unlisten.then((f) => f()); };
  }, []);

  // Listen for system dark mode changes
  useEffect(() => {
    const mq = window.matchMedia("(prefers-color-scheme: dark)");
    const handler = (e: MediaQueryListEvent) => setSystemDark(e.matches);
    mq.addEventListener("change", handler);
    return () => mq.removeEventListener("change", handler);
  }, []);

  const resolved: "light" | "dark" =
    mode === "system" ? (systemDark ? "dark" : "light") : mode;

  useEffect(() => {
    document.documentElement.classList.toggle("dark", resolved === "dark");
  }, [resolved]);

  const setMode = useCallback((newMode: ThemeMode) => {
    setModeState(newMode);
  }, []);

  const markHintSeen = useCallback((hint: "shortcut" | "variable") => {
    void storage.markHintSeen(hint);
    if (hint === "shortcut") setHasSeenShortcutHint(true);
    if (hint === "variable") setHasSeenVariableHint(true);
  }, []);

  return (
    <ThemeContext.Provider value={{ mode, setMode, resolved, hasSeenShortcutHint, hasSeenVariableHint, markHintSeen }}>
      {children}
    </ThemeContext.Provider>
  );
}

export function useTheme() {
  const ctx = useContext(ThemeContext);
  if (!ctx) throw new Error("useTheme must be used within ThemeProvider");
  return ctx;
}
