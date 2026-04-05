import {
  useCallback,
  useEffect,
  useRef,
  useState,
} from "react";
import { usePromptsData, usePromptsActions } from "../../context/PromptsContext";
import { parseSegments } from "../../services/variables";
import { Button } from "../ui";
import type { ModelTarget, Prompt } from "../../types/prompt";

const MODEL_OPTIONS: { value: ModelTarget; label: string }[] = [
  { value: "any", label: "Cualquiera" },
  { value: "claude-sonnet", label: "Claude Sonnet" },
  { value: "claude-opus", label: "Claude Opus" },
  { value: "gpt-4o", label: "GPT-4o" },
  { value: "gemini", label: "Gemini" },
];

export function PromptDetail() {
  const { prompts, selectedId } = usePromptsData();
  const { savePrompt, deletePrompt, copyPrompt } = usePromptsActions();

  const prompt = prompts.find((p) => p.id === selectedId) ?? null;

  const [title, setTitle] = useState("");
  const [content, setContent] = useState("");
  const [notes, setNotes] = useState("");
  const [modelTarget, setModelTarget] = useState<ModelTarget>("any");
  const [isFavorite, setIsFavorite] = useState(false);

  const saveDebounce = useRef<ReturnType<typeof setTimeout> | null>(null);
  const notesDebounce = useRef<ReturnType<typeof setTimeout> | null>(null);
  const currentPromptId = useRef<string | null>(null);

  useEffect(() => {
    if (!prompt) return;
    if (prompt.id === currentPromptId.current) return;
    currentPromptId.current = prompt.id;
    setTitle(prompt.title);
    setContent(prompt.content);
    setNotes(prompt.notes);
    setModelTarget(prompt.modelTarget);
    setIsFavorite(prompt.isFavorite);
  }, [prompt]);

  const scheduleSave = useCallback(
    (patch: Partial<Prompt>) => {
      if (!prompt) return;
      if (saveDebounce.current) clearTimeout(saveDebounce.current);
      saveDebounce.current = setTimeout(() => {
        const now = Date.now();
        const hasContentChange =
          "content" in patch && patch.content !== prompt.content;
        const newVersion =
          hasContentChange && prompt.versions.length < 10
            ? [
                {
                  id: crypto.randomUUID(),
                  content: prompt.content,
                  createdAt: now,
                  note: "",
                  rating: null as null,
                },
                ...prompt.versions,
              ].slice(0, 10)
            : prompt.versions;

        void savePrompt({
          ...prompt,
          ...patch,
          updatedAt: now,
          versions: hasContentChange ? newVersion : prompt.versions,
        });
      }, 300);
    },
    [prompt, savePrompt]
  );

  const handleContentChange = useCallback(
    (e: React.ChangeEvent<HTMLTextAreaElement>) => {
      setContent(e.target.value);
      scheduleSave({ content: e.target.value });
    },
    [scheduleSave]
  );

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

  const handleModelChange = useCallback(
    (e: React.ChangeEvent<HTMLSelectElement>) => {
      const val = e.target.value as ModelTarget;
      setModelTarget(val);
      scheduleSave({ modelTarget: val });
    },
    [scheduleSave]
  );

  const handleFavorite = useCallback(() => {
    const next = !isFavorite;
    setIsFavorite(next);
    scheduleSave({ isFavorite: next });
  }, [isFavorite, scheduleSave]);

  if (!prompt) {
    return (
      <div className="flex flex-1 items-center justify-center text-[var(--color-text-muted)]">
        <p className="text-sm">Selecciona un prompt</p>
      </div>
    );
  }

  const segments = parseSegments(content);

  return (
    <div className="flex flex-col flex-1 h-full overflow-hidden">
      {/* Header */}
      <div className="flex items-center gap-3 px-6 py-4 border-b border-[var(--color-border)] shrink-0">
        <input
          value={title}
          onChange={handleTitleChange}
          placeholder="Título del prompt"
          className="flex-1 text-lg font-semibold bg-transparent text-[var(--color-text)] placeholder:text-[var(--color-text-muted)] focus:outline-none"
        />
        <button
          onClick={handleFavorite}
          className="text-xl transition-colors"
          title="Favorito"
        >
          <span className={isFavorite ? "text-[var(--color-stash)]" : "text-[var(--color-text-muted)]"}>
            ★
          </span>
        </button>
        <select
          value={modelTarget}
          onChange={handleModelChange}
          className="text-xs bg-transparent text-[var(--color-text-muted)] border border-[var(--color-border)] rounded px-2 py-1 focus:outline-none"
        >
          {MODEL_OPTIONS.map((o) => (
            <option key={o.value} value={o.value}>
              {o.label}
            </option>
          ))}
        </select>
        <Button
          size="sm"
          onClick={() => copyPrompt(prompt)}
          className="bg-[var(--color-stash)] text-white hover:opacity-90"
        >
          Copiar
        </Button>
        <Button
          variant="destructive"
          size="sm"
          onClick={() => deletePrompt(prompt.id)}
        >
          Eliminar
        </Button>
      </div>

      {/* Content area */}
      <div className="flex-1 overflow-y-auto px-6 py-4 flex flex-col gap-6">
        {/* Content editor */}
        <section>
          <label className="block text-xs font-medium text-[var(--color-text-muted)] mb-2 uppercase tracking-wide">
            Contenido
          </label>
          <textarea
            value={content}
            onChange={handleContentChange}
            placeholder="Escribe tu prompt aquí... Usa {{variable}} para añadir variables."
            className="w-full min-h-[160px] resize-none bg-transparent text-sm text-[var(--color-text)] placeholder:text-[var(--color-text-muted)] focus:outline-none leading-relaxed"
          />
          {/* Variable preview */}
          {segments.some((s) => s.type === "var") && (
            <div className="mt-3 p-3 rounded-lg bg-[var(--color-bg-muted)] text-sm leading-relaxed">
              {segments.map((seg, i) =>
                seg.type === "text" ? (
                  <span key={i} className="text-[var(--color-text)]">
                    {seg.value}
                  </span>
                ) : (
                  <span
                    key={i}
                    className="inline-flex items-center px-1.5 py-0.5 rounded text-xs font-medium bg-amber-100 text-amber-800 dark:bg-amber-900/40 dark:text-amber-300 mx-0.5"
                  >
                    {`{{${seg.name}}}`}
                  </span>
                )
              )}
            </div>
          )}
        </section>

        {/* Versions */}
        {prompt.versions.length > 0 && (
          <section>
            <label className="block text-xs font-medium text-[var(--color-text-muted)] mb-2 uppercase tracking-wide">
              Versiones ({prompt.versions.length})
            </label>
            <div className="space-y-1">
              {prompt.versions.map((v, i) => (
                <div
                  key={v.id}
                  className="flex items-start gap-3 p-2 rounded-md hover:bg-[var(--color-bg-muted)] transition-colors"
                >
                  <span className="shrink-0 text-xs text-[var(--color-text-muted)] w-5 text-right">
                    v{prompt.versions.length - i}
                  </span>
                  <div className="flex-1 min-w-0">
                    <p className="text-xs text-[var(--color-text)] line-clamp-2 leading-relaxed">
                      {v.content.slice(0, 120)}
                      {v.content.length > 120 ? "…" : ""}
                    </p>
                    {v.note && (
                      <p className="text-[10px] text-[var(--color-text-muted)] mt-0.5">
                        {v.note}
                      </p>
                    )}
                  </div>
                  <span className="shrink-0 text-[10px] text-[var(--color-text-muted)]">
                    {new Date(v.createdAt).toLocaleDateString("es-ES", {
                      month: "short",
                      day: "numeric",
                    })}
                  </span>
                  <RatingDots rating={v.rating} />
                </div>
              ))}
            </div>
          </section>
        )}

        {/* Notes */}
        <section>
          <label className="block text-xs font-medium text-[var(--color-text-muted)] mb-2 uppercase tracking-wide">
            Notas
          </label>
          <textarea
            value={notes}
            onChange={handleNotesChange}
            placeholder="Notas sobre este prompt..."
            className="w-full min-h-[80px] resize-none bg-transparent text-sm text-[var(--color-text)] placeholder:text-[var(--color-text-muted)] focus:outline-none leading-relaxed"
          />
        </section>
      </div>
    </div>
  );
}

function RatingDots({ rating }: { rating: 1 | 2 | 3 | null }) {
  if (!rating) return null;
  const colors = ["", "text-red-400", "text-yellow-400", "text-green-400"];
  const labels = ["", "Malo", "Regular", "Bueno"];
  return (
    <span
      className={`shrink-0 text-xs ${colors[rating]}`}
      title={labels[rating]}
    >
      ●
    </span>
  );
}
