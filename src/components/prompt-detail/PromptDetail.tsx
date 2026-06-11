import {
  useCallback,
  useEffect,
  useMemo,
  useRef,
  useState,
} from "react";
import { createPortal } from "react-dom";
import { PushPin, Copy, Trash, Folder, CaretDown, CaretUp, Note, Notepad, MagnifyingGlass, Plus, Check, PencilSimple } from "@phosphor-icons/react";
import { VariableEditor } from "./VariableEditor";
import { WarmUp } from "../warm-up/WarmUp";
import * as DropdownMenu from "@radix-ui/react-dropdown-menu";
import { usePromptsData, usePromptsActions } from "../../context/PromptsContext";
import { capture } from "../../services/analytics";
import { extractVariables } from "../../services/variables";
import { ConfirmDialog, IconButton, Tooltip } from "../ui";
import { OnboardingTour } from "../onboarding/OnboardingTour";
import type { Prompt } from "../../types/prompt";

export function PromptDetail() {
  const { prompts, selectedId, collections, tags: globalTags } = usePromptsData();
  const { savePrompt, deletePrompt, copyPrompt, renameTag, deleteTag } = usePromptsActions();

  const prompt = prompts.find((p) => p.id === selectedId) ?? null;

  const [title, setTitle] = useState("");
  const [content, setContent] = useState("");
  const [notes, setNotes] = useState("");
  const [tags, setTags] = useState<string[]>([]);
  const [tagDropdownOpen, setTagDropdownOpen] = useState(false);
  const [tagSearch, setTagSearch] = useState("");
  const [isPinned, setIsPinned] = useState(false);
  const [warmUpOpen, setWarmUpOpen] = useState(false);
  const [tagPendingDelete, setTagPendingDelete] = useState<string | null>(null);
  const [deleteConfirmOpen, setDeleteConfirmOpen] = useState(false);
  const [notesExpanded, setNotesExpanded] = useState(true);

  // Reset notes to expanded default whenever the selected prompt changes,
  // synchronously during render so CSS transition doesn't fire.
  const lastPromptIdRef = useRef<string | null | undefined>(undefined);
  if (lastPromptIdRef.current !== (prompt?.id ?? null)) {
    lastPromptIdRef.current = prompt?.id ?? null;
    if (!notesExpanded) setNotesExpanded(true);
  }

  const outerContainerRef = useRef<HTMLDivElement>(null);
  const notesRef = useRef<HTMLTextAreaElement>(null);

  const autoSizeNotes = useCallback(() => {
    const el = notesRef.current;
    if (!el) return;
    el.style.height = "auto";
    el.style.height = `${el.scrollHeight}px`;
  }, []);

  useEffect(() => {
    autoSizeNotes();
  }, [notes, notesExpanded, autoSizeNotes]);

  // Recalculate notes height when the panel width changes (text re-wraps)
  useEffect(() => {
    const el = notesRef.current;
    if (!el) return;
    const ro = new ResizeObserver(() => autoSizeNotes());
    ro.observe(el);
    return () => ro.disconnect();
  }, [autoSizeNotes, notesExpanded]);

  const saveDebounce = useRef<ReturnType<typeof setTimeout> | null>(null);
  const pendingPatchRef = useRef<Partial<Prompt> | null>(null);
  const currentPromptRef = useRef<Prompt | null>(null);

  const syncFromPrompt = useCallback((nextPrompt: Prompt, localPatch?: Partial<Prompt> | null) => {
    const merged = { ...nextPrompt, ...localPatch };
    setTitle(merged.title);
    setContent(merged.content);
    setNotes(merged.notes);
    setTags(merged.tags);
    setIsPinned(merged.isPinned);
  }, []);

  const flushSave = useCallback(async (baseOverride?: Prompt | null) => {
    if (saveDebounce.current) {
      clearTimeout(saveDebounce.current);
      saveDebounce.current = null;
    }

    const patch = pendingPatchRef.current;
    const base = baseOverride ?? currentPromptRef.current;

    pendingPatchRef.current = null;

    if (base && patch) {
      await savePrompt({ ...base, ...patch, updatedAt: Date.now() });
    }
  }, [savePrompt]);

  useEffect(() => {
    if (!prompt) {
      currentPromptRef.current = null;
      setTitle("");
      setContent("");
      setNotes("");
      setTags([]);
      setIsPinned(false);
      return;
    }

    const previousPrompt = currentPromptRef.current;

    if (previousPrompt && previousPrompt.id !== prompt.id) {
      void flushSave(previousPrompt);
      syncFromPrompt(prompt);
      currentPromptRef.current = prompt;
      return;
    }

    currentPromptRef.current = prompt;
    syncFromPrompt(prompt, pendingPatchRef.current);
  }, [prompt, flushSave, syncFromPrompt]);

  const scheduleSave = useCallback(
    (patch: Partial<Prompt>) => {
      pendingPatchRef.current = { ...pendingPatchRef.current, ...patch };
      if (saveDebounce.current) clearTimeout(saveDebounce.current);
      saveDebounce.current = setTimeout(() => {
        const p = pendingPatchRef.current;
        pendingPatchRef.current = null;
        saveDebounce.current = null;
        const latest = currentPromptRef.current;
        if (latest && p) void savePrompt({ ...latest, ...p, updatedAt: Date.now() });
      }, 300);
    },
    [savePrompt]
  );

  useEffect(() => {
    return () => {
      // Flush any pending save on unmount so no data is lost
      void flushSave();
    };
  }, [flushSave]);

  const handleTitleChange = useCallback(
    (e: React.ChangeEvent<HTMLInputElement>) => {
      setTitle(e.target.value);
      scheduleSave({ title: e.target.value });
    },
    [scheduleSave]
  );

  const handleNotesChange = useCallback(
    (e: React.ChangeEvent<HTMLTextAreaElement>) => {
      const nextValue = e.target.value;
      setNotes(nextValue);
      scheduleSave({ notes: nextValue });
    },
    [scheduleSave]
  );

  const handlePin = useCallback(() => {
    const next = !isPinned;
    setIsPinned(next);
    scheduleSave({ isPinned: next });
  }, [isPinned, scheduleSave]);

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
      capture("prompt_moved", { source: "detail_dropdown" });
    },
    [scheduleSave]
  );

  if (!prompt) {
    return (
      <div className="flex flex-1 flex-col items-center justify-center gap-4" style={{ color: "color-mix(in srgb, var(--color-text-muted) 50%, transparent)" }}>
        <Notepad size={48} weight="thin" />
        <div className="flex flex-col items-center gap-0.5 text-center">
          <p className="text-sm">Select a prompt</p>
          <p className="text-sm">or create a new one to get started</p>
        </div>
      </div>
    );
  }

  const activeCollection = collections.find((c) => c.id === prompt.collectionId) ?? null;

  return (
    <div ref={outerContainerRef} className="relative flex flex-col flex-1 h-full overflow-hidden">
      <div key={selectedId} className="flex-1 min-h-0 flex flex-col animate-content-in">

        {/* Header — collection + actions + title + tags (fixed) */}
        <div className="shrink-0 px-8 pt-6 pb-3 flex flex-col gap-4">
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
                  {activeCollection ? activeCollection.name : "No collection"}
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
                  No collection
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
            <Tooltip label={isPinned ? "Unpin" : "Pin"}>
              <IconButton onClick={handlePin}>
                <PushPin
                  size={18}
                  weight="regular"
                  className={isPinned ? "text-[var(--color-stash)]" : ""}
                />
              </IconButton>
            </Tooltip>
            <Tooltip label="Copy prompt">
              <IconButton
                onClick={() => {
                  if (extractVariables(content).length > 0) {
                    setWarmUpOpen(true);
                  } else {
                    void copyPrompt(prompt, false, undefined, "detail");
                  }
                }}
              >
                <Copy size={18} weight="regular" />
              </IconButton>
            </Tooltip>
            <Tooltip label="Delete prompt">
              <IconButton
                onClick={() => setDeleteConfirmOpen(true)}
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
          placeholder="Untitled"
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
          onRenameTag={async (oldName, newName) => {
            await flushSave();
            await renameTag(oldName, newName);
            setTags((prev) => prev.map((t) => t === oldName ? newName.trim() : t));
          }}
          onDeleteTag={(name) => setTagPendingDelete(name)}
        />
        </div>

        {/* Content — always flex-[3]; takes 60% when notes are flex-[2], 100% when notes flex-[0] */}
        <div className="flex-[3] min-h-0 overflow-y-auto px-8 py-2">
          <VariableEditor
            value={content}
            onChange={(val) => { setContent(val); scheduleSave({ content: val }); }}
            placeholder="Write your prompt here..."
          />
        </div>

        {/* Notes divider — clickable toggle */}
        <button
          type="button"
          onClick={() => setNotesExpanded((v) => !v)}
          aria-expanded={notesExpanded}
          aria-label={notesExpanded ? "Collapse notes" : "Expand notes"}
          className={`shrink-0 px-8 pt-2 group cursor-pointer focus:outline-none transition-[padding] duration-200 ease-out ${notesExpanded ? "pb-2" : "pb-8"}`}
        >
          <div className="flex items-center gap-3">
            <div className="flex-1 h-px bg-[var(--color-border)]" />
            <span className="flex items-center gap-1.5 text-[10px] font-semibold uppercase tracking-widest text-[var(--color-text-muted)] group-hover:text-[var(--color-text)] transition-colors">
              <Note size={12} weight="regular" />
              Notes
              {notesExpanded ? <CaretDown size={10} /> : <CaretUp size={10} />}
            </span>
            <div className="flex-1 h-px bg-[var(--color-border)]" />
          </div>
        </button>

        {/* Notes — animated collapse via flex-grow + opacity */}
        <div
          aria-hidden={!notesExpanded}
          className={`min-h-0 overflow-y-auto px-8 transition-[flex-grow,opacity,padding] duration-200 ease-out ${
            notesExpanded
              ? "flex-[2] opacity-100 pt-1 pb-6 pointer-events-auto"
              : "flex-[0_0_0px] opacity-0 pt-0 pb-0 pointer-events-none"
          }`}
        >
          <textarea
            ref={notesRef}
            value={notes}
            onChange={handleNotesChange}
            placeholder="Notes about this prompt..."
            rows={1}
            tabIndex={notesExpanded ? 0 : -1}
            className="w-full resize-none overflow-hidden bg-transparent text-sm text-[var(--color-text)] placeholder:text-[var(--color-text-muted)]/50 focus:outline-none leading-relaxed selectable"
          />
        </div>
      </div>

      {/* Warm-Up modal */}
      {warmUpOpen && prompt && createPortal(
        <div
          className="fixed inset-0 z-50 flex items-center justify-center bg-black/30 backdrop-blur-sm"
          onClick={(e) => { if (e.target === e.currentTarget) setWarmUpOpen(false); }}
        >
          <div className="w-full max-w-lg mx-6 bg-[var(--color-bg)] rounded-2xl shadow-2xl ring-1 ring-black/10 overflow-hidden max-h-[80vh] flex flex-col">
            <WarmUp
              prompt={{ ...prompt, content }}
              onCopy={(resolved) => {
                void copyPrompt(prompt, false, resolved, "detail");
                setWarmUpOpen(false);
              }}
              onClose={() => setWarmUpOpen(false)}
            />
          </div>
        </div>,
        document.body
      )}

      {/* Delete tag confirm modal */}
      <ConfirmDialog
        open={!!tagPendingDelete}
        title="Delete tag"
        description={<>The tag &ldquo;{tagPendingDelete}&rdquo; will be removed from all prompts.</>}
        onCancel={() => setTagPendingDelete(null)}
        onConfirm={async () => {
          const name = tagPendingDelete;
          if (!name) return;
          await flushSave();
          await deleteTag(name);
          setTags((prev) => prev.filter((t) => t !== name));
          setTagPendingDelete(null);
        }}
      />

      {/* Delete prompt confirm modal */}
      <ConfirmDialog
        open={deleteConfirmOpen}
        title="Delete prompt"
        description={<>Are you sure you want to delete &ldquo;{title.trim() || "Untitled"}&rdquo;? This cannot be undone.</>}
        onCancel={() => setDeleteConfirmOpen(false)}
        onConfirm={() => {
          setDeleteConfirmOpen(false);
          void deletePrompt(prompt.id);
        }}
      />

      {/* Onboarding floating tour */}
      <OnboardingTour content={content} />
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
  onRenameTag: (oldName: string, newName: string) => Promise<void>;
  onDeleteTag: (name: string) => void;
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
  onRenameTag,
  onDeleteTag,
}: TagEditorProps) {
  const inputRef = useRef<HTMLInputElement>(null);
  const containerRef = useRef<HTMLDivElement>(null);
  const renameInputRef = useRef<HTMLInputElement>(null);
  const [renamingTag, setRenamingTag] = useState<string | null>(null);
  const [renameValue, setRenameValue] = useState("");
  // Ref to avoid double-confirm (Enter key + subsequent blur)
  const confirmingRef = useRef(false);

  // Focus rename input whenever renamingTag is set
  useEffect(() => {
    if (renamingTag) {
      renameInputRef.current?.focus();
      renameInputRef.current?.select();
    }
  }, [renamingTag]);

  // Cancel rename when dropdown closes
  useEffect(() => {
    if (!open) setRenamingTag(null);
  }, [open]);

  // Focus search input when dropdown opens (only if not renaming)
  useEffect(() => {
    if (open && !renamingTag) {
      setTimeout(() => inputRef.current?.focus(), 0);
    }
  }, [open, renamingTag]);

  const startRename = (tag: string) => {
    confirmingRef.current = false;
    setRenamingTag(tag);
    setRenameValue(tag);
  };

  const confirmRename = async (currentTag: string, currentValue: string) => {
    if (confirmingRef.current) return;
    confirmingRef.current = true;
    setRenamingTag(null);
    const trimmed = currentValue.trim();
    if (trimmed && trimmed !== currentTag) {
      await onRenameTag(currentTag, trimmed);
    }
    confirmingRef.current = false;
  };

  const filtered = useMemo(() => {
    const q = tagSearch.trim().toLowerCase();
    const pool = [
      ...tags.filter((t) => !globalTags.includes(t)),
      ...globalTags,
    ].filter((t, i, arr) => arr.indexOf(t) === i);
    if (!q) return pool;
    return pool.filter((t) => t.includes(q));
  }, [globalTags, tags, tagSearch]);

  const showCreate =
    tagSearch.trim().length > 0 &&
    !filtered.map((t) => t.toLowerCase()).includes(tagSearch.trim().toLowerCase());

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
            aria-label={`Remove tag ${tag}`}
            className="hover:text-[var(--color-text)] transition-colors leading-none"
          >
            ×
          </button>
        </span>
      ))}

      {/* Add tag button */}
      <button
        onClick={() => onOpenChange(true)}
        aria-label="Add tag"
        className="inline-flex items-center gap-1 rounded-full px-2.5 py-0.5 text-xs text-[var(--color-text-muted)]/60 border border-dashed border-[var(--color-border)] hover:border-[var(--color-text-muted)] hover:text-[var(--color-text-muted)] transition-colors"
      >
        <Plus size={10} />
        Add tag
      </button>

      {/* Dropdown */}
      {open && (
        <div className="absolute top-full left-0 mt-1.5 z-50 w-56 rounded-lg bg-[var(--color-bg)] border border-[var(--color-border)] shadow-lg overflow-hidden">
          {/* Search input — disabled while renaming to prevent accidental tag creation */}
          <div className="flex items-center gap-2 px-3 py-2 border-b border-[var(--color-border)]">
            <MagnifyingGlass size={13} className="text-[var(--color-text-muted)] shrink-0" />
            <input
              ref={inputRef}
              value={renamingTag ? "" : tagSearch}
              onChange={(e) => { if (!renamingTag) onTagSearchChange(e.target.value); }}
              onKeyDown={(e) => {
                if (renamingTag) return;
                if (e.key === "Escape") { e.stopPropagation(); onOpenChange(false); }
                if (e.key === "Enter" && showCreate) { e.preventDefault(); onCreateTag(); }
              }}
              placeholder={renamingTag ? "Renaming..." : "Search tag..."}
              disabled={!!renamingTag}
              className="flex-1 bg-transparent text-xs text-[var(--color-text)] placeholder:text-[var(--color-text-muted)]/50 focus:outline-none disabled:opacity-40"
            />
          </div>

          {/* Tag list */}
          <div className="max-h-48 overflow-y-auto py-1">
            {!showCreate && !renamingTag && (
              <p className="px-3 py-1.5 text-xs text-[var(--color-text-muted)]/50">Search or create a tag</p>
            )}
            {sorted.map((tag) => {
              const assigned = tags.includes(tag);
              const isRenaming = renamingTag === tag;
              return (
                <div
                  key={tag}
                  className="group flex w-full items-center gap-2.5 px-3 py-1.5 text-xs text-[var(--color-text)] hover:bg-[var(--color-bg-muted)] transition-colors"
                >
                  {/* Checkbox — disabled while renaming this tag */}
                  <span
                    onMouseDown={(e) => { e.preventDefault(); if (!isRenaming) onToggleTag(tag); }}
                    className={`flex h-3.5 w-3.5 shrink-0 items-center justify-center rounded-sm border transition-colors cursor-pointer ${assigned ? "bg-[var(--color-stash)] border-[var(--color-stash)]" : "border-[var(--color-border)]"}`}
                  >
                    {assigned && <Check size={9} weight="bold" className="text-white" />}
                  </span>

                  {/* Name or inline rename input */}
                  {isRenaming ? (
                    <input
                      ref={renameInputRef}
                      value={renameValue}
                      onChange={(e) => setRenameValue(e.target.value)}
                      onKeyDown={(e) => {
                        e.stopPropagation();
                        if (e.key === "Enter") { e.preventDefault(); void confirmRename(tag, renameValue); }
                        if (e.key === "Escape") { e.preventDefault(); setRenamingTag(null); }
                      }}
                      onBlur={() => void confirmRename(tag, renameValue)}
                      className="flex-1 bg-transparent focus:outline-none text-[var(--color-text)]"
                    />
                  ) : (
                    <span
                      className="flex-1 text-left cursor-pointer"
                      onMouseDown={(e) => { e.preventDefault(); onToggleTag(tag); }}
                    >
                      {tag}
                    </span>
                  )}

                  {/* Actions — visible on hover, hidden while any rename is active */}
                  {!renamingTag && (
                    <div className="flex items-center gap-1 opacity-0 group-hover:opacity-100 transition-opacity">
                      <button
                        onMouseDown={(e) => { e.preventDefault(); e.stopPropagation(); startRename(tag); }}
                        aria-label={`Rename tag ${tag}`}
                        className="flex items-center justify-center w-4 h-4 rounded text-[var(--color-text-muted)] hover:text-[var(--color-text)] hover:bg-[var(--color-bg-emphasis)] transition-colors"
                      >
                        <PencilSimple size={11} />
                      </button>
                      <button
                        onMouseDown={(e) => { e.preventDefault(); e.stopPropagation(); onDeleteTag(tag); }}
                        aria-label={`Delete tag ${tag}`}
                        className="flex items-center justify-center w-4 h-4 rounded text-[var(--color-text-muted)] hover:text-red-500 hover:bg-[var(--color-bg-emphasis)] transition-colors"
                      >
                        <Trash size={11} />
                      </button>
                    </div>
                  )}
                </div>
              );
            })}


            {/* Create option */}
            {showCreate && (
              <>
                {sorted.length > 0 && <div className="my-1 h-px bg-[var(--color-border)]" />}
                <button
                  onMouseDown={(e) => { e.preventDefault(); onCreateTag(); }}
                  className="flex w-full items-center gap-2 px-3 py-1.5 text-xs text-[var(--color-text)] hover:bg-[var(--color-bg-muted)] transition-colors"
                >
                  <Plus size={12} className="text-[var(--color-stash)]" />
                  Create &ldquo;{tagSearch.trim()}&rdquo;
                </button>
              </>
            )}
          </div>
        </div>
      )}
    </div>
  );
}
