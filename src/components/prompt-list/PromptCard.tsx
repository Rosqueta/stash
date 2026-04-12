import { forwardRef, memo } from "react";
import { PushPin } from "@phosphor-icons/react";
import { cn } from "../../lib/utils";
import type { Prompt } from "../../types/prompt";

interface PromptCardProps {
  prompt: Prompt;
  selected: boolean;
  onClick: () => void;
}

export const PromptCard = memo(forwardRef<HTMLDivElement, PromptCardProps>(function PromptCard({
  prompt,
  selected,
  onClick,
}, ref) {
  return (
    <div
      ref={ref}
      onClick={onClick}
      className={cn(
        "flex items-center gap-1.5 rounded-md px-2 py-1.5 text-sm cursor-pointer transition-colors",
        selected
          ? "bg-[var(--color-bg-muted)] text-[var(--color-text)]"
          : "text-[var(--color-text-muted)] hover:bg-[var(--color-bg-muted)] hover:text-[var(--color-text)]"
      )}
    >
      <span className="flex-1 truncate">
        {prompt.title || "Untitled"}
      </span>
      {prompt.isPinned && (
        <PushPin size={12} weight="regular" className="shrink-0 text-[var(--color-stash)]" />
      )}
    </div>
  );
}));
