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
import { toast } from "sonner";
import type { Collection, Prompt } from "../types/prompt";
import * as storage from "../services/storage";
import { showWindow } from "../services/storage";

interface PromptsData {
  prompts: Prompt[];
  collections: Collection[];
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
  copyPrompt: (prompt: Prompt, silent?: boolean, resolvedContent?: string) => Promise<void>;
  renameTag: (oldName: string, newName: string) => Promise<void>;
  deleteTag: (name: string) => Promise<void>;
  refresh: () => Promise<void>;
}

function dedupeTags(tags: string[]) {
  return tags.filter((tag, index) => tags.indexOf(tag) === index);
}

const PromptsDataContext = createContext<PromptsData | null>(null);
const PromptsActionsContext = createContext<PromptsActions | null>(null);

export function PromptsProvider({ children }: { children: ReactNode }) {
  const [prompts, setPrompts] = useState<Prompt[]>([]);
  const [collections, setCollections] = useState<Collection[]>([]);
  const [selectedId, setSelectedId] = useState<string | null>(null);
  const [searchQuery, setSearchQueryState] = useState("");
  const [activeCollectionId, setActiveCollectionId] = useState<string | null>(
    null
  );
  const [isLoading, setIsLoading] = useState(true);
  const searchDebounce = useRef<ReturnType<typeof setTimeout> | null>(null);

  const loadData = useCallback(async (showMainWindow = false) => {
    try {
      const [p, c] = await Promise.all([
        storage.listPrompts(),
        storage.listCollections(),
      ]);
      setPrompts(p);
      setCollections(c);
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
    try {
      await storage.savePrompt(prompt);
      setPrompts((prev) => {
        const idx = prev.findIndex((p) => p.id === prompt.id);
        if (idx === -1) return [prompt, ...prev];
        const next = [...prev];
        next[idx] = prompt;
        return next;
      });
    } catch (e) {
      console.error(e);
      toast.error("Could not save prompt");
      throw e;
    }
  }, []);

  const deletePrompt = useCallback(async (id: string) => {
    await storage.deletePrompt(id);
    setPrompts((prev) => prev.filter((p) => p.id !== id));
    setSelectedId((prev) => (prev === id ? null : prev));
    toast.success("Prompt deleted");
  }, []);

  const saveCollection = useCallback(async (collection: Collection) => {
    try {
      await storage.saveCollection(collection);
      setCollections((prev) => {
        const idx = prev.findIndex((c) => c.id === collection.id);
        if (idx === -1) return [collection, ...prev];
        const next = [...prev];
        next[idx] = collection;
        return next;
      });
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
  }, []);

  const renameTag = useCallback(async (oldName: string, newName: string) => {
    const trimmed = newName.trim();
    if (!trimmed || trimmed === oldName) return;
    const affected = prompts.filter((p) => p.tags.includes(oldName));
    const updated = affected.map((p) => ({
      ...p,
      tags: dedupeTags(p.tags.map((t) => (t === oldName ? trimmed : t))),
    }));
    await Promise.all(updated.map((p) => storage.savePrompt(p)));
    setPrompts((prev) =>
      prev.map((p) => updated.find((u) => u.id === p.id) ?? p)
    );
  }, [prompts]);

  const deleteTag = useCallback(async (name: string) => {
    const affected = prompts.filter((p) => p.tags.includes(name));
    const updated = affected.map((p) => ({
      ...p,
      tags: p.tags.filter((t) => t !== name),
    }));
    await Promise.all(updated.map((p) => storage.savePrompt(p)));
    setPrompts((prev) =>
      prev.map((p) => updated.find((u) => u.id === p.id) ?? p)
    );
    toast.success(`Tag "${name}" deleted`);
  }, [prompts]);

  const copyPrompt = useCallback(async (prompt: Prompt, silent = false, resolvedContent?: string) => {
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
      if (!silent) toast.success("Copied ✓");
    } catch {
      toast.error("Failed to copy");
    }
  }, []);

  const data = useMemo<PromptsData>(
    () => ({
      prompts,
      collections,
      selectedId,
      searchQuery,
      activeCollectionId,
      isLoading,
    }),
    [prompts, collections, selectedId, searchQuery, activeCollectionId, isLoading]
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
