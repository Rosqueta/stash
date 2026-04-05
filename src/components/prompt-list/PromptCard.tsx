import { memo } from "react";
import { cn } from "../../lib/utils";
import type { Prompt } from "../../types/prompt";

const MODEL_LABELS: Record<string, string> = {
  "claude-sonnet": "Sonnet",
  "claude-opus": "Opus",
  "gpt-4o": "GPT-4o",
  gemini: "Gemini",
  any: "",
};

interface PromptCardProps {
  prompt: Prompt;
  selected: boolean;
  onClick: () => void;
}

export const PromptCard = memo(function PromptCard({
  prompt,
  selected,
  onClick,
}: PromptCardProps) {
  const preview = prompt.content.replace(/\{\{(\w+)\}\}/g, "$1").slice(0, 100);
  const modelLabel = MODEL_LABELS[prompt.modelTarget] ?? "";

  return (
    <div
      onClick={onClick}
      className={cn(
        "relative cursor-pointer px-3 py-3 border-b border-[var(--color-border)] transition-colors",
        selected
          ? "bg-[var(--color-bg-muted)] border-l-2 border-l-[var(--color-stash)]"
          : "hover:bg-[var(--color-bg-muted)]"
      )}
    >
      {!selected && (
        <div className="absolute left-0 top-0 bottom-0 w-0.5 bg-transparent" />
      )}

      <div className="flex items-start justify-between gap-2 mb-1">
        <span className="text-sm font-medium text-[var(--color-text)] truncate leading-snug">
          {prompt.title || "Sin título"}
        </span>
        {prompt.isFavorite && (
          <span className="shrink-0 text-[var(--color-stash)] text-xs">★</span>
        )}
      </div>

      <p className="text-xs text-[var(--color-text-muted)] line-clamp-2 leading-relaxed mb-2">
        {preview}
      </p>

      <div className="flex items-center gap-1.5 flex-wrap">
        {modelLabel && (
          <span className="inline-flex items-center rounded px-1.5 py-0.5 text-[10px] font-medium bg-[var(--color-bg-emphasis)] text-[var(--color-text-muted)]">
            {modelLabel}
          </span>
        )}
        {prompt.tags.slice(0, 3).map((tag) => (
          <span
            key={tag}
            className="inline-flex items-center rounded px-1.5 py-0.5 text-[10px] bg-[var(--color-bg-muted)] text-[var(--color-text-muted)]"
          >
            {tag}
          </span>
        ))}
      </div>
    </div>
  );
});
