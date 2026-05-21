import StarterKit from "@tiptap/starter-kit";
import Placeholder from "@tiptap/extension-placeholder";
import { Table } from "@tiptap/extension-table";
import { TableRow } from "@tiptap/extension-table-row";
import { TableCell } from "@tiptap/extension-table-cell";
import { TableHeader } from "@tiptap/extension-table-header";
import Image from "@tiptap/extension-image";

/**
 * Base TipTap extension set used by every rich-text surface in the app
 * (templates, release forms, kickoff document). Centralising the set
 * here makes sure all surfaces accept the same node/mark types, so a
 * document authored in one place renders cleanly in another.
 *
 * `link` and `underline` from StarterKit v3 are intentionally disabled
 * — the backend whitelist doesn't accept them.
 */
export function createBaseExtensions(options?: { placeholder?: string }) {
  return [
    StarterKit.configure({
      link: false,
      underline: false,
    }),
    Placeholder.configure({
      placeholder: options?.placeholder ?? "",
    }),
    Table.configure({ resizable: true }),
    TableRow,
    TableCell,
    TableHeader,
    // `allowBase64: true` lets backend-rendered punchlist photos
    // (data URLs) embed in the doc instead of getting dropped.
    Image.configure({ inline: false, allowBase64: true }),
  ];
}
