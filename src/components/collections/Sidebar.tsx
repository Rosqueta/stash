import { useState, useCallback, useEffect, useRef } from "react";
import { PushPin, Notepad, Plus, Trash, MagnifyingGlass, Folder, FolderOpen, Gear } from "@phosphor-icons/react";
import { cn } from "../../lib/utils";
import { usePromptsData, usePromptsActions } from "../../context/PromptsContext";
import { IconButton, Tooltip } from "../ui";
import type { Collection, Prompt } from "../../types/prompt";

function generateId() {
  return crypto.randomUUID();
}

function createNewPrompt(collectionId: string | null = null): Prompt {
  const now = Date.now();
  return {
    id: generateId(),
    title: "Sin título",
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

const COLLECTION_COLORS = [
  "#d97706", "#0ea5e9", "#8b5cf6", "#10b981", "#ef4444", "#f59e0b",
];

export function Sidebar({ onSearchOpen, onSettingsOpen }: { onSearchOpen: () => void; onSettingsOpen: () => void }) {
  const { collections, activeCollectionId } = usePromptsData();
  const { setActiveCollection, saveCollection, deleteCollection, savePrompt, selectPrompt } =
    usePromptsActions();
  const [newCollectionName, setNewCollectionName] = useState("");
  const [isAdding, setIsAdding] = useState(false);
  const newCollectionInputRef = useRef<HTMLInputElement>(null);

  useEffect(() => {
    if (isAdding) newCollectionInputRef.current?.focus();
  }, [isAdding]);

  const handleNew = useCallback(async () => {
    try {
      const collectionId = activeCollectionId !== "pinned" ? activeCollectionId : null;
      const prompt = createNewPrompt(collectionId);
      await savePrompt(prompt);
      selectPrompt(prompt.id);
    } catch {
      // Error feedback is handled in context actions.
    }
  }, [activeCollectionId, savePrompt, selectPrompt]);

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
        color: COLLECTION_COLORS[collections.length % COLLECTION_COLORS.length],
      };
      await saveCollection(collection);
      setNewCollectionName("");
      setIsAdding(false);
    } catch {
      // Error feedback is handled in context actions.
    }
  }, [newCollectionName, collections.length, saveCollection]);

  return (
    <aside className="flex flex-col h-full w-[220px] border-r border-[var(--color-border)] bg-[var(--color-bg-secondary)] shrink-0">
      {/* Action buttons */}
      <div className="px-2 pt-3 pb-3 space-y-1 shrink-0">
        <button
          onClick={() => void handleNew()}
          className="flex w-full items-center justify-between rounded-md px-3 py-2 text-sm font-medium bg-[var(--color-stash)] text-white hover:opacity-90 transition-opacity"
        >
          <div className="flex items-center gap-2">
            <Plus size={15} weight="regular" />
            <span>Nuevo prompt</span>
          </div>
          <kbd className="inline-flex items-center rounded px-1.5 py-0.5 text-[10px] font-mono bg-white/20">⌘N</kbd>
        </button>
        <button
          onClick={onSearchOpen}
          className="flex w-full items-center justify-between rounded-md px-3 py-2 text-sm text-[var(--color-text-muted)] hover:bg-[var(--color-bg-muted)] hover:text-[var(--color-text)] transition-colors"
        >
          <div className="flex items-center gap-2">
            <MagnifyingGlass size={15} />
            <span>Buscar</span>
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
            label="Pineados"
            active={activeCollectionId === "pinned"}
            onClick={() => setActiveCollection("pinned")}
          />
        </section>

        <div className="px-2 mb-1 flex items-center justify-between">
          <span className="text-[10px] font-semibold uppercase tracking-wider text-[var(--color-text-muted)]">
            Colecciones
          </span>
          <Tooltip label="Nueva colección">
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
              style={{ color: COLLECTION_COLORS[collections.length % COLLECTION_COLORS.length] }}
              className="shrink-0"
            />
            <input
              ref={newCollectionInputRef}
              value={newCollectionName}
              onChange={(e) => setNewCollectionName(e.target.value)}
              placeholder="Nueva colección"
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
            onSelect={() => setActiveCollection(c.id)}
            onDelete={() => deleteCollection(c.id)}
          />
        ))}
        </div>
      </div>

      {/* Settings */}
      <div className="px-2 pb-3 pt-1 shrink-0">
        <button
          onClick={onSettingsOpen}
          className="flex w-full items-center justify-between rounded-md px-3 py-2 text-sm text-[var(--color-text-muted)] hover:bg-[var(--color-bg-muted)] hover:text-[var(--color-text)] transition-colors"
        >
          <div className="flex items-center gap-2">
            <Gear size={15} />
            <span>Ajustes</span>
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
      {label === "Pineados" && <PushPin size={16} weight="regular" />}
      <span>{label}</span>
    </button>
  );
}

function CollectionItem({
  collection,
  active,
  onSelect,
  onDelete,
}: {
  collection: Collection;
  active: boolean;
  onSelect: () => void;
  onDelete: () => void;
}) {
  return (
    <div
      className={cn(
        "group flex w-full items-center justify-between rounded-md px-2 py-1 text-sm transition-colors cursor-pointer",
        active
          ? "bg-[var(--color-bg-muted)] text-[var(--color-text)]"
          : "text-[var(--color-text-muted)] hover:bg-[var(--color-bg-muted)] hover:text-[var(--color-text)]"
      )}
      onClick={onSelect}
    >
      <div className="flex items-center gap-2 min-w-0">
        {active
          ? <FolderOpen size={16} weight="regular" style={{ color: collection.color }} className="shrink-0" />
          : <Folder size={16} weight="regular" style={{ color: collection.color }} className="shrink-0" />
        }
        <span className="truncate">{collection.name}</span>
      </div>
      <div className="flex items-center">
        <Tooltip label="Eliminar colección">
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
