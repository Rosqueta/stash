import { useEffect, useRef, useState, useCallback } from "react";
import { MagnifyingGlass, Notepad } from "@phosphor-icons/react";
import { getCurrentWebviewWindow } from "@tauri-apps/api/webviewWindow";
import { cn } from "../../lib/utils";
import { usePromptsData, usePromptsActions } from "../../context/PromptsContext";
import { extractVariables } from "../../services/variables";
import { WarmUp } from "../warm-up/WarmUp";
import type { Prompt } from "../../types/prompt";

const appWindow = getCurrentWebviewWindow();

export function GlobalPalette() {
  const { prompts, collections } = usePromptsData();
  const { copyPrompt, refresh } = usePromptsActions();
  const [query, setQuery] = useState("");
  const [activeIndex, setActiveIndex] = useState(0);
  const [copiedId, setCopiedId] = useState<string | null>(null);
  const [warmUpPrompt, setWarmUpPrompt] = useState<Prompt | null>(null);
  const [isClosing, setIsClosing] = useState(false);
  const inputRef = useRef<HTMLInputElement>(null);
  const activeRef = useRef<HTMLDivElement>(null);
  const closeTimeout = useRef<ReturnType<typeof setTimeout> | null>(null);

  const filtered: Prompt[] = query.trim()
    ? prompts.filter(
        (p) =>
          p.title.toLowerCase().includes(query.toLowerCase()) ||
          p.content.toLowerCase().includes(query.toLowerCase())
      )
    : prompts.slice().sort((a, b) => {
        const aTime = a.lastUsedAt ?? a.createdAt;
        const bTime = b.lastUsedAt ?? b.createdAt;
        return bTime - aTime;
      });

  const collectionName = (id: string | null) => {
    if (!id) return null;
    return collections.find((c) => c.id === id)?.name ?? null;
  };

  // Refresh data and focus input when window is shown
  useEffect(() => {
    const unlisten = appWindow.onFocusChanged(async ({ payload: focused }) => {
      if (focused) {
        await refresh();
        setQuery("");
        setActiveIndex(0);
        setCopiedId(null);
        setWarmUpPrompt(null);
        setIsClosing(false);
        setTimeout(() => inputRef.current?.focus(), 50);
      } else {
        if (!isClosing) {
          await appWindow.hide();
        }
      }
    });
    return () => { unlisten.then((f) => f()); };
  }, [refresh, isClosing]);

  useEffect(() => {
    return () => {
      if (closeTimeout.current) clearTimeout(closeTimeout.current);
    };
  }, []);

  // Keep active item in view
  useEffect(() => {
    activeRef.current?.scrollIntoView({ block: "nearest", behavior: "smooth" });
  }, [activeIndex]);

  // Reset active index when results change
  useEffect(() => {
    setActiveIndex(0);
  }, [query]);

  const close = useCallback(async () => {
    if (isClosing) return;
    if (closeTimeout.current) clearTimeout(closeTimeout.current);
    setQuery("");
    setActiveIndex(0);
    setCopiedId(null);
    setWarmUpPrompt(null);
    setIsClosing(false);
    await appWindow.hide();
  }, [isClosing]);

  const closeAnimated = useCallback(async () => {
    if (isClosing) return;
    if (closeTimeout.current) clearTimeout(closeTimeout.current);
    setIsClosing(true);
    await new Promise<void>((r) => {
      closeTimeout.current = setTimeout(r, 200);
    });
    setQuery("");
    setActiveIndex(0);
    setCopiedId(null);
    setWarmUpPrompt(null);
    setIsClosing(false);
    await appWindow.hide();
  }, [isClosing]);

  const handleSelect = useCallback(async (prompt: Prompt) => {
    const vars = extractVariables(prompt.content);
    if (vars.length > 0) {
      setWarmUpPrompt(prompt);
      return;
    }
    await copyPrompt(prompt, true);
    setCopiedId(prompt.id);
    setTimeout(() => void closeAnimated(), 850);
  }, [copyPrompt, closeAnimated]);

  const handleWarmUpCopy = useCallback(async (resolvedContent: string) => {
    if (!warmUpPrompt) return;
    await copyPrompt(warmUpPrompt, true, resolvedContent);
  }, [copyPrompt, warmUpPrompt]);

  const handleKeyDown = useCallback((e: React.KeyboardEvent) => {
    if (e.key === "Escape") {
      void close();
    } else if (e.key === "ArrowDown") {
      e.preventDefault();
      setActiveIndex((i) => Math.min(i + 1, filtered.length - 1));
    } else if (e.key === "ArrowUp") {
      e.preventDefault();
      setActiveIndex((i) => Math.max(i - 1, 0));
    } else if (e.key === "Enter" && filtered.length > 0) {
      e.preventDefault();
      void handleSelect(filtered[activeIndex]);
    }
  }, [close, filtered, activeIndex, handleSelect]);

  useEffect(() => {
    function handleGlobalKeyDown(e: KeyboardEvent) {
      if (e.key !== "Escape") return;
      e.preventDefault();
      e.stopPropagation();
      void close();
    }

    window.addEventListener("keydown", handleGlobalKeyDown, true);
    return () => window.removeEventListener("keydown", handleGlobalKeyDown, true);
  }, [close]);

  if (warmUpPrompt) {
    return (
      <div
        className={cn(
          "h-screen bg-[var(--color-bg)] rounded-xl shadow-2xl ring-1 ring-black/10 overflow-hidden",
          isClosing && "palette-closing"
        )}
      >
        <WarmUp
          prompt={warmUpPrompt}
          onCopy={(resolved) => void handleWarmUpCopy(resolved)}
          onCopySuccess={() => void closeAnimated()}
          onClose={() => void close()}
        />
      </div>
    );
  }

  return (
    <div className={cn(
      "flex flex-col h-screen bg-[var(--color-bg)] rounded-xl shadow-2xl ring-1 ring-black/10",
      isClosing && "palette-closing"
    )}>
      {/* Search input */}
      <div className="flex items-center gap-3 px-4 py-3.5 border-b border-[var(--color-border)]">
        <MagnifyingGlass size={18} className="text-[var(--color-stash)] shrink-0" />
        <input
          ref={inputRef}
          autoFocus
          value={query}
          onChange={(e) => setQuery(e.target.value)}
          onKeyDown={handleKeyDown}
          placeholder="Buscar prompts…"
          className="flex-1 bg-transparent text-sm text-[var(--color-text)] placeholder:text-[var(--color-text-muted)]/50 focus:outline-none"
        />
        <kbd className="shrink-0 inline-flex items-center rounded px-1.5 py-0.5 text-[10px] font-mono bg-[var(--color-bg-muted)] text-[var(--color-text-muted)]">
          Esc
        </kbd>
      </div>

      {/* Results */}
      <div className="flex-1 overflow-y-auto py-1.5">
        {filtered.length === 0 ? (
          <div
            className="flex flex-col items-center justify-center h-full gap-3 py-10"
            style={{ color: "color-mix(in srgb, var(--color-text-muted) 50%, transparent)" }}
          >
            <Notepad size={32} weight="thin" />
            <p className="text-sm">Sin resultados</p>
          </div>
        ) : (
          filtered.map((prompt, i) => {
            const active = i === activeIndex;
            const copied = copiedId === prompt.id;
            const col = collectionName(prompt.collectionId);
            return (
              <div
                key={prompt.id}
                ref={active ? activeRef : undefined}
                onClick={() => !copiedId && void handleSelect(prompt)}
                onMouseEnter={() => !copiedId && setActiveIndex(i)}
                className={cn(
                  "group relative flex items-center gap-3 px-4 py-2.5 mx-2 rounded-xl cursor-pointer transition-all duration-250",
                  copied
                    ? "bg-[rgba(217,119,6,0.05)]"
                    : active
                    ? "bg-[var(--color-bg-muted)]"
                    : "hover:bg-[var(--color-bg-muted)]"
                )}
              >
                <Notepad size={16} weight="regular" className="shrink-0 text-[var(--color-text-muted)]" />
                <div className="flex-1 min-w-0">
                  <p className="text-sm truncate text-[var(--color-text)]">
                    {prompt.title || "Sin título"}
                  </p>
                  {col && (
                    <p className="text-xs text-[var(--color-text-muted)] truncate">{col}</p>
                  )}
                </div>

                {/* Copy hint — fades out on copy */}
                <span
                  className="shrink-0 text-xs text-[var(--color-stash)] transition-opacity duration-150"
                  style={{ opacity: active && !copied ? 1 : 0 }}
                >
                  ↵ Copiar
                </span>

                {/* Checkmark SVG */}
                <div
                  className={cn("absolute right-3 top-1/2 -translate-y-1/2", copied ? "checkmark-active" : "")}
                  style={{ opacity: copied ? 1 : 0, transition: "opacity 0.15s" }}
                >
                  <svg width="26" height="26" viewBox="0 0 26 26">
                    <circle
                      className="ring-circle"
                      cx="13" cy="13" r="11"
                      fill="rgba(217,119,6,0.07)"
                      stroke="#D97706"
                      strokeWidth="1.4"
                    />
                    <polyline
                      className="ring-check"
                      points="8,13 11.5,16.5 18,9.5"
                      fill="none"
                      stroke="#D97706"
                      strokeWidth="1.5"
                      strokeLinecap="round"
                      strokeLinejoin="round"
                    />
                  </svg>
                </div>
              </div>
            );
          })
        )}
      </div>

      {/* Footer */}
      <div className="border-t border-[var(--color-border)] px-5 py-3 flex items-center gap-4 text-xs text-[var(--color-text-muted)]">
        <span className="flex items-center gap-1.5">
          <kbd className="inline-flex items-center rounded px-1.5 py-0.5 font-mono bg-[var(--color-bg-muted)]">↵</kbd>
          Copiar
        </span>
        <span className="flex items-center gap-1.5">
          <kbd className="inline-flex items-center rounded px-1.5 py-0.5 font-mono bg-[var(--color-bg-muted)]">Esc</kbd>
          Cerrar
        </span>
        <span className="ml-auto font-mono">⌘⇧P</span>
      </div>
    </div>
  );
}
