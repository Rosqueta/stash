import { forwardRef, memo, useState } from "react";
import { createPortal } from "react-dom";
import * as DropdownMenu from "@radix-ui/react-dropdown-menu";
import { PushPin, DotsThree, Copy, Folder, Trash, CaretRight } from "@phosphor-icons/react";
import { cn } from "../../lib/utils";
import { usePromptsData, usePromptsActions } from "../../context/PromptsContext";
import { capture } from "../../services/analytics";
import { extractVariables } from "../../services/variables";
import { ConfirmDialog, IconButton } from "../ui";
import { WarmUp } from "../warm-up/WarmUp";
import type { Prompt } from "../../types/prompt";

export const PROMPT_DRAG_TYPE = "application/x-stash-prompt";

// WebKit snapshots the drag image at dragstart, so a throwaway element works:
// a small chip with the prompt title instead of the default ghost of the row.
// No box-shadow — WebKit clips it in the snapshot and the edges look broken.
function setDragGhost(e: React.DragEvent, title: string) {
  const ghost = document.createElement("div");
  ghost.textContent = title;
  Object.assign(ghost.style, {
    position: "fixed",
    top: "-100px",
    left: "-100px",
    maxWidth: "220px",
    overflow: "hidden",
    textOverflow: "ellipsis",
    whiteSpace: "nowrap",
    padding: "4px 10px",
    borderRadius: "6px",
    background: "var(--color-bg-secondary)",
    color: "var(--color-text)",
    border: "1px solid var(--color-border)",
    fontSize: "13px",
    fontWeight: "500",
    lineHeight: "1.4",
    pointerEvents: "none",
  });
  document.body.appendChild(ghost);
  e.dataTransfer.setDragImage(ghost, 12, 12);
  setTimeout(() => ghost.remove(), 0);
}

const menuItemClass =
  "flex items-center gap-2 rounded-md px-2 py-1.5 text-sm text-[var(--color-text)] cursor-pointer outline-none hover:bg-[var(--color-bg-muted)] transition-colors";

interface PromptCardProps {
  prompt: Prompt;
  selected: boolean;
  onClick: () => void;
}

export const PromptCard = memo(forwardRef<HTMLDivElement, PromptCardProps>(function PromptCard({
  prompt,
  selected,
  onClick,
}, ref) {
  const { collections } = usePromptsData();
  const { savePrompt, copyPrompt, deletePrompt } = usePromptsActions();
  const [isDragging, setIsDragging] = useState(false);
  const [menuOpen, setMenuOpen] = useState(false);
  const [warmUpOpen, setWarmUpOpen] = useState(false);
  const [deleteConfirmOpen, setDeleteConfirmOpen] = useState(false);

  const handlePinToggle = () => {
    void savePrompt({ ...prompt, isPinned: !prompt.isPinned, updatedAt: Date.now() });
  };

  const handleCopy = () => {
    if (extractVariables(prompt.content).length > 0) {
      setWarmUpOpen(true);
    } else {
      void copyPrompt(prompt, false, undefined, "list");
    }
  };

  const handleMove = (collectionId: string | null) => {
    if (collectionId === prompt.collectionId) return;
    void savePrompt({ ...prompt, collectionId, updatedAt: Date.now() });
    capture("prompt_moved", { source: "list_menu" });
  };

  return (
    <div
      ref={ref}
      onClick={onClick}
      draggable
      onDragStart={(e) => {
        e.dataTransfer.setData(PROMPT_DRAG_TYPE, prompt.id);
        e.dataTransfer.effectAllowed = "move";
        setDragGhost(e, prompt.title || "Untitled");
        setIsDragging(true);
      }}
      onDragEnd={() => setIsDragging(false)}
      className={cn(
        "group flex items-center gap-1.5 rounded-md px-2 py-1.5 text-sm cursor-pointer transition-colors",
        selected
          ? "bg-[var(--color-bg-muted)] text-[var(--color-text)]"
          : "text-[var(--color-text-muted)] hover:bg-[var(--color-bg-muted)] hover:text-[var(--color-text)]",
        isDragging && "opacity-40"
      )}
    >
      <span className="flex-1 truncate">
        {prompt.title || "Untitled"}
      </span>

      {/* Actions menu — visible on hover or while open */}
      <DropdownMenu.Root open={menuOpen} onOpenChange={setMenuOpen}>
        <DropdownMenu.Trigger asChild>
          <IconButton
            size="sm"
            aria-label="Prompt actions"
            onClick={(e) => e.stopPropagation()}
            className={cn(
              "h-5 w-5 shrink-0 opacity-0 group-hover:opacity-100 transition-opacity",
              menuOpen && "opacity-100"
            )}
          >
            <DotsThree size={16} weight="bold" />
          </IconButton>
        </DropdownMenu.Trigger>
        <DropdownMenu.Portal>
          <DropdownMenu.Content
            side="bottom"
            align="start"
            sideOffset={4}
            className="z-50 min-w-[180px] rounded-lg bg-[var(--color-bg)] border border-[var(--color-border)] shadow-lg p-1 animate-in fade-in-0 zoom-in-95"
            onClick={(e) => e.stopPropagation()}
          >
            <DropdownMenu.Item onSelect={handlePinToggle} className={menuItemClass}>
              <PushPin size={14} weight="regular" />
              {prompt.isPinned ? "Unpin" : "Pin"}
            </DropdownMenu.Item>
            <DropdownMenu.Item onSelect={handleCopy} className={menuItemClass}>
              <Copy size={14} weight="regular" />
              Copy
            </DropdownMenu.Item>
            <DropdownMenu.Sub>
              <DropdownMenu.SubTrigger className={cn(menuItemClass, "justify-between data-[state=open]:bg-[var(--color-bg-muted)]")}>
                <div className="flex items-center gap-2">
                  <Folder size={14} weight="regular" />
                  Move to
                </div>
                <CaretRight size={11} className="text-[var(--color-text-muted)]" />
              </DropdownMenu.SubTrigger>
              <DropdownMenu.Portal>
                <DropdownMenu.SubContent
                  sideOffset={6}
                  className="z-50 min-w-[160px] rounded-lg bg-[var(--color-bg)] border border-[var(--color-border)] shadow-lg p-1 animate-in fade-in-0 zoom-in-95"
                >
                  <DropdownMenu.Item
                    onSelect={() => handleMove(null)}
                    disabled={prompt.collectionId === null}
                    className={cn(menuItemClass, "text-[var(--color-text-muted)] data-[disabled]:opacity-40 data-[disabled]:cursor-default")}
                  >
                    <Folder size={14} weight="regular" />
                    No collection
                  </DropdownMenu.Item>
                  {collections.length > 0 && (
                    <DropdownMenu.Separator className="my-1 h-px bg-[var(--color-border)]" />
                  )}
                  {collections.map((c) => (
                    <DropdownMenu.Item
                      key={c.id}
                      onSelect={() => handleMove(c.id)}
                      disabled={prompt.collectionId === c.id}
                      className={cn(menuItemClass, "data-[disabled]:opacity-40 data-[disabled]:cursor-default")}
                    >
                      <Folder size={14} weight="regular" style={{ color: c.color }} />
                      {c.name}
                    </DropdownMenu.Item>
                  ))}
                </DropdownMenu.SubContent>
              </DropdownMenu.Portal>
            </DropdownMenu.Sub>
            <DropdownMenu.Separator className="my-1 h-px bg-[var(--color-border)]" />
            <DropdownMenu.Item
              onSelect={() => setDeleteConfirmOpen(true)}
              className={cn(menuItemClass, "text-red-500 hover:bg-red-500/10")}
            >
              <Trash size={14} weight="regular" />
              Delete
            </DropdownMenu.Item>
          </DropdownMenu.Content>
        </DropdownMenu.Portal>
      </DropdownMenu.Root>

      {prompt.isPinned && (
        <PushPin size={12} weight="regular" className="shrink-0 text-[var(--color-stash)]" />
      )}

      {/* Warm-Up modal for copying prompts with variables */}
      {warmUpOpen && createPortal(
        <div
          className="fixed inset-0 z-50 flex items-center justify-center bg-black/30 backdrop-blur-sm"
          onClick={(e) => { e.stopPropagation(); if (e.target === e.currentTarget) setWarmUpOpen(false); }}
        >
          <div className="w-full max-w-lg mx-6 bg-[var(--color-bg)] rounded-2xl shadow-2xl ring-1 ring-black/10 overflow-hidden max-h-[80vh] flex flex-col">
            <WarmUp
              prompt={prompt}
              onCopy={(resolved) => {
                void copyPrompt(prompt, false, resolved, "list");
                setWarmUpOpen(false);
              }}
              onClose={() => setWarmUpOpen(false)}
            />
          </div>
        </div>,
        document.body
      )}

      {/* Delete prompt confirm modal */}
      <ConfirmDialog
        open={deleteConfirmOpen}
        title="Delete prompt"
        description={<>Are you sure you want to delete &ldquo;{prompt.title.trim() || "Untitled"}&rdquo;? This cannot be undone.</>}
        onCancel={() => setDeleteConfirmOpen(false)}
        onConfirm={() => {
          setDeleteConfirmOpen(false);
          void deletePrompt(prompt.id);
        }}
      />
    </div>
  );
}));
