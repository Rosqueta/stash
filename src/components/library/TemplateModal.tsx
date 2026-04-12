import { useState, useEffect } from "react";
import { createPortal } from "react-dom";
import { X } from "@phosphor-icons/react";
import { toast } from "sonner";
import { cn } from "../../lib/utils";
import { usePromptsData, usePromptsActions } from "../../context/PromptsContext";
import { buildPromptFromTemplate } from "../../services/templateService";
import type { Template } from "../../types/template";

interface Props {
  template: Template;
  onClose: () => void;
}

function renderContent(content: string) {
  const parts = content.split(/(\{\{[^}]+\}\})/);
  return parts.map((part, i) => {
    if (/^\{\{[^}]+\}\}$/.test(part)) {
      return (
        <span key={i} data-var={part.slice(2, -2)}>
          {part}
        </span>
      );
    }
    return <span key={i}>{part}</span>;
  });
}

export function TemplateModal({ template, onClose }: Props) {
  const { collections } = usePromptsData();
  const { savePrompt } = usePromptsActions();
  const [selectedCollectionId, setSelectedCollectionId] = useState<string | null>(null);
  const [importing, setImporting] = useState(false);

  useEffect(() => {
    function onKeyDown(e: KeyboardEvent) {
      if (e.key === "Escape") onClose();
    }
    window.addEventListener("keydown", onKeyDown);
    return () => window.removeEventListener("keydown", onKeyDown);
  }, [onClose]);

  async function handleImport() {
    setImporting(true);
    try {
      const prompt = buildPromptFromTemplate(template, selectedCollectionId);
      await savePrompt(prompt);
      toast.success("Added to your Stash");
      onClose();
    } catch {
      toast.error("Failed to import template");
      setImporting(false);
    }
  }

  return createPortal(
    <div
      className="fixed inset-0 z-50 flex items-center justify-center"
      style={{
        background: "rgba(0,0,0,0.35)",
        backdropFilter: "blur(6px)",
        WebkitBackdropFilter: "blur(6px)",
      }}
      onClick={onClose}
    >
      <div
        className="flex flex-col w-[560px] max-h-[80vh] rounded-2xl shadow-2xl bg-[var(--color-bg)] border border-[var(--color-border)] animate-slide-down overflow-hidden"
        onClick={(e) => e.stopPropagation()}
      >
        {/* Header */}
        <div className="flex items-start justify-between gap-4 px-6 pt-5 pb-4 shrink-0">
          <h2 className="text-lg font-bold text-[var(--color-text)] leading-snug">
            {template.title}
          </h2>
          <button
            onClick={onClose}
            className="mt-0.5 flex items-center justify-center w-6 h-6 rounded-full text-[var(--color-text-muted)] hover:bg-[var(--color-bg-muted)] transition-colors shrink-0"
          >
            <X size={14} />
          </button>
        </div>

        {/* Content */}
        <div className="flex-1 overflow-y-auto px-6 pb-4">
          <div className="text-sm text-[var(--color-text)] leading-relaxed whitespace-pre-wrap selectable">
            {renderContent(template.content)}
          </div>
        </div>

        {/* Footer — collection selector + import */}
        <div className="shrink-0 border-t border-[var(--color-border)] px-4 py-3">
          <div className="flex items-center gap-2 mb-2.5">
            <span className="text-xs text-[var(--color-text-muted)] shrink-0">Add to:</span>
            <div className="flex flex-wrap gap-1.5 flex-1">
              <CollectionPill
                label="No collection"
                selected={selectedCollectionId === null}
                color={null}
                onClick={() => setSelectedCollectionId(null)}
              />
              {collections.map((c) => (
                <CollectionPill
                  key={c.id}
                  label={c.name}
                  selected={selectedCollectionId === c.id}
                  color={c.color}
                  onClick={() => setSelectedCollectionId(c.id)}
                />
              ))}
            </div>
          </div>
          <div className="flex justify-end">
            <button
              onClick={() => void handleImport()}
              disabled={importing}
              className="flex items-center gap-2 rounded-lg px-4 py-2 text-sm font-medium bg-[var(--color-stash)] text-white hover:opacity-90 active:opacity-75 active:scale-[0.98] transition-all duration-100 disabled:opacity-50"
            >
              {importing ? "Importing…" : "Add to my Stash"}
            </button>
          </div>
        </div>
      </div>
    </div>,
    document.body
  );
}

function CollectionPill({
  label,
  selected,
  color,
  onClick,
}: {
  label: string;
  selected: boolean;
  color: string | null;
  onClick: () => void;
}) {
  return (
    <button
      onClick={onClick}
      className={cn(
        "inline-flex items-center gap-1.5 rounded-full px-2.5 py-0.5 text-xs transition-colors",
        selected
          ? "bg-[var(--color-stash)]/15 text-[var(--color-stash)] font-medium"
          : "bg-[var(--color-bg-muted)] text-[var(--color-text-muted)] hover:text-[var(--color-text)]"
      )}
    >
      {color && (
        <span className="w-2 h-2 rounded-full shrink-0" style={{ background: color }} />
      )}
      {label}
    </button>
  );
}
