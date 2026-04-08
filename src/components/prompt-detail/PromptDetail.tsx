import {
  useCallback,
  useEffect,
  useRef,
  useState,
} from "react";
import { PushPin, Copy, Trash, Folder, CaretDown, Note, Notepad } from "@phosphor-icons/react";
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

      {/* Warm Up modal */}
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
