import { forwardRef, type ButtonHTMLAttributes, type InputHTMLAttributes, type ReactNode } from "react";
import * as TooltipPrimitive from "@radix-ui/react-tooltip";
import { cn } from "../../lib/utils";

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
          className="z-50 rounded-md bg-[#44403c] px-2 py-1 text-[12.5px] text-[var(--color-bg)] shadow-md animate-in fade-in-0 zoom-in-95"
        >
          {label}
        </TooltipPrimitive.Content>
      </TooltipPrimitive.Portal>
    </TooltipPrimitive.Root>
  );
}

// Botón cuadrado para iconos — hover consistente en toda la app
export const IconButton = forwardRef<
  HTMLButtonElement,
  ButtonHTMLAttributes<HTMLButtonElement> & { size?: "sm" | "md" }
>(({ className, size = "md", ...props }, ref) => (
  <button
    ref={ref}
    className={cn(
      "inline-flex items-center justify-center rounded-md text-[var(--color-text-muted)] hover:bg-[var(--color-bg-muted)] hover:text-[var(--color-text)] transition-colors focus-visible:outline-none disabled:opacity-50",
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
