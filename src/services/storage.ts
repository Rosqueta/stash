import { invoke } from "@tauri-apps/api/core";
import type { Prompt, Collection } from "../types/prompt";

export async function listPrompts(): Promise<Prompt[]> {
  return invoke<Prompt[]>("list_prompts");
}

export async function savePrompt(prompt: Prompt): Promise<void> {
  return invoke("save_prompt", { prompt });
}

export async function deletePrompt(id: string): Promise<void> {
  return invoke("delete_prompt", { id });
}

export async function listCollections(): Promise<Collection[]> {
  return invoke<Collection[]>("list_collections");
}

export async function saveCollection(collection: Collection): Promise<void> {
  return invoke("save_collection", { collection });
}

export async function deleteCollection(id: string): Promise<void> {
  return invoke("delete_collection", { id });
}

export async function copyToClipboard(text: string): Promise<void> {
  return invoke("copy_to_clipboard", { text });
}

export async function showWindow(): Promise<void> {
  return invoke("show_window");
}
