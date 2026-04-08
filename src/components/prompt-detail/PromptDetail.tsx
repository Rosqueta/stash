import {
  useCallback,
  useEffect,
  useMemo,
  useRef,
  useState,
} from "react";
import { PushPin, Copy, Trash, Folder, CaretDown, Note, Notepad, MagnifyingGlass, Plus, Check } from "@phosphor-icons/react";
import { VariableEditor } from "./VariableEditor";
import { WarmUp } from "../warm-up/WarmUp";
import * as DropdownMenu from "@radix-ui/react-dropdown-menu";
import { usePromptsData, usePromptsActions } from "../../context/PromptsContext";
import { extractVariables } from "../../services/variables";
import { IconButton, Tooltip } from "../ui";
import type { Prompt } from "../../types/prompt";

export function PromptDetail() {
  const { prompts, selectedId, collections } = usePromptsData();
  const { savePrompt, deletePrompt, copyPrompt } = usePromptsActions();

  const prompt = prompts.find((p) => p.id === selectedId) ?? null;

  const [title, setTitle] = useState("");
  const [content, setContent] = useState("");
  const [notes, setNotes] = useState("");
  const [tags, setTags] = useState<string[]>([]);
  const [tagDropdownOpen, setTagDropdownOpen] = useState(false);
  const [tagSearch, setTagSearch] = useState("");
  const [isPinned, setIsPinned] = useState(false);
  const [warmUpOpen, setWarmUpOpen] = useState(false);

  const saveDebounce = useRef<ReturnType<typeof setTimeout> | null>(null);
  const notesDebounce = useRef<ReturnType<typeof setTimeout> | null>(null);
  const currentPromptId = useRef<string | null>(null);
  const latestPrompt = useRef<Prompt | null>(null);

  useEffect(() => {
    latestPrompt.current = prompt;
  }, [prompt]);

  useEffect(() => {
    if (!prompt) return;
    if (prompt.id === currentPromptId.current) return;
    currentPromptId.current = prompt.id;
    setTitle(prompt.title);
    setContent(prompt.content);
    setNotes(prompt.notes);
    setTags(prompt.tags);
    setIsPinned(prompt.isPinned);
  }, [prompt]);

  const scheduleSave = useCallback(
    (patch: Partial<Prompt>) => {
      if (!latestPrompt.current) return;
      if (saveDebounce.current) clearTimeout(saveDebounce.current);
      saveDebounce.current = setTimeout(() => {
        const basePrompt = latestPrompt.current;
        if (!basePrompt) return;
        void savePrompt({
          ...basePrompt,
          ...patch,
          updatedAt: Date.now(),
        });
      }, 300);
    },
    [savePrompt]
  );

  useEffect(() => {
    return () => {
      if (saveDebounce.current) clearTimeout(saveDebounce.current);
      if (notesDebounce.current) clearTimeout(notesDebounce.current);
    };
  }, []);

  const handleTitleChange = useCallback(
    (e: React.ChangeEvent<HTMLInputElement>) => {
      setTitle(e.target.value);
      scheduleSave({ title: e.target.value });
    },
    [scheduleSave]
  );

  const handleNotesChange = useCallback(
    (e: React.ChangeEvent<HTMLTextAreaElement>) => {
      setNotes(e.target.value);
      if (notesDebounce.current) clearTimeout(notesDebounce.current);
      notesDebounce.current = setTimeout(() => {
        scheduleSave({ notes: e.target.value });
      }, 300);
    },
    [scheduleSave]
  );

  const handlePin = useCallback(() => {
    const next = !isPinned;
    setIsPinned(next);
    scheduleSave({ isPinned: next });
  }, [isPinned, scheduleSave]);

  // Global tag pool: union of all tags across all prompts
  const globalTags = useMemo(() => {
    const set = new Set<string>();
    for (const p of prompts) for (const t of p.tags) set.add(t);
    return Array.from(set).sort();
  }, [prompts]);

  const handleToggleTag = useCallback((tag: string) => {
    const next = tags.includes(tag)
      ? tags.filter((t) => t !== tag)
      : [...tags, tag];
    setTags(next);
    scheduleSave({ tags: next });
  }, [tags, scheduleSave]);

  const handleCreateTag = useCallback(() => {
    const tag = tagSearch.trim().toLowerCase();
    if (!tag || tags.includes(tag)) return;
    const next = [...tags, tag];
    setTags(next);
    setTagSearch("");
    scheduleSave({ tags: next });
  }, [tagSearch, tags, scheduleSave]);

  const handleCollectionChange = useCallback(
    (collectionId: string | null) => {
      scheduleSave({ collectionId });
    },
    [scheduleSave]
  );

  if (!prompt) {
    return (
      <div className="flex flex-1 flex-col items-center justify-center gap-4" style={{ color: "color-mix(in srgb, var(--color-text-muted) 50%, transparent)" }}>
        <Notepad size={48} weight="thin" />
        <div className="flex flex-col items-center gap-0.5 text-center">
          <p className="text-sm">Selecciona un prompt</p>
          <p className="text-sm">o crea uno nuevo para empezar</p>
        </div>
      </div>
    );
  }

  const activeCollection = collections.find((c) => c.id === prompt.collectionId) ?? null;

  return (
    <div className="relative flex flex-col flex-1 h-full overflow-hidden">
      <div className="flex-1 overflow-y-auto px-8 py-6 flex flex-col gap-4">

        {/* Collection + actions row */}
        <div className="flex items-center justify-between">
          {/* Collection selector */}
          <DropdownMenu.Root>
            <DropdownMenu.Trigger asChild>
              <button className="flex items-center gap-1.5 text-xs text-[var(--color-text-muted)] hover:text-[var(--color-text)] transition-colors group focus:outline-none">
                <Folder
                  size={14}
                  weight="regular"
                  style={activeCollection ? { color: activeCollection.color } : undefined}
                />
                <span>
                  {activeCollection ? activeCollection.name : "Sin colección"}
                </span>
                <CaretDown size={10} className="opacity-0 group-hover:opacity-60 transition-opacity" />
              </button>
            </DropdownMenu.Trigger>
            <DropdownMenu.Portal>
              <DropdownMenu.Content
                side="bottom"
                align="start"
                sideOffset={4}
                className="z-50 min-w-[180px] rounded-lg bg-[var(--color-bg)] border border-[var(--color-border)] shadow-lg p-1 animate-in fade-in-0 zoom-in-95"
              >
                <DropdownMenu.Item
                  onSelect={() => handleCollectionChange(null)}
                  className="flex items-center gap-2 rounded-md px-2 py-1.5 text-sm text-[var(--color-text-muted)] cursor-pointer outline-none hover:bg-[var(--color-bg-muted)] transition-colors"
                >
                  <Folder size={14} weight="regular" />
                  Sin colección
                </DropdownMenu.Item>
                {collections.length > 0 && (
                  <DropdownMenu.Separator className="my-1 h-px bg-[var(--color-border)]" />
                )}
                {collections.map((c) => (
                  <DropdownMenu.Item
                    key={c.id}
                    onSelect={() => handleCollectionChange(c.id)}
                    className="flex items-center gap-2 rounded-md px-2 py-1.5 text-sm text-[var(--color-text)] cursor-pointer outline-none hover:bg-[var(--color-bg-muted)] transition-colors"
                  >
                    <Folder size={14} weight="regular" style={{ color: c.color }} />
                    {c.name}
                  </DropdownMenu.Item>
                ))}
              </DropdownMenu.Content>
            </DropdownMenu.Portal>
          </DropdownMenu.Root>

          {/* Action buttons */}
          <div className="flex items-center gap-1">
            <Tooltip label={isPinned ? "Despinear" : "Pinear"}>
              <IconButton onClick={handlePin}>
                <PushPin
                  size={18}
                  weight="regular"
                  className={isPinned ? "text-[var(--color-stash)]" : ""}
                />
              </IconButton>
            </Tooltip>
            <Tooltip label="Copiar prompt">
              <IconButton
                onClick={() => {
                  if (extractVariables(content).length > 0) {
                    setWarmUpOpen(true);
                  } else {
                    void copyPrompt(prompt);
                  }
                }}
              >
                <Copy size={18} weight="regular" />
              </IconButton>
            </Tooltip>
            <Tooltip label="Eliminar prompt">
              <IconButton
                onClick={() => deletePrompt(prompt.id)}
                className="hover:text-red-500"
              >
                <Trash size={18} weight="regular" />
              </IconButton>
            </Tooltip>
          </div>
        </div>

        {/* Title */}
        <input
          value={title}
          onChange={handleTitleChange}
          placeholder="Sin título"
          className="w-full text-2xl font-bold bg-transparent text-[var(--color-text)] placeholder:text-[var(--color-text-muted)]/50 focus:outline-none leading-tight"
        />

        {/* Tags */}
        <TagEditor
          tags={tags}
          globalTags={globalTags}
          open={tagDropdownOpen}
          onOpenChange={(v) => { setTagDropdownOpen(v); if (!v) setTagSearch(""); }}
          tagSearch={tagSearch}
          onTagSearchChange={setTagSearch}
          onToggleTag={handleToggleTag}
          onCreateTag={handleCreateTag}
          onRemoveTag={(tag) => handleToggleTag(tag)}
        />

        {/* Content */}
        <VariableEditor
          value={content}
          onChange={(val) => { setContent(val); scheduleSave({ content: val }); }}
          placeholder="Escribe tu prompt aquí…"
        />


        {/* Notes divider */}
        <div className="flex items-center gap-3 mt-2">
          <div className="flex-1 h-px bg-[var(--color-border)]" />
          <span className="flex items-center gap-1.5 text-[10px] font-semibold uppercase tracking-widest text-[var(--color-text-muted)]">
            <Note size={12} weight="regular" />
            Notas
          </span>
          <div className="flex-1 h-px bg-[var(--color-border)]" />
        </div>

        {/* Notes */}
        <textarea
          value={notes}
          onChange={handleNotesChange}
          placeholder="Notas sobre este prompt…"
          className="w-full min-h-[80px] resize-none bg-transparent text-sm text-[var(--color-text)] placeholder:text-[var(--color-text-muted)]/50 focus:outline-none leading-relaxed selectable"
        />
      </div>

      {/* Warm-Up modal */}
      {warmUpOpen && prompt && (
        <div
          className="absolute inset-0 z-50 flex items-center justify-center bg-black/30 backdrop-blur-sm"
          onClick={(e) => { if (e.target === e.currentTarget) setWarmUpOpen(false); }}
        >
          <div className="w-full max-w-lg mx-6 bg-[var(--color-bg)] rounded-2xl shadow-2xl ring-1 ring-black/10 overflow-hidden max-h-[80vh] flex flex-col">
            <WarmUp
              prompt={{ ...prompt, content }}
              onCopy={(resolved) => {
                void copyPrompt(prompt, false, resolved);
                setWarmUpOpen(false);
              }}
              onClose={() => setWarmUpOpen(false)}
            />
          </div>
        </div>
      )}
    </div>
  );
}

// ── TagEditor ─────────────────────────────────────────────────────────────────

interface TagEditorProps {
  tags: string[];
  globalTags: string[];
  open: boolean;
  onOpenChange: (open: boolean) => void;
  tagSearch: string;
  onTagSearchChange: (v: string) => void;
  onToggleTag: (tag: string) => void;
  onCreateTag: () => void;
  onRemoveTag: (tag: string) => void;
}

function TagEditor({
  tags,
  globalTags,
  open,
  onOpenChange,
  tagSearch,
  onTagSearchChange,
  onToggleTag,
  onCreateTag,
  onRemoveTag,
}: TagEditorProps) {
  const inputRef = useRef<HTMLInputElement>(null);
  const containerRef = useRef<HTMLDivElement>(null);

  const filtered = useMemo(() => {
    const q = tagSearch.trim().toLowerCase();
    const pool = [
      ...tags.filter((t) => !globalTags.includes(t)),
      ...globalTags,
    ].filter((t, i, arr) => arr.indexOf(t) === i); // dedupe
    if (!q) return pool;
    return pool.filter((t) => t.includes(q));
  }, [globalTags, tags, tagSearch]);

  const showCreate =
    tagSearch.trim().length > 0 &&
    !filtered.includes(tagSearch.trim().toLowerCase());

  // Close on mousedown outside
  useEffect(() => {
    if (!open) return;
    function handler(e: MouseEvent) {
      if (containerRef.current && !containerRef.current.contains(e.target as Node)) {
        onOpenChange(false);
      }
    }
    document.addEventListener("mousedown", handler);
    return () => document.removeEventListener("mousedown", handler);
  }, [open, onOpenChange]);

  // Focus input when opens
  useEffect(() => {
    if (open) setTimeout(() => inputRef.current?.focus(), 0);
  }, [open]);

  // Sort: assigned first, then rest
  const sorted = useMemo(() => {
    return [
      ...filtered.filter((t) => tags.includes(t)),
      ...filtered.filter((t) => !tags.includes(t)),
    ];
  }, [filtered, tags]);

  return (
    <div ref={containerRef} className="relative flex flex-wrap items-center gap-1.5 min-h-[24px]">
      {/* Chips */}
      {tags.map((tag) => (
        <span
          key={tag}
          className="inline-flex items-center gap-1 rounded-full px-2.5 py-0.5 text-xs font-medium bg-[var(--color-bg-muted)] text-[var(--color-text-muted)] cursor-pointer hover:bg-[var(--color-bg-emphasis)] transition-colors"
          onClick={() => onOpenChange(true)}
        >
          {tag}
          <button
            onMouseDown={(e) => { e.stopPropagation(); onRemoveTag(tag); }}
            className="hover:text-[var(--color-text)] transition-colors leading-none"
          >
            ×
          </button>
        </span>
      ))}

      {/* Add tag button */}
      <button
        onClick={() => onOpenChange(true)}
        className="inline-flex items-center gap-1 rounded-full px-2.5 py-0.5 text-xs text-[var(--color-text-muted)]/60 border border-dashed border-[var(--color-border)] hover:border-[var(--color-text-muted)] hover:text-[var(--color-text-muted)] transition-colors"
      >
        <Plus size={10} />
        Add tag
      </button>

      {/* Dropdown */}
      {open && (
        <div className="absolute top-full left-0 mt-1.5 z-50 w-56 rounded-lg bg-[var(--color-bg)] border border-[var(--color-border)] shadow-lg overflow-hidden">
          {/* Search input */}
          <div className="flex items-center gap-2 px-3 py-2 border-b border-[var(--color-border)]">
            <MagnifyingGlass size={13} className="text-[var(--color-text-muted)] shrink-0" />
            <input
              ref={inputRef}
              value={tagSearch}
              onChange={(e) => onTagSearchChange(e.target.value)}
              onKeyDown={(e) => {
                if (e.key === "Escape") { e.stopPropagation(); onOpenChange(false); }
                if (e.key === "Enter" && showCreate) { e.preventDefault(); onCreateTag(); }
              }}
              placeholder="Buscar tag…"
              className="flex-1 bg-transparent text-xs text-[var(--color-text)] placeholder:text-[var(--color-text-muted)]/50 focus:outline-none"
            />
          </div>

          {/* Tag list */}
          <div className="max-h-48 overflow-y-auto py-1">
            {sorted.map((tag) => {
              const assigned = tags.includes(tag);
              return (
                <button
                  key={tag}
                  onMouseDown={(e) => { e.preventDefault(); onToggleTag(tag); }}
                  className="flex w-full items-center gap-2.5 px-3 py-1.5 text-xs text-[var(--color-text)] hover:bg-[var(--color-bg-muted)] transition-colors"
                >
                  <span className={`flex h-3.5 w-3.5 items-center justify-center rounded-sm border transition-colors ${assigned ? "bg-[var(--color-stash)] border-[var(--color-stash)]" : "border-[var(--color-border)]"}`}>
                    {assigned && <Check size={9} weight="bold" className="text-white" />}
                  </span>
                  {tag}
                </button>
              );
            })}

            {sorted.length === 0 && !showCreate && (
              <p className="px-3 py-2 text-xs text-[var(--color-text-muted)]/60">Sin resultados</p>
            )}

            {/* Create option */}
            {showCreate && (
              <>
                {sorted.length > 0 && <div className="my-1 h-px bg-[var(--color-border)]" />}
                <button
                  onMouseDown={(e) => { e.preventDefault(); onCreateTag(); }}
                  className="flex w-full items-center gap-2 px-3 py-1.5 text-xs text-[var(--color-text)] hover:bg-[var(--color-bg-muted)] transition-colors"
                >
                  <Plus size={12} className="text-[var(--color-stash)]" />
                  Crear &ldquo;{tagSearch.trim()}&rdquo;
                </button>
              </>
            )}
          </div>
        </div>
      )}
    </div>
  );
}
