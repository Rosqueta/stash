import { invoke } from "@tauri-apps/api/core";
import type { Template, TemplatesData } from "../types/template";
import type { Prompt } from "../types/prompt";

const TEMPLATES_URL =
  "https://raw.githubusercontent.com/verogasco/stash-templates/main/dist/templates.json";

export async function fetchTemplates(): Promise<TemplatesData> {
  try {
    const res = await fetch(TEMPLATES_URL);
    if (!res.ok) throw new Error(`HTTP ${res.status}`);
    const data = (await res.json()) as TemplatesData;
    await invoke("set_templates_cache", { json: JSON.stringify(data) });
    return data;
  } catch {
    const cached = await invoke<string | null>("get_templates_cache");
    if (cached) return JSON.parse(cached) as TemplatesData;
    throw new Error("No connection and no cache available");
  }
}

export function buildPromptFromTemplate(
  template: Template,
  collectionId: string | null
): Prompt {
  const now = Date.now();
  return {
    id: crypto.randomUUID(),
    title: template.title,
    content: template.content,
    collectionId,
    tags: template.tags,
    modelTarget: "any",
    isPinned: false,
    createdAt: now,
    updatedAt: now,
    lastUsedAt: null,
    useCount: 0,
    notes: "",
  };
}
