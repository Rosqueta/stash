import "./App.css";
import { useState, useEffect, useCallback } from "react";
import { toast, Toaster } from "sonner";
import { getCurrentWebviewWindow } from "@tauri-apps/api/webviewWindow";
import { invoke } from "@tauri-apps/api/core";
import { X } from "@phosphor-icons/react";
import { check, type Update } from "@tauri-apps/plugin-updater";
import { ThemeProvider } from "./context/ThemeContext";
import { PromptsProvider } from "./context/PromptsContext";
import { initAnalytics, capture } from "./services/analytics";
import { Sidebar } from "./components/collections/Sidebar";
import { PromptList } from "./components/prompt-list/PromptList";
import { PromptDetail } from "./components/prompt-detail/PromptDetail";
import { LibraryPanel } from "./components/library/LibraryPanel";
import { SearchSpotlight } from "./components/search/SearchSpotlight";
import { GlobalPalette } from "./components/global-palette/GlobalPalette";
import { Settings } from "./components/settings/Settings";
import { usePromptsData } from "./context/PromptsContext";
import { TooltipProvider } from "./components/ui";

const windowLabel = getCurrentWebviewWindow().label;

function AppShell() {
  const { isLoading, activeCollectionId } = usePromptsData();
  const [searchOpen, setSearchOpen] = useState(false);
  const [settingsOpen, setSettingsOpen] = useState(false);

  const openSettings = useCallback(() => {
    setSettingsOpen(true);
    capture("settings_opened");
  }, []);
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
          Loading...
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
        <Sidebar
          onSearchOpen={() => { setSearchOpen(true); capture("search_opened"); }}
          onSettingsOpen={openSettings}
        />
        {activeCollectionId === "library" ? (
          <LibraryPanel />
        ) : (
          <>
            <PromptList />
            <PromptDetail />
          </>
        )}
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

// ── Auto-updater ──────────────────────────────────────────────────────────────

function UpdateToast({ update, toastId }: { update: Update; toastId: string | number }) {
  const [installing, setInstalling] = useState(false);

  const handleUpdate = async () => {
    setInstalling(true);
    try {
      await update.downloadAndInstall();
      toast.dismiss(toastId);
      toast.success("Update installed! Restart Stash to apply.", { duration: Infinity, closeButton: true });
    } catch {
      toast.error("Update failed. Please try again later.");
      setInstalling(false);
    }
  };

  return (
    <div className="flex flex-col gap-1">
      <p className="text-sm font-medium">Update available: v{update.version}</p>
      {update.body && (
        <p className="text-xs text-[var(--color-text-muted)] line-clamp-3">{update.body}</p>
      )}
      <button
        onClick={() => void handleUpdate()}
        disabled={installing}
        className="self-start mt-1 text-xs font-medium px-3 py-1.5 rounded-md bg-[var(--color-text)] text-[var(--color-bg)] hover:opacity-90 disabled:opacity-50 transition-opacity"
      >
        {installing ? "Installing..." : "Update Now"}
      </button>
    </div>
  );
}

export async function showUpdateToast(): Promise<"update" | "no-update" | "error"> {
  try {
    const update = await check();
    if (update) {
      toast(<UpdateToast update={update} toastId="update-toast" />, {
        id: "update-toast",
        duration: Infinity,
        closeButton: true,
      });
      return "update";
    }
    return "no-update";
  } catch (err) {
    const msg = String(err);
    if (msg.includes("404") || msg.includes("network") || msg.includes("Could not fetch")) {
      return "no-update";
    }
    console.error("Update check failed:", err);
    return "error";
  }
}

export default function App() {
  const isPalette = windowLabel === "palette";

  useEffect(() => {
    void invoke("setup_palette_window");
  }, []);

  useEffect(() => {
    if (isPalette) return;
    invoke<{ internalUser?: boolean }>("load_settings")
      .then((s) => initAnalytics(s.internalUser ?? false))
      .catch(() => initAnalytics());
    capture("app_opened");
    const timer = setTimeout(() => void showUpdateToast(), 3000);
    return () => clearTimeout(timer);
  }, [isPalette]);

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
