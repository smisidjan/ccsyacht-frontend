/**
 * Types for the Collaborative Document with Comments
 * Note: These types are used internally in the component.
 * The API types are in lib/api/types.ts
 */

import type {
  DocumentComment as ApiDocumentComment,
  DocumentCommentReply as ApiDocumentCommentReply,
} from "@/lib/api/types";

// Re-export API types for external use
export type { ApiDocumentComment, ApiDocumentCommentReply };

// Internal comment format (normalized for component use)
export interface InternalComment {
  id: string;
  text: string;
  author: {
    identifier: string;
    name: string;
  };
  createdAt: string;
  updatedAt?: string;
  /** The selected text this comment refers to */
  selectedText?: string;
  /** Position in the document (for highlighting) */
  from: number;
  to: number;
  /** Replies to this comment */
  replies?: InternalCommentReply[];
  /** Whether this comment is resolved */
  isResolved?: boolean;
}

export interface InternalCommentReply {
  id: string;
  text: string;
  author: {
    identifier: string;
    name: string;
  };
  createdAt: string;
}

// Helper to convert API comment to internal format
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

// Helper to convert array of API comments
export function normalizeComments(apiComments: ApiDocumentComment[]): InternalComment[] {
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
  /** Callback when content changes */
  onContentChange?: (content: Record<string, unknown>) => void;
  /** Callback when comments change (API format) */
  onCommentsChange?: (comments: ApiDocumentComment[]) => void;
  /** Refetch the parent's document state (after comment add/delete or 409). */
  onRefetch?: () => void | Promise<void>;
}

export interface CommentThreadProps {
  comment: InternalComment;
  currentUserId?: string;
  isActive?: boolean;
  onReply?: (commentId: string, text: string) => void;
  onDelete?: (commentId: string) => void;
  onResolve?: (commentId: string) => void;
  onClick?: () => void;
}

export interface CommentSidebarProps {
  comments: InternalComment[];
  currentUserId?: string;
  activeCommentId?: string | null;
  onCommentClick?: (commentId: string) => void;
  onReply?: (commentId: string, text: string) => void;
  onDelete?: (commentId: string) => void;
  onResolve?: (commentId: string) => void;
}

export interface AddCommentPopoverProps {
  position: { top: number; left: number } | null;
  onOpenCommentPanel: () => void;
}

export interface CommentInputPanelProps {
  isOpen: boolean;
  currentUser: {
    identifier: string;
    name: string;
  } | null;
  /** The text that is being commented on */
  selectedText?: string;
  onSubmit: (text: string) => void;
  onCancel: () => void;
}
