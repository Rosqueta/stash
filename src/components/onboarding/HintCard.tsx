import type { ReactNode } from "react";
import { X } from "@phosphor-icons/react";
import { IconButton } from "../ui";

interface HintCardProps {
  title: string;
  description: ReactNode;
  onDismiss: () => void;
}

export function HintCard({ title, description, onDismiss }: HintCardProps) {
  return (
    <div className="relative rounded-lg border border-[var(--color-border)] bg-[var(--color-bg-secondary)] px-4 py-3 pr-9">
      <IconButton
        size="sm"
        onClick={onDismiss}
        aria-label="Dismiss hint"
        className="absolute right-2 top-2"
      >
        <X size={12} weight="bold" />
      </IconButton>
      <p className="text-sm font-medium text-[var(--color-text)]">{title}</p>
      <p className="mt-0.5 text-xs leading-relaxed text-[var(--color-text-muted)]">
        {description}
      </p>
      <button
        onClick={onDismiss}
        className="mt-2.5 text-xs font-medium text-[var(--color-stash)] hover:opacity-80 transition-opacity"
      >
        Got it
      </button>
    </div>
  );
}
