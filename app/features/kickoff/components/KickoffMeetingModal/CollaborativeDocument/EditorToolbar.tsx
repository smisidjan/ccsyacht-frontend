"use client";

import type { Editor } from "@tiptap/react";
import {
  BoldIcon,
  ItalicIcon,
  ListBulletIcon,
  NumberedListIcon,
  MinusIcon,
} from "@heroicons/react/24/outline";

interface EditorToolbarProps {
  editor: Editor;
}

interface ToolbarButtonProps {
  onClick: () => void;
  active?: boolean;
  disabled?: boolean;
  label: string;
  children: React.ReactNode;
}

function ToolbarButton({ onClick, active, disabled, label, children }: ToolbarButtonProps) {
  return (
    <button
      type="button"
      // Prevent the browser from shifting focus to the button on mousedown.
      // Without this, block-level commands like setHeading/toggleBulletList
      // can fail because the editor's selection state gets disturbed before
      // the click handler runs.
      onMouseDown={(e) => e.preventDefault()}
      onClick={onClick}
      disabled={disabled}
      title={label}
      aria-label={label}
      aria-pressed={active}
      className={`flex items-center justify-center min-w-8 h-8 px-2 rounded transition-colors text-sm ${
        active
          ? "bg-blue-100 text-blue-600 dark:bg-blue-900/40 dark:text-blue-400"
          : "text-gray-700 dark:text-gray-300 hover:bg-gray-100 dark:hover:bg-gray-700"
      } disabled:opacity-40 disabled:cursor-not-allowed disabled:hover:bg-transparent`}
    >
      {children}
    </button>
  );
}

function Separator() {
  return <span className="w-px h-5 bg-gray-200 dark:bg-gray-700 mx-1" />;
}

export default function EditorToolbar({ editor }: EditorToolbarProps) {
  const isHeading = (level: 1 | 2 | 3) => editor.isActive("heading", { level });
  const isParagraph =
    editor.isActive("paragraph") && !isHeading(1) && !isHeading(2) && !isHeading(3);

  return (
    <div className="flex items-center gap-1 flex-wrap p-1.5 border border-gray-200 dark:border-gray-700 rounded-t-lg bg-white dark:bg-gray-800 border-b-0">
      {/* Block type — explicit toggle buttons keep focus on the editor; native
          <select> would lose the selection when its dropdown opens. */}
      <ToolbarButton
        onClick={() => editor.chain().focus().setParagraph().run()}
        active={isParagraph}
        label="Paragraph"
      >
        <span className="font-semibold">¶</span>
      </ToolbarButton>
      <ToolbarButton
        onClick={() => editor.chain().focus().toggleHeading({ level: 1 }).run()}
        active={isHeading(1)}
        label="Heading 1"
      >
        <span className="font-bold">H1</span>
      </ToolbarButton>
      <ToolbarButton
        onClick={() => editor.chain().focus().toggleHeading({ level: 2 }).run()}
        active={isHeading(2)}
        label="Heading 2"
      >
        <span className="font-bold">H2</span>
      </ToolbarButton>
      <ToolbarButton
        onClick={() => editor.chain().focus().toggleHeading({ level: 3 }).run()}
        active={isHeading(3)}
        label="Heading 3"
      >
        <span className="font-bold">H3</span>
      </ToolbarButton>

      <Separator />

      {/* Inline marks */}
      <ToolbarButton
        onClick={() => editor.chain().focus().toggleBold().run()}
        active={editor.isActive("bold")}
        label="Bold (⌘B)"
      >
        <BoldIcon className="w-4 h-4" />
      </ToolbarButton>
      <ToolbarButton
        onClick={() => editor.chain().focus().toggleItalic().run()}
        active={editor.isActive("italic")}
        label="Italic (⌘I)"
      >
        <ItalicIcon className="w-4 h-4" />
      </ToolbarButton>
      <ToolbarButton
        onClick={() => editor.chain().focus().toggleStrike().run()}
        active={editor.isActive("strike")}
        label="Strikethrough"
      >
        <span className="text-sm font-semibold line-through leading-none">S</span>
      </ToolbarButton>

      <Separator />

      {/* Lists & blocks */}
      <ToolbarButton
        onClick={() => editor.chain().focus().toggleBulletList().run()}
        active={editor.isActive("bulletList")}
        label="Bullet list"
      >
        <ListBulletIcon className="w-4 h-4" />
      </ToolbarButton>
      <ToolbarButton
        onClick={() => editor.chain().focus().toggleOrderedList().run()}
        active={editor.isActive("orderedList")}
        label="Numbered list"
      >
        <NumberedListIcon className="w-4 h-4" />
      </ToolbarButton>
      <ToolbarButton
        onClick={() => editor.chain().focus().setHorizontalRule().run()}
        label="Horizontal rule"
      >
        <MinusIcon className="w-4 h-4" />
      </ToolbarButton>
    </div>
  );
}
