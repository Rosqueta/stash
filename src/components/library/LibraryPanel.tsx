import { useState, useEffect, useMemo } from "react";
import {
  Books, SpinnerGap, Plus,
  Sparkle, Article, PenNib, Code, ChartBar, Users,
  type Icon,
} from "@phosphor-icons/react";
import { cn } from "../../lib/utils";
import { fetchTemplates, buildPromptFromTemplate } from "../../services/templateService";
import type { Template, TemplatesData, Lang } from "../../types/template";
import { TemplateModal } from "./TemplateModal";
import { usePromptsActions } from "../../context/PromptsContext";
import { IconButton, toastSuccess } from "../ui";
import libraryImg from "../../assets/library.png";

type CategoryConfig = { Icon: Icon; bg: string; color: string };

const CATEGORY_CONFIG: Record<string, CategoryConfig> = {
  general:     { Icon: Sparkle,  bg: "#F5F3FF", color: "#7C3AED" },
  writing:     { Icon: Article,  bg: "#EFF6FF", color: "#2563EB" },
  design:      { Icon: PenNib,   bg: "#FDF4FF", color: "#A21CAF" },
  development: { Icon: Code,     bg: "#F0FDF4", color: "#15803D" },
  analysis:    { Icon: ChartBar, bg: "#FFFBEB", color: "#B45309" },
  meetings:    { Icon: Users,    bg: "#F0FDFA", color: "#0F766E" },
};

const DEFAULT_CAT = CATEGORY_CONFIG["general"];

function stripVariables(content: string): string {
  return content.replace(/\{\{([^}]+)\}\}/g, "$1");
}

function detectInitialLanguage(): Lang {
  const navLang = navigator.language || "en";
  const langCode = navLang.split("-")[0].toLowerCase();
  return langCode === "es" ? "es" : "en";
}

export function LibraryPanel() {
  const [data, setData] = useState<TemplatesData | null>(null);
  const [isLoading, setIsLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [activeCategory, setActiveCategory] = useState("all");
  const [activeTemplate, setActiveTemplate] = useState<Template | null>(null);
  const [lang, setLang] = useState<Lang>(detectInitialLanguage());
  const { savePrompt } = usePromptsActions();

  async function handleDirectAdd(template: Template, e: React.MouseEvent) {
    e.stopPropagation();
    try {
      const prompt = buildPromptFromTemplate(template, null, lang);
      await savePrompt(prompt);
      toastSuccess("Prompt añadido");
    } catch {
      // silently fail — savePrompt already shows an error toast via context
    }
  }

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
      {/* Hero */}
      <div className="shrink-0 px-6 pt-4">
        <div className="flex items-center gap-5 px-4 py-4 rounded-xl border border-[var(--color-border)] bg-[var(--color-bg-muted)]" style={{ backgroundImage: "linear-gradient(135deg, color-mix(in srgb, var(--color-stash) 6%, transparent) 0%, transparent 100%)" }}>
          <img src={libraryImg} alt="" className="h-24 w-24 object-contain shrink-0 select-none self-center" draggable={false} />
          <div className="flex flex-col justify-center gap-1">
            <h1 className="text-xl font-bold text-[var(--color-text)] leading-snug">
              {lang === "es" ? "Los buenos prompts merecen guardarse." : "Good prompts are worth hoarding."}
            </h1>
            <p className="text-sm text-[var(--color-text-muted)] leading-relaxed whitespace-nowrap">
              {lang === "es"
                ? "Guardamos algunos de nuestros favoritos aquí. Coge los que necesites."
                : "We've stashed a few of our favorites here. Take what you need."}
            </p>
          </div>
        </div>
      </div>

      {/* Category filter + lang toggle */}
      {data && (
        <div className="shrink-0 px-6 pt-6 pb-1 flex items-center gap-1 flex-wrap">
          <CategoryPill
            label={lang === "es" ? "Todos" : "All"}
            active={activeCategory === "all"}
            onClick={() => setActiveCategory("all")}
          />
          {data.categories.map((cat) => (
            <CategoryPill
              key={cat.slug}
              label={lang === "es" ? cat.label_es : cat.label_en}
              active={activeCategory === cat.slug}
              onClick={() => setActiveCategory(cat.slug)}
            />
          ))}

          {/* Language toggle */}
          <div className="ml-auto flex items-center rounded-lg overflow-hidden border border-[var(--color-border)]">
            <button
              onClick={() => setLang("es")}
              className={cn(
                "px-2.5 py-1 text-xs transition-colors",
                lang === "es"
                  ? "bg-[var(--color-bg-emphasis)] text-[var(--color-text)] font-medium"
                  : "text-[var(--color-text-muted)] hover:bg-[var(--color-bg-muted)]"
              )}
            >
              ES
            </button>
            <div className="w-px h-4 bg-[var(--color-border)]" />
            <button
              onClick={() => setLang("en")}
              className={cn(
                "px-2.5 py-1 text-xs transition-colors",
                lang === "en"
                  ? "bg-[var(--color-bg-emphasis)] text-[var(--color-text)] font-medium"
                  : "text-[var(--color-text-muted)] hover:bg-[var(--color-bg-muted)]"
              )}
            >
              EN
            </button>
          </div>
        </div>
      )}

      {/* Content */}
      <div className="flex-1 overflow-y-auto px-6 pt-3 pb-6">
        {isLoading && (
          <div className="flex flex-col items-center justify-center h-full gap-2 text-[var(--color-text-muted)]">
            <SpinnerGap size={24} className="animate-spin" />
            <p className="text-sm">{lang === "es" ? "Cargando librería…" : "Loading library…"}</p>
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
              {lang === "es" ? "Conéctate para ver la librería" : "Connect to see the library"}
            </p>
          </div>
        )}
        {!isLoading && !error && (
          <div className="grid grid-cols-3 gap-3">
            {filtered.map((t) => (
              <TemplateCard
                key={t.id}
                template={t}
                lang={lang}
                onClick={() => setActiveTemplate(t)}
                onDirectAdd={(e) => void handleDirectAdd(t, e)}
              />
            ))}
          </div>
        )}
      </div>

      {activeTemplate && (
        <TemplateModal
          template={activeTemplate}
          lang={lang}
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
        "rounded-lg px-3 py-1 text-xs transition-colors",
        active
          ? "bg-[var(--color-bg-emphasis)] text-[var(--color-text)] font-medium"
          : "text-[var(--color-text-muted)] hover:bg-[var(--color-bg-muted)] hover:text-[var(--color-text)]"
      )}
    >
      {label}
    </button>
  );
}

function TemplateCard({
  template,
  lang,
  onClick,
  onDirectAdd,
}: {
  template: Template;
  lang: Lang;
  onClick: () => void;
  onDirectAdd: (e: React.MouseEvent) => void;
}) {
  const { Icon, bg, color } = CATEGORY_CONFIG[template.category] ?? DEFAULT_CAT;
  const title = lang === "es" ? template.title_es : template.title_en;
  const content = lang === "es" ? template.content_es : template.content_en;

  return (
    <div
      onClick={onClick}
      className="relative group text-left rounded-xl border border-[var(--color-border)] bg-[var(--color-bg)] p-4 cursor-pointer transition-all duration-200 hover:shadow-md hover:-translate-y-0.5"
    >
      <IconButton
        size="sm"
        onClick={onDirectAdd}
        title={lang === "es" ? "Añadir a mis prompts" : "Add to my prompts"}
        className="absolute top-2.5 right-2.5 opacity-0 group-hover:opacity-100"
      >
        <Plus size={12} />
      </IconButton>

      <div className="w-8 h-8 rounded-lg flex items-center justify-center mb-3" style={{ background: bg, color }}>
        <Icon size={15} />
      </div>

      <p className="text-sm font-medium text-[var(--color-text)] mb-1.5 truncate pr-7">
        {title}
      </p>
      <p className="text-xs text-[var(--color-text-muted)] leading-relaxed line-clamp-3">
        {stripVariables(content)}
      </p>
    </div>
  );
}
