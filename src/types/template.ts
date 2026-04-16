export interface TemplateCategory {
  slug: string;
  label_es: string;
  label_en: string;
}

export interface Template {
  id: string;
  title_es: string;
  title_en: string;
  category: string;
  tags?: string[];
  variables_es?: string[];
  variables_en?: string[];
  content_es: string;
  content_en: string;
}

export type Lang = "es" | "en";

export interface TemplatesData {
  version: number;
  updatedAt: number;
  categories: TemplateCategory[];
  templates: Template[];
}
