import { useState } from "react";
import { DownloadSimple, Books } from "@phosphor-icons/react";
import type { Template } from "../../types/template";
import { ImportModal } from "./ImportModal";

interface Props {
  template: Template | null;
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

export function LibraryDetail({ template }: Props) {
  const [importOpen, setImportOpen] = useState(false);

  if (!template) {
    return (
      <div className="flex-1 flex items-center justify-center text-center px-8">
        <div className="flex flex-col items-center gap-3">
          <Books
            size={48}
            weight="thin"
            style={{ color: "color-mix(in srgb, var(--color-text-muted) 40%, transparent)" }}
          />
          <p
            className="text-sm"
            style={{ color: "color-mix(in srgb, var(--color-text-muted) 60%, transparent)" }}
          >
            Select a template to preview it
          </p>
        </div>
      </div>
    );
  }

  return (
    <div className="flex-1 flex flex-col overflow-hidden">
      {/* Header */}
      <div className="px-8 pt-8 pb-4 shrink-0">
        <h1 className="text-2xl font-bold text-[var(--color-text)]">{template.title}</h1>
        {template.tags.length > 0 && (
          <div className="flex flex-wrap gap-1.5 mt-3">
            {template.tags.map((tag) => (
              <span
                key={tag}
                className="text-xs px-2 py-0.5 rounded-full bg-[var(--color-bg-muted)] text-[var(--color-text-muted)]"
              >
                {tag}
              </span>
            ))}
          </div>
        )}
      </div>

      {/* Content */}
      <div className="flex-1 overflow-y-auto px-8 pb-6">
        <div className="text-sm text-[var(--color-text)] leading-relaxed whitespace-pre-wrap selectable">
          {renderContent(template.content)}
        </div>
      </div>

      {/* Footer */}
      <div className="px-8 py-5 shrink-0 border-t border-[var(--color-border)]">
        <button
          onClick={() => setImportOpen(true)}
          className="flex items-center gap-2 rounded-lg px-4 py-2 text-sm font-medium bg-[var(--color-stash)] text-white hover:opacity-90 active:opacity-75 active:scale-[0.98] transition-all duration-100"
        >
          <DownloadSimple size={16} />
          Add to my Stash
        </button>
      </div>

      {importOpen && (
        <ImportModal template={template} onClose={() => setImportOpen(false)} />
      )}
    </div>
  );
}
