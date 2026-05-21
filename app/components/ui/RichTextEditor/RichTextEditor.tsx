"use client";

import { useEffect, useMemo, useRef } from "react";
import { useEditor, EditorContent } from "@tiptap/react";
import { createBaseExtensions } from "./extensions";
import { sanitizeTipTapDoc } from "./sanitize";
import RichTextToolbar from "./RichTextToolbar";

interface RichTextEditorProps {
  /** Current document (TipTap JSON). Sanitised before being handed to
   *  the editor — unknown nodes/marks are stripped, empty paragraphs
   *  get a content array, etc. */
  content: Record<string, unknown> | null | undefined;
  /** Fired whenever the user edits, with the latest JSON. Omit in
   *  read-only mode. */
  onChange?: (json: Record<string, unknown>) => void;
  /** When false the editor is read-only and the toolbar is hidden. */
  editable?: boolean;
  /** Empty-state hint shown when the doc is empty. */
  placeholder?: string;
  /** Minimum height of the editor area in pixels. */
  minHeight?: number;
  /** Optional className applied to the outer wrapper. */
  className?: string;
}

/**
 * Shared rich-text editor — the base every surface in the app sits on.
 * Started intentionally small (release-form pattern): TipTap + the
 * shared extension set + sanitiser + toolbar. Selection-anchored
 * BubbleMenu, autosave and comments will get folded in step by step,
 * with each addition tested against a consumer before the next lands.
 */
export default function RichTextEditor({
  content,
  onChange,
  editable = true,
  placeholder,
  minHeight = 200,
  className,
}: RichTextEditorProps) {
  const sanitized = useMemo(
    () => sanitizeTipTapDoc(content) ?? {},
    [content]
  );

  // Tracks whether the most recent content change originated from the
  // editor itself (user typing) vs an external prop update. Without
  // this flag, every keystroke flowed:
  //   typing → onUpdate → onChange → parent setState → content prop
  //     → sanitize re-runs (new object ref) → push effect →
  //     editor.commands.setContent() → cursor jumps to end + page
  //     scrolls to the editor's bottom on every character.
  // The JSON.stringify compare couldn't catch it reliably because
  // sanitize emits a fresh tree (different object identities) even
  // when semantically equal, and TipTap normalises a few attrs.
  const lastEmittedRef = useRef<string | null>(null);

  const editor = useEditor({
    immediatelyRender: false,
    editable,
    extensions: createBaseExtensions({ placeholder }),
    content: {},
    onUpdate: ({ editor }) => {
      const json = editor.getJSON();
      // Store the *sanitized* version so the round-trip compare in
      // the push effect doesn't trip on sanitize-induced shape
      // changes (e.g. empty `content: []` arrays added to heading
      // nodes that TipTap's `getJSON()` omits).
      lastEmittedRef.current = JSON.stringify(
        sanitizeTipTapDoc(json) ?? {}
      );
      onChange?.(json);
    },
  });

  // Push content into the editor whenever it changes — handles both
  // "fetch lands before editor mounts" and "editor mounts before
  // fetch" orderings. Skips the push when the incoming content is the
  // same value we just emitted upward (i.e. the user typed and the
  // parent bounced the new content back to us); without that guard
  // every keystroke triggers `setContent`, which collapses the
  // selection to the end of the document and scrolls the page.
  useEffect(() => {
    if (!editor) return;
    if (Object.keys(sanitized).length === 0) return;
    const incoming = JSON.stringify(sanitized);
    if (lastEmittedRef.current === incoming) {
      lastEmittedRef.current = null;
      return;
    }
    // Same sanitize on both sides — compare like-for-like so we don't
    // mistakenly re-set the editor's content when it's already in the
    // right state but spelled differently in JSON.
    const currentSanitized = JSON.stringify(
      sanitizeTipTapDoc(editor.getJSON()) ?? {}
    );
    if (currentSanitized === incoming) return;
    editor.commands.setContent(sanitized, { emitUpdate: false });
  }, [editor, sanitized]);

  // Keep the editor's `editable` flag in sync with the prop so the
  // same instance can flip between view + edit without remounting.
  useEffect(() => {
    if (!editor) return;
    if (editor.isEditable !== editable) {
      editor.setEditable(editable);
    }
  }, [editor, editable]);

  return (
    <div className={className}>
      {editor && editable && <RichTextToolbar editor={editor} />}
      <div
        className={`border border-gray-200 dark:border-gray-700 bg-white dark:bg-gray-900 overflow-hidden ${
          editable ? "rounded-b-lg" : "rounded-lg"
        }`}
      >
        <EditorContent
          editor={editor}
          className="prose prose-sm dark:prose-invert max-w-none p-4 focus:outline-none [&_.ProseMirror]:outline-none [&_.ProseMirror_p.is-editor-empty:first-child::before]:content-[attr(data-placeholder)] [&_.ProseMirror_p.is-editor-empty:first-child::before]:text-gray-400 [&_.ProseMirror_p.is-editor-empty:first-child::before]:float-left [&_.ProseMirror_p.is-editor-empty:first-child::before]:pointer-events-none [&_.ProseMirror_p.is-editor-empty:first-child::before]:h-0 [&_.ProseMirror_table]:border-collapse [&_.ProseMirror_table]:w-full [&_.ProseMirror_table]:my-4 [&_.ProseMirror_td]:border [&_.ProseMirror_td]:border-gray-300 [&_.ProseMirror_td]:dark:border-gray-600 [&_.ProseMirror_td]:p-2 [&_.ProseMirror_th]:border [&_.ProseMirror_th]:border-gray-300 [&_.ProseMirror_th]:dark:border-gray-600 [&_.ProseMirror_th]:p-2 [&_.ProseMirror_th]:bg-gray-100 [&_.ProseMirror_th]:dark:bg-gray-800 [&_.ProseMirror_th]:font-semibold [&_.ProseMirror_img]:max-w-full [&_.ProseMirror_img]:h-auto"
          style={{ minHeight }}
        />
      </div>
    </div>
  );
}
