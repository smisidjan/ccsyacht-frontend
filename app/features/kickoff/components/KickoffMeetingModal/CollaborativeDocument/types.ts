/**
 * Kickoff-specific adapters around the shared comment types. The
 * generic comment internals live in
 * `app/components/ui/RichTextEditor/comments/types.ts`; this file
 * keeps the API ↔ internal-format converters next to the consumer
 * that needs them (the kickoff document).
 */

import type {
  DocumentComment as ApiDocumentComment,
  DocumentCommentReply as ApiDocumentCommentReply,
} from "@/lib/api/types";
import type {
  InternalComment,
  InternalCommentReply,
  CommentThreadProps,
  CommentSidebarProps,
  CommentInputPanelProps,
} from "@/app/components/ui/RichTextEditor/comments/types";

// Re-export so consumers in this folder keep working off `./types`.
export type { ApiDocumentComment, ApiDocumentCommentReply };
export type {
  InternalComment,
  InternalCommentReply,
  CommentThreadProps,
  CommentSidebarProps,
  CommentInputPanelProps,
};

export function normalizeComment(apiComment: ApiDocumentComment): InternalComment {
  return {
    id: apiComment.identifier,
    text: apiComment.text,
    author: {
      identifier: apiComment.author.identifier,
      name: apiComment.author.name,
    },
    createdAt: apiComment.dateCreated,
    updatedAt: apiComment.dateModified,
    selectedText: apiComment.selectedText || undefined,
    from: apiComment.from || 0,
    to: apiComment.to || 0,
    replies: apiComment.replies?.map((reply: ApiDocumentCommentReply) => ({
      id: reply.identifier,
      text: reply.text,
      author: {
        identifier: reply.author.identifier,
        name: reply.author.name,
      },
      createdAt: reply.dateCreated,
    })),
    isResolved: apiComment.isResolved,
  };
}

export function normalizeComments(
  apiComments: ApiDocumentComment[]
): InternalComment[] {
  return apiComments.map(normalizeComment);
}

export interface CollaborativeDocumentProps {
  projectId: string;
  taskId: string;
  documentId: string;
  /** Initial content (TipTap JSON) */
  initialContent?: Record<string, unknown> | null;
  /** Initial comments from API */
  initialComments?: ApiDocumentComment[];
  /** Optimistic-locking version from the server. Sent back on content saves. */
  version?: number;
  /** Current user info */
  currentUser: {
    identifier: string;
    name: string;
  } | null;
  /** Whether the document content is editable */
  editable?: boolean;
  /** Whether the user can add comments (separate from content editing) */
  canComment?: boolean;
  /** Which section to render. Defaults to both for backward compatibility. */
  view?: "document" | "comments";
  /** Callback when content changes */
  onContentChange?: (content: Record<string, unknown>) => void;
  /** Callback when comments change (API format) */
  onCommentsChange?: (comments: ApiDocumentComment[]) => void;
  /** Refetch the parent's document state (after comment add/delete or 409). */
  onRefetch?: () => void | Promise<void>;
  /**
   * Called after a successful content save with the server response.
   * Parent should sync the document (especially the version field) so the
   * next save is not rejected with 409 for sending a stale version.
   */
  onSaved?: (response: unknown) => void;
}
