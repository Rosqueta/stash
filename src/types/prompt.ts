export type ModelTarget =
  | "claude-sonnet"
  | "claude-opus"
  | "gpt-4o"
  | "gemini"
  | "any";

export interface PromptVersion {
  id: string;
  content: string;
  createdAt: number;
  note: string;
  rating: 1 | 2 | 3 | null;
}

export interface Prompt {
  id: string;
  title: string;
  content: string;
  collectionId: string | null;
  tags: string[];
  modelTarget: ModelTarget;
  isFavorite: boolean;
  createdAt: number;
  updatedAt: number;
  lastUsedAt: number | null;
  useCount: number;
  versions: PromptVersion[];
  notes: string;
}

export interface Collection {
  id: string;
  name: string;
  color: string;
}

export interface StashData {
  prompts: Prompt[];
  collections: Collection[];
  version: number;
}
