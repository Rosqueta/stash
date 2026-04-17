import type { CSSProperties, ReactNode } from "react";
import { X } from "@phosphor-icons/react";
import { IconButton } from "../ui";

interface OnboardingCardProps {
  title: string;
  description: ReactNode;
  onDismiss: () => void;
  style: CSSProperties;
  squirrelSrc: string;
}

export function OnboardingCard({
  title,
  description,
  onDismiss,
  style,
  squirrelSrc,
}: OnboardingCardProps) {
  return (
    <div
      className="absolute z-40 w-[290px] rounded-xl border border-[var(--color-border)] bg-[var(--color-bg)] shadow-[0_2px_12px_rgba(0,0,0,0.07)] animate-slide-in-bottom"
      style={style}
    >
      <div className="p-4 pr-8">
        {/* Fila superior: imagen + título */}
        <div className="flex items-center gap-2.5 mb-2">
          <img
            src={squirrelSrc}
            alt=""
            className="h-8 w-8 shrink-0 object-contain"
          />
          <p className="text-sm font-semibold leading-tight text-[var(--color-text)]">
            {title}
          </p>
        </div>

        {/* Descripción y acción — ancho completo */}
        <p className="text-xs leading-relaxed text-[var(--color-text-muted)]">
          {description}
        </p>
        <button
          onClick={onDismiss}
          className="mt-2 text-xs font-medium text-[var(--color-stash)] hover:opacity-70 transition-opacity"
        >
          Got it
        </button>
      </div>

      {/* Dismiss × */}
      <IconButton
        size="sm"
        onClick={onDismiss}
        aria-label="Dismiss"
        className="absolute right-2 top-2"
      >
        <X size={11} weight="bold" />
      </IconButton>
    </div>
  );
}
