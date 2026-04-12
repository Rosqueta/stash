import { useState, useEffect, useMemo } from "react";
import { Books, SpinnerGap } from "@phosphor-icons/react";
import { cn } from "../../lib/utils";
import { fetchTemplates } from "../../services/templateService";
import type { Template, TemplatesData } from "../../types/template";
import { TemplateModal } from "./TemplateModal";

export function LibraryPanel() {
  const [data, setData] = useState<TemplatesData | null>(null);
  const [isLoading, setIsLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [activeCategory, setActiveCategory] = useState("all");
  const [activeTemplate, setActiveTemplate] = useState<Template | null>(null);

  useEffect(() => {
    setIsLoading(true);
    setError(null);
    fetchTemplates()
      .then((d) => setData(d))
      .catch((e: Error) => setError(e.message))
      .finally(() => setIsLoading(false));
  }, []);

  const filtered = useMemo(() => {
    if (!data) return [];
    if (activeCategory === "all") return data.templates;
    return data.templates.filter((t) => t.category === activeCategory);
  }, [data, activeCategory]);

  return (
    <div className="flex-1 flex flex-col overflow-hidden bg-[var(--color-bg)]">
      {/* Category filter */}
      {data && (
        <div className="shrink-0 px-6 pt-4 pb-3 flex items-center gap-1.5 flex-wrap border-b border-[var(--color-border)]">
          <CategoryPill
            label="All"
            active={activeCategory === "all"}
            onClick={() => setActiveCategory("all")}
          />
          {data.categories.map((cat) => (
            <CategoryPill
              key={cat.slug}
              label={cat.label}
              active={activeCategory === cat.slug}
              onClick={() => setActiveCategory(cat.slug)}
            />
          ))}
        </div>
      )}

      {/* Content */}
      <div className="flex-1 overflow-y-auto p-6">
        {isLoading && (
          <div className="flex flex-col items-center justify-center h-full gap-2 text-[var(--color-text-muted)]">
            <SpinnerGap size={24} className="animate-spin" />
            <p className="text-sm">Loading library…</p>
          </div>
        )}
        {!isLoading && error && (
          <div className="flex flex-col items-center justify-center h-full gap-2 text-center">
            <Books
              size={40}
              weight="thin"
              style={{ color: "color-mix(in srgb, var(--color-text-muted) 50%, transparent)" }}
            />
            <p className="text-sm text-[var(--color-text-muted)]">
              Connect to see the library
            </p>
          </div>
        )}
        {!isLoading && !error && (
          <div className="grid grid-cols-3 gap-3">
            {filtered.map((t) => (
              <TemplateCard
                key={t.id}
                template={t}
                onClick={() => setActiveTemplate(t)}
              />
            ))}
          </div>
        )}
      </div>

      {activeTemplate && (
        <TemplateModal
          template={activeTemplate}
          onClose={() => setActiveTemplate(null)}
        />
      )}
    </div>
  );
}

function CategoryPill({
  label,
  active,
  onClick,
}: {
  label: string;
  active: boolean;
  onClick: () => void;
}) {
  return (
    <button
      onClick={onClick}
      className={cn(
        "rounded-full px-3 py-1 text-sm transition-colors",
        active
          ? "bg-[var(--color-stash)]/15 text-[var(--color-stash)] font-medium"
          : "text-[var(--color-text-muted)] hover:bg-[var(--color-bg-muted)] hover:text-[var(--color-text)]"
      )}
    >
      {label}
    </button>
  );
}

function TemplateCard({
  template,
  onClick,
}: {
  template: Template;
  onClick: () => void;
}) {
  return (
    <button
      onClick={onClick}
      className="text-left rounded-xl border border-[var(--color-border)] bg-[var(--color-bg-secondary)] p-4 hover:bg-[var(--color-bg-muted)] hover:border-[var(--color-border)] transition-colors cursor-pointer"
    >
      <p className="text-sm font-medium text-[var(--color-text)] mb-1.5 truncate">
        {template.title}
      </p>
      <p className="text-xs text-[var(--color-text-muted)] leading-relaxed line-clamp-3">
        {template.content}
      </p>
    </button>
  );
}
