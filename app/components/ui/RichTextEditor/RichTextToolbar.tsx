"use client";

import { useState, useRef, useEffect, useCallback } from "react";
import { createPortal } from "react-dom";
import type { Editor } from "@tiptap/react";
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
  DocumentIcon,
  RectangleGroupIcon,
  Square3Stack3DIcon,
  ChartBarIcon,
  CameraIcon,
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

function IndentSvg() {
  return (
    <svg className="w-3.5 h-3.5" viewBox="0 0 16 16" fill="currentColor">
      <rect x="1" y="2" width="14" height="1.2" rx="0.6" />
      <rect x="5" y="5.4" width="10" height="1.2" rx="0.6" />
      <rect x="5" y="8.8" width="10" height="1.2" rx="0.6" />
      <rect x="1" y="12.2" width="14" height="1.2" rx="0.6" />
      <path d="M1.5 6.8 L4 8.2 L1.5 9.6 Z" />
    </svg>
  );
}

function OutdentSvg() {
  return (
    <svg className="w-3.5 h-3.5" viewBox="0 0 16 16" fill="currentColor">
      <rect x="1" y="2" width="14" height="1.2" rx="0.6" />
      <rect x="5" y="5.4" width="10" height="1.2" rx="0.6" />
      <rect x="5" y="8.8" width="10" height="1.2" rx="0.6" />
      <rect x="1" y="12.2" width="14" height="1.2" rx="0.6" />
      <path d="M4 6.8 L1.5 8.2 L4 9.6 Z" />
    </svg>
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

  const options = [
    { label: "Normal",     fn: () => editor.chain().focus().setParagraph().run() },
    { label: "Heading 1",  fn: () => editor.chain().focus().toggleHeading({ level: 1 }).run() },
    { label: "Heading 2",  fn: () => editor.chain().focus().toggleHeading({ level: 2 }).run() },
    { label: "Heading 3",  fn: () => editor.chain().focus().toggleHeading({ level: 3 }).run() },
    { label: "Blockquote", fn: () => editor.chain().focus().toggleBlockquote().run() },
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
        <DropdownPortal anchor={dd.anchor} onClose={dd.close} className="py-1 min-w-[140px]">
          {options.map((opt) => (
            <button
              key={opt.label}
              type="button"
              onMouseDown={(e) => e.preventDefault()}
              onClick={() => { opt.fn(); dd.close(); }}
              className="w-full text-left px-3 py-1.5 text-sm hover:bg-blue-50 dark:hover:bg-blue-900/20 text-gray-900 dark:text-white transition-colors"
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
function BigBtn({ onClick, label, children }: { onClick?: (e: React.MouseEvent<HTMLButtonElement>) => void; label: string; children: React.ReactNode }) {
  return (
    <button
      type="button"
      onMouseDown={(e) => e.preventDefault()}
      onClick={onClick}
      title={label}
      aria-label={label}
      className="flex flex-col items-center justify-center gap-0.5 w-10 h-full rounded px-1 hover:bg-gray-200 dark:hover:bg-gray-700 text-gray-700 dark:text-gray-200 transition-colors flex-shrink-0"
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

/** Wrapper for a ribbon group — holds 2 content rows + label. */
function RibbonGroup({ label, children }: { label: string; children: React.ReactNode }) {
  return (
    <div className="flex flex-col px-1.5 pt-1.5 pb-0 min-w-0 flex-shrink-0">
      <div className="flex items-start flex-1">{children}</div>
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
  const [ribbonTab, setRibbonTab] = useState<"home" | "insert">("home");
  const [showImageInput, setShowImageInput] = useState(false);
  const [imageUrl, setImageUrl] = useState("");
  const [pickerHover, setPickerHover] = useState({ rows: 0, cols: 0 });
  const [showMediaInput, setShowMediaInput] = useState(false);
  const [mediaUrl, setMediaUrl] = useState("");
  const fileInputRef = useRef<HTMLInputElement>(null);
  const tablePickerDD = useDropdown();
  const picturesDD = useDropdown();
  const shapesDD = useDropdown();

  // Re-render on every editor transaction so isActive() calls stay current.
  const [, rerender] = useState(0);
  useEffect(() => {
    const tick = () => {
      const inTable = editor.isActive("tableCell") || editor.isActive("tableHeader");
      if (inTable) setRibbonTab((prev) => prev === "insert" ? "home" : prev);
      rerender((n) => n + 1);
    };
    editor.on("transaction", tick);
    return () => { editor.off("transaction", tick); };
  }, [editor]);

  const isInTable = editor.isActive("tableCell") || editor.isActive("tableHeader");
  const isInList  = editor.isActive("bulletList") || editor.isActive("orderedList") || editor.isActive("listItem");

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

  const handleInsertSmartArt = () => {
    editor.chain().focus().insertContent({
      type: "bulletList",
      content: [
        { type: "listItem", content: [{ type: "paragraph", content: [{ type: "text", text: "Item 1" }] }] },
        { type: "listItem", content: [{ type: "paragraph", content: [{ type: "text", text: "Item 2" }] }] },
        { type: "listItem", content: [{ type: "paragraph", content: [{ type: "text", text: "Item 3" }] }] },
      ],
    }).run();
  };

  const handleInsertChart = () => {
    editor.chain().focus().insertTable({ rows: 4, cols: 3, withHeaderRow: true }).run();
    setRibbonTab("home");
  };

  const handleInsertScreenshot = async () => {
    try {
      const items = await navigator.clipboard.read();
      for (const item of items) {
        const imageType = item.types.find((t) => t.startsWith("image/"));
        if (imageType) {
          const blob = await item.getType(imageType);
          const reader = new FileReader();
          reader.onload = (e) => {
            const src = e.target?.result as string;
            if (src) editor.chain().focus().setImage({ src }).run();
          };
          reader.readAsDataURL(blob);
          return;
        }
      }
    } catch {
      // no image in clipboard or permission denied
    }
  };

  const handleInsertMedia = () => {
    const url = mediaUrl.trim();
    if (!url) return;
    editor.chain().focus().insertContent(`<a href="${url}" target="_blank">${url}</a>`).run();
    setMediaUrl("");
    setShowMediaInput(false);
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
        {(["home", "insert"] as const).map((tab) => (
          <button
            key={tab}
            type="button"
            onMouseDown={(e) => e.preventDefault()}
            onClick={() => setRibbonTab(tab)}
            className={`px-4 py-1.5 text-xs font-semibold tracking-wide capitalize transition-all border border-b-0 ${
              ribbonTab === tab
                ? "rounded-t-md bg-gray-50 dark:bg-gray-800 text-blue-700 dark:text-blue-400 border-gray-300 dark:border-gray-600 -mb-px pb-[7px]"
                : "rounded-t-md border-transparent text-gray-500 dark:text-gray-400 hover:text-gray-700 dark:hover:text-gray-200 hover:bg-gray-200/60 dark:hover:bg-gray-700/40"
            }`}
          >
            {tab.charAt(0).toUpperCase() + tab.slice(1)}
          </button>
        ))}
      </div>

      {/* ── Ribbon content ── */}
      <div className="flex items-stretch bg-gray-50 dark:bg-gray-800 overflow-x-auto min-h-[66px] border-t border-gray-300 dark:border-gray-600">

        {ribbonTab === "home" && (
          <>
            {/* ═══ CLIPBOARD GROUP ═══ */}
            <RibbonGroup label="Clipboard">
              <div className="flex items-stretch gap-0.5 h-[44px]">
                {/* Paste — big tall button */}
                <BigBtn onClick={handlePaste} label="Paste (Ctrl+V)">
                  <ClipboardIcon className="w-5 h-5" />
                  <span className="text-[9px] leading-none font-medium">Paste</span>
                </BigBtn>
                {/* Cut / Copy / Format painter — stacked small */}
                <div className="flex flex-col justify-center gap-0.5 pl-0.5">
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
                {/* Row 1: block type | size | A+A- | Aa | clear */}
                <div className="flex items-center gap-0.5">
                  <BlockTypeSelect editor={editor} />
                  <InlineSep />
                  <RBtn disabled label="Font size" >
                    <span className="text-[10px] w-5 text-center">12</span>
                  </RBtn>
                  <RBtn disabled label="Increase font size">
                    <span className="text-[11px] font-bold leading-none">A<sup className="text-[6px]">▲</sup></span>
                  </RBtn>
                  <RBtn disabled label="Decrease font size">
                    <span className="text-[11px] font-bold leading-none">A<sup className="text-[6px]">▼</sup></span>
                  </RBtn>
                  <InlineSep />
                  <RBtn disabled label="Change case">
                    <span className="text-[10px] font-semibold">Aa</span>
                  </RBtn>
                  <RBtn
                    onClick={() => editor.chain().focus().clearNodes().unsetAllMarks().run()}
                    label="Clear formatting"
                  >
                    <span className="text-[11px] font-bold text-gray-500">A</span>
                    <span className="text-[7px] text-red-400">✕</span>
                  </RBtn>
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
                  <RBtn disabled label="Underline (not supported by document format)">
                    <span className="text-[12px] font-semibold underline leading-none">U</span>
                  </RBtn>
                  <RBtn
                    onClick={() => editor.chain().focus().toggleStrike().run()}
                    active={editor.isActive("strike")}
                    label="Strikethrough"
                  >
                    <span className="text-[12px] font-semibold line-through leading-none">S</span>
                  </RBtn>
                  <RBtn disabled label="Subscript (not supported)">
                    <span className="text-[11px] font-semibold leading-none">x<sub>2</sub></span>
                  </RBtn>
                  <RBtn disabled label="Superscript (not supported)">
                    <span className="text-[11px] font-semibold leading-none">x<sup>2</sup></span>
                  </RBtn>
                  <InlineSep />
                  <RBtn disabled label="Text color (not supported)">
                    <span className="flex flex-col items-center leading-none">
                      <span className="text-[11px] font-bold">A</span>
                      <span className="w-3 h-[3px] bg-red-500 rounded-sm" />
                    </span>
                  </RBtn>
                  <RBtn disabled label="Highlight color (not supported)">
                    <span className="flex flex-col items-center leading-none">
                      <span className="text-[11px] font-bold">A</span>
                      <span className="w-3 h-[3px] bg-yellow-400 rounded-sm" />
                    </span>
                  </RBtn>
                </div>
              </div>
            </RibbonGroup>

            <GroupSep />

            {/* ═══ PARAGRAPH GROUP ═══ */}
            <RibbonGroup label="Paragraph">
              <div className="flex flex-col gap-0.5 h-[44px] justify-center">
                {/* Row 1: lists | indent/outdent | ¶ */}
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
                  <RBtn disabled label="Multilevel list">
                    <span className="text-[11px] leading-none">≡≡</span>
                  </RBtn>
                  <InlineSep />
                  <RBtn
                    onClick={() => editor.chain().focus().liftListItem("listItem").run()}
                    disabled={!isInList}
                    label="Decrease indent"
                  >
                    <OutdentSvg />
                  </RBtn>
                  <RBtn
                    onClick={() => editor.chain().focus().sinkListItem("listItem").run()}
                    disabled={!isInList}
                    label="Increase indent"
                  >
                    <IndentSvg />
                  </RBtn>
                  <InlineSep />
                  <RBtn disabled label="Sort">
                    <span className="text-[9px] font-bold leading-none">A↕Z</span>
                  </RBtn>
                  <RBtn
                    onClick={() => editor.chain().focus().setHorizontalRule().run()}
                    label="Divider"
                  >
                    <span className="text-[10px] font-bold leading-none">¶</span>
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
                  <RBtn disabled label="Line spacing">
                    <span className="text-[9px] font-bold leading-none">↕≡</span>
                  </RBtn>
                  <RBtn disabled label="Shading">
                    <span className="text-[9px] leading-none">🎨</span>
                  </RBtn>
                  <RBtn disabled label="Borders">
                    <span className="text-[9px] leading-none">⊞</span>
                  </RBtn>
                </div>
              </div>
            </RibbonGroup>

            {/* ═══ TABLE CONTROLS (contextual — only when cursor is in table) ═══ */}
            {isInTable && (
              <>
                <GroupSep />
                <RibbonGroup label="Table">
                  <div className="flex flex-col gap-0.5 h-[44px] justify-center">
                    {/* Row 1: Row operations */}
                    <div className="flex items-center gap-0.5">
                      <span className="text-[9px] font-semibold uppercase text-gray-400 dark:text-gray-500 mr-0.5 leading-none">Row</span>
                      <RBtn onClick={() => { editor.view.focus(); editor.chain().addRowBefore().run(); }} label="Add row above">
                        <span className="text-[10px] font-semibold leading-none">↑+</span>
                      </RBtn>
                      <RBtn onClick={() => { editor.view.focus(); editor.chain().addRowAfter().run(); }} label="Add row below">
                        <span className="text-[10px] font-semibold leading-none">↓+</span>
                      </RBtn>
                      <RBtn onClick={() => { editor.view.focus(); editor.chain().deleteRow().run(); }} label="Delete row" danger>
                        <span className="text-[10px] font-semibold leading-none">✕</span>
                      </RBtn>
                    </div>
                    {/* Row 2: Column operations + delete table */}
                    <div className="flex items-center gap-0.5">
                      <span className="text-[9px] font-semibold uppercase text-gray-400 dark:text-gray-500 mr-0.5 leading-none">Col</span>
                      <RBtn onClick={() => { editor.view.focus(); editor.chain().addColumnBefore().run(); }} label="Add column left">
                        <span className="text-[10px] font-semibold leading-none">←+</span>
                      </RBtn>
                      <RBtn onClick={() => { editor.view.focus(); editor.chain().addColumnAfter().run(); }} label="Add column right">
                        <span className="text-[10px] font-semibold leading-none">+→</span>
                      </RBtn>
                      <RBtn onClick={() => { editor.view.focus(); editor.chain().deleteColumn().run(); }} label="Delete column" danger>
                        <span className="text-[10px] font-semibold leading-none">✕</span>
                      </RBtn>
                      <InlineSep />
                      <RBtn onClick={() => { editor.view.focus(); editor.chain().deleteTable().run(); }} label="Delete table" danger>
                        <TableCellsIcon className="w-3 h-3" />
                        <span className="text-[9px] font-semibold leading-none">Del</span>
                      </RBtn>
                    </div>
                  </div>
                </RibbonGroup>
              </>
            )}

            {trailing}
          </>
        )}

        {ribbonTab === "insert" && (
          <>
            {/* ═══ PAGES ═══ */}
            <RibbonGroup label="Pages">
              <div className="flex items-stretch h-[44px]">
                <BigBtn
                  onClick={() => editor.chain().focus().setHorizontalRule().run()}
                  label="Page Break"
                >
                  <DocumentIcon className="w-5 h-5" />
                  <span className="text-[9px] leading-none font-medium text-center">Page<br />Break</span>
                </BigBtn>
              </div>
            </RibbonGroup>

            <GroupSep />

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
                              setRibbonTab("home");
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

                {/* Shapes */}
                <BigBtn
                  onClick={(e) => { picturesDD.close(); shapesDD.toggle(e.currentTarget as HTMLButtonElement); }}
                  label="Shapes"
                >
                  <RectangleGroupIcon className="w-5 h-5" />
                  <div className="flex items-center gap-0.5">
                    <span className="text-[9px] leading-none font-medium">Shapes</span>
                    <ChevronDownIcon className="w-2 h-2" />
                  </div>
                </BigBtn>
                {shapesDD.isOpen && shapesDD.anchor && (
                  <DropdownPortal anchor={shapesDD.anchor} onClose={shapesDD.close} className="py-1 min-w-[160px]">
                    <button
                      type="button"
                      onMouseDown={(e) => e.preventDefault()}
                      onClick={() => { editor.chain().focus().setHorizontalRule().run(); shapesDD.close(); }}
                      className="w-full flex items-center gap-2.5 px-3 py-1.5 text-xs hover:bg-blue-50 dark:hover:bg-blue-900/20 text-gray-700 dark:text-gray-300 transition-colors"
                    >
                      <span className="text-base leading-none select-none">—</span>
                      Horizontal Line
                    </button>
                    <button
                      type="button"
                      onMouseDown={(e) => e.preventDefault()}
                      onClick={() => { editor.chain().focus().toggleBlockquote().run(); shapesDD.close(); }}
                      className="w-full flex items-center gap-2.5 px-3 py-1.5 text-xs hover:bg-blue-50 dark:hover:bg-blue-900/20 text-gray-700 dark:text-gray-300 transition-colors"
                    >
                      <span className="text-base leading-none select-none border-l-2 border-gray-400 pl-1">❝</span>
                      Callout Box
                    </button>
                  </DropdownPortal>
                )}

                {/* Right column: SmartArt / Chart / Screenshot stacked — compact to fit 44px */}
                <div className="flex flex-col h-[44px] justify-between py-0.5 pl-1 border-l border-gray-300 dark:border-gray-600 ml-0.5">
                  {[
                    { Icon: Square3Stack3DIcon, label: "SmartArt", title: "SmartArt — insert structured list", onClick: handleInsertSmartArt },
                    { Icon: ChartBarIcon,       label: "Chart",    title: "Chart — insert data table",         onClick: handleInsertChart },
                    { Icon: CameraIcon,         label: "Screen",   title: "Screenshot — paste from clipboard", onClick: handleInsertScreenshot },
                  ].map(({ Icon, label, title, onClick }) => (
                    <button
                      key={label}
                      type="button"
                      onMouseDown={(e) => e.preventDefault()}
                      onClick={onClick}
                      title={title}
                      className="flex items-center gap-1 px-1.5 py-0.5 rounded text-[10px] text-gray-600 dark:text-gray-400 hover:bg-gray-200 dark:hover:bg-gray-700 hover:text-gray-900 dark:hover:text-white transition-colors whitespace-nowrap"
                    >
                      <Icon className="w-3 h-3 flex-shrink-0" />
                      <span className="leading-none">{label}</span>
                      <ChevronDownIcon className="w-2 h-2 flex-shrink-0 opacity-60" />
                    </button>
                  ))}
                </div>
              </div>
            </RibbonGroup>

            <GroupSep />

            {/* ═══ MEDIA ═══ */}
            <RibbonGroup label="Media">
              <div className="flex items-stretch h-[44px]">
                <BigBtn
                  onClick={() => { setShowMediaInput((p) => !p); setMediaUrl(""); }}
                  label="Insert Media"
                >
                  <FilmIcon className="w-5 h-5" />
                  <div className="flex items-center gap-0.5">
                    <span className="text-[9px] leading-none font-medium">Media</span>
                    <ChevronDownIcon className="w-2 h-2" />
                  </div>
                </BigBtn>
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

      <input ref={fileInputRef} type="file" accept="image/*" className="hidden" onChange={handleImageFile} />
    </div>
  );
}
