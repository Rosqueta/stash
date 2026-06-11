import { useMemo, useCallback, useState, useRef, useEffect } from "react";
import { Tag, MagnifyingGlass, Check, Plus } from "@phosphor-icons/react";
import { usePromptsData, usePromptsActions } from "../../context/PromptsContext";
import { Tooltip } from "../ui";
import { PromptCard } from "./PromptCard";
import emptyStateImg from "../../assets/empty-state-prompts.png";
import emptyStateImgDark from "../../assets/dark-empty-state-prompts.png";
import type { Prompt } from "../../types/prompt";

function createNewPrompt(collectionId: string | null = null): Prompt {
  const now = Date.now();
  return {
    id: crypto.randomUUID(),
    title: "",
    content: "",
    collectionId,
    tags: [],
    modelTarget: "any",
    isPinned: false,
    createdAt: now,
    updatedAt: now,
    lastUsedAt: null,
    useCount: 0,
    notes: "",
  };
}

export function PromptList() {
  const { prompts, selectedId, activeCollectionId, collections } = usePromptsData();
  const { selectPrompt, savePrompt } = usePromptsActions();
  const [activeTags, setActiveTags] = useState<string[]>([]);
  const [tagFilterOpen, setTagFilterOpen] = useState(false);
  const [tagSearch, setTagSearch] = useState("");
  const tagDropdownRef = useRef<HTMLDivElement>(null);
  const tagInputRef = useRef<HTMLInputElement>(null);
  const selectedCardRef = useRef<HTMLDivElement>(null);

  useEffect(() => {
    selectedCardRef.current?.scrollIntoView({ block: "nearest", behavior: "smooth" });
  }, [selectedId]);

  // Base list filtered by collection/pin view
  const baseList = useMemo(() => {
    let list = [...prompts];
    if (activeCollectionId === "pinned") {
      list = list.filter((p) => p.isPinned);
    } else if (activeCollectionId !== null) {
      list = list.filter((p) => p.collectionId === activeCollectionId);
    }
    return list;
  }, [prompts, activeCollectionId]);

  // Tags available in this view
  const availableTags = useMemo(() => {
    const set = new Set<string>();
    for (const p of baseList) for (const t of p.tags) set.add(t);
    return Array.from(set).sort();
  }, [baseList]);

  // Reset active tags when view changes
  useEffect(() => { setActiveTags([]); }, [activeCollectionId]);

  const filtered = useMemo(() => {
    let list = baseList;
    if (activeTags.length > 0) {
      list = list.filter((p) => activeTags.every((t) => p.tags.includes(t)));
    }
    return list.sort((a, b) => {
      const aTime = a.lastUsedAt ?? a.createdAt;
      const bTime = b.lastUsedAt ?? b.createdAt;
      return bTime - aTime;
    });
  }, [baseList, activeTags]);

  // Close dropdown on outside click
  useEffect(() => {
    if (!tagFilterOpen) return;
    function handler(e: MouseEvent) {
      if (tagDropdownRef.current && !tagDropdownRef.current.contains(e.target as Node)) {
        setTagFilterOpen(false);
        setTagSearch("");
      }
    }
    document.addEventListener("mousedown", handler);
    return () => document.removeEventListener("mousedown", handler);
  }, [tagFilterOpen]);

  // Focus input when dropdown opens
  useEffect(() => {
    if (tagFilterOpen) setTimeout(() => tagInputRef.current?.focus(), 0);
  }, [tagFilterOpen]);

  const filteredTags = useMemo(() => {
    const q = tagSearch.trim().toLowerCase();
    const sorted = [
      ...availableTags.filter((t) => activeTags.includes(t)),
      ...availableTags.filter((t) => !activeTags.includes(t)),
    ];
    return q ? sorted.filter((t) => t.includes(q)) : sorted;
  }, [availableTags, activeTags, tagSearch]);

  const handleNew = useCallback(async () => {
    const collectionId = activeCollectionId !== "pinned" ? activeCollectionId : null;
    const prompt = createNewPrompt(collectionId);
    await savePrompt(prompt);
    selectPrompt(prompt.id);
  }, [activeCollectionId, savePrompt, selectPrompt]);

  const viewTitle =
    activeCollectionId === null
      ? "Prompts"
      : activeCollectionId === "pinned"
        ? "Pinned"
        : collections.find((c) => c.id === activeCollectionId)?.name ?? "Prompts";

  return (
    <div className="flex flex-col h-full w-[284px] border-r border-[var(--color-border)] shrink-0">

      {/* Header — view title + new prompt */}
      <div className="flex items-center justify-between gap-2 px-3 pt-3 pb-1 shrink-0">
        <span className="text-sm font-semibold text-[var(--color-text)] truncate">{viewTitle}</span>
        <Tooltip label="New prompt (⌘N)">
          <button
            onClick={() => void handleNew()}
            aria-label="New prompt"
            className="inline-flex h-6 w-6 shrink-0 items-center justify-center rounded-md bg-[var(--color-stash)] text-white hover:opacity-90 active:opacity-75 active:scale-[0.9] transition-all duration-100"
          >
            <Plus size={14} weight="bold" />
          </button>
        </Tooltip>
      </div>

      {/* Tag filter bar */}
      {availableTags.length > 0 && (
        <div className="relative px-2 pt-2 pb-1 shrink-0" ref={tagDropdownRef}>
          <button
            onClick={() => setTagFilterOpen((v) => !v)}
            className={`inline-flex items-center gap-1.5 rounded-md px-2 py-1 text-xs transition-colors ${
              activeTags.length > 0
                ? "bg-[var(--color-stash)]/10 text-[var(--color-stash)]"
                : "text-[var(--color-text-muted)] hover:bg-[var(--color-bg-muted)] hover:text-[var(--color-text)]"
            }`}
          >
            <Tag size={12} />
            <span>Tags</span>
            {activeTags.length > 0 && (
              <span className="font-medium">· {activeTags.length}</span>
            )}
          </button>

          {tagFilterOpen && (
            <div className="absolute top-full left-2 mt-1 z-50 w-52 rounded-lg bg-[var(--color-bg)] border border-[var(--color-border)] shadow-lg overflow-hidden">
              <div className="flex items-center gap-2 px-3 py-2 border-b border-[var(--color-border)]">
                <MagnifyingGlass size={13} className="text-[var(--color-text-muted)] shrink-0" />
                <input
                  ref={tagInputRef}
                  value={tagSearch}
                  onChange={(e) => setTagSearch(e.target.value)}
                  onKeyDown={(e) => { if (e.key === "Escape") { setTagFilterOpen(false); setTagSearch(""); }}}
                  placeholder="Search tag…"
                  className="flex-1 bg-transparent text-xs text-[var(--color-text)] placeholder:text-[var(--color-text-muted)]/50 focus:outline-none"
                />
              </div>
              <div className="max-h-48 overflow-y-auto py-1">
                {filteredTags.length === 0 ? (
                  <p className="px-3 py-2 text-xs text-[var(--color-text-muted)]/60">No results</p>
                ) : (
                  filteredTags.map((tag) => {
                    const active = activeTags.includes(tag);
                    return (
                      <button
                        key={tag}
                        onMouseDown={(e) => {
                          e.preventDefault();
                          setActiveTags((prev) =>
                            active ? prev.filter((t) => t !== tag) : [...prev, tag]
                          );
                        }}
                        className="flex w-full items-center gap-2.5 px-3 py-1.5 text-xs text-[var(--color-text)] hover:bg-[var(--color-bg-muted)] transition-colors"
                      >
                        <span className={`flex h-3.5 w-3.5 items-center justify-center rounded-sm border transition-colors ${active ? "bg-[var(--color-stash)] border-[var(--color-stash)]" : "border-[var(--color-border)]"}`}>
                          {active && <Check size={9} weight="bold" className="text-white" />}
                        </span>
                        {tag}
                      </button>
                    );
                  })
                )}
              </div>
              {activeTags.length > 0 && (
                <div className="border-t border-[var(--color-border)] px-3 py-1.5">
                  <button
                    onMouseDown={(e) => { e.preventDefault(); setActiveTags([]); }}
                    className="text-xs text-[var(--color-text-muted)] hover:text-[var(--color-text)] transition-colors"
                  >
                    Clear filters
                  </button>
                </div>
              )}
            </div>
          )}
        </div>
      )}

      <div className="flex-1 overflow-y-auto px-2 pt-1 pb-2 space-y-0.5">
        {filtered.length === 0 ? (
          <div className="flex flex-col items-center justify-center h-full gap-2 px-6 text-center">
            <img src={emptyStateImg} alt="" className="w-28 h-28 object-contain dark:hidden" />
            <img src={emptyStateImgDark} alt="" className="w-28 h-28 object-contain hidden dark:block" />
            <div className="flex flex-col gap-1.5">
              <p className="text-sm font-semibold text-[var(--color-text)]">
                Your stash is empty
              </p>
              <p className="text-sm text-[var(--color-text-muted)] leading-relaxed">
                Create your first prompt and access it from any app.
              </p>
            </div>
            <button
              onClick={() => void handleNew()}
              className="inline-flex items-center gap-3 rounded-lg px-3 py-2 text-sm font-medium bg-[var(--color-bg-muted)] text-[var(--color-text)] hover:bg-[var(--color-bg-emphasis)] transition-colors mt-2"
            >
              <span>New prompt</span>
              <kbd className="inline-flex items-center rounded px-1.5 py-0.5 text-[10px] font-mono bg-[var(--color-bg-emphasis)] text-[var(--color-text-muted)]">⌘N</kbd>
            </button>
          </div>
        ) : (
          filtered.map((p) => (
            <PromptCard
              key={p.id}
              ref={p.id === selectedId ? selectedCardRef : null}
              prompt={p}
              selected={p.id === selectedId}
              onClick={() => selectPrompt(p.id)}
            />
          ))
        )}
      </div>
    </div>
  );
}
