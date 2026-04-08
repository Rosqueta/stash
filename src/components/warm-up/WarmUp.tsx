import { useState, useCallback, useMemo, useRef, useEffect } from "react";
import { X, Check, Copy, ArrowRight } from "@phosphor-icons/react";
import {
  parseSegments,
  resolveVariables,
  extractVariables,
} from "../../services/variables";
import type { Prompt } from "../../types/prompt";
import { cn } from "../../lib/utils";

interface VarChipProps {
  name: string;
  value: string;
  isEditing: boolean;
  onEdit: () => void;
  onConfirm: (val: string) => void;
  onConfirmAndAdvance: (val: string) => void;
  onCancel: () => void;
}

function VarChip({
  name,
  value,
  isEditing,
  onEdit,
  onConfirm,
  onConfirmAndAdvance,
  onCancel,
}: VarChipProps) {
  const inputRef = useRef<HTMLInputElement>(null);
  const [draft, setDraft] = useState(value);

  useEffect(() => {
    if (isEditing) {
      setDraft("");
      requestAnimationFrame(() => inputRef.current?.focus());
    }
  }, [isEditing]); // eslint-disable-line react-hooks/exhaustive-deps

  if (isEditing) {
    return (
      <input
        ref={inputRef}
        value={draft}
        placeholder={`{{${name}}}`}
        onChange={(e) => setDraft(e.target.value)}
        onKeyDown={(e) => {
          if (e.key === "Enter" || e.key === "Tab") {
            e.preventDefault();
            if (draft.trim() !== "") onConfirmAndAdvance(draft);
            else onCancel();
          } else if (e.key === "Escape") {
            e.preventDefault();
            onCancel();
          }
        }}
        onBlur={() => {
          if (draft.trim() !== "") onConfirm(draft);
          else onCancel();
        }}
        className={cn(
          "inline-block rounded-md px-1.5 py-0.5 text-sm leading-snug",
          "border border-[var(--color-stash)] bg-transparent text-[var(--color-text)] focus:outline-none",
          "placeholder:text-[var(--color-text-muted)]/40"
        )}
        style={{ width: `${Math.max(draft.length, name.length + 4, 4) + 3}ch` }}
      />
    );
  }

  const filled = value.trim() !== "";

  if (filled) {
    return (
      <span
        onClick={onEdit}
        className="inline-flex items-center gap-0.5 rounded-md px-1.5 py-0.5 text-sm leading-snug bg-emerald-500/10 text-emerald-600 dark:text-emerald-400 cursor-pointer hover:bg-emerald-500/15 transition-colors"
      >
        <Check size={11} weight="bold" className="shrink-0" />
        {value}
      </span>
    );
  }

  return (
    <span
      onClick={onEdit}
      className="inline-block rounded-md px-1.5 py-0.5 text-sm leading-snug bg-[var(--color-stash)]/10 text-[var(--color-stash)] italic cursor-pointer hover:bg-[var(--color-stash)]/15 transition-colors"
    >
      {name}
    </span>
  );
}

export interface WarmUpProps {
  prompt: Prompt;
  onCopy: (resolvedContent: string) => Promise<void> | void;
  onCopySuccess?: () => Promise<void> | void;
  onClose: () => void;
}

export function WarmUp({ prompt, onCopy, onCopySuccess, onClose }: WarmUpProps) {
  const segments = useMemo(
    () => parseSegments(prompt.content),
    [prompt.content]
  );
  const varNames = useMemo(
    () => extractVariables(prompt.content),
    [prompt.content]
  );

  const [values, setValues] = useState<Record<string, string>>({});
  const [isCopying, setIsCopying] = useState(false);
  const [isCopied, setIsCopied] = useState(false);
  const [animateCopied, setAnimateCopied] = useState(false);
  const [copyPhase, setCopyPhase] = useState<"idle" | "copying" | "copied-animating">("idle");
  const valuesRef = useRef(values);
  const copySuccessTimeout = useRef<ReturnType<typeof setTimeout> | null>(null);
  useEffect(() => {
    valuesRef.current = values;
  }, [values]);

  useEffect(() => {
    return () => {
      if (copySuccessTimeout.current) clearTimeout(copySuccessTimeout.current);
    };
  }, []);

  // editingKey = `${varname}_${segmentIndex}`
  const initialKey = useMemo(() => {
    const idx = segments.findIndex((s) => s.type === "var");
    if (idx === -1) return null;
    const seg = segments[idx] as { type: "var"; name: string };
    return `${seg.name}_${idx}`;
  }, [segments]);

  const [editingKey, setEditingKey] = useState<string | null>(initialKey);

  const filledCount = varNames.filter(
    (n) => (values[n] ?? "").trim() !== ""
  ).length;
  const allFilled = varNames.length > 0 && filledCount === varNames.length;

  const findNextEmptyKey = useCallback(
    (updated: Record<string, string>, afterIdx: number) => {
      // Search from afterIdx+1, then wrap around
      for (let i = afterIdx + 1; i < segments.length; i++) {
        const seg = segments[i];
        if (seg.type === "var" && !(updated[seg.name] ?? "").trim()) {
          return `${seg.name}_${i}`;
        }
      }
      for (let i = 0; i < afterIdx; i++) {
        const seg = segments[i];
        if (seg.type === "var" && !(updated[seg.name] ?? "").trim()) {
          return `${seg.name}_${i}`;
        }
      }
      return null;
    },
    [segments]
  );

  const handleConfirm = useCallback((varName: string, val: string) => {
    setValues((prev) => ({ ...prev, [varName]: val }));
    setEditingKey(null);
  }, []);

  const handleConfirmAndAdvance = useCallback(
    (varName: string, segIdx: number, val: string) => {
      const updated = { ...valuesRef.current, [varName]: val };
      setValues(updated);
      const next = findNextEmptyKey(updated, segIdx);
      setEditingKey(next);
    },
    [findNextEmptyKey]
  );

  const handleCopy = useCallback(() => {
    if (isCopying || isCopied) return;
    const resolved = resolveVariables(prompt.content, values);
    setIsCopying(true);
    setCopyPhase("copying");
    void (async () => {
      try {
        await onCopy(resolved);
        setIsCopying(false);
        setAnimateCopied(false);
        setIsCopied(true);
        setCopyPhase("copied-animating");
        requestAnimationFrame(() => {
          requestAnimationFrame(() => {
            setAnimateCopied(true);
          });
        });
        copySuccessTimeout.current = setTimeout(() => {
          void onCopySuccess?.();
        }, 1100);
      } catch {
        setIsCopying(false);
        setIsCopied(false);
        setAnimateCopied(false);
        setCopyPhase("idle");
      }
    })();
  }, [isCopied, isCopying, prompt.content, values, onCopy, onCopySuccess]);

  const copyDisabled = isCopying || isCopied;
  const closeDisabled = isCopying || isCopied;

  return (
    <div className="flex flex-col h-full bg-[var(--color-bg)]">
      {/* Header */}
      <div className="flex items-center justify-between gap-3 px-5 py-3.5 border-b border-[var(--color-border)]">
        <div className="min-w-0">
          <h2 className="text-base font-semibold text-[var(--color-text)] truncate">
            {prompt.title || "Sin título"}
          </h2>
        </div>
        <button
          onClick={onClose}
          disabled={closeDisabled}
          className="shrink-0 w-6 h-6 flex items-center justify-center rounded-md text-[var(--color-text-muted)] hover:bg-[var(--color-bg-muted)] hover:text-[var(--color-text)] transition-colors"
        >
          <X size={14} />
        </button>
      </div>

      {/* Content */}
      <div className="flex-1 overflow-y-auto px-5 py-4">
        <div
          className={cn(
            "mb-3 text-xs transition-colors",
            allFilled
              ? "text-emerald-600 dark:text-emerald-400"
              : "text-[var(--color-text-muted)]"
          )}
        >
          {allFilled
            ? "Todo listo ✓"
            : `${filledCount} de ${varNames.length} variable${varNames.length !== 1 ? "s" : ""}`}
        </div>
        <p className="text-sm text-[var(--color-text)] leading-relaxed whitespace-pre-wrap selectable">
          {segments.map((seg, i) => {
            if (seg.type === "text") return seg.value;
            const key = `${seg.name}_${i}`;
            return (
              <VarChip
                key={key}
                name={seg.name}
                value={values[seg.name] ?? ""}
                isEditing={editingKey === key}
                onEdit={() => setEditingKey(key)}
                onConfirm={(val) => handleConfirm(seg.name, val)}
                onConfirmAndAdvance={(val) =>
                  handleConfirmAndAdvance(seg.name, i, val)
                }
                onCancel={() => setEditingKey(null)}
              />
            );
          })}
        </p>
      </div>

      {/* Footer */}
      <div className="border-t border-[var(--color-border)] px-5 py-2.5 flex items-center gap-4 text-xs text-[var(--color-text-muted)]">
        <div className="flex items-center gap-3">
          <span className="flex items-center gap-1">
            <kbd className="inline-flex items-center rounded px-1 py-0.5 font-mono bg-[var(--color-bg-muted)]">
              Tab
            </kbd>
            <ArrowRight size={10} />
            siguiente
          </span>
          <span className="flex items-center gap-1">
            <kbd className="inline-flex items-center rounded px-1 py-0.5 font-mono bg-[var(--color-bg-muted)]">
              Esc
            </kbd>
            cerrar
          </span>
        </div>
        <button
          onClick={handleCopy}
          disabled={copyDisabled}
          className={cn(
            "ml-auto inline-flex items-center rounded-lg px-3 py-2 text-sm font-medium text-white transition-opacity bg-[var(--color-stash)] leading-none",
            "gap-2 align-middle",
            !copyDisabled && "hover:opacity-90",
            copyDisabled && "cursor-default"
          )}
        >
          {copyPhase === "copied-animating" ? (
            <>
              <span className={cn("inline-flex h-[14px] w-[14px] items-center justify-center shrink-0", animateCopied && "checkmark-active")}>
                <svg width="14" height="14" viewBox="0 0 26 26" className="block">
                  <circle
                    className="ring-circle"
                    cx="13" cy="13" r="11"
                    fill="rgba(255,255,255,0.16)"
                    stroke="#FFF7ED"
                    strokeWidth="1.4"
                  />
                  <polyline
                    className="ring-check"
                    points="8,13 11.5,16.5 18,9.5"
                    fill="none"
                    stroke="#FFF7ED"
                    strokeWidth="1.5"
                    strokeLinecap="round"
                    strokeLinejoin="round"
                  />
                </svg>
              </span>
              <span>Copiado</span>
            </>
          ) : (
            <>
              <Copy size={14} className="shrink-0" />
              {copyPhase === "copying" ? "Copiando..." : "Copiar"}
            </>
          )}
        </button>
      </div>
    </div>
  );
}
