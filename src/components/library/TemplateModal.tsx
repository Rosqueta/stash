import { useState, useEffect } from "react";
import { createPortal } from "react-dom";
import { X, Folder, CaretDown } from "@phosphor-icons/react";
import { toast } from "sonner";
import { toastSuccess } from "../ui";
import * as DropdownMenu from "@radix-ui/react-dropdown-menu";
import { usePromptsData, usePromptsActions } from "../../context/PromptsContext";
import { IconButton } from "../ui";
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
          {part.slice(2, -2)}
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
      toastSuccess("Added to your prompts");
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
          <IconButton size="sm" onClick={onClose} className="mt-0.5 shrink-0">
            <X size={14} />
          </IconButton>
        </div>

        {/* Content */}
        <div className="flex-1 overflow-y-auto px-6 pb-4">
          <div className="text-sm text-[var(--color-text)] leading-relaxed whitespace-pre-wrap selectable">
            {renderContent(template.content)}
          </div>
        </div>

        {/* Footer — collection selector + import */}
        <div className="shrink-0 border-t border-[var(--color-border)] px-4 py-3">
          <div className="flex items-center gap-2">
            <span className="text-xs text-[var(--color-text-muted)] shrink-0">Add to:</span>
            <DropdownMenu.Root>
              <DropdownMenu.Trigger asChild>
                <button className="flex items-center gap-1.5 text-xs text-[var(--color-text-muted)] hover:text-[var(--color-text)] transition-colors group focus:outline-none">
                  {(() => {
                    const col = collections.find((c) => c.id === selectedCollectionId) ?? null;
                    return (
                      <>
                        <Folder size={13} weight="regular" style={col ? { color: col.color } : undefined} />
                        <span>{col ? col.name : "No collection"}</span>
                        <CaretDown size={10} className="opacity-0 group-hover:opacity-60 transition-opacity" />
                      </>
                    );
                  })()}
                </button>
              </DropdownMenu.Trigger>
              <DropdownMenu.Portal>
                <DropdownMenu.Content
                  side="top"
                  align="start"
                  sideOffset={4}
                  className="z-50 min-w-[180px] rounded-lg bg-[var(--color-bg)] border border-[var(--color-border)] shadow-lg p-1 animate-in fade-in-0 zoom-in-95"
                >
                  <DropdownMenu.Item
                    onSelect={() => setSelectedCollectionId(null)}
                    className="flex items-center gap-2 rounded-md px-2 py-1.5 text-sm text-[var(--color-text-muted)] cursor-pointer outline-none hover:bg-[var(--color-bg-muted)] transition-colors"
                  >
                    <Folder size={14} weight="regular" />
                    No collection
                  </DropdownMenu.Item>
                  {collections.length > 0 && (
                    <DropdownMenu.Separator className="my-1 h-px bg-[var(--color-border)]" />
                  )}
                  {collections.map((c) => (
                    <DropdownMenu.Item
                      key={c.id}
                      onSelect={() => setSelectedCollectionId(c.id)}
                      className="flex items-center gap-2 rounded-md px-2 py-1.5 text-sm text-[var(--color-text)] cursor-pointer outline-none hover:bg-[var(--color-bg-muted)] transition-colors"
                    >
                      <Folder size={14} weight="regular" style={{ color: c.color }} />
                      {c.name}
                    </DropdownMenu.Item>
                  ))}
                </DropdownMenu.Content>
              </DropdownMenu.Portal>
            </DropdownMenu.Root>
            <button
              onClick={() => void handleImport()}
              disabled={importing}
              className="ml-auto flex items-center gap-2 rounded-lg px-4 py-2 text-sm font-medium bg-[var(--color-stash)] text-white hover:opacity-90 active:opacity-75 active:scale-[0.98] transition-all duration-100 disabled:opacity-50"
            >
              {importing ? "Importing…" : "Add to my prompts"}
            </button>
          </div>
        </div>
      </div>
    </div>,
    document.body
  );
}

