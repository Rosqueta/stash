export interface TemplateCategory {
  slug: string;
  label: string;
}

export interface Template {
  id: string;
  title: string;
  category: string;
  tags: string[];
  variables?: string[];
  content: string;
}

export interface TemplatesData {
  version: number;
  updatedAt: number;
  categories: TemplateCategory[];
  templates: Template[];
}
