import { useCallback, useMemo } from "react";
import { usePromptsData, usePromptsActions } from "../../context/PromptsContext";
import { PromptCard } from "./PromptCard";
import { Input } from "../ui";
import type { Prompt } from "../../types/prompt";

function generateId() {
  return crypto.randomUUID();
}

function createNewPrompt(): Prompt {
  const now = Date.now();
  return {
    id: generateId(),
    title: "",
    content: "",
    collectionId: null,
    tags: [],
    modelTarget: "any",
    isFavorite: false,
    createdAt: now,
    updatedAt: now,
    lastUsedAt: null,
    useCount: 0,
    versions: [],
    notes: "",
  };
}

export function PromptList() {
  const { prompts, selectedId, searchQuery, activeCollectionId } =
    usePromptsData();
  const { selectPrompt, setSearchQuery, savePrompt } = usePromptsActions();

  const filtered = useMemo(() => {
    let list = [...prompts];

    if (activeCollectionId === "favorites") {
      list = list.filter((p) => p.isFavorite);
    } else if (activeCollectionId !== null) {
      list = list.filter((p) => p.collectionId === activeCollectionId);
    }

    if (searchQuery.trim()) {
      const q = searchQuery.toLowerCase();
      list = list.filter(
        (p) =>
          p.title.toLowerCase().includes(q) ||
          p.content.toLowerCase().includes(q)
      );
    }

    return list.sort((a, b) => {
      const aTime = a.lastUsedAt ?? a.createdAt;
      const bTime = b.lastUsedAt ?? b.createdAt;
      return bTime - aTime;
    });
  }, [prompts, searchQuery, activeCollectionId]);

  const handleNew = useCallback(async () => {
    const prompt = createNewPrompt();
    await savePrompt(prompt);
    selectPrompt(prompt.id);
  }, [savePrompt, selectPrompt]);

  return (
    <div className="flex flex-col h-full w-[240px] border-r border-[var(--color-border)] shrink-0">
      {/* Header */}
      <div className="px-3 pt-3 pb-2 border-b border-[var(--color-border)]">
        <div className="flex items-center gap-2">
          <Input
            placeholder="Buscar prompts..."
            onChange={(e) => setSearchQuery(e.target.value)}
            className="h-7 text-xs"
          />
          <button
            onClick={handleNew}
            title="Nuevo prompt (⌘N)"
            className="shrink-0 flex items-center justify-center w-7 h-7 rounded-md text-[var(--color-text-muted)] hover:bg-[var(--color-bg-muted)] hover:text-[var(--color-text)] transition-colors text-lg leading-none"
          >
            +
          </button>
        </div>
      </div>

      {/* List */}
      <div className="flex-1 overflow-y-auto">
        {filtered.length === 0 ? (
          <div className="flex flex-col items-center justify-center h-full gap-2 text-[var(--color-text-muted)]">
            <p className="text-sm">
              {searchQuery ? "Sin resultados" : "Sin prompts"}
            </p>
            {!searchQuery && (
              <button
                onClick={handleNew}
                className="text-xs text-[var(--color-stash)] hover:underline"
              >
                Crear uno nuevo
              </button>
            )}
          </div>
        ) : (
          filtered.map((p) => (
            <PromptCard
              key={p.id}
              prompt={p}
              selected={p.id === selectedId}
              onClick={() => selectPrompt(p.id)}
            />
          ))
        )}
      </div>

      <div className="px-3 py-2 border-t border-[var(--color-border)]">
        <p className="text-[10px] text-[var(--color-text-muted)]">
          {filtered.length} prompt{filtered.length !== 1 ? "s" : ""}
        </p>
      </div>
    </div>
  );
}
