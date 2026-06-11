import { forwardRef, memo, useState } from "react";
import { PushPin } from "@phosphor-icons/react";
import { cn } from "../../lib/utils";
import type { Prompt } from "../../types/prompt";

export const PROMPT_DRAG_TYPE = "application/x-stash-prompt";

// WebKit snapshots the drag image at dragstart, so a throwaway element works:
// a small chip with the prompt title instead of the default ghost of the row.
// No box-shadow — WebKit clips it in the snapshot and the edges look broken.
function setDragGhost(e: React.DragEvent, title: string) {
  const ghost = document.createElement("div");
  ghost.textContent = title;
  Object.assign(ghost.style, {
    position: "fixed",
    top: "-100px",
    left: "-100px",
    maxWidth: "220px",
    overflow: "hidden",
    textOverflow: "ellipsis",
    whiteSpace: "nowrap",
    padding: "4px 10px",
    borderRadius: "6px",
    background: "var(--color-bg-secondary)",
    color: "var(--color-text)",
    border: "1px solid var(--color-border)",
    fontSize: "13px",
    fontWeight: "500",
    lineHeight: "1.4",
    pointerEvents: "none",
  });
  document.body.appendChild(ghost);
  e.dataTransfer.setDragImage(ghost, 12, 12);
  setTimeout(() => ghost.remove(), 0);
}

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
  const [isDragging, setIsDragging] = useState(false);

  return (
    <div
      ref={ref}
      onClick={onClick}
      draggable
      onDragStart={(e) => {
        e.dataTransfer.setData(PROMPT_DRAG_TYPE, prompt.id);
        e.dataTransfer.effectAllowed = "move";
        setDragGhost(e, prompt.title || "Untitled");
        setIsDragging(true);
      }}
      onDragEnd={() => setIsDragging(false)}
      className={cn(
        "flex items-center gap-1.5 rounded-md px-2 py-1.5 text-sm cursor-pointer transition-colors",
        selected
          ? "bg-[var(--color-bg-muted)] text-[var(--color-text)]"
          : "text-[var(--color-text-muted)] hover:bg-[var(--color-bg-muted)] hover:text-[var(--color-text)]",
        isDragging && "opacity-40"
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
