import { act, cleanup, render, screen, waitFor } from "@testing-library/react";
import userEvent from "@testing-library/user-event";
import { afterEach, beforeEach, describe, expect, it, vi } from "vitest";
import { PromptDetail } from "./PromptDetail";
import { PromptsProvider, usePromptsActions, usePromptsData } from "../../context/PromptsContext";
import { TooltipProvider } from "../ui";
import type { Collection, Prompt } from "../../types/prompt";

const toastSuccessMock = vi.fn();
const toastErrorMock = vi.fn();

let mockPrompts: Prompt[] = [];
let mockCollections: Collection[] = [];

function clonePrompt(prompt: Prompt): Prompt {
  return {
    ...prompt,
    tags: [...prompt.tags],
  };
}

function seedStorage(prompts: Prompt[], collections: Collection[] = []) {
  mockPrompts = prompts.map(clonePrompt);
  mockCollections = collections.map((collection) => ({ ...collection }));
}

vi.mock("sonner", () => ({
  toast: {
    success: (...args: unknown[]) => toastSuccessMock(...args),
    error: (...args: unknown[]) => toastErrorMock(...args),
  },
}));

vi.mock("../../services/storage", () => ({
  listPrompts: vi.fn(async () => mockPrompts.map(clonePrompt)),
  listCollections: vi.fn(async () => mockCollections.map((collection) => ({ ...collection }))),
  savePrompt: vi.fn(async (prompt: Prompt) => {
    const next = clonePrompt(prompt);
    const index = mockPrompts.findIndex((item) => item.id === prompt.id);
    if (index === -1) {
      mockPrompts.push(next);
      return;
    }
    mockPrompts[index] = next;
  }),
  deletePrompt: vi.fn(async (id: string) => {
    mockPrompts = mockPrompts.filter((prompt) => prompt.id !== id);
  }),
  saveCollection: vi.fn(async (collection: Collection) => {
    const index = mockCollections.findIndex((item) => item.id === collection.id);
    if (index === -1) {
      mockCollections.push({ ...collection });
      return;
    }
    mockCollections[index] = { ...collection };
  }),
  deleteCollection: vi.fn(async (id: string) => {
    mockCollections = mockCollections.filter((collection) => collection.id !== id);
  }),
  copyToClipboard: vi.fn(async () => undefined),
  showWindow: vi.fn(async () => undefined),
}));

vi.mock("./VariableEditor", () => ({
  VariableEditor: ({
    value,
    onChange,
    placeholder,
  }: {
    value: string;
    onChange: (value: string) => void;
    placeholder?: string;
  }) => (
    <textarea
      aria-label="Contenido del prompt"
      value={value}
      onChange={(event) => onChange(event.target.value)}
      placeholder={placeholder}
    />
  ),
}));

vi.mock("../warm-up/WarmUp", () => ({
  WarmUp: () => <div>WarmUp</div>,
}));

function PromptNavigator() {
  const { prompts, selectedId } = usePromptsData();
  const { selectPrompt } = usePromptsActions();

  return (
    <div>
      {prompts.map((prompt) => (
        <button
          key={prompt.id}
          type="button"
          onClick={() => selectPrompt(prompt.id)}
          aria-label={`Seleccionar ${prompt.title}`}
          aria-pressed={selectedId === prompt.id}
        >
          {prompt.title}
        </button>
      ))}
    </div>
  );
}

function TestApp() {
  return (
    <TooltipProvider>
      <PromptsProvider>
        <PromptNavigator />
        <PromptDetail />
      </PromptsProvider>
    </TooltipProvider>
  );
}

function createPrompt(id: string, title: string, tags: string[]): Prompt {
  return {
    id,
    title,
    content: `${title} content`,
    collectionId: null,
    tags,
    modelTarget: "any",
    isPinned: false,
    createdAt: 1,
    updatedAt: 1,
    lastUsedAt: null,
    useCount: 0,
    notes: "",
  };
}

async function flushAsyncWork() {
  await act(async () => {
    await new Promise((resolve) => setTimeout(resolve, 350));
  });
}

async function selectPrompt(user: ReturnType<typeof userEvent.setup>, title: string) {
  await screen.findByRole("button", { name: `Seleccionar ${title}` });
  await user.click(screen.getByRole("button", { name: `Seleccionar ${title}` }));
  await screen.findByDisplayValue(title);
}

async function openTagEditor(user: ReturnType<typeof userEvent.setup>) {
  await user.click(screen.getByLabelText("Add tag"));
  await screen.findByPlaceholderText("Search tag...");
}

describe("PromptDetail tags", () => {
  beforeEach(() => {
    toastSuccessMock.mockReset();
    toastErrorMock.mockReset();
    seedStorage([
      createPrompt("a", "Prompt A", ["creative", "ux"]),
      createPrompt("b", "Prompt B", ["creative", "research"]),
    ]);
  });

  afterEach(() => {
    cleanup();
  });

  it("persiste al quitar una etiqueta de un prompt y volver a entrar", async () => {
    const user = userEvent.setup();
    render(<TestApp />);

    await selectPrompt(user, "Prompt A");
    await user.click(screen.getByLabelText("Remove tag ux"));
    await flushAsyncWork();
    await user.click(screen.getByRole("button", { name: "Seleccionar Prompt B" }));
    await screen.findByDisplayValue("Prompt B");
    await user.click(screen.getByRole("button", { name: "Seleccionar Prompt A" }));
    await screen.findByDisplayValue("Prompt A");

    expect(screen.queryByText("ux")).not.toBeInTheDocument();
    expect(mockPrompts.find((prompt) => prompt.id === "a")?.tags).toEqual(["creative"]);
  });

  it("renombra una etiqueta desde el editor y la mantiene entre prompts", async () => {
    const user = userEvent.setup();
    render(<TestApp />);

    await selectPrompt(user, "Prompt A");
    await openTagEditor(user);
    await user.click(screen.getByLabelText("Rename tag creative"));
    const renameInput = await screen.findByDisplayValue("creative");
    await user.clear(renameInput);
    await user.type(renameInput, "ideation{enter}");
    await flushAsyncWork();

    await waitFor(() => {
      expect(screen.getByLabelText("Remove tag ideation")).toBeInTheDocument();
    });

    await user.click(screen.getByRole("button", { name: "Seleccionar Prompt B" }));
    await screen.findByDisplayValue("Prompt B");

    expect(screen.getByLabelText("Remove tag ideation")).toBeInTheDocument();
    expect(mockPrompts.map((prompt) => prompt.tags)).toEqual([
      ["ideation", "ux"],
      ["ideation", "research"],
    ]);
  });

  it("borra una etiqueta global y no reaparece tras navegar", async () => {
    const user = userEvent.setup();
    render(<TestApp />);

    await selectPrompt(user, "Prompt A");
    await openTagEditor(user);
    await user.click(screen.getByLabelText("Delete tag creative"));
    await user.click(screen.getByRole("button", { name: "Delete" }));
    await flushAsyncWork();

    await waitFor(() => {
      expect(screen.queryByText("creative")).not.toBeInTheDocument();
    });

    await user.click(screen.getByRole("button", { name: "Seleccionar Prompt B" }));
    await screen.findByDisplayValue("Prompt B");
    expect(screen.queryByText("creative")).not.toBeInTheDocument();

    await user.click(screen.getByRole("button", { name: "Seleccionar Prompt A" }));
    await screen.findByDisplayValue("Prompt A");
    expect(screen.queryByText("creative")).not.toBeInTheDocument();
    expect(mockPrompts.map((prompt) => prompt.tags)).toEqual([
      ["ux"],
      ["research"],
    ]);
  });

  it("no restaura etiquetas antiguas si había un guardado pendiente antes de borrar", async () => {
    const user = userEvent.setup();
    render(<TestApp />);

    await selectPrompt(user, "Prompt A");
    await user.click(screen.getByLabelText("Remove tag creative"));
    await openTagEditor(user);
    await user.click(screen.getByLabelText("Delete tag creative"));
    await user.click(screen.getByRole("button", { name: "Delete" }));
    await flushAsyncWork();

    expect(mockPrompts.map((prompt) => prompt.tags)).toEqual([
      ["ux"],
      ["research"],
    ]);

    await user.click(screen.getByRole("button", { name: "Seleccionar Prompt B" }));
    await screen.findByDisplayValue("Prompt B");
    await user.click(screen.getByRole("button", { name: "Seleccionar Prompt A" }));
    await screen.findByDisplayValue("Prompt A");

    expect(screen.queryByText("creative")).not.toBeInTheDocument();
  });

  it("pide confirmación y cancela el borrado global de una etiqueta", async () => {
    const user = userEvent.setup();
    render(<TestApp />);

    await selectPrompt(user, "Prompt A");
    await openTagEditor(user);
    await user.click(screen.getByLabelText("Delete tag creative"));
    await user.click(screen.getByRole("button", { name: "Cancel" }));
    await flushAsyncWork();

    expect(mockPrompts.map((prompt) => prompt.tags)).toEqual([
      ["creative", "ux"],
      ["creative", "research"],
    ]);
  });
});
