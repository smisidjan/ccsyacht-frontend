/**
 * Internal comment types used by the shared RichTextEditor's comment
 * surface. The editor doesn't know about any specific API shape — the
 * consumer normalises whatever the backend returns into these structures
 * and supplies them via the `comments.items` prop.
 */

export interface InternalCommentAuthor {
  identifier: string;
  name: string;
}

export interface InternalCommentReply {
  id: string;
  text: string;
  author: InternalCommentAuthor;
  createdAt: string;
}

export interface InternalComment {
  id: string;
  text: string;
  author: InternalCommentAuthor;
  createdAt: string;
  updatedAt?: string;
  /** The text the comment was attached to at creation time. */
  selectedText?: string;
  /** TipTap document positions of the highlighted range. */
  from: number;
  to: number;
  replies?: InternalCommentReply[];
  isResolved?: boolean;
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

export interface CommentInputPanelProps {
  isOpen: boolean;
  currentUser: InternalCommentAuthor | null;
  /** The text the comment is being attached to. */
  selectedText?: string;
  /** Comments already overlapping the current selection — surfaced so
   *  the user sees what's already there before composing a new one. */
  existingComments?: InternalComment[];
  onSubmit: (text: string) => void;
  onCancel: () => void;
  /** Reply to one of the existing comments shown in the panel. */
  onReply?: (commentId: string, text: string) => void | Promise<void>;
}
