import "./App.css";
import { useState, useEffect } from "react";
import { Toaster } from "sonner";
import { getCurrentWebviewWindow } from "@tauri-apps/api/webviewWindow";
import { invoke } from "@tauri-apps/api/core";
import { ThemeProvider } from "./context/ThemeContext";
import { PromptsProvider } from "./context/PromptsContext";
import { Sidebar } from "./components/collections/Sidebar";
import { PromptList } from "./components/prompt-list/PromptList";
import { PromptDetail } from "./components/prompt-detail/PromptDetail";
import { SearchSpotlight } from "./components/search/SearchSpotlight";
import { GlobalPalette } from "./components/global-palette/GlobalPalette";
import { usePromptsData } from "./context/PromptsContext";
import { TooltipProvider } from "./components/ui";

const windowLabel = getCurrentWebviewWindow().label;

function AppShell() {
  const { isLoading } = usePromptsData();
  const [searchOpen, setSearchOpen] = useState(false);

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
        <Sidebar onSearchOpen={() => setSearchOpen(true)} />
        <PromptList />
        <PromptDetail />
      </div>
      {searchOpen && <SearchSpotlight onClose={() => setSearchOpen(false)} />}
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
          {isPalette ? (
            <GlobalPalette />
          ) : (
            <AppShell />
          )}
          <Toaster position="bottom-right" />
        </PromptsProvider>
      </TooltipProvider>
    </ThemeProvider>
  );
}
