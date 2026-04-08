import { useMemo, useCallback } from "react";
import { usePromptsData, usePromptsActions } from "../../context/PromptsContext";
import { PromptCard } from "./PromptCard";
import emptyStateImg from "../../assets/empty-state-prompts.png";
import type { Prompt } from "../../types/prompt";

function createNewPrompt(collectionId: string | null = null): Prompt {
  const now = Date.now();
  return {
    id: crypto.randomUUID(),
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

export function PromptList() {
  const { prompts, selectedId, activeCollectionId } = usePromptsData();
  const { selectPrompt, savePrompt } = usePromptsActions();

  const filtered = useMemo(() => {
    let list = [...prompts];

    if (activeCollectionId === "pinned") {
      list = list.filter((p) => p.isPinned);
    } else if (activeCollectionId !== null) {
      list = list.filter((p) => p.collectionId === activeCollectionId);
    }

    return list.sort((a, b) => {
      const aTime = a.lastUsedAt ?? a.createdAt;
      const bTime = b.lastUsedAt ?? b.createdAt;
      return bTime - aTime;
    });
  }, [prompts, activeCollectionId]);

  const handleNew = useCallback(async () => {
    const collectionId = activeCollectionId !== "pinned" ? activeCollectionId : null;
    const prompt = createNewPrompt(collectionId);
    await savePrompt(prompt);
    selectPrompt(prompt.id);
  }, [activeCollectionId, savePrompt, selectPrompt]);

  return (
    <div className="flex flex-col h-full w-[284px] border-r border-[var(--color-border)] shrink-0">
      <div className="flex-1 overflow-y-auto px-2 pt-3 pb-2 space-y-0.5">
        {filtered.length === 0 ? (
          <div className="flex flex-col items-center justify-center h-full gap-2 px-6 text-center">
            <img
              src={emptyStateImg}
              alt=""
              className="w-28 h-28 object-contain"
            />
            <div className="flex flex-col gap-1.5">
              <p className="text-sm font-semibold text-[var(--color-text)]">
                Tu stash está vacío
              </p>
              <p className="text-sm text-[var(--color-text-muted)] leading-relaxed">
                Crea tu primer prompt y accede a él desde cualquier app.
              </p>
            </div>
            <button
              onClick={() => void handleNew()}
              className="inline-flex items-center gap-3 rounded-lg px-3 py-2 text-sm font-medium bg-[var(--color-bg-muted)] text-[var(--color-text)] hover:bg-[var(--color-bg-emphasis)] transition-colors mt-2"
            >
              <span>Nuevo prompt</span>
              <kbd className="inline-flex items-center rounded px-1.5 py-0.5 text-[10px] font-mono bg-[var(--color-bg-emphasis)] text-[var(--color-text-muted)]">⌘N</kbd>
            </button>
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
    </div>
  );
}
