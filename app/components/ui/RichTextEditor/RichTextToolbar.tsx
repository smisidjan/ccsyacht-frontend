"use client";

import { useState, useRef, useEffect, useCallback } from "react";
import { createPortal } from "react-dom";
import type { Editor } from "@tiptap/react";
import { NodeSelection } from "@tiptap/pm/state";
import {
  getShapeContent,
  INSERTABLE_SHAPES,
  SHAPE_DEFAULTS,
  type ShapeAttrs,
  type ShapeType,
} from "./ShapeExtension";
import {
  BoldIcon,
  ItalicIcon,
  ListBulletIcon,
  NumberedListIcon,
  TableCellsIcon,
  PhotoIcon,
  XMarkIcon,
  ClipboardIcon,
  DocumentDuplicateIcon,
  PaintBrushIcon,
  ChevronDownIcon,
  RectangleGroupIcon,
  FilmIcon,
  LinkIcon,
  ArrowUpTrayIcon,
} from "@heroicons/react/24/outline";

interface RichTextToolbarProps {
  editor: Editor;
  /** When false, renders a compact dark bubble-menu strip (no tabs). */
  light?: boolean;
  trailing?: React.ReactNode;
}

// ─── Inline SVG primitives (no heroicon equivalent) ───────────────────────────

function ScissorsSvg() {
  return (
    <svg className="w-3.5 h-3.5" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth={1.8} strokeLinecap="round" strokeLinejoin="round">
      <circle cx="6" cy="6" r="3" /><circle cx="6" cy="18" r="3" />
      <line x1="20" y1="4" x2="8.12" y2="15.88" />
      <line x1="14.47" y1="14.48" x2="20" y2="20" />
      <line x1="8.12" y1="8.12" x2="12" y2="12" />
    </svg>
  );
}

function AlignLeftSvg() {
  return (
    <svg className="w-3.5 h-3.5" viewBox="0 0 16 16" fill="currentColor">
      <rect x="1" y="1.5" width="14" height="1.5" rx="0.75" />
      <rect x="1" y="4.75" width="9" height="1.5" rx="0.75" />
      <rect x="1" y="8" width="14" height="1.5" rx="0.75" />
      <rect x="1" y="11.25" width="7" height="1.5" rx="0.75" />
    </svg>
  );
}

function AlignCenterSvg() {
  return (
    <svg className="w-3.5 h-3.5" viewBox="0 0 16 16" fill="currentColor">
      <rect x="1" y="1.5" width="14" height="1.5" rx="0.75" />
      <rect x="3.5" y="4.75" width="9" height="1.5" rx="0.75" />
      <rect x="1" y="8" width="14" height="1.5" rx="0.75" />
      <rect x="4.5" y="11.25" width="7" height="1.5" rx="0.75" />
    </svg>
  );
}

function AlignRightSvg() {
  return (
    <svg className="w-3.5 h-3.5" viewBox="0 0 16 16" fill="currentColor">
      <rect x="1" y="1.5" width="14" height="1.5" rx="0.75" />
      <rect x="6" y="4.75" width="9" height="1.5" rx="0.75" />
      <rect x="1" y="8" width="14" height="1.5" rx="0.75" />
      <rect x="8" y="11.25" width="7" height="1.5" rx="0.75" />
    </svg>
  );
}

function AlignJustifySvg() {
  return (
    <svg className="w-3.5 h-3.5" viewBox="0 0 16 16" fill="currentColor">
      <rect x="1" y="1.5" width="14" height="1.5" rx="0.75" />
      <rect x="1" y="4.75" width="14" height="1.5" rx="0.75" />
      <rect x="1" y="8" width="14" height="1.5" rx="0.75" />
      <rect x="1" y="11.25" width="10" height="1.5" rx="0.75" />
    </svg>
  );
}


// ─── Color palette ─────────────────────────────────────────────────────────────

const TEXT_COLORS = [
  "#000000","#1f2937","#374151","#6b7280","#9ca3af","#d1d5db","#f3f4f6","#ffffff",
  "#dc2626","#ea580c","#d97706","#65a30d","#16a34a","#0891b2","#2563eb","#7c3aed",
  "#fca5a5","#fdba74","#fcd34d","#86efac","#6ee7b7","#67e8f9","#93c5fd","#c4b5fd",
];
const HIGHLIGHT_COLORS = [
  "#fef08a","#fde68a","#fed7aa","#fecaca","#d9f99d","#bbf7d0","#bae6fd","#e9d5ff",
  "#ffffff","#000000",
];

function ColorPalette({
  colors,
  onSelect,
  selected,
}: {
  colors: string[];
  onSelect: (color: string) => void;
  selected?: string | null;
}) {
  return (
    <div className="p-2 grid gap-1" style={{ gridTemplateColumns: "repeat(8, 20px)" }}>
      {colors.map((c) => (
        <button
          key={c}
          type="button"
          onMouseDown={(e) => e.preventDefault()}
          onClick={() => onSelect(c)}
          title={c}
          className={`w-5 h-5 rounded-sm border transition-transform hover:scale-110 ${
            selected === c ? "border-blue-500 ring-1 ring-blue-500" : "border-gray-300 dark:border-gray-600"
          }`}
          style={{ backgroundColor: c }}
        />
      ))}
    </div>
  );
}

function InsertShapePanel({ editor, onClose }: { editor: Editor; onClose: () => void }) {
  const insert = (type: ShapeType) => {
    editor.chain().focus().insertContent({
      type: "shape",
      attrs: { ...SHAPE_DEFAULTS, shapeType: type },
    }).run();
    onClose();
  };

  return (
    <div className="p-2.5 w-[248px]">
      <div className="grid grid-cols-4 gap-1">
        {INSERTABLE_SHAPES.map(({ type, label }) => (
          <button
            key={type}
            type="button"
            onMouseDown={(e) => e.preventDefault()}
            onClick={() => insert(type)}
            title={label}
            className="flex flex-col items-center gap-1 p-1.5 rounded hover:bg-blue-50 dark:hover:bg-blue-900/20 transition-colors"
          >
            <svg width="44" height="30" viewBox="0 0 44 30" className="overflow-visible">
              <g fill="#93c5fd" stroke="#3b82f6" strokeWidth="1.5">
                {getShapeContent(type, 44, 30)}
              </g>
            </svg>
            <span className="text-[9px] text-gray-500 dark:text-gray-400 text-center leading-tight w-full truncate">
              {label}
            </span>
          </button>
        ))}
      </div>
    </div>
  );
}

// ─── Portal dropdown (escapes overflow-x:auto scroll container) ───────────────

function DropdownPortal({
  anchor,
  onClose,
  children,
  className = "",
}: {
  anchor: { top: number; left: number };
  onClose: () => void;
  children: React.ReactNode;
  className?: string;
}) {
  const ref = useRef<HTMLDivElement>(null);

  useEffect(() => {
    const handler = (e: MouseEvent) => {
      if (ref.current && !ref.current.contains(e.target as Node)) onClose();
    };
    document.addEventListener("mousedown", handler);
    return () => document.removeEventListener("mousedown", handler);
  }, [onClose]);

  return createPortal(
    <div
      ref={ref}
      className={`fixed z-[9999] bg-white dark:bg-gray-800 border border-gray-200 dark:border-gray-700 rounded-lg shadow-xl ${className}`}
      style={{ top: anchor.top, left: anchor.left }}
      onMouseDown={(e) => e.stopPropagation()}
      onClick={(e) => e.stopPropagation()}
    >
      {children}
    </div>,
    document.body
  );
}

function useDropdown() {
  const [anchor, setAnchor] = useState<{ top: number; left: number } | null>(null);
  const open = useCallback((el: HTMLElement) => {
    const r = el.getBoundingClientRect();
    setAnchor({ top: r.bottom + 4, left: r.left });
  }, []);
  const close = useCallback(() => setAnchor(null), []);
  const toggle = useCallback((el: HTMLElement) => {
    setAnchor((prev) => {
      if (prev) return null;
      const r = el.getBoundingClientRect();
      return { top: r.bottom + 4, left: r.left };
    });
  }, []);
  return { isOpen: anchor !== null, anchor, open, close, toggle };
}

// ─── Font-size dropdown ────────────────────────────────────────────────────────

const FONT_SIZES = [8, 9, 10, 11, 12, 14, 16, 18, 20, 22, 24, 28, 36, 48, 72];

function FontSizeSelect({ editor }: { editor: Editor }) {
  const triggerRef = useRef<HTMLButtonElement>(null);
  const dd = useDropdown();

  const currentSize = (() => {
    const attrs = editor.getAttributes("textStyle");
    const raw = attrs?.fontSize as string | undefined;
    return raw ? parseInt(raw, 10) : 12;
  })();

  const setSize = (size: number) => {
    editor.view.focus();
    editor.chain().setMark("textStyle", { fontSize: `${size}px` }).run();
  };

  const adjust = (delta: number) => {
    const next = Math.max(8, Math.min(72, currentSize + delta));
    setSize(next);
  };

  return (
    <div className="flex items-center gap-0.5">
      <button
        ref={triggerRef}
        type="button"
        onMouseDown={(e) => e.preventDefault()}
        onClick={() => triggerRef.current && dd.toggle(triggerRef.current)}
        className="flex items-center gap-0.5 h-[22px] w-9 px-1 rounded border border-gray-300 dark:border-gray-600 bg-white dark:bg-gray-700/60 hover:border-blue-400 dark:hover:border-blue-500 transition-colors text-gray-800 dark:text-gray-200"
      >
        <span className="flex-1 text-center text-[10px] font-medium">{currentSize}</span>
        <ChevronDownIcon className="w-2 h-2 text-gray-400 flex-shrink-0" />
      </button>
      {dd.isOpen && dd.anchor && (
        <DropdownPortal anchor={dd.anchor} onClose={dd.close} className="py-1 w-[64px] max-h-52 overflow-y-auto">
          {FONT_SIZES.map((size) => (
            <button
              key={size}
              type="button"
              onMouseDown={(e) => e.preventDefault()}
              onClick={() => { setSize(size); dd.close(); }}
              className={`w-full text-center py-1 text-sm transition-colors ${
                size === currentSize
                  ? "bg-blue-50 dark:bg-blue-900/20 text-blue-700 dark:text-blue-400 font-semibold"
                  : "hover:bg-blue-50 dark:hover:bg-blue-900/20 text-gray-900 dark:text-white"
              }`}
            >
              {size}
            </button>
          ))}
        </DropdownPortal>
      )}
      <RBtn onClick={() => adjust(1)} label="Increase font size">
        <span className="text-[11px] font-bold leading-none">A<sup className="text-[6px]">▲</sup></span>
      </RBtn>
      <RBtn onClick={() => adjust(-1)} label="Decrease font size">
        <span className="text-[11px] font-bold leading-none">A<sup className="text-[6px]">▼</sup></span>
      </RBtn>
    </div>
  );
}

// ─── Block-type dropdown ───────────────────────────────────────────────────────

function BlockTypeSelect({ editor }: { editor: Editor }) {
  const triggerRef = useRef<HTMLButtonElement>(null);
  const dd = useDropdown();

  const getLabel = () => {
    if (editor.isActive("heading", { level: 1 })) return "Heading 1";
    if (editor.isActive("heading", { level: 2 })) return "Heading 2";
    if (editor.isActive("heading", { level: 3 })) return "Heading 3";
    if (editor.isActive("blockquote")) return "Blockquote";
    return "Normal";
  };

  const options: { label: string; fn: () => void; preview: string }[] = [
    { label: "Normal",     preview: "text-sm",             fn: () => { editor.view.focus(); editor.chain().setParagraph().run(); } },
    { label: "Heading 1",  preview: "text-lg font-bold",   fn: () => { editor.view.focus(); editor.chain().setHeading({ level: 1 }).run(); } },
    { label: "Heading 2",  preview: "text-base font-bold", fn: () => { editor.view.focus(); editor.chain().setHeading({ level: 2 }).run(); } },
    { label: "Heading 3",  preview: "text-sm font-bold",   fn: () => { editor.view.focus(); editor.chain().setHeading({ level: 3 }).run(); } },
    { label: "Blockquote", preview: "text-sm italic",      fn: () => { editor.view.focus(); editor.chain().toggleBlockquote().run(); } },
  ];

  return (
    <div className="relative">
      <button
        ref={triggerRef}
        type="button"
        onMouseDown={(e) => e.preventDefault()}
        onClick={() => triggerRef.current && dd.toggle(triggerRef.current)}
        className="flex items-center gap-1 h-[22px] pl-2 pr-1 rounded border border-gray-300 dark:border-gray-600 bg-white dark:bg-gray-700/60 text-left w-[112px] hover:border-blue-400 dark:hover:border-blue-500 transition-colors text-gray-800 dark:text-gray-200"
      >
        <span className="flex-1 truncate text-[11px] font-medium">{getLabel()}</span>
        <ChevronDownIcon className="w-2.5 h-2.5 text-gray-400 flex-shrink-0" />
      </button>
      {dd.isOpen && dd.anchor && (
        <DropdownPortal anchor={dd.anchor} onClose={dd.close} className="py-1 w-[160px]">
          {options.map((opt) => (
            <button
              key={opt.label}
              type="button"
              onMouseDown={(e) => e.preventDefault()}
              onClick={() => { opt.fn(); dd.close(); }}
              className={`w-full text-left px-3 py-1.5 hover:bg-blue-50 dark:hover:bg-blue-900/20 text-gray-900 dark:text-white transition-colors ${opt.preview}`}
            >
              {opt.label}
            </button>
          ))}
        </DropdownPortal>
      )}
    </div>
  );
}

// ─── Ribbon primitives ─────────────────────────────────────────────────────────

interface RBtnProps {
  onClick?: () => void;
  active?: boolean;
  disabled?: boolean;
  label: string;
  children: React.ReactNode;
  danger?: boolean;
}

/** Standard ribbon row-button: 22px tall, fits inside a 2-row group. */
function RBtn({ onClick, active, disabled, label, children, danger }: RBtnProps) {
  return (
    <button
      type="button"
      onMouseDown={(e) => e.preventDefault()}
      onClick={onClick}
      disabled={disabled}
      title={label}
      aria-label={label}
      aria-pressed={active}
      className={`flex items-center justify-center gap-0.5 min-w-[22px] h-[22px] px-1 rounded transition-colors text-xs font-medium flex-shrink-0 ${
        danger
          ? "text-red-500 hover:bg-red-100 dark:hover:bg-red-900/20"
          : active
          ? "bg-blue-100 text-blue-700 dark:bg-blue-900/40 dark:text-blue-400"
          : "text-gray-700 dark:text-gray-300 hover:bg-gray-200 dark:hover:bg-gray-700"
      } disabled:opacity-35 disabled:cursor-not-allowed`}
    >
      {children}
    </button>
  );
}

/** Tall Paste-style button that spans the full 2-row content height. */
function BigBtn({ onClick, label, children, disabled }: { onClick?: (e: React.MouseEvent<HTMLButtonElement>) => void; label: string; children: React.ReactNode; disabled?: boolean }) {
  return (
    <button
      type="button"
      onMouseDown={(e) => e.preventDefault()}
      onClick={onClick}
      disabled={disabled}
      title={label}
      aria-label={label}
      className="flex flex-col items-center justify-center gap-0.5 w-10 h-full rounded px-1 hover:bg-gray-200 dark:hover:bg-gray-700 text-gray-700 dark:text-gray-200 transition-colors flex-shrink-0 disabled:opacity-40 disabled:cursor-not-allowed disabled:hover:bg-transparent"
    >
      {children}
    </button>
  );
}

/** Thin vertical divider between items within the same row. */
function InlineSep() {
  return <span className="w-px h-3.5 mx-0.5 flex-shrink-0 self-center bg-gray-200 dark:bg-gray-600" />;
}

/** Full-height separator between ribbon groups. */
function GroupSep() {
  return <div className="w-px mx-1.5 my-1.5 flex-shrink-0 self-stretch bg-gray-300 dark:bg-gray-600" />;
}

/** Compact W/H number input for the Shape Format tab's Size group. */
function SizeInput({
  label, value, min, onChange,
}: {
  label: string; value: number; min: number; onChange: (v: number) => void;
}) {
  const [local, setLocal] = useState(String(value));
  useEffect(() => { setLocal(String(value)); }, [value]);
  const apply = () => {
    const n = parseInt(local, 10);
    if (!isNaN(n) && n >= min) onChange(n);
    else setLocal(String(value));
  };
  return (
    <div className="flex items-center gap-1">
      <span className="text-[10px] font-semibold text-gray-500 dark:text-gray-400 w-3 leading-none">{label}</span>
      <input
        type="number"
        value={local}
        onChange={(e) => setLocal(e.target.value)}
        onKeyDown={(e) => { if (e.key === "Enter") { e.preventDefault(); apply(); } }}
        onBlur={apply}
        min={min}
        max={800}
        className="w-[52px] h-[18px] px-1 text-[10px] border border-gray-300 dark:border-gray-600 rounded bg-white dark:bg-gray-700 text-gray-800 dark:text-gray-200 focus:outline-none focus:ring-1 focus:ring-blue-500 [appearance:textfield] [&::-webkit-inner-spin-button]:appearance-none [&::-webkit-outer-spin-button]:appearance-none"
      />
      <span className="text-[10px] text-gray-400">px</span>
    </div>
  );
}

/** Wrapper for a ribbon group — holds 2 content rows + label. */
function RibbonGroup({ label, children }: { label: string; children: React.ReactNode }) {
  return (
    <div className="flex flex-col px-1.5 pt-1.5 pb-0 min-w-0 flex-shrink-0">
      <div className="flex items-center flex-1">{children}</div>
      <div className="text-center mt-1 pt-0.5 border-t border-gray-200 dark:border-gray-600">
        <span className="text-[9px] font-semibold text-gray-400 dark:text-gray-500 uppercase tracking-[0.12em] leading-none select-none">
          {label}
        </span>
      </div>
    </div>
  );
}

// ─── Dark bubble-menu variant (unchanged) ─────────────────────────────────────

interface BubbleBtnProps {
  onClick: () => void;
  active?: boolean;
  label: string;
  onMouseDown?: (e: React.MouseEvent) => void;
  children: React.ReactNode;
}

function BubbleBtn({ onClick, active, label, onMouseDown, children }: BubbleBtnProps) {
  return (
    <button
      type="button"
      onClick={onClick}
      onMouseDown={onMouseDown ?? ((e) => e.preventDefault())}
      title={label}
      aria-label={label}
      aria-pressed={active}
      className={`flex items-center justify-center min-w-8 h-8 px-2 rounded text-white transition-colors text-sm ${
        active ? "bg-blue-500 hover:bg-blue-400" : "hover:bg-gray-700"
      }`}
    >
      {children}
    </button>
  );
}

// ─── Main export ──────────────────────────────────────────────────────────────

export default function RichTextToolbar({ editor, light = true, trailing }: RichTextToolbarProps) {
  const [ribbonTab, setRibbonTab] = useState<"home" | "insert" | "format" | "table">("home");
  const [showImageInput, setShowImageInput] = useState(false);
  const [imageUrl, setImageUrl] = useState("");
  const [pickerHover, setPickerHover] = useState({ rows: 0, cols: 0 });
  const [showMediaInput, setShowMediaInput] = useState(false);
  const [mediaUrl, setMediaUrl] = useState("");
  const [showLinkInput, setShowLinkInput] = useState(false);
  const [linkUrl, setLinkUrl] = useState("");
  const fileInputRef = useRef<HTMLInputElement>(null);
  const mediaFileInputRef = useRef<HTMLInputElement>(null);
  const tablePickerDD = useDropdown();
  const picturesDD = useDropdown();
  const shapesDD = useDropdown();
  const textColorDD = useDropdown();
  const highlightDD = useDropdown();
  const shapeFillDD = useDropdown();
  const shapeStrokeDD = useDropdown();
  const mediaDD = useDropdown();

  // Stores the ProseMirror position of the currently selected shape node.
  // Kept in a ref so size inputs (which steal focus) can still target the node.
  const selectedShapePos = useRef<number | null>(null);

  // Re-render on every editor transaction so ribbon state stays current.
  const [, rerender] = useState(0);
  useEffect(() => {
    const tick = () => {
      const { selection } = editor.state;
      const shapeSelected =
        selection instanceof NodeSelection && selection.node.type.name === "shape";

      // Walk the ancestor chain — isActive("tableCell") only checks the direct
      // parent and misses the cursor when it's inside a paragraph within a cell.
      const { $from } = selection;
      let inTable = false;
      for (let d = $from.depth; d > 0; d--) {
        const name = $from.node(d).type.name;
        if (name === "tableCell" || name === "tableHeader") { inTable = true; break; }
      }

      if (shapeSelected) {
        selectedShapePos.current = selection.from;
      } else {
        selectedShapePos.current = null;
      }

      setRibbonTab((prev) => {
        if (shapeSelected) return "format";
        if (prev === "format") return "home";
        if (inTable) return "table";
        if (prev === "table") return "home";
        return prev;
      });
      rerender((n) => n + 1);
    };
    editor.on("transaction", tick);
    return () => { editor.off("transaction", tick); };
  }, [editor]);

  /** Update the selected shape's attributes directly by ProseMirror position. */
  const updateShapeAttrs = useCallback((attrs: Partial<ShapeAttrs>) => {
    const pos = selectedShapePos.current;
    if (pos === null) return;
    const node = editor.state.doc.nodeAt(pos);
    if (!node || node.type.name !== "shape") return;
    const tr = editor.state.tr.setNodeMarkup(pos, undefined, { ...node.attrs, ...attrs });
    editor.view.dispatch(tr);
  }, [editor]);

  /** Read an attribute from the currently selected shape node. */
  const getShapeAttr = useCallback(<T,>(key: keyof ShapeAttrs, fallback: T): T => {
    const pos = selectedShapePos.current;
    if (pos === null) return fallback;
    const node = editor.state.doc.nodeAt(pos);
    if (!node) return fallback;
    return (node.attrs[key] as T) ?? fallback;
  }, [editor]);

  // Same ancestor-chain check for render-time tab visibility.
  const { $from: rf } = editor.state.selection;
  let isInTable = false;
  for (let d = rf.depth; d > 0; d--) {
    const name = rf.node(d).type.name;
    if (name === "tableCell" || name === "tableHeader") { isInTable = true; break; }
  }
  const isShapeSelected = selectedShapePos.current !== null;

  // ── Clipboard helpers ──────────────────────────────────────────────────────
  const handleCopy = () => document.execCommand("copy");
  const handleCut  = () => document.execCommand("cut");
  const handlePaste = () => {
    navigator.clipboard.readText()
      .then((text) => { if (text) editor.chain().focus().insertContent(text).run(); })
      .catch(() => editor.view.focus()); // fallback: just refocus so Ctrl+V works
  };

  // ── Image helpers ──────────────────────────────────────────────────────────
  const handleInsertImageUrl = () => {
    const url = imageUrl.trim();
    if (!url) return;
    editor.chain().focus().setImage({ src: url }).run();
    setImageUrl("");
    setShowImageInput(false);
  };

  const handleImageFile = (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (!file) return;
    const reader = new FileReader();
    reader.onload = (ev) => {
      const src = ev.target?.result as string;
      if (src) editor.chain().focus().setImage({ src }).run();
    };
    reader.readAsDataURL(file);
    e.target.value = "";
    setShowImageInput(false);
  };

  const handleInsertMedia = () => {
    const url = mediaUrl.trim();
    if (!url) return;
    const looksLikeVideo = /\.(mp4|webm|ogg|mov|m4v)(\?|$)/i.test(url);
    if (looksLikeVideo) {
      editor.chain().focus().setVideo({ src: url, controls: true }).run();
    } else {
      editor.chain().focus().insertContent(`<a href="${url}" target="_blank">${url}</a>`).run();
    }
    setMediaUrl("");
    setShowMediaInput(false);
  };

  const handleMediaFile = (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (!file) return;
    const url = URL.createObjectURL(file);
    if (file.type.startsWith("video/")) {
      editor.chain().focus().setVideo({ src: url, controls: true }).run();
    } else {
      editor.chain().focus().insertContent(`<a href="${url}" target="_blank">${file.name}</a>`).run();
    }
    e.target.value = "";
  };

  const handleSetLink = () => {
    const url = linkUrl.trim();
    if (!url) {
      editor.chain().focus().unsetLink().run();
    } else {
      const href = url.startsWith("http") ? url : `https://${url}`;
      editor.chain().focus().setLink({ href, target: "_blank" }).run();
    }
    setLinkUrl("");
    setShowLinkInput(false);
  };

  // ── Dark compact strip (BubbleMenu context) ────────────────────────────────
  if (!light) {
    return (
      <div className="flex items-center gap-1 rounded-lg bg-gray-900 px-1 py-1 shadow-lg">
        <BubbleBtn onClick={() => editor.chain().focus().setParagraph().run()} active={editor.isActive("paragraph") && !editor.isActive("heading")} label="Paragraph">
          <span className="font-semibold">¶</span>
        </BubbleBtn>
        <BubbleBtn onClick={() => editor.chain().focus().toggleHeading({ level: 1 }).run()} active={editor.isActive("heading", { level: 1 })} label="H1">
          <span className="font-bold">H1</span>
        </BubbleBtn>
        <BubbleBtn onClick={() => editor.chain().focus().toggleHeading({ level: 2 }).run()} active={editor.isActive("heading", { level: 2 })} label="H2">
          <span className="font-bold">H2</span>
        </BubbleBtn>
        <BubbleBtn onClick={() => editor.chain().focus().toggleHeading({ level: 3 }).run()} active={editor.isActive("heading", { level: 3 })} label="H3">
          <span className="font-bold">H3</span>
        </BubbleBtn>
        <span className="w-px h-5 bg-gray-700 mx-0.5" />
        <BubbleBtn onClick={() => editor.chain().focus().toggleBold().run()} active={editor.isActive("bold")} label="Bold">
          <BoldIcon className="w-4 h-4" />
        </BubbleBtn>
        <BubbleBtn onClick={() => editor.chain().focus().toggleItalic().run()} active={editor.isActive("italic")} label="Italic">
          <ItalicIcon className="w-4 h-4" />
        </BubbleBtn>
        <BubbleBtn onClick={() => editor.chain().focus().toggleStrike().run()} active={editor.isActive("strike")} label="Strikethrough">
          <span className="text-sm font-semibold line-through leading-none px-0.5">S</span>
        </BubbleBtn>
        <span className="w-px h-5 bg-gray-700 mx-0.5" />
        <BubbleBtn onClick={() => editor.chain().focus().toggleBulletList().run()} active={editor.isActive("bulletList")} label="Bullet list">
          <ListBulletIcon className="w-4 h-4" />
        </BubbleBtn>
        <BubbleBtn onClick={() => editor.chain().focus().toggleOrderedList().run()} active={editor.isActive("orderedList")} label="Numbered list">
          <NumberedListIcon className="w-4 h-4" />
        </BubbleBtn>
        {trailing}
      </div>
    );
  }

  // ── Tab bar ────────────────────────────────────────────────────────────────
  return (
    <div className="border-b-2 border-blue-600/20 dark:border-blue-500/20 shadow-[0_3px_8px_rgba(0,0,0,0.10)] dark:shadow-[0_3px_8px_rgba(0,0,0,0.30)] bg-gray-100 dark:bg-gray-900">
      {/* Thin blue accent line at very top */}
      <div className="h-0.5 bg-gradient-to-r from-blue-600 via-blue-500 to-blue-400" />

      {/* Tab row */}
      <div className="flex items-end bg-gray-100 dark:bg-gray-900 px-2 pt-1 gap-0.5">
        {(["home", "insert", ...(isShapeSelected ? ["format"] : []), ...(isInTable ? ["table"] : [])] as ("home" | "insert" | "format" | "table")[]).map((tab) => (
          <button
            key={tab}
            type="button"
            onMouseDown={(e) => e.preventDefault()}
            onClick={() => setRibbonTab(tab)}
            className={`px-4 py-1.5 text-xs font-semibold tracking-wide capitalize transition-all border border-b-0 ${
              ribbonTab === tab
                ? "rounded-t-md bg-gray-50 dark:bg-gray-800 text-blue-700 dark:text-blue-400 border-gray-300 dark:border-gray-600 -mb-px pb-[7px]"
                : "rounded-t-md border-transparent text-gray-500 dark:text-gray-400 hover:text-gray-700 dark:hover:text-gray-200 hover:bg-gray-200/60 dark:hover:bg-gray-700/40"
            } ${tab === "format" ? "text-purple-600 dark:text-purple-400" : ""}`}
          >
            {tab === "format" ? "Shape Format" : tab === "table" ? "Table Layout" : tab.charAt(0).toUpperCase() + tab.slice(1)}
          </button>
        ))}
      </div>

      {/* ── Ribbon content ── */}
      <div className="flex items-stretch bg-gray-50 dark:bg-gray-800 overflow-x-auto min-h-[96px] border-t border-gray-300 dark:border-gray-600">

        {ribbonTab === "home" && (
          <>
            {/* ═══ CLIPBOARD GROUP ═══ */}
            <RibbonGroup label="Clipboard">
              <div className="flex items-stretch gap-0.5 h-[72px]">
                {/* Paste — big tall button */}
                <BigBtn onClick={handlePaste} label="Paste (Ctrl+V)">
                  <ClipboardIcon className="w-6 h-6" />
                  <span className="text-[10px] leading-none font-medium">Paste</span>
                </BigBtn>
                {/* Cut / Copy / Format painter — stacked small */}
                <div className="flex flex-col justify-center gap-1 pl-0.5">
                  <RBtn onClick={handleCut} label="Cut (Ctrl+X)">
                    <ScissorsSvg />
                  </RBtn>
                  <RBtn onClick={handleCopy} label="Copy (Ctrl+C)">
                    <DocumentDuplicateIcon className="w-3.5 h-3.5" />
                  </RBtn>
                  <RBtn disabled label="Format Painter">
                    <PaintBrushIcon className="w-3.5 h-3.5" />
                  </RBtn>
                </div>
              </div>
            </RibbonGroup>

            <GroupSep />

            {/* ═══ FONT GROUP ═══ */}
            <RibbonGroup label="Font">
              <div className="flex flex-col gap-0.5 h-[44px] justify-center">
                {/* Row 1: block type | size picker */}
                <div className="flex items-center gap-0.5">
                  <BlockTypeSelect editor={editor} />
                  <InlineSep />
                  <FontSizeSelect editor={editor} />
                </div>

                {/* Row 2: B I U S x₂ x² | color highlight */}
                <div className="flex items-center gap-0.5">
                  <RBtn
                    onClick={() => editor.chain().focus().toggleBold().run()}
                    active={editor.isActive("bold")}
                    label="Bold (⌘B)"
                  >
                    <BoldIcon className="w-3.5 h-3.5" />
                  </RBtn>
                  <RBtn
                    onClick={() => editor.chain().focus().toggleItalic().run()}
                    active={editor.isActive("italic")}
                    label="Italic (⌘I)"
                  >
                    <ItalicIcon className="w-3.5 h-3.5" />
                  </RBtn>
                  <RBtn
                    onClick={() => editor.chain().focus().toggleUnderline().run()}
                    active={editor.isActive("underline")}
                    label="Underline (⌘U)"
                  >
                    <span className="text-[12px] font-semibold underline leading-none">U</span>
                  </RBtn>
                  <RBtn
                    onClick={() => editor.chain().focus().toggleStrike().run()}
                    active={editor.isActive("strike")}
                    label="Strikethrough"
                  >
                    <span className="text-[12px] font-semibold line-through leading-none">S</span>
                  </RBtn>
                  <RBtn
                    onClick={() => editor.chain().focus().toggleSubscript().run()}
                    active={editor.isActive("subscript")}
                    label="Subscript"
                  >
                    <span className="text-[11px] font-semibold leading-none">x<sub>2</sub></span>
                  </RBtn>
                  <RBtn
                    onClick={() => editor.chain().focus().toggleSuperscript().run()}
                    active={editor.isActive("superscript")}
                    label="Superscript"
                  >
                    <span className="text-[11px] font-semibold leading-none">x<sup>2</sup></span>
                  </RBtn>
                  <InlineSep />
                  {/* Text color */}
                  <button
                    type="button"
                    onMouseDown={(e) => e.preventDefault()}
                    onClick={(e) => { highlightDD.close(); textColorDD.toggle(e.currentTarget); }}
                    title="Text color"
                    className="flex flex-col items-center justify-center gap-[1px] min-w-[22px] h-[22px] px-1 rounded hover:bg-gray-200 dark:hover:bg-gray-700 transition-colors"
                  >
                    <span className="text-[11px] font-bold leading-none text-gray-700 dark:text-gray-300">A</span>
                    <span
                      className="w-3 h-[3px] rounded-sm"
                      style={{ backgroundColor: (editor.getAttributes("textStyle").color as string) || "#ef4444" }}
                    />
                  </button>
                  {textColorDD.isOpen && textColorDD.anchor && (
                    <DropdownPortal anchor={textColorDD.anchor} onClose={textColorDD.close} className="shadow-xl">
                      <div className="px-3 pt-2 pb-1 text-[10px] font-semibold text-gray-400 uppercase tracking-wider">Text Color</div>
                      <ColorPalette
                        colors={TEXT_COLORS}
                        selected={editor.getAttributes("textStyle").color as string}
                        onSelect={(c) => { editor.chain().focus().setColor(c).run(); textColorDD.close(); }}
                      />
                      <button
                        type="button"
                        onMouseDown={(e) => e.preventDefault()}
                        onClick={() => { editor.chain().focus().unsetColor().run(); textColorDD.close(); }}
                        className="w-full text-xs text-gray-500 hover:text-gray-700 dark:hover:text-gray-300 px-3 py-1.5 text-left border-t border-gray-100 dark:border-gray-700 transition-colors"
                      >
                        Remove color
                      </button>
                    </DropdownPortal>
                  )}
                  {/* Highlight color */}
                  <button
                    type="button"
                    onMouseDown={(e) => e.preventDefault()}
                    onClick={(e) => { textColorDD.close(); highlightDD.toggle(e.currentTarget); }}
                    title="Highlight color"
                    className="flex flex-col items-center justify-center gap-[1px] min-w-[22px] h-[22px] px-1 rounded hover:bg-gray-200 dark:hover:bg-gray-700 transition-colors"
                  >
                    <span className="text-[11px] font-bold leading-none text-gray-700 dark:text-gray-300">A</span>
                    <span
                      className="w-3 h-[3px] rounded-sm"
                      style={{ backgroundColor: (editor.getAttributes("highlight").color as string) || "#fde047" }}
                    />
                  </button>
                  {highlightDD.isOpen && highlightDD.anchor && (
                    <DropdownPortal anchor={highlightDD.anchor} onClose={highlightDD.close} className="shadow-xl">
                      <div className="px-3 pt-2 pb-1 text-[10px] font-semibold text-gray-400 uppercase tracking-wider">Highlight</div>
                      <ColorPalette
                        colors={HIGHLIGHT_COLORS}
                        selected={editor.getAttributes("highlight").color as string}
                        onSelect={(c) => { editor.chain().focus().toggleHighlight({ color: c }).run(); highlightDD.close(); }}
                      />
                      <button
                        type="button"
                        onMouseDown={(e) => e.preventDefault()}
                        onClick={() => { editor.chain().focus().unsetHighlight().run(); highlightDD.close(); }}
                        className="w-full text-xs text-gray-500 hover:text-gray-700 dark:hover:text-gray-300 px-3 py-1.5 text-left border-t border-gray-100 dark:border-gray-700 transition-colors"
                      >
                        Remove highlight
                      </button>
                    </DropdownPortal>
                  )}
                </div>
              </div>
            </RibbonGroup>

            <GroupSep />

            {/* ═══ PARAGRAPH GROUP ═══ */}
            <RibbonGroup label="Paragraph">
              <div className="flex flex-col gap-0.5 h-[44px] justify-center">
                {/* Row 1: lists */}
                <div className="flex items-center gap-0.5">
                  <RBtn
                    onClick={() => editor.chain().focus().toggleBulletList().run()}
                    active={editor.isActive("bulletList")}
                    label="Bullet list"
                  >
                    <ListBulletIcon className="w-3.5 h-3.5" />
                  </RBtn>
                  <RBtn
                    onClick={() => editor.chain().focus().toggleOrderedList().run()}
                    active={editor.isActive("orderedList")}
                    label="Numbered list"
                  >
                    <NumberedListIcon className="w-3.5 h-3.5" />
                  </RBtn>
                </div>

                {/* Row 2: alignment | spacing */}
                <div className="flex items-center gap-0.5">
                  <RBtn
                    onClick={() => editor.chain().focus().setTextAlign("left").run()}
                    active={editor.isActive({ textAlign: "left" })}
                    label="Align left (⌘⇧L)"
                  >
                    <AlignLeftSvg />
                  </RBtn>
                  <RBtn
                    onClick={() => editor.chain().focus().setTextAlign("center").run()}
                    active={editor.isActive({ textAlign: "center" })}
                    label="Center (⌘⇧E)"
                  >
                    <AlignCenterSvg />
                  </RBtn>
                  <RBtn
                    onClick={() => editor.chain().focus().setTextAlign("right").run()}
                    active={editor.isActive({ textAlign: "right" })}
                    label="Align right (⌘⇧R)"
                  >
                    <AlignRightSvg />
                  </RBtn>
                  <RBtn
                    onClick={() => editor.chain().focus().setTextAlign("justify").run()}
                    active={editor.isActive({ textAlign: "justify" })}
                    label="Justify (⌘⇧J)"
                  >
                    <AlignJustifySvg />
                  </RBtn>
                  <InlineSep />
                  <RBtn
                    onClick={() => {
                      if (editor.isActive("link")) {
                        editor.chain().focus().unsetLink().run();
                      } else {
                        const existing = editor.getAttributes("link").href as string || "";
                        setLinkUrl(existing);
                        setShowLinkInput((p) => !p);
                      }
                    }}
                    active={editor.isActive("link")}
                    label="Link"
                  >
                    <LinkIcon className="w-3.5 h-3.5" />
                  </RBtn>
                </div>
              </div>
            </RibbonGroup>

            {trailing}
          </>
        )}

        {ribbonTab === "insert" && (
          <>
            {/* ═══ TABLES ═══ */}
            <RibbonGroup label="Tables">
              <div className="flex items-stretch h-[44px]">
                <BigBtn
                  onClick={(e) => tablePickerDD.toggle((e.currentTarget as HTMLButtonElement))}
                  label="Insert Table"
                >
                  <TableCellsIcon className="w-5 h-5" />
                  <div className="flex items-center gap-0.5">
                    <span className="text-[9px] leading-none font-medium">Table</span>
                    <ChevronDownIcon className="w-2 h-2" />
                  </div>
                </BigBtn>
                {tablePickerDD.isOpen && tablePickerDD.anchor && (
                  <DropdownPortal anchor={tablePickerDD.anchor} onClose={tablePickerDD.close} className="p-2">
                    <div
                      className="grid gap-0.5"
                      style={{ gridTemplateColumns: "repeat(8, 16px)" }}
                      onMouseLeave={() => setPickerHover({ rows: 0, cols: 0 })}
                    >
                      {Array.from({ length: 64 }, (_, i) => {
                        const row = Math.floor(i / 8) + 1;
                        const col = (i % 8) + 1;
                        const highlighted = row <= pickerHover.rows && col <= pickerHover.cols;
                        return (
                          <button
                            key={i}
                            type="button"
                            onMouseDown={(e) => e.preventDefault()}
                            onMouseEnter={() => setPickerHover({ rows: row, cols: col })}
                            onClick={() => {
                              editor.chain().focus().insertTable({ rows: row, cols: col, withHeaderRow: true }).run();
                              tablePickerDD.close();
                              setPickerHover({ rows: 0, cols: 0 });
                            }}
                            className={`w-4 h-4 border rounded-sm transition-colors ${
                              highlighted
                                ? "bg-blue-200 border-blue-400 dark:bg-blue-700 dark:border-blue-500"
                                : "bg-gray-50 border-gray-200 dark:bg-gray-700 dark:border-gray-600"
                            }`}
                          />
                        );
                      })}
                    </div>
                    <p className="text-center text-[10px] text-gray-500 dark:text-gray-400 mt-1.5 font-medium h-3.5">
                      {pickerHover.rows > 0 ? `${pickerHover.cols} × ${pickerHover.rows} Table` : ""}
                    </p>
                  </DropdownPortal>
                )}
              </div>
            </RibbonGroup>

            <GroupSep />

            {/* ═══ ILLUSTRATIONS ═══ */}
            <RibbonGroup label="Illustrations">
              <div className="flex items-stretch gap-0.5 h-[44px]">
                {/* Pictures */}
                <BigBtn
                  onClick={(e) => { shapesDD.close(); picturesDD.toggle(e.currentTarget as HTMLButtonElement); }}
                  label="Pictures"
                >
                  <PhotoIcon className="w-5 h-5" />
                  <div className="flex items-center gap-0.5">
                    <span className="text-[9px] leading-none font-medium">Pictures</span>
                    <ChevronDownIcon className="w-2 h-2" />
                  </div>
                </BigBtn>
                {picturesDD.isOpen && picturesDD.anchor && (
                  <DropdownPortal anchor={picturesDD.anchor} onClose={picturesDD.close} className="py-1 min-w-[160px]">
                    <button
                      type="button"
                      onMouseDown={(e) => e.preventDefault()}
                      onClick={() => { fileInputRef.current?.click(); picturesDD.close(); }}
                      className="w-full flex items-center gap-2.5 px-3 py-1.5 text-xs hover:bg-blue-50 dark:hover:bg-blue-900/20 text-gray-700 dark:text-gray-300 transition-colors"
                    >
                      <ArrowUpTrayIcon className="w-3.5 h-3.5" />
                      This Device
                    </button>
                    <button
                      type="button"
                      onMouseDown={(e) => e.preventDefault()}
                      onClick={() => { setShowImageInput(true); setImageUrl(""); picturesDD.close(); }}
                      className="w-full flex items-center gap-2.5 px-3 py-1.5 text-xs hover:bg-blue-50 dark:hover:bg-blue-900/20 text-gray-700 dark:text-gray-300 transition-colors"
                    >
                      <LinkIcon className="w-3.5 h-3.5" />
                      Image URL
                    </button>
                  </DropdownPortal>
                )}

                {/* Shapes — disabled until further work */}
                <BigBtn label="Shapes (coming soon)" disabled>
                  <RectangleGroupIcon className="w-5 h-5 opacity-40" />
                  <div className="flex items-center gap-0.5 opacity-40">
                    <span className="text-[9px] leading-none font-medium">Shapes</span>
                  </div>
                </BigBtn>

              </div>
            </RibbonGroup>

            <GroupSep />

            {/* ═══ MEDIA ═══ */}
            <RibbonGroup label="Media">
              <div className="flex items-stretch h-[44px]">
                <BigBtn
                  onClick={(e) => { mediaDD.toggle(e.currentTarget as HTMLButtonElement); }}
                  label="Insert Media"
                >
                  <FilmIcon className="w-5 h-5" />
                  <div className="flex items-center gap-0.5">
                    <span className="text-[9px] leading-none font-medium">Media</span>
                    <ChevronDownIcon className="w-2 h-2" />
                  </div>
                </BigBtn>
                {mediaDD.isOpen && mediaDD.anchor && (
                  <DropdownPortal anchor={mediaDD.anchor} onClose={mediaDD.close} className="py-1 min-w-[160px]">
                    <button
                      type="button"
                      onMouseDown={(e) => e.preventDefault()}
                      onClick={() => { mediaFileInputRef.current?.click(); mediaDD.close(); }}
                      className="w-full flex items-center gap-2.5 px-3 py-1.5 text-xs hover:bg-blue-50 dark:hover:bg-blue-900/20 text-gray-700 dark:text-gray-300 transition-colors"
                    >
                      <ArrowUpTrayIcon className="w-3.5 h-3.5" />
                      This Device
                    </button>
                    <button
                      type="button"
                      onMouseDown={(e) => e.preventDefault()}
                      onClick={() => { setShowMediaInput(true); setMediaUrl(""); mediaDD.close(); }}
                      className="w-full flex items-center gap-2.5 px-3 py-1.5 text-xs hover:bg-blue-50 dark:hover:bg-blue-900/20 text-gray-700 dark:text-gray-300 transition-colors"
                    >
                      <LinkIcon className="w-3.5 h-3.5" />
                      Media URL
                    </button>
                  </DropdownPortal>
                )}
              </div>
            </RibbonGroup>

            {trailing}
          </>
        )}

        {/* ═══ SHAPE FORMAT TAB ═══ */}
        {ribbonTab === "format" && isShapeSelected && (
          <>
            {/* ── Fill ── */}
            <RibbonGroup label="Fill">
              <div className="flex flex-col gap-0.5 h-[44px] justify-center">
                <div className="flex items-center gap-0.5">
                  {/* Fill color picker trigger */}
                  <button
                    type="button"
                    onMouseDown={(e) => e.preventDefault()}
                    onClick={(e) => { shapeStrokeDD.close(); shapeFillDD.toggle(e.currentTarget); }}
                    title="Fill color"
                    className="flex flex-col items-center justify-center gap-[2px] h-[22px] px-1.5 rounded hover:bg-gray-200 dark:hover:bg-gray-700 transition-colors"
                  >
                    <span className="text-[9px] font-semibold text-gray-500 dark:text-gray-400 leading-none">Fill</span>
                    <span
                      className="w-5 h-[4px] rounded-sm border border-gray-300 dark:border-gray-600"
                      style={{ backgroundColor: getShapeAttr("fill", SHAPE_DEFAULTS.fill) }}
                    />
                  </button>
                  {shapeFillDD.isOpen && shapeFillDD.anchor && (
                    <DropdownPortal anchor={shapeFillDD.anchor} onClose={shapeFillDD.close} className="shadow-xl">
                      <div className="px-3 pt-2 pb-1 text-[10px] font-semibold text-gray-400 uppercase tracking-wider">Fill Color</div>
                      <ColorPalette
                        colors={TEXT_COLORS}
                        selected={getShapeAttr("fill", SHAPE_DEFAULTS.fill)}
                        onSelect={(c) => { updateShapeAttrs({ fill: c }); shapeFillDD.close(); }}
                      />
                      <button
                        type="button"
                        onMouseDown={(e) => e.preventDefault()}
                        onClick={() => { updateShapeAttrs({ fill: "transparent" }); shapeFillDD.close(); }}
                        className="w-full text-xs text-gray-500 hover:text-gray-700 dark:hover:text-gray-300 px-3 py-1.5 text-left border-t border-gray-100 dark:border-gray-700 transition-colors"
                      >
                        No Fill
                      </button>
                    </DropdownPortal>
                  )}
                  <RBtn
                    onClick={() => updateShapeAttrs({ fill: "transparent" })}
                    active={getShapeAttr<string>("fill", SHAPE_DEFAULTS.fill) === "transparent"}
                    label="No fill"
                  >
                    <span className="text-[10px] leading-none">∅</span>
                  </RBtn>
                </div>
              </div>
            </RibbonGroup>

            <GroupSep />

            {/* ── Border ── */}
            <RibbonGroup label="Border">
              <div className="flex flex-col gap-0.5 h-[44px] justify-center">
                <div className="flex items-center gap-0.5">
                  {/* Stroke color picker trigger */}
                  <button
                    type="button"
                    onMouseDown={(e) => e.preventDefault()}
                    onClick={(e) => { shapeFillDD.close(); shapeStrokeDD.toggle(e.currentTarget); }}
                    title="Border color"
                    className="flex flex-col items-center justify-center gap-[2px] h-[22px] px-1.5 rounded hover:bg-gray-200 dark:hover:bg-gray-700 transition-colors"
                  >
                    <span className="text-[9px] font-semibold text-gray-500 dark:text-gray-400 leading-none">Color</span>
                    <span
                      className="w-5 h-[4px] rounded-sm border border-gray-300 dark:border-gray-600"
                      style={{ backgroundColor: getShapeAttr("stroke", SHAPE_DEFAULTS.stroke) }}
                    />
                  </button>
                  {shapeStrokeDD.isOpen && shapeStrokeDD.anchor && (
                    <DropdownPortal anchor={shapeStrokeDD.anchor} onClose={shapeStrokeDD.close} className="shadow-xl">
                      <div className="px-3 pt-2 pb-1 text-[10px] font-semibold text-gray-400 uppercase tracking-wider">Border Color</div>
                      <ColorPalette
                        colors={TEXT_COLORS}
                        selected={getShapeAttr("stroke", SHAPE_DEFAULTS.stroke)}
                        onSelect={(c) => { updateShapeAttrs({ stroke: c, noStroke: false }); shapeStrokeDD.close(); }}
                      />
                    </DropdownPortal>
                  )}
                  <InlineSep />
                  <RBtn
                    onClick={() => updateShapeAttrs({ noStroke: !getShapeAttr("noStroke", false) })}
                    active={getShapeAttr("noStroke", false)}
                    label="No border"
                  >
                    <span className="text-[10px] leading-none">∅</span>
                  </RBtn>
                </div>
                {/* Border width row */}
                <div className="flex items-center gap-0.5">
                  <span className="text-[9px] text-gray-400 dark:text-gray-500 mr-0.5 leading-none">Width</span>
                  {([1, 2, 3, 4] as const).map((w) => (
                    <RBtn
                      key={w}
                      onClick={() => updateShapeAttrs({ strokeWidth: w, noStroke: false })}
                      active={!getShapeAttr("noStroke", false) && getShapeAttr("strokeWidth", 2) === w}
                      label={`${w}px border`}
                    >
                      <span className="flex items-center justify-center w-5 h-3.5">
                        <span className="w-full rounded-full bg-current" style={{ height: `${w}px` }} />
                      </span>
                    </RBtn>
                  ))}
                </div>
              </div>
            </RibbonGroup>

            <GroupSep />

            {/* ── Size ── */}
            <RibbonGroup label="Size">
              <div className="flex flex-col gap-1 h-[44px] justify-center">
                {(["width", "height"] as const).map((key) => (
                  <SizeInput
                    key={key}
                    label={key === "width" ? "W" : "H"}
                    value={getShapeAttr(key, key === "width" ? SHAPE_DEFAULTS.width : SHAPE_DEFAULTS.height)}
                    min={key === "width" ? 40 : 30}
                    onChange={(v) => updateShapeAttrs({ [key]: v })}
                  />
                ))}
              </div>
            </RibbonGroup>

            {trailing}
          </>
        )}

        {/* ═══ TABLE LAYOUT TAB ═══ */}
        {ribbonTab === "table" && isInTable && (
          <>
            {/* ── Rows ── */}
            <RibbonGroup label="Rows">
              <div className="flex flex-col gap-0.5 h-[44px] justify-center">
                <div className="flex items-center gap-0.5">
                  <RBtn onClick={() => { editor.view.focus(); editor.chain().addRowBefore().run(); }} label="Insert row above">
                    <span className="text-[10px] leading-none">↑</span>
                    <span className="text-[9px] leading-none">Row</span>
                  </RBtn>
                  <RBtn onClick={() => { editor.view.focus(); editor.chain().addRowAfter().run(); }} label="Insert row below">
                    <span className="text-[10px] leading-none">↓</span>
                    <span className="text-[9px] leading-none">Row</span>
                  </RBtn>
                  <RBtn onClick={() => { editor.view.focus(); editor.chain().deleteRow().run(); }} label="Delete row" danger>
                    <span className="text-[10px] leading-none">✕</span>
                    <span className="text-[9px] leading-none">Row</span>
                  </RBtn>
                </div>
              </div>
            </RibbonGroup>

            <GroupSep />

            {/* ── Columns ── */}
            <RibbonGroup label="Columns">
              <div className="flex flex-col gap-0.5 h-[44px] justify-center">
                <div className="flex items-center gap-0.5">
                  <RBtn onClick={() => { editor.view.focus(); editor.chain().addColumnBefore().run(); }} label="Insert column left">
                    <span className="text-[10px] leading-none">←</span>
                    <span className="text-[9px] leading-none">Col</span>
                  </RBtn>
                  <RBtn onClick={() => { editor.view.focus(); editor.chain().addColumnAfter().run(); }} label="Insert column right">
                    <span className="text-[10px] leading-none">→</span>
                    <span className="text-[9px] leading-none">Col</span>
                  </RBtn>
                  <RBtn onClick={() => { editor.view.focus(); editor.chain().deleteColumn().run(); }} label="Delete column" danger>
                    <span className="text-[10px] leading-none">✕</span>
                    <span className="text-[9px] leading-none">Col</span>
                  </RBtn>
                </div>
              </div>
            </RibbonGroup>

            <GroupSep />

            {/* ── Merge ── */}
            <RibbonGroup label="Cells">
              <div className="flex flex-col gap-0.5 h-[44px] justify-center">
                <div className="flex items-center gap-0.5">
                  <RBtn onClick={() => { editor.view.focus(); editor.chain().mergeCells().run(); }} label="Merge selected cells">
                    <span className="text-[9px] leading-none font-semibold">Merge</span>
                  </RBtn>
                  <RBtn onClick={() => { editor.view.focus(); editor.chain().splitCell().run(); }} label="Split cell">
                    <span className="text-[9px] leading-none font-semibold">Split</span>
                  </RBtn>
                </div>
              </div>
            </RibbonGroup>

            <GroupSep />

            {/* ── Header ── */}
            <RibbonGroup label="Header">
              <div className="flex flex-col gap-0.5 h-[44px] justify-center">
                <div className="flex items-center gap-0.5">
                  <RBtn
                    onClick={() => { editor.view.focus(); editor.chain().toggleHeaderRow().run(); }}
                    active={editor.isActive("tableHeader")}
                    label="Toggle header row"
                  >
                    <span className="text-[9px] leading-none font-semibold">Header Row</span>
                  </RBtn>
                  <RBtn
                    onClick={() => { editor.view.focus(); editor.chain().toggleHeaderColumn().run(); }}
                    label="Toggle header column"
                  >
                    <span className="text-[9px] leading-none font-semibold">Header Col</span>
                  </RBtn>
                </div>
              </div>
            </RibbonGroup>

            <GroupSep />

            {/* ── Delete table ── */}
            <RibbonGroup label="Table">
              <div className="flex flex-col gap-0.5 h-[44px] justify-center">
                <RBtn onClick={() => { editor.view.focus(); editor.chain().deleteTable().run(); }} label="Delete table" danger>
                  <TableCellsIcon className="w-3 h-3" />
                  <span className="text-[9px] leading-none">Delete</span>
                </RBtn>
              </div>
            </RibbonGroup>

            {trailing}
          </>
        )}
      </div>

      {/* ── Image URL panel (below ribbon) ── */}
      {showImageInput && (
        <div className="flex items-center gap-2 px-3 py-2 border-t border-gray-200 dark:border-gray-700 bg-gray-50 dark:bg-gray-800/60">
          <PhotoIcon className="w-4 h-4 text-gray-400 flex-shrink-0" />
          <input
            type="url"
            value={imageUrl}
            onChange={(e) => setImageUrl(e.target.value)}
            onKeyDown={(e) => {
              if (e.key === "Enter") { e.preventDefault(); handleInsertImageUrl(); }
              if (e.key === "Escape") { e.preventDefault(); setShowImageInput(false); setImageUrl(""); }
            }}
            placeholder="Paste image URL and press Enter…"
            className="flex-1 px-2 py-1 text-xs border border-gray-200 dark:border-gray-600 rounded-md bg-white dark:bg-gray-700 text-gray-800 dark:text-gray-200 placeholder-gray-400 focus:outline-none focus:ring-2 focus:ring-blue-500"
            autoFocus
          />
          <button
            type="button"
            onMouseDown={(e) => e.preventDefault()}
            onClick={handleInsertImageUrl}
            disabled={!imageUrl.trim()}
            className="px-3 py-1 text-xs font-semibold bg-blue-600 text-white rounded-md hover:bg-blue-700 disabled:opacity-40 disabled:cursor-not-allowed transition-colors"
          >
            Insert
          </button>
          <button
            type="button"
            onMouseDown={(e) => e.preventDefault()}
            onClick={() => { setShowImageInput(false); setImageUrl(""); }}
            className="text-gray-400 hover:text-gray-600 dark:hover:text-gray-300 transition-colors"
          >
            <XMarkIcon className="w-4 h-4" />
          </button>
        </div>
      )}

      {/* ── Media URL panel (below ribbon) ── */}
      {showMediaInput && (
        <div className="flex items-center gap-2 px-3 py-2 border-t border-gray-200 dark:border-gray-700 bg-gray-50 dark:bg-gray-800/60">
          <FilmIcon className="w-4 h-4 text-gray-400 flex-shrink-0" />
          <input
            type="url"
            value={mediaUrl}
            onChange={(e) => setMediaUrl(e.target.value)}
            onKeyDown={(e) => {
              if (e.key === "Enter") { e.preventDefault(); handleInsertMedia(); }
              if (e.key === "Escape") { e.preventDefault(); setShowMediaInput(false); setMediaUrl(""); }
            }}
            placeholder="Paste video or media URL and press Enter…"
            className="flex-1 px-2 py-1 text-xs border border-gray-200 dark:border-gray-600 rounded-md bg-white dark:bg-gray-700 text-gray-800 dark:text-gray-200 placeholder-gray-400 focus:outline-none focus:ring-2 focus:ring-blue-500"
            autoFocus
          />
          <button
            type="button"
            onMouseDown={(e) => e.preventDefault()}
            onClick={handleInsertMedia}
            disabled={!mediaUrl.trim()}
            className="px-3 py-1 text-xs font-semibold bg-blue-600 text-white rounded-md hover:bg-blue-700 disabled:opacity-40 disabled:cursor-not-allowed transition-colors"
          >
            Insert
          </button>
          <button
            type="button"
            onMouseDown={(e) => e.preventDefault()}
            onClick={() => { setShowMediaInput(false); setMediaUrl(""); }}
            className="text-gray-400 hover:text-gray-600 dark:hover:text-gray-300 transition-colors"
          >
            <XMarkIcon className="w-4 h-4" />
          </button>
        </div>
      )}

      {/* ── Link URL panel (below ribbon) ── */}
      {showLinkInput && (
        <div className="flex items-center gap-2 px-3 py-2 border-t border-gray-200 dark:border-gray-700 bg-gray-50 dark:bg-gray-800/60">
          <LinkIcon className="w-4 h-4 text-gray-400 flex-shrink-0" />
          <input
            type="url"
            value={linkUrl}
            onChange={(e) => setLinkUrl(e.target.value)}
            onKeyDown={(e) => {
              if (e.key === "Enter") { e.preventDefault(); handleSetLink(); }
              if (e.key === "Escape") { e.preventDefault(); setShowLinkInput(false); setLinkUrl(""); }
            }}
            placeholder="Paste URL and press Enter…"
            className="flex-1 px-2 py-1 text-xs border border-gray-200 dark:border-gray-600 rounded-md bg-white dark:bg-gray-700 text-gray-800 dark:text-gray-200 placeholder-gray-400 focus:outline-none focus:ring-2 focus:ring-blue-500"
            autoFocus
          />
          <button
            type="button"
            onMouseDown={(e) => e.preventDefault()}
            onClick={handleSetLink}
            className="px-3 py-1 text-xs font-semibold bg-blue-600 text-white rounded-md hover:bg-blue-700 transition-colors"
          >
            {linkUrl.trim() ? "Apply" : "Remove"}
          </button>
          <button
            type="button"
            onMouseDown={(e) => e.preventDefault()}
            onClick={() => { setShowLinkInput(false); setLinkUrl(""); }}
            className="text-gray-400 hover:text-gray-600 dark:hover:text-gray-300 transition-colors"
          >
            <XMarkIcon className="w-4 h-4" />
          </button>
        </div>
      )}

      <input ref={fileInputRef} type="file" accept="image/*" className="hidden" onChange={handleImageFile} />
      <input ref={mediaFileInputRef} type="file" accept="video/*,audio/*" className="hidden" onChange={handleMediaFile} />
    </div>
  );
}
