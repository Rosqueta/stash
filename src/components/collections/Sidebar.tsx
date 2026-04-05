import { useState, useCallback } from "react";
import { cn } from "../../lib/utils";
import { usePromptsData, usePromptsActions } from "../../context/PromptsContext";
import { Button, Input } from "../ui";
import type { Collection } from "../../types/prompt";

function generateId() {
  return crypto.randomUUID();
}

const COLLECTION_COLORS = [
  "#d97706", "#0ea5e9", "#8b5cf6", "#10b981", "#ef4444", "#f59e0b",
];

export function Sidebar() {
  const { collections, activeCollectionId, prompts } = usePromptsData();
  const { setActiveCollection, saveCollection, deleteCollection } =
    usePromptsActions();
  const [newCollectionName, setNewCollectionName] = useState("");
  const [isAdding, setIsAdding] = useState(false);

  const handleAddCollection = useCallback(async () => {
    const name = newCollectionName.trim();
    if (!name) return;
    const collection: Collection = {
      id: generateId(),
      name,
      color: COLLECTION_COLORS[collections.length % COLLECTION_COLORS.length],
    };
    await saveCollection(collection);
    setNewCollectionName("");
    setIsAdding(false);
  }, [newCollectionName, collections.length, saveCollection]);

  const allCount = prompts.length;
  const favCount = prompts.filter((p) => p.isFavorite).length;

  return (
    <aside className="flex flex-col h-full w-[220px] border-r border-[var(--color-border)] bg-[var(--color-bg-secondary)] shrink-0">
      {/* Traffic light spacer */}
      <div className="h-[52px] shrink-0" />

      <div className="flex-1 overflow-y-auto px-2 pb-4">
        {/* Quick views */}
        <section className="mb-4">
          <SidebarItem
            label="Todos los prompts"
            count={allCount}
            active={activeCollectionId === null}
            onClick={() => setActiveCollection(null)}
          />
          <SidebarItem
            label="Favoritos"
            count={favCount}
            active={activeCollectionId === "favorites"}
            onClick={() => setActiveCollection("favorites")}
          />
        </section>

        <div className="px-2 mb-1 text-[10px] font-semibold uppercase tracking-wider text-[var(--color-text-muted)]">
          Colecciones
        </div>

        {collections.map((c) => (
          <CollectionItem
            key={c.id}
            collection={c}
            count={prompts.filter((p) => p.collectionId === c.id).length}
            active={activeCollectionId === c.id}
            onSelect={() => setActiveCollection(c.id)}
            onDelete={() => deleteCollection(c.id)}
          />
        ))}

        {isAdding ? (
          <div className="mt-1 px-1">
            <Input
              autoFocus
              value={newCollectionName}
              onChange={(e) => setNewCollectionName(e.target.value)}
              placeholder="Nombre de colección"
              className="text-xs h-7"
              onKeyDown={(e) => {
                if (e.key === "Enter") void handleAddCollection();
                if (e.key === "Escape") {
                  setIsAdding(false);
                  setNewCollectionName("");
                }
              }}
            />
          </div>
        ) : (
          <button
            onClick={() => setIsAdding(true)}
            className="mt-1 flex w-full items-center gap-1.5 rounded-md px-2 py-1.5 text-xs text-[var(--color-text-muted)] hover:bg-[var(--color-bg-muted)] transition-colors"
          >
            <span className="text-base leading-none">+</span> Nueva colección
          </button>
        )}
      </div>
    </aside>
  );
}

function SidebarItem({
  label,
  count,
  active,
  onClick,
}: {
  label: string;
  count: number;
  active: boolean;
  onClick: () => void;
}) {
  return (
    <button
      onClick={onClick}
      className={cn(
        "flex w-full items-center justify-between rounded-md px-2 py-1.5 text-sm transition-colors",
        active
          ? "bg-[var(--color-bg-muted)] text-[var(--color-text)] font-medium"
          : "text-[var(--color-text-muted)] hover:bg-[var(--color-bg-muted)] hover:text-[var(--color-text)]"
      )}
    >
      <span>{label}</span>
      <span className="text-xs text-[var(--color-text-muted)]">{count}</span>
    </button>
  );
}

function CollectionItem({
  collection,
  count,
  active,
  onSelect,
  onDelete,
}: {
  collection: Collection;
  count: number;
  active: boolean;
  onSelect: () => void;
  onDelete: () => void;
}) {
  return (
    <div
      className={cn(
        "group flex w-full items-center justify-between rounded-md px-2 py-1.5 text-sm transition-colors cursor-pointer",
        active
          ? "bg-[var(--color-bg-muted)] text-[var(--color-text)] font-medium"
          : "text-[var(--color-text-muted)] hover:bg-[var(--color-bg-muted)] hover:text-[var(--color-text)]"
      )}
      onClick={onSelect}
    >
      <div className="flex items-center gap-2 min-w-0">
        <span
          className="shrink-0 w-2 h-2 rounded-full"
          style={{ backgroundColor: collection.color }}
        />
        <span className="truncate">{collection.name}</span>
      </div>
      <div className="flex items-center gap-1">
        <span className="text-xs text-[var(--color-text-muted)]">{count}</span>
        <Button
          variant="ghost"
          size="sm"
          className="opacity-0 group-hover:opacity-100 h-5 w-5 p-0 text-[var(--color-text-muted)] hover:text-red-500"
          onClick={(e) => {
            e.stopPropagation();
            onDelete();
          }}
        >
          ×
        </Button>
      </div>
    </div>
  );
}
