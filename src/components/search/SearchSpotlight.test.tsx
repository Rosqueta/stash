import { cleanup, render, screen } from "@testing-library/react";
import userEvent from "@testing-library/user-event";
import { afterEach, beforeEach, describe, expect, it, vi } from "vitest";
import { SearchSpotlight } from "./SearchSpotlight";
import { PromptsProvider } from "../../context/PromptsContext";
import { TooltipProvider } from "../ui";
import type { Prompt } from "../../types/prompt";

// ── toast mock ────────────────────────────────────────────────────────────────

vi.mock("sonner", () => ({
  toast: Object.assign(vi.fn(), { success: vi.fn(), error: vi.fn() }),
}));

// ── storage mock ──────────────────────────────────────────────────────────────

let mockPrompts: Prompt[] = [];

vi.mock("../../services/storage", () => ({
  listPrompts:     vi.fn(async () => mockPrompts.map((p) => ({ ...p }))),
  listCollections: vi.fn(async () => []),
  savePrompt:      vi.fn(async () => undefined),
  deletePrompt:    vi.fn(async () => undefined),
  saveCollection:  vi.fn(async () => undefined),
  deleteCollection: vi.fn(async () => undefined),
  copyToClipboard: vi.fn(async () => undefined),
  showWindow:      vi.fn(async () => undefined),
  renameTag:       vi.fn(async () => []),
  deleteTag:       vi.fn(async () => []),
}));

// ── fixtures ──────────────────────────────────────────────────────────────────

function makePrompt(id: string, title: string, content = ""): Prompt {
  return {
    id, title, content,
    collectionId: null, tags: [], modelTarget: "any", isPinned: false,
    createdAt: 1, updatedAt: 1, lastUsedAt: null, useCount: 0, notes: "",
  };
}

// ── test harness ──────────────────────────────────────────────────────────────

function TestApp({ onClose = vi.fn() }: { onClose?: () => void }) {
  return (
    <TooltipProvider>
      <PromptsProvider>
        <SearchSpotlight onClose={onClose} />
      </PromptsProvider>
    </TooltipProvider>
  );
}

async function waitForPrompts() {
  await screen.findByPlaceholderText("Search across all your prompts...");
  // give the PromptsProvider effect time to resolve
  await vi.waitFor(() =>
    expect(screen.queryByText("No prompts found")).toBeNull()
  );
}

// ── tests ─────────────────────────────────────────────────────────────────────

describe("SearchSpotlight", () => {
  beforeEach(() => {
    mockPrompts = [
      makePrompt("p1", "Email de bienvenida", "Bienvenido al equipo"),
      makePrompt("p2", "Revisión de código", "Revisa este fragmento"),
      makePrompt("p3", "Resumen de reunión", "Resume la siguiente transcripción"),
    ];
  });

  afterEach(() => { cleanup(); });

  it("muestra todos los prompts cuando no hay query", async () => {
    render(<TestApp />);
    await waitForPrompts();

    expect(screen.getByText("Email de bienvenida")).toBeInTheDocument();
    expect(screen.getByText("Revisión de código")).toBeInTheDocument();
    expect(screen.getByText("Resumen de reunión")).toBeInTheDocument();
  });

  it("filtra prompts por título al escribir", async () => {
    const user = userEvent.setup();
    render(<TestApp />);
    await waitForPrompts();

    await user.type(screen.getByPlaceholderText("Search across all your prompts..."), "email");

    expect(screen.getByText("Email de bienvenida")).toBeInTheDocument();
    expect(screen.queryByText("Revisión de código")).not.toBeInTheDocument();
  });

  it("filtra prompts por contenido al escribir", async () => {
    const user = userEvent.setup();
    render(<TestApp />);
    await waitForPrompts();

    await user.type(screen.getByPlaceholderText("Search across all your prompts..."), "transcripción");

    expect(screen.getByText("Resumen de reunión")).toBeInTheDocument();
    expect(screen.queryByText("Email de bienvenida")).not.toBeInTheDocument();
  });

  it("muestra 'No prompts found' cuando no hay resultados", async () => {
    const user = userEvent.setup();
    render(<TestApp />);
    await waitForPrompts();

    await user.type(screen.getByPlaceholderText("Search across all your prompts..."), "xyzxyzxyz");

    expect(screen.getByText("No prompts found")).toBeInTheDocument();
  });

  it("Escape llama a onClose", async () => {
    const user = userEvent.setup();
    const onClose = vi.fn();
    render(<TestApp onClose={onClose} />);
    await screen.findByPlaceholderText("Search across all your prompts...");

    await user.keyboard("{Escape}");

    expect(onClose).toHaveBeenCalledTimes(1);
  });

  it("clic en el backdrop llama a onClose", async () => {
    const onClose = vi.fn();
    render(<TestApp onClose={onClose} />);
    await screen.findByPlaceholderText("Search across all your prompts...");

    // el backdrop es el div con clase fixed inset-0
    const backdrop = screen.getByPlaceholderText("Search across all your prompts...").closest(".fixed.inset-0");
    if (backdrop) backdrop.dispatchEvent(new MouseEvent("click", { bubbles: true }));

    expect(onClose).toHaveBeenCalledTimes(1);
  });

  it("Enter copia el prompt activo y llama a onClose", async () => {
    const user = userEvent.setup();
    const onClose = vi.fn();
    const { copyToClipboard } = await import("../../services/storage");
    render(<TestApp onClose={onClose} />);
    await waitForPrompts();

    await user.keyboard("{Enter}");

    expect(vi.mocked(copyToClipboard)).toHaveBeenCalled();
    expect(onClose).toHaveBeenCalledTimes(1);
  });

  it("⌘Enter selecciona el prompt sin copiarlo y llama a onClose", async () => {
    const user = userEvent.setup();
    const onClose = vi.fn();
    const { copyToClipboard } = await import("../../services/storage");
    vi.mocked(copyToClipboard).mockClear();
    render(<TestApp onClose={onClose} />);
    await waitForPrompts();

    await user.keyboard("{Meta>}{Enter}{/Meta}");

    expect(vi.mocked(copyToClipboard)).not.toHaveBeenCalled();
    expect(onClose).toHaveBeenCalledTimes(1);
  });
});
