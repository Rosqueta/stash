import { forwardRef, useEffect, useState, type ButtonHTMLAttributes, type InputHTMLAttributes, type ReactNode } from "react";
import { createPortal } from "react-dom";
import * as TooltipPrimitive from "@radix-ui/react-tooltip";
import { Trash, X } from "@phosphor-icons/react";
import { toast } from "sonner";
import { cn } from "../../lib/utils";

export function ConfirmIcon() {
  const [active, setActive] = useState(false);
  useEffect(() => { requestAnimationFrame(() => setActive(true)); }, []);
  return (
    <svg viewBox="0 0 28 28" className={`w-5 h-5 ${active ? "checkmark-active" : ""}`} fill="none">
      <circle className="ring-circle" cx="14" cy="14" r="13" stroke="var(--color-stash)" strokeWidth="1.5" />
      <path className="ring-check" d="M9 14l3.5 3.5L19 10" stroke="var(--color-stash)" strokeWidth="1.5" strokeLinecap="round" strokeLinejoin="round" />
    </svg>
  );
}

export function toastSuccess(message: string) {
  toast(message, { icon: <ConfirmIcon />, duration: 2000 });
}

export function TooltipProvider({ children }: { children: ReactNode }) {
  return (
    <TooltipPrimitive.Provider delayDuration={600}>
      {children}
    </TooltipPrimitive.Provider>
  );
}

export function Tooltip({ children, label }: { children: ReactNode; label: string }) {
  return (
    <TooltipPrimitive.Root>
      <TooltipPrimitive.Trigger asChild>{children}</TooltipPrimitive.Trigger>
      <TooltipPrimitive.Portal>
        <TooltipPrimitive.Content
          sideOffset={6}
          className="z-50 rounded-md bg-[var(--color-text)] px-2 py-1 text-[12.5px] text-[var(--color-bg)] shadow-md animate-in fade-in-0 zoom-in-95"
        >
          {label}
        </TooltipPrimitive.Content>
      </TooltipPrimitive.Portal>
    </TooltipPrimitive.Root>
  );
}

// Square icon button with consistent hover behavior across the app
export const IconButton = forwardRef<
  HTMLButtonElement,
  ButtonHTMLAttributes<HTMLButtonElement> & { size?: "sm" | "md" }
>(({ className, size = "md", ...props }, ref) => (
  <button
    ref={ref}
    className={cn(
      "inline-flex items-center justify-center rounded-md text-[var(--color-text-muted)] hover:bg-[var(--color-bg-muted)] hover:text-[var(--color-text)] active:scale-[0.9] active:bg-[var(--color-bg-emphasis)] transition-all duration-100 focus-visible:outline-none disabled:opacity-50",
      size === "md" && "w-7 h-7",
      size === "sm" && "w-6 h-6",
      className
    )}
    {...props}
  />
));
IconButton.displayName = "IconButton";

export const Button = forwardRef<
  HTMLButtonElement,
  ButtonHTMLAttributes<HTMLButtonElement> & {
    variant?: "default" | "ghost" | "destructive";
    size?: "sm" | "md";
  }
>(({ className, variant = "default", size = "md", ...props }, ref) => (
  <button
    ref={ref}
    className={cn(
      "inline-flex items-center justify-center rounded-md font-medium transition-colors focus-visible:outline-none disabled:opacity-50",
      variant === "default" &&
        "bg-accent text-[var(--color-bg)] hover:opacity-90",
      variant === "ghost" &&
        "hover:bg-[var(--color-bg-muted)] text-[var(--color-text-muted)] hover:text-[var(--color-text)]",
      variant === "destructive" &&
        "text-red-500 hover:bg-red-500/10",
      size === "sm" && "h-7 px-2.5 text-xs gap-1.5",
      size === "md" && "h-9 px-4 text-sm gap-2",
      className
    )}
    {...props}
  />
));
Button.displayName = "Button";

export const Input = forwardRef<
  HTMLInputElement,
  InputHTMLAttributes<HTMLInputElement>
>(({ className, ...props }, ref) => (
  <input
    ref={ref}
    className={cn(
      "w-full rounded-md border border-[var(--color-border)] bg-transparent px-3 py-1.5 text-sm text-[var(--color-text)] placeholder:text-[var(--color-text-muted)] focus:outline-none focus:border-[var(--color-accent)] transition-colors",
      className
    )}
    {...props}
  />
));
Input.displayName = "Input";

// Keyboard shortcut rendered one key per <kbd> so symbols don't blend together
export function ShortcutKeys({ keys, accent = false }: { keys: string[]; accent?: boolean }) {
  return (
    <span className="inline-flex items-center gap-[3px] align-middle">
      {keys.map((k) => (
        <kbd
          key={k}
          className={cn(
            "inline-flex items-center justify-center rounded px-1 py-0.5 min-w-[18px] text-[10px] font-mono leading-none",
            accent
              ? "bg-[var(--color-stash)]/12 text-[var(--color-stash)] font-semibold"
              : "bg-[var(--color-bg-muted)] text-[var(--color-text-muted)]"
          )}
        >
          {k}
        </kbd>
      ))}
    </span>
  );
}

// Destructive-action confirmation modal, portaled to document.body
export function ConfirmDialog({
  open,
  title,
  description,
  confirmLabel = "Delete",
  onConfirm,
  onCancel,
}: {
  open: boolean;
  title: string;
  description: ReactNode;
  confirmLabel?: string;
  onConfirm: () => void;
  onCancel: () => void;
}) {
  useEffect(() => {
    if (!open) return;
    function handleKey(e: KeyboardEvent) {
      if (e.key === "Escape") {
        e.stopPropagation();
        onCancel();
      }
    }
    window.addEventListener("keydown", handleKey, true);
    return () => window.removeEventListener("keydown", handleKey, true);
  }, [open, onCancel]);

  if (!open) return null;

  return createPortal(
    <div
      className="fixed inset-0 z-[200] flex items-center justify-center bg-black/30 backdrop-blur-[2px]"
      onClick={(e) => { if (e.target === e.currentTarget) onCancel(); }}
    >
      <div className="relative w-full max-w-[330px] mx-6 rounded-3xl bg-[var(--color-bg)] border border-[var(--color-border)] shadow-2xl p-6">
        <IconButton
          onClick={onCancel}
          aria-label="Close modal"
          className="absolute right-4 top-4"
        >
          <X size={14} weight="bold" />
        </IconButton>
        <div className="mx-auto mb-4 flex items-center justify-center">
          <Trash size={34} weight="regular" className="text-red-400" />
        </div>
        <h3 className="text-center text-sm font-semibold text-[var(--color-text)]">
          {title}
        </h3>
        <p className="mt-2 text-center text-sm text-[var(--color-text-muted)] leading-relaxed">
          {description}
        </p>
        <div className="mt-7 grid grid-cols-2 gap-4">
          <button
            onClick={onCancel}
            className="w-full rounded-lg px-3 py-2 text-sm font-medium bg-[var(--color-bg-muted)] text-[var(--color-text)] hover:bg-[var(--color-bg-emphasis)] transition-colors"
          >
            Cancel
          </button>
          <button
            onClick={onConfirm}
            className="w-full rounded-lg px-3 py-2 text-sm font-medium bg-red-400 text-white hover:bg-red-500 transition-colors"
          >
            {confirmLabel}
          </button>
        </div>
      </div>
    </div>,
    document.body
  );
}
