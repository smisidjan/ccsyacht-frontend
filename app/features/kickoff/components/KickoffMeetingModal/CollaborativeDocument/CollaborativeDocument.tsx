"use client";

import { useState, useCallback, useEffect, useRef, useMemo } from "react";
import { useTranslations } from "next-intl";
import { useEditor, EditorContent } from "@tiptap/react";
import StarterKit from "@tiptap/starter-kit";
import { Extension } from "@tiptap/core";
import { Plugin, PluginKey } from "@tiptap/pm/state";
import Placeholder from "@tiptap/extension-placeholder";
import { Table } from "@tiptap/extension-table";
import { TableRow } from "@tiptap/extension-table-row";
import { TableCell } from "@tiptap/extension-table-cell";
import { TableHeader } from "@tiptap/extension-table-header";
import CommentMark from "./CommentMark";
import CommentSidebar from "./CommentSidebar";
import AddCommentPopover from "./AddCommentPopover";
import CommentInputPanel from "./CommentInputPanel";
import { setupTasksApi } from "@/lib/api";
import type { DocumentComment as ApiDocumentComment } from "@/lib/api/types";
import type { CollaborativeDocumentProps, InternalComment } from "./types";
import { normalizeComment, normalizeComments } from "./types";

export default function CollaborativeDocument({
  projectId,
  taskId,
  documentId,
  initialContent,
  initialComments,
  currentUser,
  editable = false,
  canComment = true,
  onContentChange,
  onCommentsChange,
}: CollaborativeDocumentProps) {
  const t = useTranslations("projectDetail.setupTasks.kickoffMeeting.document");

  const [comments, setComments] = useState<InternalComment[]>(() =>
    initialComments ? normalizeComments(initialComments) : []
  );
  const [activeCommentId, setActiveCommentId] = useState<string | null>(null);
  const [popoverPosition, setPopoverPosition] = useState<{ top: number; left: number } | null>(null);
  const [selectionRange, setSelectionRange] = useState<{ from: number; to: number } | null>(null);
  const [isCommentPanelOpen, setIsCommentPanelOpen] = useState(false);
  const [selectedText, setSelectedText] = useState<string>("");
  const [isSaving, setIsSaving] = useState(false);
  const saveTimeoutRef = useRef<NodeJS.Timeout | null>(null);

  // Use refs to access latest values in callbacks (TipTap doesn't re-create editor on prop changes)
  const canCommentRef = useRef(canComment);
  const currentUserRef = useRef(currentUser);
  const editableRef = useRef(editable);

  // Keep refs updated
  useEffect(() => {
    canCommentRef.current = canComment;
    currentUserRef.current = currentUser;
    editableRef.current = editable;
  }, [canComment, currentUser, editable]);

  // Store initialContent in a ref to access in onCreate
  const initialContentRef = useRef(initialContent);
  initialContentRef.current = initialContent;

  // Track if we're programmatically adding a comment mark
  const isAddingCommentRef = useRef(false);

  // Create a stable extension that blocks document changes when not editable
  // Must use useMemo to ensure the extension is created only once
  // The refs are accessed at runtime so they'll always have current values
  const ConditionalReadOnly = useMemo(
    () =>
      Extension.create({
        name: "conditionalReadOnly",
        addProseMirrorPlugins: () => {
          return [
            new Plugin({
              key: new PluginKey("conditionalReadOnly"),
              filterTransaction: (transaction) => {
                // Allow all transactions if editable
                if (editableRef.current) return true;

                // Allow if we're programmatically adding a comment
                if (isAddingCommentRef.current) return true;

                // Block any transaction that changes the document
                if (transaction.docChanged) return false;

                // Allow selection-only transactions
                return true;
              },
            }),
          ];
        },
      }),
    [] // Empty deps - refs are stable and accessed at runtime
  );

  const editor = useEditor({
    immediatelyRender: false,
    extensions: [
      StarterKit,
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
      ConditionalReadOnly,
    ],
    content: initialContent || getDefaultContent(),
    editable: true, // Always true to allow selection for comments
    editorProps: {
      // Block all text input when not editable
      handleTextInput: () => {
        if (!editableRef.current) {
          return true; // Block
        }
        return false;
      },
      // Block keyboard input when not editable
      handleKeyDown: (_view, event) => {
        if (editableRef.current) return false;

        // Allow navigation and selection keys
        const allowedKeys = [
          "ArrowUp", "ArrowDown", "ArrowLeft", "ArrowRight",
          "Home", "End", "PageUp", "PageDown",
          "Shift", "Control", "Alt", "Meta", "Tab", "Escape",
        ];

        // Allow Ctrl/Cmd+C for copy, Ctrl/Cmd+A for select all
        if ((event.ctrlKey || event.metaKey) && ["c", "a"].includes(event.key.toLowerCase())) {
          return false;
        }

        if (!allowedKeys.includes(event.key)) {
          return true; // Block
        }
        return false;
      },
      // Block paste when not editable
      handlePaste: () => {
        if (!editableRef.current) {
          return true; // Block
        }
        return false;
      },
      // Block drop when not editable
      handleDrop: () => {
        if (!editableRef.current) {
          return true; // Block
        }
        return false;
      },
    },
    onCreate: ({ editor }) => {
      // Ensure content is set when editor is created
      const content = initialContentRef.current;
      if (content) {
        editor.commands.setContent(content);
      }
    },
    onUpdate: ({ editor }) => {
      // Allow comment mark updates even when not editable
      if (isAddingCommentRef.current) return;

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

      // Only clear the button when selection is removed (not during selection)
      if (!hasSelection) {
        setPopoverPosition(null);
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

  // Handle click on comment highlight
  useEffect(() => {
    if (!editor) return;

    const handleClick = (event: MouseEvent) => {
      const target = event.target as HTMLElement;
      const commentSpan = target.closest("[data-comment-id]");
      if (commentSpan) {
        const commentId = commentSpan.getAttribute("data-comment-id");
        if (commentId) {
          setActiveCommentId(commentId);
        }
      }
    };

    const editorElement = editor.view.dom;
    editorElement.addEventListener("click", handleClick);

    return () => {
      editorElement.removeEventListener("click", handleClick);
    };
  }, [editor]);

  // Handle mouseup to show comment button after selection
  useEffect(() => {
    if (!editor) return;

    const handleMouseUp = () => {
      if (!canCommentRef.current || !currentUserRef.current) return;

      // Small delay to ensure selection is complete
      setTimeout(() => {
        const { from, to } = editor.state.selection;
        const hasSelection = from !== to;

        if (hasSelection && canCommentRef.current && currentUserRef.current) {
          // Anchor the icon to the right edge of the editor on the same line as
          // the start of the selection — independent of mouse / selection direction.
          const startCoords = editor.view.coordsAtPos(from);
          const editorRect = editor.view.dom.getBoundingClientRect();
          const lineMiddle = (startCoords.top + startCoords.bottom) / 2;
          const ICON_SIZE = 32;
          const RIGHT_GAP = 8;

          setPopoverPosition({
            top: lineMiddle - ICON_SIZE / 2,
            left: editorRect.right - ICON_SIZE - RIGHT_GAP,
          });
          setSelectionRange({ from, to });
        }
      }, 10);
    };

    // Listen on document so we catch mouseup even when released outside the editor
    document.addEventListener("mouseup", handleMouseUp);

    return () => {
      document.removeEventListener("mouseup", handleMouseUp);
    };
  }, [editor]);

  // Save content to API
  const saveContent = async (content: Record<string, unknown>) => {
    if (!editable) return;

    try {
      setIsSaving(true);
      await setupTasksApi.updateDocumentContent(projectId, taskId, documentId, content);
    } catch (error) {
      console.error("Failed to save document:", error);
    } finally {
      setIsSaving(false);
    }
  };

  const handleAddComment = useCallback(
    async (text: string) => {
      if (!editor || !selectionRange || !currentUser) return;

      const { from, to } = selectionRange;
      // Validate the saved range still maps to real text in the current doc.
      // If the editor remounted (e.g. content reload, HMR), positions may be stale.
      const docSize = editor.state.doc.content.size;
      if (from < 0 || to > docSize || from >= to) return;

      const selectedText = editor.state.doc.textBetween(from, to);
      if (!selectedText.trim()) return;

      try {
        const apiComment = await setupTasksApi.addDocumentComment(projectId, taskId, documentId, {
          content: text,
          selected_text: selectedText,
          from,
          to,
        });

        const newComment = normalizeComment(apiComment);

        // Explicitly target the saved range — don't rely on whatever selection the
        // editor happens to have when this runs. Without setTextSelection, setMark
        // can apply to a collapsed range (no-op) if focus shifted to the comment
        // panel input.
        isAddingCommentRef.current = true;
        editor.chain()
          .focus()
          .setTextSelection({ from, to })
          .setComment(newComment.id)
          .run();
        isAddingCommentRef.current = false;

        // Guard against persisting an empty document on top of valid content.
        // If something resets the editor mid-flow, getJSON may return an empty
        // doc — saving that wipes the kickoff template on the backend.
        const updatedContent = editor.getJSON();
        if (isEmptyDoc(updatedContent)) {
          console.error("Refusing to save empty document content");
        } else {
          await setupTasksApi.updateDocumentContent(projectId, taskId, documentId, updatedContent);
        }

        setComments((prev) => [...prev, newComment]);
        setPopoverPosition(null);
        setSelectionRange(null);
        setIsCommentPanelOpen(false);
        setActiveCommentId(newComment.id);
      } catch (error) {
        console.error("Failed to add comment:", error);
      }
    },
    [editor, selectionRange, currentUser, projectId, taskId, documentId]
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
      if (!editor) return;

      try {
        await setupTasksApi.deleteDocumentComment(projectId, taskId, documentId, commentId);

        // Remove the comment mark from the document
        const { doc } = editor.state;
        const markType = editor.schema.marks.comment;

        doc.descendants((node, pos) => {
          if (node.isText) {
            const marks = node.marks.filter(
              (mark) => mark.type === markType && mark.attrs.commentId === commentId
            );
            if (marks.length > 0) {
              editor
                .chain()
                .setTextSelection({ from: pos, to: pos + node.nodeSize })
                .unsetComment()
                .run();
            }
          }
        });

        setComments((prev) => prev.filter((c) => c.id !== commentId));
        if (activeCommentId === commentId) {
          setActiveCommentId(null);
        }
      } catch (error) {
        console.error("Failed to delete comment:", error);
      }
    },
    [editor, activeCommentId, projectId, taskId, documentId]
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
    // Capture the selected text before opening the panel
    if (editor && selectionRange) {
      const text = editor.state.doc.textBetween(selectionRange.from, selectionRange.to);
      setSelectedText(text);
    }
    setIsCommentPanelOpen(true);
    setPopoverPosition(null);
  }, [editor, selectionRange]);

  const handleCancelCommentPanel = useCallback(() => {
    setIsCommentPanelOpen(false);
    setSelectionRange(null);
    setSelectedText("");
    // Clear the editor selection and blur to remove visual highlight
    if (editor) {
      editor.commands.setTextSelection(editor.state.selection.from);
      editor.commands.blur();
    }
    // Also clear browser's native selection
    window.getSelection()?.removeAllRanges();
  }, [editor]);

  return (
    <div className="space-y-4">
      {/* Editor - full width */}
      <div className="relative">
        <div className="border border-gray-200 dark:border-gray-700 rounded-lg overflow-hidden bg-white dark:bg-gray-900">
          {/* Save indicator */}
          {isSaving && (
            <div className="absolute top-2 right-2 text-xs text-gray-400 dark:text-gray-500 z-10">
              {t("saving")}...
            </div>
          )}
          <EditorContent
            editor={editor}
            className="prose prose-sm dark:prose-invert max-w-none p-4 min-h-[300px] focus:outline-none [&_.ProseMirror]:outline-none [&_.ProseMirror]:min-h-[280px] [&_.ProseMirror]:[&::selection]:bg-blue-200 [&_.ProseMirror]:dark:[&::selection]:bg-blue-800 [&_.comment-highlight]:bg-yellow-200 [&_.comment-highlight]:dark:bg-yellow-900/50 [&_.comment-highlight]:cursor-pointer [&_.ProseMirror_p.is-editor-empty:first-child::before]:content-[attr(data-placeholder)] [&_.ProseMirror_p.is-editor-empty:first-child::before]:text-gray-400 [&_.ProseMirror_p.is-editor-empty:first-child::before]:float-left [&_.ProseMirror_p.is-editor-empty:first-child::before]:pointer-events-none [&_.ProseMirror_p.is-editor-empty:first-child::before]:h-0 [&_.ProseMirror_table]:border-collapse [&_.ProseMirror_table]:w-full [&_.ProseMirror_table]:my-4 [&_.ProseMirror_td]:border [&_.ProseMirror_td]:border-gray-300 [&_.ProseMirror_td]:dark:border-gray-600 [&_.ProseMirror_td]:p-2 [&_.ProseMirror_th]:border [&_.ProseMirror_th]:border-gray-300 [&_.ProseMirror_th]:dark:border-gray-600 [&_.ProseMirror_th]:p-2 [&_.ProseMirror_th]:bg-gray-100 [&_.ProseMirror_th]:dark:bg-gray-800 [&_.ProseMirror_th]:font-semibold"
          />
        </div>

        {/* Button for adding comments */}
        {currentUser && canComment && (
          <AddCommentPopover
            position={popoverPosition}
            onOpenCommentPanel={handleOpenCommentPanel}
          />
        )}
      </div>

      {/* Comment input panel - appears to the side */}
      {canComment && (
        <CommentInputPanel
          isOpen={isCommentPanelOpen}
          currentUser={currentUser}
          selectedText={selectedText}
          onSubmit={handleAddComment}
          onCancel={handleCancelCommentPanel}
        />
      )}

      {/* Comments section - below */}
      <div className="border border-gray-200 dark:border-gray-700 rounded-lg p-4 bg-gray-50 dark:bg-gray-800/50">
        <CommentSidebar
          comments={comments}
          currentUserId={currentUser?.identifier}
          activeCommentId={activeCommentId}
          onCommentClick={handleCommentClick}
          onReply={currentUser && canComment ? handleReplyToComment : undefined}
          onDelete={canComment ? handleDeleteComment : undefined}
          onResolve={canComment ? handleResolveComment : undefined}
        />
      </div>
    </div>
  );
}

// True when a TipTap doc has no text and no non-trivial structure — i.e. saving
// it would visually appear as an empty editor.
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
