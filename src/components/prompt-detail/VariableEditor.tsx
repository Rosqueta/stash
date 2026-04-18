import { useRef, useState, useEffect, useCallback } from "react";

interface PopoverState {
  x: number;
  y: number;
  type: "create" | "remove";
  savedRange: Range;
  chipEl?: HTMLElement;
}

interface Props {
  value: string;
  onChange: (value: string) => void;
  placeholder?: string;
  className?: string;
}

function getAdaptivePopoverPosition(
  elementRect: DOMRect,
  containerRect: DOMRect,
  offset: number = 38
): { x: number; y: number } {
  const x = elementRect.left + elementRect.width / 2 - containerRect.left;

  const elementTopRelative = elementRect.top - containerRect.top;
  const elementBottomRelative = elementRect.bottom - containerRect.top;

  const spaceAbove = elementTopRelative;

  let y: number;
  if (spaceAbove >= offset) {
    y = elementTopRelative - offset;
  } else {
    y = elementBottomRelative + offset;
  }

  return { x, y };
}

function valueToHTML(str: string): string {
  const escaped = str
    .replace(/&/g, "&amp;")
    .replace(/</g, "&lt;")
    .replace(/>/g, "&gt;");
  return escaped
    .replace(/\{\{(\w+)\}\}/g, (_, name) =>
      `<span data-var="${name}" contenteditable="false">${name}</span>`
    )
    .replace(/\n/g, "<br>");
}

function htmlToValue(el: HTMLElement): string {
  let result = "";
  let firstBlock = true;
  el.childNodes.forEach((node) => {
    if (node.nodeType === Node.TEXT_NODE) {
      result += node.textContent ?? "";
    } else if (node instanceof HTMLElement) {
      if (node.tagName === "BR") {
        result += "\n";
      } else if (node.dataset.var !== undefined) {
        result += `{{${node.dataset.var}}}`;
      } else if (node.tagName === "DIV" || node.tagName === "P") {
        if (!firstBlock) result += "\n";
        result += htmlToValue(node);
        firstBlock = false;
        return;
      } else {
        result += htmlToValue(node);
      }
    }
    firstBlock = false;
  });
  return result;
}

export function VariableEditor({ value, onChange, placeholder, className }: Props) {
  const editorRef = useRef<HTMLDivElement>(null);
  const containerRef = useRef<HTMLDivElement>(null);
  const popoverRef = useRef<HTMLDivElement>(null);
  const editingChipRef = useRef<{ el: HTMLElement; originalName: string } | null>(null);
  const [popover, setPopover] = useState<PopoverState | null>(null);

  // Mount: set initial HTML
  useEffect(() => {
    if (editorRef.current) editorRef.current.innerHTML = valueToHTML(value);
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, []);

  // Sync external value changes (only when editor not focused)
  useEffect(() => {
    const el = editorRef.current;
    if (!el || document.activeElement === el) return;
    const current = htmlToValue(el);
    if (current !== value) el.innerHTML = valueToHTML(value);
  }, [value]);

  // Close popover on outside click
  useEffect(() => {
    if (!popover) return;
    function onDown(e: MouseEvent) {
      if (popoverRef.current && !popoverRef.current.contains(e.target as Node))
        setPopover(null);
    }
    document.addEventListener("mousedown", onDown);
    return () => document.removeEventListener("mousedown", onDown);
  }, [popover]);

  const confirmChipEdit = useCallback((el: HTMLElement, originalName: string) => {
    const newName = (el.textContent ?? "").trim().replace(/\s+/g, "_");
    el.contentEditable = "false";
    editingChipRef.current = null;

    if (!newName) {
      const text = document.createTextNode(originalName);
      el.parentNode?.replaceChild(text, el);
    } else {
      el.dataset.var = newName;
      el.textContent = newName;
    }
    if (editorRef.current) onChange(htmlToValue(editorRef.current));
  }, [onChange]);

  const cancelChipEdit = useCallback((el: HTMLElement, originalName: string) => {
    el.contentEditable = "false";
    el.textContent = originalName;
    editingChipRef.current = null;
  }, []);

  const handleInput = useCallback(() => {
    if (editingChipRef.current) return;
    if (editorRef.current) onChange(htmlToValue(editorRef.current));
  }, [onChange]);

  const handlePaste = useCallback((e: React.ClipboardEvent) => {
    e.preventDefault();
    document.execCommand("insertText", false, e.clipboardData.getData("text/plain"));
  }, []);

  // Click on chip → enter edit mode with cursor at click position
  const handleClick = useCallback((e: React.MouseEvent) => {
    const target = e.target as HTMLElement;
    if (target.dataset.var === undefined) return;
    if (editingChipRef.current?.el === target) return;

    editingChipRef.current = { el: target, originalName: target.dataset.var };
    target.contentEditable = "true";
    setPopover(null);
    target.focus();

    // Place cursor at exact click position
    const caretRange = document.caretRangeFromPoint?.(e.clientX, e.clientY);
    if (caretRange) {
      const sel = window.getSelection();
      if (sel) { sel.removeAllRanges(); sel.addRange(caretRange); }
    }
  }, []);

  // Double-click on chip → show "Quitar variable" popover
  const handleDoubleClick = useCallback((e: React.MouseEvent) => {
    const target = e.target as HTMLElement;
    if (target.dataset.var === undefined) return;

    // Confirm any edit mode started by the first click before showing popover
    if (editingChipRef.current) {
      confirmChipEdit(editingChipRef.current.el, editingChipRef.current.originalName);
    }

    const containerRect = containerRef.current!.getBoundingClientRect();
    const chipRect = target.getBoundingClientRect();
    const { x, y } = getAdaptivePopoverPosition(chipRect, containerRect);

    const fakeRange = document.createRange();
    fakeRange.selectNode(target);
    setPopover({ type: "remove", x, y, savedRange: fakeRange, chipEl: target });
  }, [cancelChipEdit]);

  const handleKeyDown = useCallback((e: React.KeyboardEvent) => {
    const editing = editingChipRef.current;
    if (!editing) return;
    if (e.key === "Enter") {
      e.preventDefault();
      confirmChipEdit(editing.el, editing.originalName);
      editorRef.current?.focus();
    } else if (e.key === "Escape") {
      e.preventDefault();
      cancelChipEdit(editing.el, editing.originalName);
      editorRef.current?.focus();
    }
  }, [confirmChipEdit, cancelChipEdit]);

  const handleBlur = useCallback((e: React.FocusEvent) => {
    const editing = editingChipRef.current;
    if (editing && e.target === editing.el) {
      confirmChipEdit(editing.el, editing.originalName);
    }
  }, [confirmChipEdit]);

  const handleMouseUp = useCallback((_e: React.MouseEvent) => {
    // Don't show popover while editing a chip
    if (editingChipRef.current) return;

    const sel = window.getSelection();
    if (!sel || sel.isCollapsed || sel.rangeCount === 0) { setPopover(null); return; }

    const range = sel.getRangeAt(0);
    const text = range.toString().trim();
    if (!text) { setPopover(null); return; }

    // Only show "Convertir en variable" for plain text selections (no chips)
    const fragment = range.cloneContents();
    if (fragment.querySelector("[data-var]")) { setPopover(null); return; }

    const containerRect = containerRef.current!.getBoundingClientRect();
    const selRect = range.getBoundingClientRect();
    const { x, y } = getAdaptivePopoverPosition(selRect, containerRect);

    setPopover({ type: "create", x, y, savedRange: range.cloneRange() });
  }, []);

  const handleConvertToVar = useCallback(() => {
    if (!popover) return;
    const range = popover.savedRange;
    const text = range.toString().trim();
    if (!text) return;

    const varName = text.replace(/\s+/g, "_");
    const span = document.createElement("span");
    span.dataset.var = varName;
    span.contentEditable = "false";
    span.textContent = varName;

    range.deleteContents();
    range.insertNode(span);

    const sel = window.getSelection();
    if (sel) {
      const newRange = document.createRange();
      newRange.setStartAfter(span);
      newRange.collapse(true);
      sel.removeAllRanges();
      sel.addRange(newRange);
    }

    if (editorRef.current) onChange(htmlToValue(editorRef.current));
    setPopover(null);
  }, [popover, onChange]);

  const handleRemoveVar = useCallback(() => {
    if (!popover?.chipEl) return;
    const text = document.createTextNode(popover.chipEl.dataset.var ?? "");
    popover.chipEl.parentNode?.replaceChild(text, popover.chipEl);
    if (editorRef.current) onChange(htmlToValue(editorRef.current));
    setPopover(null);
  }, [popover, onChange]);

  return (
    <div ref={containerRef} className={`relative ${className ?? ""}`}>
      <div
        ref={editorRef}
        contentEditable
        suppressContentEditableWarning
        data-placeholder={placeholder}
        onInput={handleInput}
        onPaste={handlePaste}
        onClick={handleClick}
        onDoubleClick={handleDoubleClick}
        onMouseUp={handleMouseUp}
        onKeyDown={handleKeyDown}
        onBlur={handleBlur}
        className={`min-h-[120px] w-full text-sm text-[var(--color-text)] focus:outline-none leading-relaxed selectable ${className ?? ""}`}
        style={{ whiteSpace: "pre-wrap", wordBreak: "break-word" }}
      />

      {/* Selection popover */}
      {popover && (
        <div
          ref={popoverRef}
          style={{
            position: "absolute",
            left: popover.x,
            top: popover.y,
            transform: "translateX(-50%)",
            zIndex: 50,
          }}
          onMouseDown={(e) => e.preventDefault()}
          onClick={popover.type === "create" ? handleConvertToVar : handleRemoveVar}
          className="bg-[var(--color-bg)] text-[var(--color-text)] border border-[var(--color-border)] text-xs font-medium rounded-md px-3 py-1.5 shadow-[0_2px_8px_rgba(0,0,0,0.07)] cursor-pointer hover:bg-[var(--color-bg-secondary)] whitespace-nowrap transition-colors select-none"
        >
          {popover.type === "create" ? "Convert to variable" : "Remove variable"}
        </div>
      )}
    </div>
  );
}
