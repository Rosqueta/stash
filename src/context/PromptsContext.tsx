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
  copyPrompt: (prompt: Prompt) => Promise<void>;
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

  useEffect(() => {
    async function load() {
      try {
        const [p, c] = await Promise.all([
          storage.listPrompts(),
          storage.listCollections(),
        ]);
        setPrompts(p);
        setCollections(c);
      } catch (e) {
        toast.error("Error al cargar datos");
        console.error(e);
      } finally {
        setIsLoading(false);
        await showWindow();
      }
    }
    void load();
  }, []);

  const setSearchQuery = useCallback((q: string) => {
    if (searchDebounce.current) clearTimeout(searchDebounce.current);
    searchDebounce.current = setTimeout(() => setSearchQueryState(q), 150);
  }, []);

  const savePrompt = useCallback(async (prompt: Prompt) => {
    await storage.savePrompt(prompt);
    setPrompts((prev) => {
      const idx = prev.findIndex((p) => p.id === prompt.id);
      if (idx === -1) return [prompt, ...prev];
      const next = [...prev];
      next[idx] = prompt;
      return next;
    });
  }, []);

  const deletePrompt = useCallback(async (id: string) => {
    await storage.deletePrompt(id);
    setPrompts((prev) => prev.filter((p) => p.id !== id));
    setSelectedId((prev) => (prev === id ? null : prev));
    toast.success("Prompt eliminado");
  }, []);

  const saveCollection = useCallback(async (collection: Collection) => {
    await storage.saveCollection(collection);
    setCollections((prev) => {
      const idx = prev.findIndex((c) => c.id === collection.id);
      if (idx === -1) return [...prev, collection];
      const next = [...prev];
      next[idx] = collection;
      return next;
    });
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

  const copyPrompt = useCallback(async (prompt: Prompt) => {
    try {
      await storage.copyToClipboard(prompt.content);
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
      toast.success("Copiado ✓");
    } catch {
      toast.error("Error al copiar");
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
    }),
    [
      setSearchQuery,
      savePrompt,
      deletePrompt,
      saveCollection,
      deleteCollection,
      copyPrompt,
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
