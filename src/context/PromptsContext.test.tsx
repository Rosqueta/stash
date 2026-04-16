import { act, cleanup, render, screen } from "@testing-library/react";
import { afterEach, beforeEach, describe, expect, it, vi } from "vitest";
import { PromptsProvider, usePromptsData, usePromptsActions } from "./PromptsContext";
import { TooltipProvider } from "../components/ui";
import type { Prompt, Collection } from "../types/prompt";

// ── toast mock ────────────────────────────────────────────────────────────────

const toastMock = vi.hoisted(() => {
  const fn = vi.fn();
  Object.assign(fn, { success: vi.fn(), error: vi.fn() });
  return fn;
});

vi.mock("sonner", () => ({ toast: toastMock }));

// ── storage mock ──────────────────────────────────────────────────────────────

let mockPrompts: Prompt[] = [];
let mockCollections: Collection[] = [];

vi.mock("../services/storage", () => ({
  listPrompts:     vi.fn(async () => mockPrompts.map((p) => ({ ...p }))),
  listCollections: vi.fn(async () => mockCollections.map((c) => ({ ...c }))),
  savePrompt: vi.fn(async (p: Prompt) => {
    const idx = mockPrompts.findIndex((x) => x.id === p.id);
    if (idx === -1) mockPrompts.unshift({ ...p });
    else mockPrompts[idx] = { ...p };
  }),
  deletePrompt: vi.fn(async (id: string) => {
    mockPrompts = mockPrompts.filter((p) => p.id !== id);
  }),
  saveCollection: vi.fn(async (c: Collection) => {
    const idx = mockCollections.findIndex((x) => x.id === c.id);
    if (idx === -1) mockCollections.unshift({ ...c });
    else mockCollections[idx] = { ...c };
  }),
  deleteCollection: vi.fn(async (id: string) => {
    mockCollections = mockCollections.filter((c) => c.id !== id);
  }),
  copyToClipboard: vi.fn(async () => undefined),
  showWindow:      vi.fn(async () => undefined),
  renameTag:       vi.fn(async () => []),
  deleteTag:       vi.fn(async () => []),
}));

// ── fixtures ──────────────────────────────────────────────────────────────────

function makePrompt(id: string, overrides: Partial<Prompt> = {}): Prompt {
  return {
    id, title: `Prompt ${id}`, content: `Content ${id}`,
    collectionId: null, tags: [], modelTarget: "any", isPinned: false,
    createdAt: 1, updatedAt: 1, lastUsedAt: null, useCount: 0, notes: "",
    ...overrides,
  };
}

function makeCollection(id: string): Collection {
  return { id, name: `Collection ${id}`, color: "#000000" };
}

// ── test harness ──────────────────────────────────────────────────────────────

type Actions = ReturnType<typeof usePromptsActions>;
type Data    = ReturnType<typeof usePromptsData>;
let capturedActions: Actions | null = null;
let capturedData:    Data    | null = null;

function ContextCapture() {
  capturedActions = usePromptsActions();
  capturedData    = usePromptsData();
  const { prompts, collections, selectedId, activeCollectionId, isLoading } = capturedData;
  return (
    <>
      <div data-testid="loading">{String(isLoading)}</div>
      <div data-testid="prompt-ids">{prompts.map((p) => p.id).join(",")}</div>
      <div data-testid="collection-ids">{collections.map((c) => c.id).join(",")}</div>
      <div data-testid="selected-id">{selectedId ?? "none"}</div>
      <div data-testid="active-collection">{activeCollectionId ?? "none"}</div>
    </>
  );
}

function TestApp() {
  return (
    <TooltipProvider>
      <PromptsProvider>
        <ContextCapture />
      </PromptsProvider>
    </TooltipProvider>
  );
}

async function waitForReady() {
  await vi.waitFor(() =>
    expect(screen.getByTestId("loading").textContent).toBe("false")
  );
}

// ── tests ─────────────────────────────────────────────────────────────────────

describe("PromptsContext", () => {
  beforeEach(() => {
    toastMock.mockReset();
    (toastMock as ReturnType<typeof vi.fn> & { success: ReturnType<typeof vi.fn>; error: ReturnType<typeof vi.fn> }).success.mockReset();
    (toastMock as ReturnType<typeof vi.fn> & { success: ReturnType<typeof vi.fn>; error: ReturnType<typeof vi.fn> }).error.mockReset();
    capturedActions = null;
    capturedData    = null;
  });

  afterEach(() => { cleanup(); });

  // ── carga inicial ───────────────────────────────────────────────────────────

  describe("carga inicial", () => {
    it("arranca en estado de carga", () => {
      mockPrompts = [];
      mockCollections = [];
      render(<TestApp />);
      expect(screen.getByTestId("loading").textContent).toBe("true");
    });

    it("carga prompts y colecciones y deja isLoading en false", async () => {
      mockPrompts    = [makePrompt("p1"), makePrompt("p2")];
      mockCollections = [makeCollection("col1")];
      render(<TestApp />);
      await waitForReady();
      expect(screen.getByTestId("prompt-ids").textContent).toBe("p1,p2");
      expect(screen.getByTestId("collection-ids").textContent).toBe("col1");
    });

    it("muestra toast de error si falla la carga", async () => {
      const { listPrompts } = await import("../services/storage");
      vi.mocked(listPrompts).mockRejectedValueOnce(new Error("fail"));
      mockPrompts = [];
      mockCollections = [];
      render(<TestApp />);
      await waitForReady();
      expect((toastMock as { error: ReturnType<typeof vi.fn> }).error).toHaveBeenCalledWith("Failed to load data");
    });
  });

  // ── savePrompt ──────────────────────────────────────────────────────────────

  describe("savePrompt", () => {
    it("añade un prompt nuevo al principio de la lista", async () => {
      mockPrompts    = [makePrompt("p1")];
      mockCollections = [];
      render(<TestApp />);
      await waitForReady();

      await act(async () => {
        await capturedActions!.savePrompt(makePrompt("p2"));
      });

      expect(screen.getByTestId("prompt-ids").textContent).toBe("p2,p1");
    });

    it("actualiza un prompt existente sin duplicarlo", async () => {
      mockPrompts    = [makePrompt("p1", { title: "Original" })];
      mockCollections = [];
      render(<TestApp />);
      await waitForReady();

      await act(async () => {
        await capturedActions!.savePrompt(makePrompt("p1", { title: "Updated" }));
      });

      expect(capturedData!.prompts).toHaveLength(1);
      expect(capturedData!.prompts[0].title).toBe("Updated");
    });
  });

  // ── deletePrompt ────────────────────────────────────────────────────────────

  describe("deletePrompt", () => {
    it("elimina el prompt de la lista", async () => {
      mockPrompts    = [makePrompt("p1"), makePrompt("p2")];
      mockCollections = [];
      render(<TestApp />);
      await waitForReady();

      await act(async () => { await capturedActions!.deletePrompt("p1"); });

      expect(screen.getByTestId("prompt-ids").textContent).toBe("p2");
    });

    it("limpia selectedId cuando se borra el prompt seleccionado", async () => {
      mockPrompts    = [makePrompt("p1")];
      mockCollections = [];
      render(<TestApp />);
      await waitForReady();

      act(() => capturedActions!.selectPrompt("p1"));
      await vi.waitFor(() =>
        expect(screen.getByTestId("selected-id").textContent).toBe("p1")
      );

      await act(async () => { await capturedActions!.deletePrompt("p1"); });

      expect(screen.getByTestId("selected-id").textContent).toBe("none");
    });

    it("mantiene selectedId cuando se borra un prompt diferente", async () => {
      mockPrompts    = [makePrompt("p1"), makePrompt("p2")];
      mockCollections = [];
      render(<TestApp />);
      await waitForReady();

      act(() => capturedActions!.selectPrompt("p1"));
      await vi.waitFor(() =>
        expect(screen.getByTestId("selected-id").textContent).toBe("p1")
      );

      await act(async () => { await capturedActions!.deletePrompt("p2"); });

      expect(screen.getByTestId("selected-id").textContent).toBe("p1");
    });
  });

  // ── copyPrompt ──────────────────────────────────────────────────────────────

  describe("copyPrompt", () => {
    it("incrementa useCount y actualiza lastUsedAt", async () => {
      vi.spyOn(Date, "now").mockReturnValue(1700000000000);
      mockPrompts    = [makePrompt("p1", { useCount: 3 })];
      mockCollections = [];
      render(<TestApp />);
      await waitForReady();

      await act(async () => {
        await capturedActions!.copyPrompt(capturedData!.prompts[0]);
      });

      expect(capturedData!.prompts[0].useCount).toBe(4);
      expect(capturedData!.prompts[0].lastUsedAt).toBe(1700000000000);
      vi.restoreAllMocks();
    });
  });

  // ── deleteCollection ────────────────────────────────────────────────────────

  describe("deleteCollection", () => {
    it("pone collectionId: null en los prompts que pertenecían a la colección", async () => {
      mockPrompts     = [makePrompt("p1", { collectionId: "col1" }), makePrompt("p2")];
      mockCollections = [makeCollection("col1")];
      render(<TestApp />);
      await waitForReady();

      await act(async () => { await capturedActions!.deleteCollection("col1"); });

      expect(capturedData!.prompts.find((p) => p.id === "p1")?.collectionId).toBeNull();
      expect(capturedData!.prompts.find((p) => p.id === "p2")?.collectionId).toBeNull();
    });

    it("resetea activeCollectionId si coincide con la colección borrada", async () => {
      mockPrompts     = [];
      mockCollections = [makeCollection("col1")];
      render(<TestApp />);
      await waitForReady();

      act(() => capturedActions!.setActiveCollection("col1"));
      await vi.waitFor(() =>
        expect(screen.getByTestId("active-collection").textContent).toBe("col1")
      );

      await act(async () => { await capturedActions!.deleteCollection("col1"); });

      expect(screen.getByTestId("active-collection").textContent).toBe("none");
    });
  });
});
