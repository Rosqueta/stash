import { useState, useMemo } from "react";
import { Books, SpinnerGap } from "@phosphor-icons/react";
import { cn } from "../../lib/utils";
import type { Template, TemplatesData } from "../../types/template";

interface Props {
  data: TemplatesData | null;
  isLoading: boolean;
  error: string | null;
  selectedId: string | null;
  onSelect: (template: Template) => void;
}

export function LibraryList({ data, isLoading, error, selectedId, onSelect }: Props) {
  const [activeCategory, setActiveCategory] = useState<string>("all");

  const filtered = useMemo(() => {
    if (!data) return [];
    if (activeCategory === "all") return data.templates;
    return data.templates.filter((t) => t.category === activeCategory);
  }, [data, activeCategory]);

  return (
    <div className="flex flex-col h-full w-[284px] border-r border-[var(--color-border)] shrink-0">
      {/* Category filter pills */}
      {data && (
        <div className="px-3 pt-2.5 pb-2 flex flex-wrap gap-1.5 shrink-0 border-b border-[var(--color-border)]">
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

      <div className="flex-1 overflow-y-auto px-2 py-2 space-y-0.5">
        {isLoading && (
          <div className="flex flex-col items-center justify-center h-full gap-2 text-[var(--color-text-muted)]">
            <SpinnerGap size={24} className="animate-spin" />
            <p className="text-sm">Loading library…</p>
          </div>
        )}
        {!isLoading && error && (
          <div className="flex flex-col items-center justify-center h-full gap-2 px-6 text-center">
            <Books size={32} weight="thin" className="text-[var(--color-text-muted)]" />
            <p className="text-sm text-[var(--color-text-muted)]">Connect to see the library</p>
          </div>
        )}
        {!isLoading && !error && filtered.map((t) => (
          <TemplateCard
            key={t.id}
            template={t}
            selected={t.id === selectedId}
            onClick={() => onSelect(t)}
          />
        ))}
      </div>
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
        "rounded-full px-2.5 py-0.5 text-xs transition-colors",
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
  selected,
  onClick,
}: {
  template: Template;
  selected: boolean;
  onClick: () => void;
}) {
  return (
    <div
      onClick={onClick}
      className={cn(
        "rounded-lg px-3 py-2.5 cursor-pointer transition-colors",
        selected ? "bg-[var(--color-bg-muted)]" : "hover:bg-[var(--color-bg-muted)]"
      )}
    >
      <p className="text-sm font-medium text-[var(--color-text)] truncate">{template.title}</p>
      <p className="text-xs text-[var(--color-text-muted)] line-clamp-2 mt-0.5 leading-relaxed">
        {template.content}
      </p>
    </div>
  );
}
