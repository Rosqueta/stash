import { useEffect, useRef, useState } from "react";
import { createPortal } from "react-dom";
import { MagnifyingGlass, Notepad } from "@phosphor-icons/react";
import { cn } from "../../lib/utils";
import { usePromptsData, usePromptsActions } from "../../context/PromptsContext";
import { extractVariables } from "../../services/variables";
import { WarmUp } from "../warm-up/WarmUp";
import type { Prompt } from "../../types/prompt";

export function SearchSpotlight({ onClose }: { onClose: () => void }) {
  const { prompts, collections } = usePromptsData();
  const { selectPrompt, copyPrompt } = usePromptsActions();
  const [query, setQuery] = useState("");
  const [activeIndex, setActiveIndex] = useState(0);
  const [warmUpPrompt, setWarmUpPrompt] = useState<Prompt | null>(null);
  const inputRef = useRef<HTMLInputElement>(null);
  const activeRef = useRef<HTMLDivElement>(null);

  const filtered = query.trim()
    ? prompts.filter(
        (p) =>
          p.title.toLowerCase().includes(query.toLowerCase()) ||
          p.content.toLowerCase().includes(query.toLowerCase())
      ).slice(0, 12)
    : prompts.slice(0, 12);

  useEffect(() => { inputRef.current?.focus(); }, []);
  useEffect(() => { setActiveIndex(0); }, [query]);
  useEffect(() => {
    activeRef.current?.scrollIntoView({ block: "nearest", behavior: "smooth" });
  }, [activeIndex]);

  function collectionName(collectionId: string | null) {
    if (!collectionId) return "General";
    return collections.find((c) => c.id === collectionId)?.name ?? "General";
  }

  function handleOpen(id: string) {
    selectPrompt(id);
    onClose();
  }

  async function handleCopy(id: string) {
    const prompt = prompts.find((p) => p.id === id);
    if (!prompt) return;
    selectPrompt(id);
    if (extractVariables(prompt.content).length > 0) {
      setWarmUpPrompt(prompt);
    } else {
      await copyPrompt(prompt, false, undefined, "search");
      onClose();
    }
  }

  function handleKeyDown(e: React.KeyboardEvent) {
    if (e.key === "ArrowDown") {
      e.preventDefault();
      setActiveIndex((i) => Math.min(i + 1, filtered.length - 1));
    } else if (e.key === "ArrowUp") {
      e.preventDefault();
      setActiveIndex((i) => Math.max(i - 1, 0));
    } else if (e.key === "Enter" && filtered[activeIndex]) {
      e.preventDefault();
      if (e.metaKey || e.ctrlKey) {
        handleOpen(filtered[activeIndex].id);
      } else {
        void handleCopy(filtered[activeIndex].id);
      }
    } else if (e.key === "Escape") {
      onClose();
    }
  }

  return (
    <>
    <div
      className="fixed inset-0 z-50 flex items-start justify-center pt-[18vh] bg-black/20"
      onClick={onClose}
    >
      <div
        className="w-full max-w-2xl mx-4 bg-[var(--color-bg)] rounded-2xl shadow-2xl overflow-hidden animate-slide-down"
        onClick={(e) => e.stopPropagation()}
      >
        {/* Input */}
        <div className="flex items-center gap-3 px-5 py-4">
          <MagnifyingGlass size={18} className="text-[var(--color-stash)] shrink-0" />
          <input
            ref={inputRef}
            value={query}
            onChange={(e) => setQuery(e.target.value)}
            onKeyDown={handleKeyDown}
            placeholder="Search across all your prompts..."
            className="flex-1 bg-transparent text-sm text-[var(--color-text)] placeholder:text-[var(--color-text-muted)] focus:outline-none"
          />
          <kbd className="inline-flex items-center rounded-md px-2 py-1 text-[11px] font-mono bg-[var(--color-bg-muted)] text-[var(--color-text-muted)]">
            Esc
          </kbd>
        </div>

        <div className="border-t border-[var(--color-border)]" />

        {/* Results */}
        <div className="max-h-[360px] overflow-y-auto py-2">
          {filtered.length === 0 ? (
            <div className="flex flex-col items-center gap-2 px-5 py-8 text-[var(--color-text-muted)]">
              <Notepad size={32} weight="thin" />
              <p className="text-sm">No prompts found</p>
            </div>
          ) : (
            filtered.map((p, i) => {
              const active = i === activeIndex;
              return (
                <div
                  key={p.id}
                  ref={active ? activeRef : null}
                  onClick={() => void handleCopy(p.id)}
                  className={cn(
                    "group flex items-center gap-3 px-4 py-2.5 mx-2 rounded-xl cursor-pointer transition-colors",
                    active ? "bg-[var(--color-bg-muted)]" : "hover:bg-[var(--color-bg-muted)]"
                  )}
                >
                  {/* Icon */}
                  <Notepad
                    size={16}
                    weight="regular"
                    className="shrink-0 text-[var(--color-text-muted)]"
                  />

                  {/* Text */}
                  <div className="flex-1 min-w-0">
                    <p className="text-sm truncate text-[var(--color-text)]">
                      {p.title || "Untitled"}
                    </p>
                    <p className="text-xs text-[var(--color-text-muted)] truncate">
                      {collectionName(p.collectionId)}
                    </p>
                  </div>

                  {/* Copy hint */}
                  {active && (
                    <span className="shrink-0 text-xs text-[var(--color-stash)] flex items-center gap-1">
                      ↵ Copy
                    </span>
                  )}
                </div>
              );
            })
          )}
        </div>

        {/* Footer */}
        <div className="border-t border-[var(--color-border)] px-5 py-3 flex items-center gap-4 text-xs text-[var(--color-text-muted)]">
          <span className="flex items-center gap-1.5">
            <kbd className="inline-flex items-center rounded px-1.5 py-0.5 font-mono bg-[var(--color-bg-muted)]">↵</kbd>
            Copy
          </span>
          <span className="flex items-center gap-1.5">
            <kbd className="inline-flex items-center rounded px-1.5 py-0.5 font-mono bg-[var(--color-bg-muted)]">⌘↵</kbd>
            Open
          </span>
          <span className="flex items-center gap-1.5">
            <kbd className="inline-flex items-center rounded px-1.5 py-0.5 font-mono bg-[var(--color-bg-muted)]">Esc</kbd>
            Close
          </span>
        </div>
      </div>
    </div>

    {warmUpPrompt && createPortal(
      <div
        className="fixed inset-0 z-[60] flex items-center justify-center bg-black/30 backdrop-blur-sm"
        onClick={(e) => { if (e.target === e.currentTarget) setWarmUpPrompt(null); }}
      >
        <div className="w-full max-w-lg mx-6 bg-[var(--color-bg)] rounded-2xl shadow-2xl ring-1 ring-black/10 overflow-hidden max-h-[80vh] flex flex-col">
          <WarmUp
            prompt={warmUpPrompt}
            onCopy={async (resolved) => {
              await copyPrompt(warmUpPrompt, false, resolved, "search");
              setWarmUpPrompt(null);
              onClose();
            }}
            onClose={() => setWarmUpPrompt(null)}
          />
        </div>
      </div>,
      document.body
    )}
    </>
  );
}
