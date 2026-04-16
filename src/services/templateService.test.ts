import { afterEach, beforeEach, describe, expect, it, vi } from "vitest";
import { fetchTemplates, buildPromptFromTemplate } from "./templateService";
import type { Template, TemplatesData } from "../types/template";

vi.mock("@tauri-apps/api/core", () => ({
  invoke: vi.fn(),
}));

import { invoke } from "@tauri-apps/api/core";
const mockedInvoke = vi.mocked(invoke);

// ── Fixtures ──────────────────────────────────────────────────────────────────

const mockTemplate: Template = {
  id: "tpl-test",
  title_es: "Título en español",
  title_en: "Title in English",
  category: "general",
  content_es: "Contenido en {{idioma}}",
  content_en: "Content in {{language}}",
  variables_es: ["idioma"],
  variables_en: ["language"],
};

const mockTemplatesData: TemplatesData = {
  version: 2,
  updatedAt: 1700000000,
  categories: [{ slug: "general", label_es: "General", label_en: "General" }],
  templates: [mockTemplate],
};

// ── fetchTemplates ─────────────────────────────────────────────────────────────

describe("fetchTemplates", () => {
  afterEach(() => {
    vi.restoreAllMocks();
    mockedInvoke.mockReset();
  });

  describe("path exitoso", () => {
    it("devuelve los datos cuando fetch responde OK", async () => {
      vi.spyOn(globalThis, "fetch").mockResolvedValue({
        ok: true,
        json: async () => mockTemplatesData,
      } as Response);
      mockedInvoke.mockResolvedValue(undefined);

      const result = await fetchTemplates();
      expect(result).toEqual(mockTemplatesData);
    });

    it("llama a set_templates_cache con el JSON serializado tras fetch exitoso", async () => {
      vi.spyOn(globalThis, "fetch").mockResolvedValue({
        ok: true,
        json: async () => mockTemplatesData,
      } as Response);
      mockedInvoke.mockResolvedValue(undefined);

      await fetchTemplates();

      expect(mockedInvoke).toHaveBeenCalledTimes(1);
      expect(mockedInvoke).toHaveBeenCalledWith("set_templates_cache", {
        json: JSON.stringify(mockTemplatesData),
      });
    });
  });

  describe("path de fallback a caché", () => {
    it("usa la caché cuando fetch responde con status no-OK", async () => {
      vi.spyOn(globalThis, "fetch").mockResolvedValue({
        ok: false,
        status: 500,
      } as Response);
      mockedInvoke.mockImplementation(async (cmd) => {
        if (cmd === "get_templates_cache") return JSON.stringify(mockTemplatesData);
      });

      const result = await fetchTemplates();
      expect(result).toEqual(mockTemplatesData);
    });

    it("usa la caché cuando fetch lanza un error de red", async () => {
      vi.spyOn(globalThis, "fetch").mockRejectedValue(new Error("Network error"));
      mockedInvoke.mockImplementation(async (cmd) => {
        if (cmd === "get_templates_cache") return JSON.stringify(mockTemplatesData);
      });

      const result = await fetchTemplates();
      expect(result).toEqual(mockTemplatesData);
    });

    it("lanza error específico cuando falla la red y no hay caché", async () => {
      vi.spyOn(globalThis, "fetch").mockRejectedValue(new Error("Network error"));
      mockedInvoke.mockImplementation(async (cmd) => {
        if (cmd === "get_templates_cache") return null;
      });

      await expect(fetchTemplates()).rejects.toThrow("No connection and no cache available");
    });
  });
});

// ── buildPromptFromTemplate ────────────────────────────────────────────────────

describe("buildPromptFromTemplate", () => {
  beforeEach(() => {
    vi.spyOn(crypto, "randomUUID").mockReturnValue("test-uuid-1234-5678-abcd" as `${string}-${string}-${string}-${string}-${string}`);
    vi.spyOn(Date, "now").mockReturnValue(1700000000000);
  });

  afterEach(() => {
    vi.restoreAllMocks();
  });

  it("usa title_en y content_en cuando lang es 'en'", () => {
    const prompt = buildPromptFromTemplate(mockTemplate, null, "en");
    expect(prompt.title).toBe("Title in English");
    expect(prompt.content).toBe("Content in {{language}}");
  });

  it("usa title_es y content_es cuando lang es 'es'", () => {
    const prompt = buildPromptFromTemplate(mockTemplate, null, "es");
    expect(prompt.title).toBe("Título en español");
    expect(prompt.content).toBe("Contenido en {{idioma}}");
  });

  it("usa 'en' por defecto cuando no se especifica lang", () => {
    const prompt = buildPromptFromTemplate(mockTemplate, null);
    expect(prompt.title).toBe("Title in English");
    expect(prompt.content).toBe("Content in {{language}}");
  });

  it("asigna correctamente el collectionId cuando se proporciona", () => {
    const prompt = buildPromptFromTemplate(mockTemplate, "col-123", "en");
    expect(prompt.collectionId).toBe("col-123");
  });

  it("asigna collectionId como null cuando se pasa null", () => {
    const prompt = buildPromptFromTemplate(mockTemplate, null, "en");
    expect(prompt.collectionId).toBeNull();
  });

  it("el id del prompt viene de crypto.randomUUID", () => {
    const prompt = buildPromptFromTemplate(mockTemplate, null, "en");
    expect(prompt.id).toBe("test-uuid-1234-5678-abcd");
  });

  it("createdAt y updatedAt usan Date.now()", () => {
    const prompt = buildPromptFromTemplate(mockTemplate, null, "en");
    expect(prompt.createdAt).toBe(1700000000000);
    expect(prompt.updatedAt).toBe(1700000000000);
  });

  it("los valores por defecto son los esperados", () => {
    const prompt = buildPromptFromTemplate(mockTemplate, null, "en");
    expect(prompt.tags).toEqual([]);
    expect(prompt.modelTarget).toBe("any");
    expect(prompt.isPinned).toBe(false);
    expect(prompt.lastUsedAt).toBeNull();
    expect(prompt.useCount).toBe(0);
    expect(prompt.notes).toBe("");
  });
});
