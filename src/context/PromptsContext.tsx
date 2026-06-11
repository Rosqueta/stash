import {
  createContext,
  useCallback,
  useContext,
  useEffect,
  useMemo,
  useRef,
  useState,
  type ReactNode,
} from "react";
import { capture } from "../services/analytics";

import { toast } from "sonner";
import { ConfirmIcon, toastSuccess } from "../components/ui";
import type { Collection, Prompt } from "../types/prompt";
import * as storage from "../services/storage";
import { showWindow } from "../services/storage";

interface PromptsData {
  prompts: Prompt[];
  collections: Collection[];
  tags: string[];
  selectedId: string | null;
  searchQuery: string;
  activeCollectionId: string | null;
  isLoading: boolean;
}

interface PromptsActions {
  selectPrompt: (id: string | null) => void;
  setSearchQuery: (q: string) => void;
  setActiveCollection: (id: string | null) => void;
  savePrompt: (prompt: Prompt) => Promise<void>;
  deletePrompt: (id: string) => Promise<void>;
  saveCollection: (collection: Collection) => Promise<void>;
  deleteCollection: (id: string) => Promise<void>;
  copyPrompt: (prompt: Prompt, silent?: boolean, resolvedContent?: string, source?: string) => Promise<void>;
  renameTag: (oldName: string, newName: string) => Promise<void>;
  deleteTag: (name: string) => Promise<void>;
  refresh: () => Promise<void>;
}


const PromptsDataContext = createContext<PromptsData | null>(null);
const PromptsActionsContext = createContext<PromptsActions | null>(null);

function getNextId(
  allPrompts: Prompt[],
  deletedId: string,
  activeCollectionId: string | null
): string | null {
  let list: Prompt[];
  if (activeCollectionId === "pinned") {
    list = allPrompts.filter((p) => p.isPinned);
  } else if (activeCollectionId !== null && activeCollectionId !== "library") {
    list = allPrompts.filter((p) => p.collectionId === activeCollectionId);
  } else {
    list = allPrompts;
  }
  const remaining = list.filter((p) => p.id !== deletedId);
  if (remaining.length === 0) return null;
  const sort = (arr: Prompt[]) =>
    [...arr].sort((a, b) => (b.lastUsedAt ?? b.createdAt) - (a.lastUsedAt ?? a.createdAt));
  const prevSorted = sort(list);
  const nextSorted = sort(remaining);
  const idx = prevSorted.findIndex((p) => p.id === deletedId);
  return nextSorted[Math.min(idx, nextSorted.length - 1)]?.id ?? null;
}

export function PromptsProvider({ children }: { children: ReactNode }) {
  const [prompts, setPrompts] = useState<Prompt[]>([]);
  const [collections, setCollections] = useState<Collection[]>([]);
  const [tags, setTags] = useState<string[]>([]);
  const [selectedId, setSelectedId] = useState<string | null>(null);
  const [searchQuery, setSearchQueryState] = useState("");
  const [activeCollectionId, setActiveCollectionId] = useState<string | null>(
    null
  );
  const [isLoading, setIsLoading] = useState(true);
  const searchDebounce = useRef<ReturnType<typeof setTimeout> | null>(null);
  const promptsRef = useRef<Prompt[]>([]);
  const collectionsRef = useRef<Collection[]>([]);

  useEffect(() => { promptsRef.current = prompts; }, [prompts]);
  useEffect(() => { collectionsRef.current = collections; }, [collections]);

  const loadData = useCallback(async (showMainWindow = false) => {
    try {
      const [p, c, t] = await Promise.all([
        storage.listPrompts(),
        storage.listCollections(),
        storage.listTags(),
      ]);
      setPrompts(p);
      setCollections(c);
      setTags(t);
    } catch (e) {
      toast.error("Failed to load data");
      console.error(e);
    } finally {
      setIsLoading(false);
      if (showMainWindow) await showWindow();
    }
  }, []);

  useEffect(() => {
    void loadData(true);
  }, [loadData]);

  const refresh = useCallback(async () => {
    await loadData(false);
  }, [loadData]);

  const setSearchQuery = useCallback((q: string) => {
    if (searchDebounce.current) clearTimeout(searchDebounce.current);
    searchDebounce.current = setTimeout(() => setSearchQueryState(q), 150);
  }, []);

  const savePrompt = useCallback(async (prompt: Prompt) => {
    const existing = promptsRef.current.find((p) => p.id === prompt.id);
    try {
      await storage.savePrompt(prompt);
      setPrompts((prev) => {
        const idx = prev.findIndex((p) => p.id === prompt.id);
        if (idx === -1) return [prompt, ...prev];
        const next = [...prev];
        next[idx] = prompt;
        return next;
      });
      // Mirror the backend: new tags on a prompt join the persistent pool
      setTags((prev) => {
        const missing = prompt.tags.filter((t) => !prev.includes(t));
        return missing.length === 0 ? prev : [...prev, ...missing].sort();
      });
      if (!existing) {
        capture("prompt_created", {
          has_variables: /\{\{[^}]+\}\}/.test(prompt.content),
          has_collection: prompt.collectionId !== null,
          has_tags: prompt.tags.length > 0,
        });
      } else if (existing.isPinned !== prompt.isPinned) {
        capture(prompt.isPinned ? "prompt_pinned" : "prompt_unpinned");
      }
    } catch (e) {
      console.error(e);
      toast.error("Could not save prompt");
      throw e;
    }
  }, []);

  const deletePrompt = useCallback(async (id: string) => {
    await storage.deletePrompt(id);
    const nextId = selectedId === id
      ? getNextId(prompts, id, activeCollectionId)
      : selectedId;
    setPrompts((prev) => prev.filter((p) => p.id !== id));
    setSelectedId(nextId);
    toastSuccess("Prompt deleted");
    capture("prompt_deleted");
  }, [prompts, selectedId, activeCollectionId]);

  const saveCollection = useCallback(async (collection: Collection) => {
    const isNew = !collectionsRef.current.find((c) => c.id === collection.id);
    try {
      await storage.saveCollection(collection);
      setCollections((prev) => {
        const idx = prev.findIndex((c) => c.id === collection.id);
        if (idx === -1) return [collection, ...prev];
        const next = [...prev];
        next[idx] = collection;
        return next;
      });
      if (isNew) capture("collection_created");
    } catch (e) {
      console.error(e);
      toast.error("Could not save collection");
      throw e;
    }
  }, []);

  const deleteCollection = useCallback(async (id: string) => {
    await storage.deleteCollection(id);
    setCollections((prev) => prev.filter((c) => c.id !== id));
    setPrompts((prev) =>
      prev.map((p) =>
        p.collectionId === id ? { ...p, collectionId: null } : p
      )
    );
    setActiveCollectionId((prev) => (prev === id ? null : prev));
    toastSuccess("Collection deleted");
  }, []);

  const renameTag = useCallback(async (oldName: string, newName: string) => {
    const trimmed = newName.trim();
    if (!trimmed || trimmed === oldName) return;
    const updatedPrompts = await storage.renameTag(oldName, trimmed);
    setPrompts(updatedPrompts);
    setTags((prev) => {
      const next = prev.filter((t) => t !== oldName);
      if (!next.includes(trimmed)) next.push(trimmed);
      return next.sort();
    });
  }, []);

  const deleteTag = useCallback(async (name: string) => {
    const updatedPrompts = await storage.deleteTag(name);
    setPrompts(updatedPrompts);
    setTags((prev) => prev.filter((t) => t !== name));
    toastSuccess(`Tag "${name}" deleted`);
  }, []);

  const copyPrompt = useCallback(async (prompt: Prompt, silent = false, resolvedContent?: string, source = "detail") => {
    try {
      await storage.copyToClipboard(resolvedContent ?? prompt.content);
      const now = Date.now();
      const updated: Prompt = {
        ...prompt,
        lastUsedAt: now,
        useCount: prompt.useCount + 1,
      };
      await storage.savePrompt(updated);
      setPrompts((prev) => {
        const idx = prev.findIndex((p) => p.id === updated.id);
        if (idx === -1) return prev;
        const next = [...prev];
        next[idx] = updated;
        return next;
      });
      capture("prompt_copied", {
        source,
        has_variables: /\{\{[^}]+\}\}/.test(prompt.content),
      });
      if (!silent) toast("Copied", { icon: <ConfirmIcon />, duration: 2000 });
    } catch {
      toast.error("Failed to copy");
    }
  }, []);

  const data = useMemo<PromptsData>(
    () => ({
      prompts,
      collections,
      tags,
      selectedId,
      searchQuery,
      activeCollectionId,
      isLoading,
    }),
    [prompts, collections, tags, selectedId, searchQuery, activeCollectionId, isLoading]
  );

  const actions = useMemo<PromptsActions>(
    () => ({
      selectPrompt: setSelectedId,
      setSearchQuery,
      setActiveCollection: setActiveCollectionId,
      savePrompt,
      deletePrompt,
      saveCollection,
      deleteCollection,
      copyPrompt,
      renameTag,
      deleteTag,
      refresh,
    }),
    [
      setSearchQuery,
      savePrompt,
      deletePrompt,
      saveCollection,
      deleteCollection,
      copyPrompt,
      renameTag,
      deleteTag,
      refresh,
    ]
  );

  return (
    <PromptsDataContext.Provider value={data}>
      <PromptsActionsContext.Provider value={actions}>
        {children}
      </PromptsActionsContext.Provider>
    </PromptsDataContext.Provider>
  );
}

export function usePromptsData() {
  const ctx = useContext(PromptsDataContext);
  if (!ctx) throw new Error("usePromptsData must be used within PromptsProvider");
  return ctx;
}

export function usePromptsActions() {
  const ctx = useContext(PromptsActionsContext);
  if (!ctx)
    throw new Error("usePromptsActions must be used within PromptsProvider");
  return ctx;
}
