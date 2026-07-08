"use client";

import { useState, useCallback, useEffect, useRef, useMemo } from "react";
import { useTranslations } from "next-intl";
import { useEditor, EditorContent } from "@tiptap/react";
import { BubbleMenu } from "@tiptap/react/menus";
import StarterKit from "@tiptap/starter-kit";
import { Extension } from "@tiptap/core";
import { Plugin, PluginKey } from "@tiptap/pm/state";
import Placeholder from "@tiptap/extension-placeholder";
import { Table } from "@tiptap/extension-table";
import { TableRow } from "@tiptap/extension-table-row";
import { TableCell } from "@tiptap/extension-table-cell";
import { TableHeader } from "@tiptap/extension-table-header";
import Image from "@tiptap/extension-image";
import TextAlign from "@tiptap/extension-text-align";
import {
  ChatBubbleOvalLeftIcon,
  BoldIcon,
  ItalicIcon,
  ListBulletIcon,
  NumberedListIcon,
} from "@heroicons/react/24/outline";
import CommentMark from "@/app/components/ui/RichTextEditor/comments/CommentMark";
import CommentSidebar from "@/app/components/ui/RichTextEditor/comments/CommentSidebar";
import CommentInputPanel from "@/app/components/ui/RichTextEditor/comments/CommentInputPanel";
import { RichTextToolbar } from "@/app/components/ui/RichTextEditor";
import { setupTasksApi } from "@/lib/api";
import { useToast } from "@/app/context/ToastContext";
import type { DocumentComment as ApiDocumentComment, ApiError } from "@/lib/api/types";
import type { CollaborativeDocumentProps, InternalComment } from "./types";
import { normalizeComment, normalizeComments } from "./types";

interface BubbleButtonProps {
  onClick: () => void;
  active?: boolean;
  label: string;
  onMouseDown?: (e: React.MouseEvent) => void;
  children: React.ReactNode;
}

function BubbleButton({ onClick, active, label, onMouseDown, children }: BubbleButtonProps) {
  return (
    <button
      type="button"
      onClick={onClick}
      // Default: prevent focus shift so the editor's selection is intact when
      // the click handler fires. Callers can override (e.g. the comment button
      // already does) but the default keeps block-level commands working.
      onMouseDown={onMouseDown ?? ((e) => e.preventDefault())}
      title={label}
      aria-label={label}
      aria-pressed={active}
      className={`flex items-center justify-center min-w-8 h-8 px-2 rounded text-white transition-colors text-sm ${
        active
          ? "bg-blue-500 hover:bg-blue-400"
          : "hover:bg-gray-700"
      }`}
    >
      {children}
    </button>
  );
}

export default function CollaborativeDocument({
  projectId,
  taskId,
  documentId,
  initialContent,
  initialComments,
  version,
  currentUser,
  editable = false,
  canComment = true,
  canResolve = false,
  view,
  onContentChange,
  onCommentsChange,
  onRefetch,
  onSaved,
}: CollaborativeDocumentProps) {
  const showDocument = view !== "comments";
  const showComments = view !== "document";
  const t = useTranslations("projectDetail.setupTasks.kickoffMeeting.document");
  const { showToast } = useToast();

  const [comments, setComments] = useState<InternalComment[]>(() =>
    initialComments ? normalizeComments(initialComments) : []
  );
  const [activeCommentId, setActiveCommentId] = useState<string | null>(null);
  const [selectionRange, setSelectionRange] = useState<{ from: number; to: number } | null>(null);
  // Frozen at the moment the comment panel opens. Decoupled from selectionRange
  // so a selection change elsewhere doesn't make the open panel switch from a
  // pinned highlight thread to a "Start a conversation" prompt.
  const [panelRange, setPanelRange] = useState<{ from: number; to: number } | null>(null);
  // Sticky BubbleMenu — opens on selection, closes only on a mousedown outside
  // the menu DOM. Selection collapses (from menu actions, from the save round-
  // trip resetting content, etc.) don't close it.
  const [bubbleOpen, setBubbleOpen] = useState(false);
  const [isCommentPanelOpen, setIsCommentPanelOpen] = useState(false);
  const [selectedText, setSelectedText] = useState<string>("");
  const [isSaving, setIsSaving] = useState(false);
  const saveTimeoutRef = useRef<NodeJS.Timeout | null>(null);
  const commentPanelRef = useRef<HTMLDivElement>(null);

  // Use refs to access latest values in callbacks (TipTap doesn't re-create editor on prop changes).
  // Updated synchronously during render (not in a useEffect) so filterTransaction and event
  // handlers always read the current value — no window where the ref is stale after a prop change.
  const canCommentRef = useRef(canComment);
  const currentUserRef = useRef(currentUser);
  const editableRef = useRef(editable);
  const versionRef = useRef(version);
  canCommentRef.current = canComment;
  currentUserRef.current = currentUser;
  editableRef.current = editable;
  versionRef.current = version;

  // Store initialContent in a ref to access in onCreate
  const initialContentRef = useRef(initialContent);
  initialContentRef.current = initialContent;

  // Create a stable extension that blocks document changes when not editable.
  // Comment marks are now applied server-side, so no programmatic-edit escape
  // hatch is needed here — only block real user edits.
  const ConditionalReadOnly = useMemo(
    () =>
      Extension.create({
        name: "conditionalReadOnly",
        addProseMirrorPlugins: () => {
          return [
            new Plugin({
              key: new PluginKey("conditionalReadOnly"),
              filterTransaction: (transaction) => {
                if (editableRef.current) return true;
                if (transaction.docChanged) return false;
                return true; // selection-only transactions
              },
            }),
          ];
        },
      }),
    []
  );

  const editor = useEditor({
    immediatelyRender: false,
    extensions: [
      // StarterKit v3 ships link + underline by default; backend whitelist
      // doesn't include them, so save would 422 on "Invalid document structure"
      // as soon as a user pasted a URL or hit ⌘U.
      StarterKit.configure({
        link: false,
        underline: false,
      }),
      Placeholder.configure({
        placeholder: t("placeholder"),
      }),
      Table.configure({
        resizable: true,
      }),
      TableRow,
      TableCell,
      TableHeader,
      CommentMark,
      Image.configure({ inline: false, allowBase64: true }),
      TextAlign.configure({ types: ["heading", "paragraph"] }),
      ConditionalReadOnly,
    ],
    content: initialContent || getDefaultContent(),
    // Always true so text can be selected in read-only (commenting) mode —
    // the ConditionalReadOnly extension's filterTransaction blocks actual edits.
    editable: true,
    onCreate: ({ editor }) => {
      // Ensure content is set when editor is created
      const content = initialContentRef.current;
      if (content) {
        editor.commands.setContent(content);
      }
    },
    onUpdate: ({ editor }) => {
      // Only process content changes if editable
      if (!editableRef.current) return;

      const json = editor.getJSON();
      onContentChange?.(json);

      // Debounced auto-save
      if (saveTimeoutRef.current) {
        clearTimeout(saveTimeoutRef.current);
      }
      saveTimeoutRef.current = setTimeout(() => {
        saveContent(json);
      }, 1000);
    },
    onSelectionUpdate: ({ editor }) => {
      const { from, to } = editor.state.selection;
      const hasSelection = from !== to;

      if (!hasSelection) {
        setSelectionRange(null);
      }
    },
  });
  
  // Cleanup timeout on unmount
  useEffect(() => {
    return () => {
      if (saveTimeoutRef.current) {
        clearTimeout(saveTimeoutRef.current);
      }
    };
  }, []);

  // Update editor content when initialContent changes (e.g., modal reopen)
  useEffect(() => {
    if (editor && initialContent) {
      // Only update if content is different to avoid unnecessary re-renders
      const currentContent = JSON.stringify(editor.getJSON());
      const newContent = JSON.stringify(initialContent);
      if (currentContent !== newContent) {
        editor.commands.setContent(initialContent);
      }
    }
  }, [editor, initialContent]);

  // Sync comments with parent (convert back to API format)
  useEffect(() => {
    if (onCommentsChange) {
      // Convert internal format back to API format for parent
      const apiComments: ApiDocumentComment[] = comments.map((c) => ({
        "@context": "https://schema.org",
        "@type": "Comment",
        identifier: c.id,
        text: c.text,
        author: {
          "@type": "Person" as const,
          identifier: c.author.identifier,
          name: c.author.name,
        },
        dateCreated: c.createdAt,
        dateModified: c.updatedAt || c.createdAt,
        selectedText: c.selectedText || null,
        from: c.from,
        to: c.to,
        isResolved: c.isResolved || false,
        replies: (c.replies || []).map((r) => ({
          identifier: r.id,
          text: r.text,
          author: {
            "@type": "Person" as const,
            identifier: r.author.identifier,
            name: r.author.name,
          },
          dateCreated: r.createdAt,
        })),
      }));
      onCommentsChange(apiComments);
    }
  }, [comments, onCommentsChange]);

  // Handle click on comment highlight — open the comment panel for that range
  // so the existing comments are visible and the user can add a reply / new
  // comment on the same selection.
  useEffect(() => {
    if (!editor) return;

    const handleClick = (event: MouseEvent) => {
      const target = event.target as HTMLElement;
      const commentSpan = target.closest("[data-comment-id]");
      if (!commentSpan) return;

      const commentId = commentSpan.getAttribute("data-comment-id");
      if (!commentId) return;

      setActiveCommentId(commentId);

      // Find the clicked comment so we can open the panel anchored to its range.
      const clicked = comments.find((c) => c.id === commentId);
      // Open the panel even when the user can't *add* comments (e.g. host in
      // editing phase) — they should still be able to read the existing
      // thread. The panel itself hides the input when comments exist.
      if (!clicked || !currentUserRef.current) return;

      const docSize = editor.state.doc.content.size;
      const from = Math.max(0, Math.min(clicked.from, docSize));
      const to = Math.max(0, Math.min(clicked.to, docSize));
      if (from >= to) return;

      const text = editor.state.doc.textBetween(from, to);
      setSelectionRange({ from, to });
      setPanelRange({ from, to });
      setSelectedText(text);
      setIsCommentPanelOpen(true);
    };

    const editorElement = editor.view.dom;
    editorElement.addEventListener("click", handleClick);

    return () => {
      editorElement.removeEventListener("click", handleClick);
    };
  }, [editor, comments]);

  // Track the live editor selection so handleOpenCommentPanel and
  // handleAddComment have a fresh range when the user clicks the comment
  // button in the BubbleMenu — TipTap manages the menu's positioning, but
  // we still need the {from, to} for the panel + comment POST.
  useEffect(() => {
    if (!editor) return;
    const handler = () => {
      const { from, to } = editor.state.selection;
      if (from !== to) {
        setSelectionRange({ from, to });
        setBubbleOpen(true);
      }
      // Don't auto-close on collapsed selection — that gets triggered by menu
      // actions and the save round-trip's setContent. Closing is handled by
      // the document mousedown listener below.
    };
    editor.on("selectionUpdate", handler);
    return () => {
      editor.off("selectionUpdate", handler);
    };
  }, [editor]);

  // Close the inline panel when switching to the Comments tab — otherwise
  // the same thread shows in both the panel and the sidebar simultaneously.
  useEffect(() => {
    if (view === "comments" && isCommentPanelOpen) {
      setIsCommentPanelOpen(false);
      setSelectionRange(null);
      setPanelRange(null);
      setSelectedText("");
    }
  }, [view, isCommentPanelOpen]);

  // Scroll the inline comment panel into view when it opens.
  useEffect(() => {
    if (isCommentPanelOpen && commentPanelRef.current) {
      setTimeout(() => {
        commentPanelRef.current?.scrollIntoView({ behavior: "smooth", block: "nearest" });
      }, 50);
    }
  }, [isCommentPanelOpen]);

  // Close the BubbleMenu when the user clicks outside it. Combined with the
  // selectionUpdate listener above this gives a sticky-but-honest behavior:
  // open on selection, stay through commands + save, close on outside click.
  useEffect(() => {
    if (!bubbleOpen) return;
    const handler = (e: MouseEvent) => {
      const target = e.target as HTMLElement;
      if (target.closest("[data-bubble-menu='kickoff']")) return;
      setBubbleOpen(false);
    };
    document.addEventListener("mousedown", handler);
    return () => document.removeEventListener("mousedown", handler);
  }, [bubbleOpen]);

  // Save content to API with optimistic-locking + empty-doc guard.
  const saveContent = async (content: Record<string, unknown>) => {
    if (!editable) return;
    // Cheap local check before the network round-trip — backend has the same
    // guard but failing fast avoids overwriting valid content with empties.
    if (isEmptyDoc(content)) return;

    // Strip any attribute the backend whitelist doesn't accept (TipTap v3's
    // `align` on table cells, null colwidth, etc).
    const sanitized = sanitizeForBackend(content as SanitizedNode) as Record<string, unknown>;

    // TEMP debug — print the full distinct sets so we can spot any non-
    // whitelisted node/mark type without hunting through the truncated JSON.
    const types = collectNodeMarkTypes(sanitized);
    console.log("📤 nodes:", types.nodes.join(", "));
    console.log("📤 marks:", types.marks.join(", "));
    console.log("📤 PUT /content payload:", JSON.stringify(sanitized));

    try {
      setIsSaving(true);
      const response = await setupTasksApi.updateDocumentContent(
        projectId,
        taskId,
        documentId,
        sanitized,
        versionRef.current
      );
      // Bump the version (and any other server-normalized fields) in the
      // parent's state so the next save doesn't 409 with a stale version.
      onSaved?.(response);
    } catch (error) {
      const apiError = error as ApiError | undefined;
      const status = apiError?.status;
      const backendMessage = apiError?.message;

      if (status === 409) {
        showToast("warning", t("saveConflict"));
        await onRefetch?.();
      } else if (status === 422) {
        // Backend has three 422 reasons: empty, dramatic-shrink, invalid-structure.
        // Surface the actual message so the user (and we) know what failed.
        showToast("warning", backendMessage || t("saveRejectedEmpty"));
        console.error("Save rejected by backend:", apiError);
      } else {
        showToast("error", backendMessage || "Failed to save document");
        console.error("Failed to save document:", apiError);
      }
    } finally {
      setIsSaving(false);
    }
  };

  const handleAddComment = useCallback(
    async (text: string) => {
      // Prefer the panel's pinned range — that's what the user actually saw
      // when they composed the comment. Falls back to live selection.
      const range = panelRange ?? selectionRange;
      if (!editor || !range || !currentUser) return;

      const { from, to } = range;
      // Validate the saved range still maps to real text in the current doc.
      // If the editor remounted (e.g. content reload, HMR), positions may be stale.
      const docSize = editor.state.doc.content.size;
      if (from < 0 || to > docSize || from >= to) return;

      const selectedText = editor.state.doc.textBetween(from, to);
      if (!selectedText.trim()) return;

      try {
        // Backend handles the comment record AND the mark injection in one
        // transaction. Frontend just POSTs and refetches — no setMark, no
        // updateDocumentContent round-trip.
        const apiComment = await setupTasksApi.addDocumentComment(projectId, taskId, documentId, {
          content: text,
          selected_text: selectedText,
          from,
          to,
        });

        const newComment = normalizeComment(apiComment);
        setComments((prev) => [...prev, newComment]);
        setSelectionRange(null);
        setPanelRange(null);
        setIsCommentPanelOpen(false);
        setActiveCommentId(newComment.id);

        // Pull fresh content with the server-injected mark.
        await onRefetch?.();
      } catch (error) {
        console.error("Failed to add comment:", error);
      }
    },
    [editor, selectionRange, panelRange, currentUser, projectId, taskId, documentId, onRefetch]
  );

  const handleReplyToComment = useCallback(
    async (commentId: string, text: string) => {
      if (!currentUser) return;

      try {
        const apiReply = await setupTasksApi.addCommentReply(projectId, taskId, documentId, commentId, {
          content: text,
        });

        setComments((prev) =>
          prev.map((comment) =>
            comment.id === commentId
              ? {
                  ...comment,
                  replies: [
                    ...(comment.replies || []),
                    {
                      id: apiReply.identifier,
                      text: apiReply.text,
                      author: {
                        identifier: apiReply.author.identifier,
                        name: apiReply.author.name,
                      },
                      createdAt: apiReply.dateCreated,
                    },
                  ],
                }
              : comment
          )
        );
      } catch (error) {
        console.error("Failed to add reply:", error);
      }
    },
    [currentUser, projectId, taskId, documentId]
  );

  const handleDeleteComment = useCallback(
    async (commentId: string) => {
      try {
        // Backend strips the mark from the content as part of the delete.
        await setupTasksApi.deleteDocumentComment(projectId, taskId, documentId, commentId);

        setComments((prev) => prev.filter((c) => c.id !== commentId));
        if (activeCommentId === commentId) {
          setActiveCommentId(null);
        }

        await onRefetch?.();
      } catch (error) {
        console.error("Failed to delete comment:", error);
      }
    },
    [activeCommentId, projectId, taskId, documentId, onRefetch]
  );

  const handleResolveComment = useCallback(
    async (commentId: string) => {
      try {
        const comment = comments.find((c) => c.id === commentId);
        const newResolvedState = !comment?.isResolved;

        await setupTasksApi.resolveComment(projectId, taskId, documentId, commentId, newResolvedState);

        setComments((prev) =>
          prev.map((c) =>
            c.id === commentId ? { ...c, isResolved: newResolvedState } : c
          )
        );
      } catch (error) {
        console.error("Failed to resolve comment:", error);
      }
    },
    [comments, projectId, taskId, documentId]
  );

  const handleCommentClick = useCallback(
    (commentId: string) => {
      setActiveCommentId(commentId);

      // Scroll to and highlight the comment in the editor
      const comment = comments.find((c) => c.id === commentId);
      if (comment && editor) {
        editor.chain().focus().setTextSelection(comment.from).run();
      }
    },
    [comments, editor]
  );

  const handleOpenCommentPanel = useCallback(() => {
    // Pin the panel to the live selection at the moment it's opened. After
    // this, panelRange stays put even if the editor selection changes.
    if (editor && selectionRange) {
      const text = editor.state.doc.textBetween(selectionRange.from, selectionRange.to);
      setSelectedText(text);
      setPanelRange(selectionRange);
    }
    setIsCommentPanelOpen(true);
  }, [editor, selectionRange]);

  const handleCancelCommentPanel = useCallback(() => {
    setIsCommentPanelOpen(false);
    setSelectionRange(null);
    setPanelRange(null);
    setSelectedText("");
    // Clear the editor selection and blur to remove visual highlight
    if (editor) {
      editor.commands.setTextSelection(editor.state.selection.from);
      editor.commands.blur();
    }
    // Also clear browser's native selection
    window.getSelection()?.removeAllRanges();
  }, [editor]);

  // Comments whose range overlaps the current selection — surfaced in the panel
  // so the user sees what's already attached to this passage before commenting.
  const existingCommentsForSelection = useMemo(() => {
    // Use the panel's pinned range while it's open; falls back to the live
    // selectionRange so the BubbleMenu's comment button still works correctly
    // when no panel is open yet.
    const range = panelRange ?? selectionRange;
    if (!range) return [];
    const { from, to } = range;
    return comments.filter((c) => c.from < to && c.to > from);
  }, [comments, selectionRange, panelRange]);

  // Wraps a BubbleMenu button's command. The menu stays open via the outside-
  // click guard; this just runs the action and re-asserts the open flag in
  // case it was somehow toggled off.
  const runMenuAction = (action: () => void) => () => {
    action();
    setBubbleOpen(true);
  };

  return (
    <div className="space-y-4">
      {/* Editor - full width */}
      {showDocument && (
        <div className="relative">
          {editor && editable && (
            <div className="sticky top-0 z-10 rounded-t-lg border border-b-0 border-gray-200 dark:border-gray-700 bg-white dark:bg-gray-800 shadow-sm">
              <RichTextToolbar editor={editor} />
            </div>
          )}
          <div
            className={`border border-gray-200 dark:border-gray-700 overflow-hidden ${
              editable
                ? "rounded-b-lg bg-white dark:bg-gray-900"
                : "rounded-lg bg-gray-50/60 dark:bg-gray-900/60"
            }`}
          >
            {/* Save indicator */}
            {isSaving && (
              <div className="absolute top-2 right-2 text-xs text-gray-400 dark:text-gray-500 z-10">
                {t("saving")}...
              </div>
            )}
            <EditorContent
              editor={editor}
              // In read-only mode hide the blinking caret and swap the
              // text cursor for the default arrow — text selection
              // still works (needed to trigger the comment popover)
              // but the editor no longer reads as a typeable field.
              className={`prose prose-sm dark:prose-invert max-w-none p-4 min-h-[300px] focus:outline-none [&_.ProseMirror]:outline-none [&_.ProseMirror]:min-h-[280px] [&_.ProseMirror]:[&::selection]:bg-blue-200 [&_.ProseMirror]:dark:[&::selection]:bg-blue-800 [&_.comment-highlight]:bg-yellow-200 [&_.comment-highlight]:dark:bg-yellow-900/50 [&_.comment-highlight]:cursor-pointer [&_.ProseMirror_p.is-editor-empty:first-child::before]:content-[attr(data-placeholder)] [&_.ProseMirror_p.is-editor-empty:first-child::before]:text-gray-400 [&_.ProseMirror_p.is-editor-empty:first-child::before]:float-left [&_.ProseMirror_p.is-editor-empty:first-child::before]:pointer-events-none [&_.ProseMirror_p.is-editor-empty:first-child::before]:h-0 [&_.ProseMirror_table]:border-collapse [&_.ProseMirror_table]:w-full [&_.ProseMirror_table]:my-4 [&_.ProseMirror_td]:border [&_.ProseMirror_td]:border-gray-300 [&_.ProseMirror_td]:dark:border-gray-600 [&_.ProseMirror_td]:p-2 [&_.ProseMirror_th]:border [&_.ProseMirror_th]:border-gray-300 [&_.ProseMirror_th]:dark:border-gray-600 [&_.ProseMirror_th]:p-2 [&_.ProseMirror_th]:bg-gray-100 [&_.ProseMirror_th]:dark:bg-gray-800 [&_.ProseMirror_th]:font-semibold ${
                editable
                  ? ""
                  : "[&_.ProseMirror]:caret-transparent [&_.ProseMirror]:cursor-default"
              }`}
            />
          </div>

          {/* Selection-anchored toolbar — formatting marks during the editing
              phase, comment trigger during commenting. TipTap's BubbleMenu
              positions itself; we control visibility per-button. */}
          {editor && (editable || (canComment && currentUser)) && (
            <BubbleMenu
              editor={editor}
              shouldShow={() => bubbleOpen}
              // Anchor the menu inline at the right edge of the
              // selection (with a small offset) instead of floating
              // above. Keeps the menu out of the way of surrounding
              // content and reads as an in-place action.
              options={{
                placement: "right",
                offset: 8,
              }}
            >
              <div data-bubble-menu="kickoff" className="flex items-center gap-1 rounded-lg bg-gray-900 px-1 py-1 shadow-lg">
                {editable && (
                  <>
                    {/* Block-type buttons — kept identical to the toolbar so the
                        user can switch from either place. We use buttons (not a
                        native <select>) because selects steal focus on open and
                        break ProseMirror's selection. */}
                    <BubbleButton
                      onClick={runMenuAction(() => editor.chain().focus().setParagraph().run())}
                      active={editor.isActive("paragraph") && !editor.isActive("heading")}
                      label="Paragraph"
                    >
                      <span className="font-semibold">¶</span>
                    </BubbleButton>
                    <BubbleButton
                      onClick={runMenuAction(() => editor.chain().focus().toggleHeading({ level: 1 }).run())}
                      active={editor.isActive("heading", { level: 1 })}
                      label="Heading 1"
                    >
                      <span className="font-bold">H1</span>
                    </BubbleButton>
                    <BubbleButton
                      onClick={runMenuAction(() => editor.chain().focus().toggleHeading({ level: 2 }).run())}
                      active={editor.isActive("heading", { level: 2 })}
                      label="Heading 2"
                    >
                      <span className="font-bold">H2</span>
                    </BubbleButton>
                    <BubbleButton
                      onClick={runMenuAction(() => editor.chain().focus().toggleHeading({ level: 3 }).run())}
                      active={editor.isActive("heading", { level: 3 })}
                      label="Heading 3"
                    >
                      <span className="font-bold">H3</span>
                    </BubbleButton>
                    <span className="w-px h-5 bg-gray-700 mx-0.5" />
                    <BubbleButton
                      onClick={runMenuAction(() => editor.chain().focus().toggleBold().run())}
                      active={editor.isActive("bold")}
                      label="Bold"
                    >
                      <BoldIcon className="w-4 h-4" />
                    </BubbleButton>
                    <BubbleButton
                      onClick={runMenuAction(() => editor.chain().focus().toggleItalic().run())}
                      active={editor.isActive("italic")}
                      label="Italic"
                    >
                      <ItalicIcon className="w-4 h-4" />
                    </BubbleButton>
                    <BubbleButton
                      onClick={runMenuAction(() => editor.chain().focus().toggleStrike().run())}
                      active={editor.isActive("strike")}
                      label="Strikethrough"
                    >
                      <span className="text-sm line-through font-semibold leading-none px-0.5">S</span>
                    </BubbleButton>
                    <span className="w-px h-5 bg-gray-700 mx-0.5" />
                    <BubbleButton
                      onClick={runMenuAction(() => editor.chain().focus().toggleBulletList().run())}
                      active={editor.isActive("bulletList")}
                      label="Bullet list"
                    >
                      <ListBulletIcon className="w-4 h-4" />
                    </BubbleButton>
                    <BubbleButton
                      onClick={runMenuAction(() => editor.chain().focus().toggleOrderedList().run())}
                      active={editor.isActive("orderedList")}
                      label="Numbered list"
                    >
                      <NumberedListIcon className="w-4 h-4" />
                    </BubbleButton>
                  </>
                )}
                {canComment && currentUser && (
                  <>
                    {editable && <span className="w-px h-5 bg-gray-700 mx-0.5" />}
                    <BubbleButton
                      onClick={handleOpenCommentPanel}
                      label="Add comment"
                      onMouseDown={(e) => e.preventDefault()}
                    >
                      <ChatBubbleOvalLeftIcon className="w-4 h-4" />
                    </BubbleButton>
                  </>
                )}
              </div>
            </BubbleMenu>
          )}

        </div>
      )}

      {/* Comment input panel — visible to anyone with a user (so editing-phase
          host can still read existing threads). The panel itself hides the
          input when there are existing comments, and we only pass onReply when
          commenting is actually allowed (commenting phase + attendee). */}
      {currentUser && (
        <div ref={commentPanelRef}>
          {/* key resets internal state when the panel opens on a new selection */}
          <CommentInputPanel
            key={isCommentPanelOpen ? (panelRange ? `${panelRange.from}-${panelRange.to}` : "open") : "closed"}
            isOpen={isCommentPanelOpen}
            currentUser={currentUser}
            selectedText={selectedText}
            existingComments={existingCommentsForSelection}
            onSubmit={handleAddComment}
            onCancel={handleCancelCommentPanel}
            onReply={canComment ? handleReplyToComment : undefined}
          />
        </div>
      )}

      {/* Comments section */}
      {showComments && (
        <div className="border border-gray-200 dark:border-gray-700 rounded-lg p-4 bg-gray-50 dark:bg-gray-800/50">
          <CommentSidebar
            comments={comments}
            currentUserId={currentUser?.identifier}
            activeCommentId={activeCommentId}
            onCommentClick={handleCommentClick}
            onReply={currentUser && canComment ? handleReplyToComment : undefined}
            onDelete={canComment ? handleDeleteComment : undefined}
            onResolve={canResolve ? handleResolveComment : undefined}
          />
        </div>
      )}
    </div>
  );
}

// True when a TipTap doc has no text and no non-trivial structure — i.e. saving
// it would visually appear as an empty editor.
// Backend whitelist of attributes per node/mark type. Anything outside this
// list (e.g. TipTap v3's new `align` attribute on table cells) triggers
// "Invalid document structure" on save, so strip it before sending.
const ALLOWED_NODE_ATTRS: Record<string, string[]> = {
  paragraph: ["textAlign"],
  heading: ["level", "textAlign"],
  tableCell: ["colspan", "rowspan", "colwidth"],
  tableHeader: ["colspan", "rowspan", "colwidth"],
  image: ["src", "alt", "title"],
};
const ALLOWED_MARK_ATTRS: Record<string, string[]> = {
  comment: ["commentId"],
};

type SanitizedNode = {
  type?: string;
  text?: string;
  attrs?: Record<string, unknown>;
  marks?: { type?: string; attrs?: Record<string, unknown> }[];
  content?: SanitizedNode[];
};

function pickAllowedAttrs(
  attrs: Record<string, unknown> | undefined,
  allowed: string[]
): Record<string, unknown> | undefined {
  if (!attrs) return undefined;
  const out: Record<string, unknown> = {};
  for (const key of allowed) {
    const v = attrs[key];
    if (v !== null && v !== undefined) out[key] = v;
  }
  return Object.keys(out).length > 0 ? out : undefined;
}

function sanitizeForBackend(node: SanitizedNode): SanitizedNode {
  const out: SanitizedNode = { ...node };

  if (out.type) {
    const allowed = ALLOWED_NODE_ATTRS[out.type];
    if (allowed) {
      const picked = pickAllowedAttrs(out.attrs, allowed);
      if (picked) out.attrs = picked;
      else delete out.attrs;
    } else {
      delete out.attrs;
    }
  }

  if (Array.isArray(out.marks)) {
    out.marks = out.marks
      .map((mark) => {
        const result: { type?: string; attrs?: Record<string, unknown> } = { ...mark };
        const allowed = mark.type ? ALLOWED_MARK_ATTRS[mark.type] : undefined;
        if (allowed) {
          const picked = pickAllowedAttrs(mark.attrs, allowed);
          if (picked) result.attrs = picked;
          else delete result.attrs;
        } else {
          delete result.attrs;
        }
        return result;
      });
  }

  if (Array.isArray(out.content)) {
    out.content = out.content.map(sanitizeForBackend);
  }

  return out;
}

// TEMP debug — collect every distinct node and mark type that appears in a
// TipTap doc, so we can compare against the backend whitelist.
function collectNodeMarkTypes(doc: Record<string, unknown>): {
  nodes: string[];
  marks: string[];
} {
  type Node = { type?: string; marks?: { type?: string }[]; content?: Node[] };
  const nodes = new Set<string>();
  const marks = new Set<string>();
  const walk = (n: Node) => {
    if (n.type) nodes.add(n.type);
    if (Array.isArray(n.marks)) {
      for (const m of n.marks) if (m.type) marks.add(m.type);
    }
    if (Array.isArray(n.content)) for (const c of n.content) walk(c);
  };
  walk(doc as Node);
  return { nodes: [...nodes].sort(), marks: [...marks].sort() };
}

function isEmptyDoc(doc: Record<string, unknown>): boolean {
  type Node = { type?: string; text?: string; content?: Node[] };
  const hasText = (node: Node): boolean => {
    if (typeof node.text === "string" && node.text.length > 0) return true;
    if (Array.isArray(node.content)) return node.content.some(hasText);
    return false;
  };
  const root = doc as Node;
  if (!root || root.type !== "doc") return true;
  if (!Array.isArray(root.content) || root.content.length === 0) return true;
  return !hasText(root);
}

function getDefaultContent(): Record<string, unknown> {
  return {
    type: "doc",
    content: [
      {
        type: "heading",
        attrs: { level: 2 },
        content: [{ type: "text", text: "Kickoff Meeting Notes" }],
      },
      { type: "paragraph" },
      {
        type: "heading",
        attrs: { level: 3 },
        content: [{ type: "text", text: "Agenda" }],
      },
      {
        type: "bulletList",
        content: [
          {
            type: "listItem",
            content: [
              {
                type: "paragraph",
                content: [{ type: "text", text: "Project Overview" }],
              },
            ],
          },
          {
            type: "listItem",
            content: [
              {
                type: "paragraph",
                content: [{ type: "text", text: "Timeline Discussion" }],
              },
            ],
          },
          {
            type: "listItem",
            content: [
              {
                type: "paragraph",
                content: [{ type: "text", text: "Roles & Responsibilities" }],
              },
            ],
          },
          {
            type: "listItem",
            content: [
              {
                type: "paragraph",
                content: [{ type: "text", text: "Questions & Concerns" }],
              },
            ],
          },
        ],
      },
      { type: "paragraph" },
      {
        type: "heading",
        attrs: { level: 3 },
        content: [{ type: "text", text: "Notes" }],
      },
      { type: "paragraph" },
    ],
  };
}
