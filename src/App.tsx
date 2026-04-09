import "./App.css";
import { useState, useEffect, useCallback } from "react";
import { Toaster } from "sonner";
import { getCurrentWebviewWindow } from "@tauri-apps/api/webviewWindow";
import { invoke } from "@tauri-apps/api/core";
import { X } from "@phosphor-icons/react";
import { ThemeProvider } from "./context/ThemeContext";
import { PromptsProvider } from "./context/PromptsContext";
import { Sidebar } from "./components/collections/Sidebar";
import { PromptList } from "./components/prompt-list/PromptList";
import { PromptDetail } from "./components/prompt-detail/PromptDetail";
import { SearchSpotlight } from "./components/search/SearchSpotlight";
import { GlobalPalette } from "./components/global-palette/GlobalPalette";
import { Settings } from "./components/settings/Settings";
import { usePromptsData } from "./context/PromptsContext";
import { TooltipProvider } from "./components/ui";

const windowLabel = getCurrentWebviewWindow().label;

function AppShell() {
  const { isLoading } = usePromptsData();
  const [searchOpen, setSearchOpen] = useState(false);
  const [settingsOpen, setSettingsOpen] = useState(false);

  const openSettings = useCallback(() => setSettingsOpen(true), []);
  const closeSettings = useCallback(() => setSettingsOpen(false), []);

  useEffect(() => {
    function onKeyDown(e: KeyboardEvent) {
      if (e.metaKey && e.key === ",") {
        e.preventDefault();
        setSettingsOpen((v) => !v);
      }
      if (e.key === "Escape") {
        setSettingsOpen(false);
      }
    }
    window.addEventListener("keydown", onKeyDown);
    return () => window.removeEventListener("keydown", onKeyDown);
  }, []);

  if (isLoading) {
    return (
      <div className="flex h-full items-center justify-center">
        <div className="text-sm text-[var(--color-text-muted)]">
          Cargando…
        </div>
      </div>
    );
  }

  return (
    <div className="flex flex-col h-full overflow-hidden bg-[var(--color-bg)]">
      <div
        data-tauri-drag-region
        className="h-[52px] shrink-0 bg-[var(--color-bg-secondary)] border-b border-[var(--color-border)]"
      />
      <div className="flex flex-1 overflow-hidden">
        <Sidebar onSearchOpen={() => setSearchOpen(true)} onSettingsOpen={openSettings} />
        <PromptList />
        <PromptDetail />
      </div>
      {searchOpen && <SearchSpotlight onClose={() => setSearchOpen(false)} />}
      {settingsOpen && (
        <div
          className="absolute inset-0 z-50 flex items-center justify-center"
          style={{ background: "rgba(0,0,0,0.35)", backdropFilter: "blur(6px)", WebkitBackdropFilter: "blur(6px)" }}
          onClick={closeSettings}
        >
          <div
            className="relative flex overflow-hidden rounded-2xl shadow-2xl"
            style={{ width: 860, height: 560, background: "var(--color-bg-secondary)" }}
            onClick={(e) => e.stopPropagation()}
          >
            <button
              onClick={closeSettings}
              className="absolute top-3 right-3 z-10 flex items-center justify-center w-7 h-7 rounded-full text-[var(--color-text-muted)] hover:bg-[var(--color-bg-muted)] hover:text-[var(--color-text)] transition-colors"
            >
              <X size={15} />
            </button>
            <Settings />
          </div>
        </div>
      )}
    </div>
  );
}

export default function App() {
  const isPalette = windowLabel === "palette";

  useEffect(() => {
    void invoke("setup_palette_window");
  }, []);

  return (
    <ThemeProvider>
      <TooltipProvider>
        <PromptsProvider>
          {isPalette ? <GlobalPalette /> : <AppShell />}
          <Toaster position="bottom-right" />
        </PromptsProvider>
      </TooltipProvider>
    </ThemeProvider>
  );
}
