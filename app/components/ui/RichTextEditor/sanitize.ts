/**
 * Sanitize a TipTap JSON document so the editor doesn't silently reject
 * the whole tree when it encounters something its extension set doesn't
 * understand. Three concerns covered:
 *   - Unknown node types (e.g. `image` when the Image extension isn't
 *     loaded, or any custom node from another schema) are dropped.
 *   - Unknown marks are stripped from text nodes for the same reason.
 *   - Heading and paragraph nodes that arrive without a `content`
 *     array get an empty one — some backend exports omit the field
 *     entirely, which ProseMirror treats as malformed.
 *
 * Pure function — caller passes the doc in, gets a new doc back. The
 * input is never mutated.
 */

const ALLOWED_NODE_TYPES = new Set([
  "doc",
  "paragraph",
  "text",
  "heading",
  "blockquote",
  "bulletList",
  "orderedList",
  "listItem",
  "codeBlock",
  "hardBreak",
  "horizontalRule",
  "table",
  "tableRow",
  "tableCell",
  "tableHeader",
  "image",
]);

const ALLOWED_MARK_TYPES = new Set(["bold", "italic", "strike", "code"]);

interface TipTapNode {
  type?: string;
  content?: unknown[];
  marks?: Array<{ type?: string }>;
  text?: string;
  attrs?: Record<string, unknown>;
}

export function sanitizeTipTapDoc(
  doc: unknown,
  extraAllowedNodes?: ReadonlySet<string>,
  extraAllowedMarks?: ReadonlySet<string>
): Record<string, unknown> | null {
  if (!doc || typeof doc !== "object") return null;

  const isAllowedNode = (type: string) =>
    ALLOWED_NODE_TYPES.has(type) || extraAllowedNodes?.has(type) === true;
  const isAllowedMark = (type: string) =>
    ALLOWED_MARK_TYPES.has(type) || extraAllowedMarks?.has(type) === true;

  const walk = (node: unknown): unknown | null => {
    if (!node || typeof node !== "object") return null;
    const n = node as TipTapNode;
    if (!n.type || !isAllowedNode(n.type)) return null;

    const next: Record<string, unknown> = { ...n };
    if (Array.isArray(n.content)) {
      next.content = n.content
        .map(walk)
        .filter((c) => c !== null) as unknown[];
    }
    if (
      (n.type === "heading" || n.type === "paragraph") &&
      !Array.isArray(next.content)
    ) {
      next.content = [];
    }
    if (Array.isArray(n.marks)) {
      next.marks = n.marks.filter(
        (m) => m?.type !== undefined && isAllowedMark(m.type)
      );
    }
    return next;
  };

  return walk(doc) as Record<string, unknown> | null;
}
