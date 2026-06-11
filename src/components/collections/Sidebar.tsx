import { useState, useCallback, useEffect, useRef } from "react";
import { PushPin, Notepad, Plus, Trash, MagnifyingGlass, Folder, FolderOpen, Gear, Books } from "@phosphor-icons/react";
import { cn } from "../../lib/utils";
import { usePromptsData, usePromptsActions } from "../../context/PromptsContext";
import { useTheme } from "../../context/ThemeContext";
import { IconButton, Tooltip } from "../ui";
import { capture } from "../../services/analytics";
import { PROMPT_DRAG_TYPE } from "../prompt-list/PromptCard";
import { pickNextCollectionColor } from "../../services/collectionColors";
import type { Collection, Prompt } from "../../types/prompt";

function generateId() {
  return crypto.randomUUID();
}

function createNewPrompt(collectionId: string | null = null): Prompt {
  const now = Date.now();
  return {
    id: generateId(),
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

export function Sidebar({ onSearchOpen, onSettingsOpen }: { onSearchOpen: () => void; onSettingsOpen: () => void }) {
  const { collections, activeCollectionId, prompts } = usePromptsData();
  const { hasSeenShortcutHint, markHintSeen } = useTheme();
  const { setActiveCollection, saveCollection, deleteCollection, savePrompt, selectPrompt } =
    usePromptsActions();
  const [newCollectionName, setNewCollectionName] = useState("");
  const [isAdding, setIsAdding] = useState(false);
  const [editingCollectionId, setEditingCollectionId] = useState<string | null>(null);
  const [editingName, setEditingName] = useState("");
  const newCollectionInputRef = useRef<HTMLInputElement>(null);
  const [m1Triggered, setM1Triggered] = useState(false);

  useEffect(() => {
    if (!m1Triggered && prompts.length >= 1) setM1Triggered(true);
  }, [prompts.length, m1Triggered]);

  useEffect(() => {
    if (isAdding) newCollectionInputRef.current?.focus();
  }, [isAdding]);

  const handleNew = useCallback(async () => {
    try {
      const isSpecialView = activeCollectionId === "pinned" || activeCollectionId === "library";
      const collectionId = isSpecialView ? null : activeCollectionId;
      const prompt = createNewPrompt(collectionId);
      await savePrompt(prompt);
      if (activeCollectionId === "library") setActiveCollection(null);
      selectPrompt(prompt.id);
    } catch {
      // Error feedback is handled in context actions.
    }
  }, [activeCollectionId, savePrompt, selectPrompt, setActiveCollection]);

  useEffect(() => {
    function handleKey(e: KeyboardEvent) {
      if ((e.metaKey || e.ctrlKey) && e.key === "n") {
        e.preventDefault();
        void handleNew();
      }
      if ((e.metaKey || e.ctrlKey) && e.key === "f") {
        e.preventDefault();
        onSearchOpen();
      }
    }
    window.addEventListener("keydown", handleKey);
    return () => window.removeEventListener("keydown", handleKey);
  }, [handleNew, onSearchOpen]);

  const handleAddCollection = useCallback(async () => {
    const name = newCollectionName.trim();
    if (!name) return;
    try {
      const collection: Collection = {
        id: generateId(),
        name,
        color: pickNextCollectionColor(collections),
      };
      await saveCollection(collection);
      setActiveCollection(collection.id);
      setNewCollectionName("");
      setIsAdding(false);
    } catch {
      // Error feedback is handled in context actions.
    }
  }, [newCollectionName, collections, saveCollection, setActiveCollection]);

  const handleDropPrompt = useCallback(async (promptId: string, collectionId: string) => {
    const prompt = prompts.find((p) => p.id === promptId);
    if (!prompt || prompt.collectionId === collectionId) return;
    try {
      await savePrompt({ ...prompt, collectionId, updatedAt: Date.now() });
      capture("prompt_moved", { source: "drag_drop" });
    } catch {
      // Error feedback is handled in context actions.
    }
  }, [prompts, savePrompt]);

  const startEditingCollection = useCallback((collection: Collection) => {
    setEditingCollectionId(collection.id);
    setEditingName(collection.name);
  }, []);

  const cancelEditingCollection = useCallback(() => {
    setEditingCollectionId(null);
    setEditingName("");
  }, []);

  const saveEditedCollection = useCallback(async (collection: Collection) => {
    const trimmed = editingName.trim();
    if (!trimmed || trimmed === collection.name) {
      cancelEditingCollection();
      return;
    }
    try {
      await saveCollection({ ...collection, name: trimmed });
      cancelEditingCollection();
    } catch {
      // Error feedback is handled in context actions.
    }
  }, [editingName, saveCollection, cancelEditingCollection]);

  return (
    <aside className="flex flex-col h-full w-[220px] border-r border-[var(--color-border)] bg-[var(--color-bg-secondary)] shrink-0">
      {/* Action buttons */}
      <div className="px-2 pt-3 pb-3 space-y-1 shrink-0">
        <button
          onClick={onSearchOpen}
          className="flex w-full items-center justify-between rounded-md px-3 py-2 text-sm text-[var(--color-text-muted)] hover:bg-[var(--color-bg-muted)] hover:text-[var(--color-text)] transition-colors"
        >
          <div className="flex items-center gap-2">
            <MagnifyingGlass size={15} />
            <span>Search</span>
          </div>
          <kbd className="inline-flex items-center rounded px-1.5 py-0.5 text-[10px] font-mono bg-[var(--color-bg-muted)] text-[var(--color-text-muted)]">⌘F</kbd>
        </button>
      </div>

      <div className="flex-1 overflow-y-auto px-2 pb-2">
        {/* Quick views */}
        <section className="mb-4 space-y-0.5">
          <SidebarItem
            label="Prompts"
            active={activeCollectionId === null}
            onClick={() => setActiveCollection(null)}
          />
          <SidebarItem
            label="Pinned"
            active={activeCollectionId === "pinned"}
            onClick={() => setActiveCollection("pinned")}
          />
          <SidebarItem
            label="Library"
            active={activeCollectionId === "library"}
            onClick={() => setActiveCollection("library")}
          />
        </section>

        <div className="px-2 mb-1 flex items-center justify-between">
          <span className="text-[10px] font-semibold uppercase tracking-wider text-[var(--color-text-muted)]">
            Collections
          </span>
          <Tooltip label="New collection">
            <IconButton size="sm" onClick={() => setIsAdding(true)}>
              <Plus size={14} weight="regular" />
            </IconButton>
          </Tooltip>
        </div>

        {isAdding && (
          <div className="flex items-center gap-2 rounded-md px-2 py-1.5 bg-[var(--color-bg-muted)]">
            <Folder
              size={16}
              weight="regular"
              style={{ color: pickNextCollectionColor(collections) }}
              className="shrink-0"
            />
            <input
              ref={newCollectionInputRef}
              value={newCollectionName}
              onChange={(e) => setNewCollectionName(e.target.value)}
              placeholder="New collection"
              className="flex-1 min-w-0 bg-transparent text-sm text-[var(--color-text)] placeholder:text-[var(--color-text-muted)] focus:outline-none"
              onKeyDown={(e) => {
                if (e.key === "Enter") void handleAddCollection();
                if (e.key === "Escape") {
                  setIsAdding(false);
                  setNewCollectionName("");
                }
              }}
              onBlur={() => {
                setIsAdding(false);
                setNewCollectionName("");
              }}
            />
          </div>
        )}

        <div className="space-y-0.5">
        {collections.map((c) => (
          <CollectionItem
            key={c.id}
            collection={c}
            active={activeCollectionId === c.id}
            isEditing={editingCollectionId === c.id}
            editingName={editingName}
            onEditingNameChange={setEditingName}
            onSelect={() => {
              if (editingCollectionId !== c.id) setActiveCollection(c.id);
            }}
            onDelete={() => deleteCollection(c.id)}
            onStartEdit={() => startEditingCollection(c)}
            onSaveEdit={() => void saveEditedCollection(c)}
            onCancelEdit={cancelEditingCollection}
            onDropPrompt={(promptId) => void handleDropPrompt(promptId, c.id)}
          />
        ))}
        </div>
      </div>

      {/* Onboarding — M1: shortcut hint banner (shown after first prompt) */}
      {m1Triggered && !hasSeenShortcutHint && (
        <div className="mx-3 mb-2 shrink-0 rounded-lg bg-[var(--color-bg-muted)] px-3 py-2.5 animate-slide-in-left">
          <p className="text-xs font-medium text-[var(--color-text)]">
            Press{" "}
            <span className="font-mono font-semibold text-[var(--color-stash)]">⌘⇧P</span>
            {" "}from any app to open your prompts
          </p>
          <p className="mt-1 text-[11px] leading-snug text-[var(--color-text-muted)]">
            Works everywhere except full-screen apps. Customizable in Settings.
          </p>
          <button
            onClick={() => markHintSeen("shortcut")}
            className="mt-2 text-[11px] font-medium text-[var(--color-stash)] hover:opacity-70 transition-opacity"
          >
            Got it
          </button>
        </div>
      )}

      {/* Settings */}
      <div className="px-2 pb-3 pt-1 shrink-0">
        <button
          onClick={onSettingsOpen}
          className="flex w-full items-center justify-between rounded-md px-3 py-2 text-sm text-[var(--color-text-muted)] hover:bg-[var(--color-bg-muted)] hover:text-[var(--color-text)] transition-colors"
        >
          <div className="flex items-center gap-2">
            <Gear size={15} />
            <span>Settings</span>
          </div>
          <kbd className="inline-flex items-center rounded px-1.5 py-0.5 text-[10px] font-mono bg-[var(--color-bg-muted)] text-[var(--color-text-muted)]">⌘,</kbd>
        </button>
      </div>
    </aside>
  );
}

function SidebarItem({
  label,
  active,
  onClick,
}: {
  label: string;
  active: boolean;
  onClick: () => void;
}) {
  return (
    <button
      onClick={onClick}
      className={cn(
        "flex w-full items-center gap-1.5 rounded-md px-2 py-1.5 text-sm transition-colors",
        active
          ? "bg-[var(--color-bg-muted)] text-[var(--color-text)]"
          : "text-[var(--color-text-muted)] hover:bg-[var(--color-bg-muted)] hover:text-[var(--color-text)]"
      )}
    >
      {label === "Prompts" && <Notepad size={16} weight="regular" />}
      {label === "Pinned" && <PushPin size={16} weight="regular" />}
      {label === "Library" && <Books size={16} weight="regular" />}
      <span>{label}</span>
    </button>
  );
}

function CollectionItem({
  collection,
  active,
  isEditing,
  editingName,
  onEditingNameChange,
  onSelect,
  onDelete,
  onStartEdit,
  onSaveEdit,
  onCancelEdit,
  onDropPrompt,
}: {
  collection: Collection;
  active: boolean;
  isEditing: boolean;
  editingName: string;
  onEditingNameChange: (value: string) => void;
  onSelect: () => void;
  onDelete: () => void;
  onStartEdit: () => void;
  onSaveEdit: () => void;
  onCancelEdit: () => void;
  onDropPrompt: (promptId: string) => void;
}) {
  const inputRef = useRef<HTMLInputElement>(null);
  const [isDropTarget, setIsDropTarget] = useState(false);

  useEffect(() => {
    if (isEditing) {
      inputRef.current?.focus();
      inputRef.current?.select();
    }
  }, [isEditing]);

  return (
    <div
      className={cn(
        "group flex w-full items-center justify-between rounded-md px-2 py-1 text-sm transition-colors cursor-pointer",
        active
          ? "bg-[var(--color-bg-muted)] text-[var(--color-text)]"
          : "text-[var(--color-text-muted)] hover:bg-[var(--color-bg-muted)] hover:text-[var(--color-text)]",
        isDropTarget && "bg-[var(--color-bg-emphasis)] text-[var(--color-text)] ring-1 ring-inset ring-[var(--color-stash)]"
      )}
      onClick={onSelect}
      onDoubleClick={onStartEdit}
      onDragOver={(e) => {
        if (e.dataTransfer.types.includes(PROMPT_DRAG_TYPE)) {
          e.preventDefault();
          e.dataTransfer.dropEffect = "move";
          setIsDropTarget(true);
        }
      }}
      onDragLeave={() => setIsDropTarget(false)}
      onDrop={(e) => {
        e.preventDefault();
        setIsDropTarget(false);
        const promptId = e.dataTransfer.getData(PROMPT_DRAG_TYPE);
        if (promptId) onDropPrompt(promptId);
      }}
    >
      <div className="flex items-center gap-2 min-w-0">
        {active
          ? <FolderOpen size={16} weight="regular" style={{ color: collection.color }} className="shrink-0" />
          : <Folder size={16} weight="regular" style={{ color: collection.color }} className="shrink-0" />
        }
        {isEditing ? (
          <input
            ref={inputRef}
            value={editingName}
            onChange={(e) => onEditingNameChange(e.target.value)}
            className="flex-1 min-w-0 bg-transparent text-sm text-[var(--color-text)] focus:outline-none"
            onClick={(e) => e.stopPropagation()}
            onDoubleClick={(e) => e.stopPropagation()}
            onBlur={onSaveEdit}
            onKeyDown={(e) => {
              e.stopPropagation();
              if (e.key === "Enter") void onSaveEdit();
              if (e.key === "Escape") onCancelEdit();
            }}
          />
        ) : (
          <span className="truncate">{collection.name}</span>
        )}
      </div>
      <div className={cn("flex items-center", isEditing && "invisible")}>
        <Tooltip label="Delete collection">
          <IconButton
            size="sm"
            className="opacity-0 group-hover:opacity-100 hover:text-red-500"
            onClick={(e) => {
              e.stopPropagation();
              onDelete();
            }}
          >
            <Trash size={14} weight="regular" />
          </IconButton>
        </Tooltip>
      </div>
    </div>
  );
}
