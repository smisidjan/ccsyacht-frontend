"use client";

import type { Editor } from "@tiptap/react";
import {
  BoldIcon,
  ItalicIcon,
  ListBulletIcon,
  NumberedListIcon,
  MinusIcon,
} from "@heroicons/react/24/outline";

interface RichTextToolbarProps {
  editor: Editor;
  /** When true the toolbar uses dark-on-light styling (default,
   *  matches the static toolbar above the editor). False switches to
   *  the inverse for placement on a dark surface like a BubbleMenu. */
  light?: boolean;
  /** Optional extra buttons to render at the end of the toolbar — used
   *  by surfaces that add domain-specific actions (e.g. the kickoff
   *  document's comment button). */
  trailing?: React.ReactNode;
}

interface ToolbarButtonProps {
  onClick: () => void;
  active?: boolean;
  disabled?: boolean;
  label: string;
  children: React.ReactNode;
  light?: boolean;
}

/** Toolbar button — `onMouseDown` is suppressed so the editor's text
 *  selection doesn't collapse before the click handler runs. Without
 *  that, block-level commands like `setHeading` or `toggleBulletList`
 *  silently fail because they need a valid selection. */
function ToolbarButton({
  onClick,
  active,
  disabled,
  label,
  children,
  light = true,
}: ToolbarButtonProps) {
  return (
    <button
      type="button"
      onMouseDown={(e) => e.preventDefault()}
      onClick={onClick}
      disabled={disabled}
      title={label}
      aria-label={label}
      aria-pressed={active}
      className={`flex items-center justify-center min-w-8 h-8 px-2 rounded transition-colors text-sm ${
        light
          ? active
            ? "bg-blue-100 text-blue-600 dark:bg-blue-900/40 dark:text-blue-400"
            : "text-gray-700 dark:text-gray-300 hover:bg-gray-100 dark:hover:bg-gray-700"
          : active
            ? "bg-blue-500 text-white hover:bg-blue-400"
            : "text-white hover:bg-gray-700"
      } disabled:opacity-40 disabled:cursor-not-allowed disabled:hover:bg-transparent`}
    >
      {children}
    </button>
  );
}

function Separator({ light }: { light: boolean }) {
  return (
    <span
      className={`w-px h-5 mx-1 ${
        light ? "bg-gray-200 dark:bg-gray-700" : "bg-gray-700"
      }`}
    />
  );
}

/** Block-type + inline mark + list toolbar used above every editor in
 *  the app. Knows about: paragraph, headings 1–3, bold, italic, strike,
 *  bullet list, ordered list, horizontal rule. */
export default function RichTextToolbar({
  editor,
  light = true,
  trailing,
}: RichTextToolbarProps) {
  const isHeading = (level: 1 | 2 | 3) =>
    editor.isActive("heading", { level });
  const isParagraph =
    editor.isActive("paragraph") &&
    !isHeading(1) &&
    !isHeading(2) &&
    !isHeading(3);

  return (
    <div
      className={`flex items-center gap-1 flex-wrap ${
        light
          ? "p-1.5 border border-gray-200 dark:border-gray-700 rounded-t-lg bg-white dark:bg-gray-800 border-b-0"
          : "rounded-lg bg-gray-900 px-1 py-1 shadow-lg"
      }`}
    >
      <ToolbarButton
        onClick={() => editor.chain().focus().setParagraph().run()}
        active={isParagraph}
        label="Paragraph"
        light={light}
      >
        <span className="font-semibold">¶</span>
      </ToolbarButton>
      <ToolbarButton
        onClick={() => editor.chain().focus().toggleHeading({ level: 1 }).run()}
        active={isHeading(1)}
        label="Heading 1"
        light={light}
      >
        <span className="font-bold">H1</span>
      </ToolbarButton>
      <ToolbarButton
        onClick={() => editor.chain().focus().toggleHeading({ level: 2 }).run()}
        active={isHeading(2)}
        label="Heading 2"
        light={light}
      >
        <span className="font-bold">H2</span>
      </ToolbarButton>
      <ToolbarButton
        onClick={() => editor.chain().focus().toggleHeading({ level: 3 }).run()}
        active={isHeading(3)}
        label="Heading 3"
        light={light}
      >
        <span className="font-bold">H3</span>
      </ToolbarButton>

      <Separator light={light} />

      <ToolbarButton
        onClick={() => editor.chain().focus().toggleBold().run()}
        active={editor.isActive("bold")}
        label="Bold (⌘B)"
        light={light}
      >
        <BoldIcon className="w-4 h-4" />
      </ToolbarButton>
      <ToolbarButton
        onClick={() => editor.chain().focus().toggleItalic().run()}
        active={editor.isActive("italic")}
        label="Italic (⌘I)"
        light={light}
      >
        <ItalicIcon className="w-4 h-4" />
      </ToolbarButton>
      <ToolbarButton
        onClick={() => editor.chain().focus().toggleStrike().run()}
        active={editor.isActive("strike")}
        label="Strikethrough"
        light={light}
      >
        <span className="text-sm font-semibold line-through leading-none">
          S
        </span>
      </ToolbarButton>

      <Separator light={light} />

      <ToolbarButton
        onClick={() => editor.chain().focus().toggleBulletList().run()}
        active={editor.isActive("bulletList")}
        label="Bullet list"
        light={light}
      >
        <ListBulletIcon className="w-4 h-4" />
      </ToolbarButton>
      <ToolbarButton
        onClick={() => editor.chain().focus().toggleOrderedList().run()}
        active={editor.isActive("orderedList")}
        label="Numbered list"
        light={light}
      >
        <NumberedListIcon className="w-4 h-4" />
      </ToolbarButton>
      <ToolbarButton
        onClick={() => editor.chain().focus().setHorizontalRule().run()}
        label="Horizontal rule"
        light={light}
      >
        <MinusIcon className="w-4 h-4" />
      </ToolbarButton>

      {trailing}
    </div>
  );
}
