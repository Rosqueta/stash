import { useState } from "react";
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

export function ImportModal({ template, onClose }: Props) {
  const { collections } = usePromptsData();
  const { savePrompt } = usePromptsActions();
  const [selectedCollectionId, setSelectedCollectionId] = useState<string | null>(null);
  const [importing, setImporting] = useState(false);

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
        className="relative w-72 rounded-2xl shadow-2xl overflow-hidden bg-[var(--color-bg)] border border-[var(--color-border)] animate-slide-down"
        onClick={(e) => e.stopPropagation()}
      >
        {/* Header */}
        <div className="flex items-center justify-between px-5 pt-4 pb-2">
          <p className="text-sm font-semibold text-[var(--color-text)]">Add to your Stash</p>
          <button
            onClick={onClose}
            className="flex items-center justify-center w-6 h-6 rounded-full text-[var(--color-text-muted)] hover:bg-[var(--color-bg-muted)] transition-colors"
          >
            <X size={14} />
          </button>
        </div>

        <p className="px-5 pb-2 text-xs text-[var(--color-text-muted)]">Choose a collection</p>

        {/* Collection list */}
        <div className="max-h-48 overflow-y-auto px-2 pb-2 space-y-0.5">
          <CollectionOption
            label="No collection"
            selected={selectedCollectionId === null}
            color={null}
            onClick={() => setSelectedCollectionId(null)}
          />
          {collections.map((c) => (
            <CollectionOption
              key={c.id}
              label={c.name}
              selected={selectedCollectionId === c.id}
              color={c.color}
              onClick={() => setSelectedCollectionId(c.id)}
            />
          ))}
        </div>

        {/* Footer */}
        <div className="px-4 pb-4 pt-3 border-t border-[var(--color-border)]">
          <button
            onClick={() => void handleImport()}
            disabled={importing}
            className="w-full rounded-lg px-4 py-2 text-sm font-medium bg-[var(--color-stash)] text-white hover:opacity-90 active:opacity-75 active:scale-[0.98] transition-all duration-100 disabled:opacity-50"
          >
            {importing ? "Importing…" : "Import"}
          </button>
        </div>
      </div>
    </div>,
    document.body
  );
}

function CollectionOption({
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
        "flex w-full items-center gap-2.5 rounded-md px-3 py-1.5 text-sm transition-colors",
        selected
          ? "bg-[var(--color-bg-muted)] text-[var(--color-text)]"
          : "text-[var(--color-text-muted)] hover:bg-[var(--color-bg-muted)] hover:text-[var(--color-text)]"
      )}
    >
      {color ? (
        <span className="w-2.5 h-2.5 rounded-full shrink-0" style={{ background: color }} />
      ) : (
        <span className="w-2.5 h-2.5 rounded-full shrink-0 border border-[var(--color-border)]" />
      )}
      <span className="truncate">{label}</span>
    </button>
  );
}
