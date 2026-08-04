"use client";

import { useMemo, useRef, useState } from "react";
import { useTranslations } from "next-intl";
import {
  PencilIcon,
  TrashIcon,
  CheckIcon,
  XMarkIcon,
  UserPlusIcon,
} from "@heroicons/react/24/outline";
import DeleteConfirmModal from "@/app/components/modals/DeleteConfirmModal";
import { usePunchlistItemNotes } from "@/lib/api/punchlist-items";
import { useCurrentUserContext } from "@/app/context/CurrentUserContext";
import { useProjectMembersFromContext } from "@/app/context/ProjectContext";
import { usePermission } from "@/lib/hooks/usePermission";
import { PERMISSIONS } from "@/lib/constants/permissions";
import { useToast } from "@/app/context/ToastContext";
import { handleError } from "@/lib/utils/errors";
import type { PunchlistItemNote, PunchlistItemMention } from "@/lib/api/types";

interface PunchlistCommentsSectionProps {
  projectId: string;
  itemId: string;
  /** Fired after a comment is posted, edited, or deleted — each of
   *  those writes its own logbook entry server-side, but that log is
   *  fetched by the separate `PunchlistActivityCollapse` section, so
   *  the parent needs this to know to refresh it. */
  onActivityChange?: () => void;
}

/** Taggable person — just the fields the mention picker/highlighter
 *  need, decoupled from `ProjectMember`'s membership-record wrapper. */
interface TaggableMember {
  identifier: string;
  name: string;
}

// Same avatar palette/hash as `PunchlistActivityCollapse` so a user's
// initials chip reads the same color in both the comment thread and
// the activity feed.
const palette = [
  "bg-blue-100 text-blue-700 dark:bg-blue-900/40 dark:text-blue-300",
  "bg-emerald-100 text-emerald-700 dark:bg-emerald-900/40 dark:text-emerald-300",
  "bg-amber-100 text-amber-700 dark:bg-amber-900/40 dark:text-amber-300",
  "bg-violet-100 text-violet-700 dark:bg-violet-900/40 dark:text-violet-300",
  "bg-rose-100 text-rose-700 dark:bg-rose-900/40 dark:text-rose-300",
  "bg-sky-100 text-sky-700 dark:bg-sky-900/40 dark:text-sky-300",
];

const toneOf = (name: string) => {
  let hash = 0;
  for (let i = 0; i < name.length; i++)
    hash = (hash * 31 + name.charCodeAt(i)) | 0;
  return palette[Math.abs(hash) % palette.length];
};

const initialsOf = (name: string) =>
  name
    .split(/\s+/)
    .filter(Boolean)
    .slice(0, 2)
    .map((p) => p[0]?.toUpperCase() ?? "")
    .join("") || "?";

const formatTimestamp = (iso: string) => {
  const d = new Date(iso);
  return d.toLocaleString(undefined, {
    day: "numeric",
    month: "long",
    year: "numeric",
    hour: "2-digit",
    minute: "2-digit",
  });
};

/** Splits a comment's text on its `@Name` mentions and wraps each match
 *  in a highlighted span. Only names present in `mentions` are
 *  highlighted, so a literal "@" a user typed without picking someone
 *  from the autocomplete stays plain text. */
function splitOnMentionNames(text: string, names: string[]) {
  if (names.length === 0) return [{ text, isMention: false }];
  // Longest name first so "Paul Bournas" matches before a shorter
  // overlapping "Paul" would.
  const sorted = [...new Set(names)].sort((a, b) => b.length - a.length);
  const escaped = sorted.map((n) => n.replace(/[.*+?^${}()|[\]\\]/g, "\\$&"));
  const re = new RegExp(`(@(?:${escaped.join("|")}))`, "g");
  return text
    .split(re)
    .filter((part) => part.length > 0)
    .map((part) => ({
      text: part,
      isMention: sorted.some((n) => `@${n}` === part),
    }));
}

function renderTextWithMentions(
  text: string,
  mentions: PunchlistItemMention[]
) {
  if (mentions.length === 0) return text;
  return splitOnMentionNames(
    text,
    mentions.map((m) => m.name)
  ).map((part, i) =>
    part.isMention ? (
      <span key={i} className="font-medium text-blue-600 dark:text-blue-400">
        {part.text}
      </span>
    ) : (
      <span key={i}>{part.text}</span>
    )
  );
}

/** Textarea with `@name` mention autocomplete. Typing "@" followed by
 *  letters (no space yet) opens a filtered dropdown of project
 *  members; picking one inserts "@Full Name " and records the
 *  member's id. Deleting the "@Name" text back out of the draft drops
 *  the id again — the id list is always re-derived from what's still
 *  literally in the text rather than tracked as separate ranges, which
 *  keeps this simple at the cost of not handling two members sharing
 *  an identical name (rare enough not to design around here). */
function MentionTextarea({
  value,
  mentionIds,
  onChange,
  members,
  placeholder,
  rows = 2,
  autoFocus = false,
  className,
  onSubmitShortcut,
}: {
  value: string;
  mentionIds: string[];
  onChange: (value: string, mentionIds: string[]) => void;
  members: TaggableMember[];
  placeholder?: string;
  rows?: number;
  autoFocus?: boolean;
  className: string;
  onSubmitShortcut?: () => void;
}) {
  const textareaRef = useRef<HTMLTextAreaElement>(null);
  const backdropRef = useRef<HTMLDivElement>(null);
  const [query, setQuery] = useState<string | null>(null);
  const [triggerIndex, setTriggerIndex] = useState(-1);

  // Names behind the currently-tracked mention ids — what the
  // highlight backdrop below matches against. Only ids the user
  // actually picked (quick-add or the "@" dropdown) get the gray pill;
  // a literal "@word" typed by hand doesn't.
  const mentionedNames = useMemo(
    () =>
      mentionIds
        .map((id) => members.find((m) => m.identifier === id)?.name)
        .filter((n): n is string => !!n),
    [mentionIds, members]
  );

  // Keeps the (non-interactive) highlight layer scrolled in lockstep
  // with the real textarea so multi-line drafts stay aligned.
  const handleScroll = () => {
    if (backdropRef.current && textareaRef.current) {
      backdropRef.current.scrollTop = textareaRef.current.scrollTop;
      backdropRef.current.scrollLeft = textareaRef.current.scrollLeft;
    }
  };

  const suggestions = useMemo(() => {
    if (query === null) return [];
    const q = query.toLowerCase();
    return members
      .filter((m) => m.name.toLowerCase().includes(q))
      .slice(0, 6);
  }, [members, query]);

  const detectTrigger = (text: string, caret: number) => {
    const uptoCaret = text.slice(0, caret);
    const at = uptoCaret.lastIndexOf("@");
    if (at === -1) return null;
    if (at > 0 && !/\s/.test(uptoCaret[at - 1])) return null;
    const fragment = uptoCaret.slice(at + 1);
    if (/\s/.test(fragment)) return null;
    return { at, fragment };
  };

  const pruneMentionIds = (text: string) =>
    mentionIds.filter((id) => {
      const member = members.find((m) => m.identifier === id);
      return member ? text.includes(`@${member.name}`) : false;
    });

  const handleChange = (e: React.ChangeEvent<HTMLTextAreaElement>) => {
    const nextText = e.target.value;
    onChange(nextText, pruneMentionIds(nextText));

    const caret = e.target.selectionStart ?? nextText.length;
    const trigger = detectTrigger(nextText, caret);
    if (trigger) {
      setQuery(trigger.fragment);
      setTriggerIndex(trigger.at);
    } else {
      setQuery(null);
      setTriggerIndex(-1);
    }
  };

  // Replaces the active "@query" fragment (from a live `@` trigger) —
  // used by the dropdown. Quick-add (below) has no fragment to
  // replace, so it goes through `insertMention` instead.
  const selectMember = (member: TaggableMember) => {
    if (triggerIndex === -1 || !textareaRef.current) {
      insertMention(member);
      return;
    }
    const caret = textareaRef.current.selectionStart ?? value.length;
    const before = value.slice(0, triggerIndex);
    const after = value.slice(caret);
    const inserted = `@${member.name} `;
    const nextText = `${before}${inserted}${after}`;
    const nextIds = mentionIds.includes(member.identifier)
      ? mentionIds
      : [...mentionIds, member.identifier];
    onChange(nextText, nextIds);
    setQuery(null);
    setTriggerIndex(-1);
    requestAnimationFrame(() => {
      const pos = before.length + inserted.length;
      textareaRef.current?.focus();
      textareaRef.current?.setSelectionRange(pos, pos);
    });
  };

  // Jira-style quick-add: append "@Name " at the current caret (or the
  // end, if the field isn't focused) instead of replacing a typed "@"
  // fragment — this is the row of member buttons below the field, not
  // the live-typing dropdown.
  const insertMention = (member: TaggableMember) => {
    const el = textareaRef.current;
    const caret = el ? el.selectionStart ?? value.length : value.length;
    const before = value.slice(0, caret);
    const after = value.slice(caret);
    const needsLeadingSpace = before.length > 0 && !/\s$/.test(before);
    const inserted = `${needsLeadingSpace ? " " : ""}@${member.name} `;
    const nextText = `${before}${inserted}${after}`;
    const nextIds = mentionIds.includes(member.identifier)
      ? mentionIds
      : [...mentionIds, member.identifier];
    onChange(nextText, nextIds);
    requestAnimationFrame(() => {
      const pos = before.length + inserted.length;
      el?.focus();
      el?.setSelectionRange(pos, pos);
    });
  };

  // Quick-add row only offers people not already tagged in the draft —
  // once picked, the button drops out and the name reads directly out
  // of the text itself instead.
  const unmentionedMembers = members.filter(
    (m) => !mentionIds.includes(m.identifier)
  );

  return (
    <div>
      <div className="relative">
        {/* Highlight layer — sits exactly under the textarea (same box
            model via the shared `className`) and renders the same text
            with tracked mentions given a gray pill background. The
            textarea on top keeps real text/caret but with its glyphs
            made transparent, so what the user sees is this layer while
            still typing/selecting/scrolling the native field normally. */}
        <div
          ref={backdropRef}
          aria-hidden="true"
          className={`${className} absolute inset-0 overflow-hidden whitespace-pre-wrap break-words pointer-events-none`}
          style={{ background: "transparent", borderColor: "transparent" }}
        >
          {splitOnMentionNames(value, mentionedNames).map((part, i) =>
            part.isMention ? (
              <span
                key={i}
                className="bg-gray-200 dark:bg-gray-600 rounded"
              >
                {part.text}
              </span>
            ) : (
              part.text
            )
          )}
          {/* Zero-width trailing char so a trailing newline reserves a
              visual line here the same way it does in the textarea. */}
          {"​"}
        </div>
        <textarea
          ref={textareaRef}
          autoFocus={autoFocus}
          value={value}
          onChange={handleChange}
          onScroll={handleScroll}
          onKeyDown={(e) => {
            if (e.key === "Escape" && query !== null) {
              e.preventDefault();
              setQuery(null);
              setTriggerIndex(-1);
              return;
            }
            if (onSubmitShortcut && e.key === "Enter" && (e.metaKey || e.ctrlKey)) {
              e.preventDefault();
              onSubmitShortcut();
            }
          }}
          rows={rows}
          placeholder={placeholder}
          className={`${className} relative resize-none caret-gray-900 dark:caret-white placeholder:text-gray-400 dark:placeholder:text-gray-500`}
          style={{ background: "transparent", color: "transparent" }}
        />
        {query !== null && suggestions.length > 0 && (
          <div className="absolute left-0 z-20 mt-1 w-72 max-h-56 overflow-y-auto bg-white dark:bg-gray-800 border border-gray-200 dark:border-gray-700 rounded-md shadow-lg py-1">
            {suggestions.map((m) => (
              <button
                key={m.identifier}
                type="button"
                // Mousedown (not click) fires before the textarea's blur,
                // so the selection/caret used by `selectMember` is still
                // valid at the moment this handler runs.
                onMouseDown={(e) => {
                  e.preventDefault();
                  selectMember(m);
                }}
                className="w-full flex items-center gap-2.5 text-left px-3 py-2 text-sm text-gray-900 dark:text-white hover:bg-gray-50 dark:hover:bg-gray-700"
              >
                <span
                  className={`w-7 h-7 rounded-full flex items-center justify-center text-[11px] font-semibold flex-shrink-0 ${toneOf(
                    m.name
                  )}`}
                  aria-hidden="true"
                >
                  {initialsOf(m.name)}
                </span>
                {m.name}
              </button>
            ))}
          </div>
        )}
      </div>

      {/* Quick-add row — same idea as Jira's "@ to mention someone"
          people strip under the comment box, so tagging a project
          member doesn't require typing "@" and a name at all. */}
      {unmentionedMembers.length > 0 && (
        <div className="flex items-center gap-2 flex-wrap mt-2">
          <UserPlusIcon
            className="w-4 h-4 text-gray-400 flex-shrink-0"
            aria-hidden="true"
          />
          {unmentionedMembers.map((m) => (
            <button
              key={m.identifier}
              type="button"
              onClick={() => insertMention(m)}
              className="inline-flex items-center gap-1.5 pl-1 pr-2.5 py-1 rounded-full border border-gray-200 dark:border-gray-700 bg-white dark:bg-gray-800 hover:bg-gray-50 dark:hover:bg-gray-700 text-xs text-gray-700 dark:text-gray-300 transition-colors"
            >
              <span
                className={`w-5 h-5 rounded-full flex items-center justify-center text-[9px] font-semibold ${toneOf(
                  m.name
                )}`}
                aria-hidden="true"
              >
                {initialsOf(m.name)}
              </span>
              {m.name}
            </button>
          ))}
        </div>
      )}
    </div>
  );
}

/** Comment thread on a punchlist item's detail panel. Notes only ever
 *  arrive inlined on the item detail response (see
 *  `usePunchlistItemNotes`), so this section owns its own fetch
 *  independent of the `item` object the parent card was handed —
 *  mirrors how `PunchlistActivityCollapse` and the attachments section
 *  each keep their own state.
 *
 *  Edit / delete controls are hidden for comments that aren't the
 *  current user's own — the backend rejects those with a 403 anyway,
 *  but filtering client-side avoids a dead-end click. */
export default function PunchlistCommentsSection({
  projectId,
  itemId,
  onActivityChange,
}: PunchlistCommentsSectionProps) {
  const t = useTranslations("punchlist");
  const { showToast } = useToast();
  const { hasPermission } = usePermission();
  const { currentUser } = useCurrentUserContext();
  const { data: projectMembers } = useProjectMembersFromContext();
  const {
    data: notes,
    loading,
    error,
    addNote,
    editNote,
    removeNote,
  } = usePunchlistItemNotes(projectId, itemId);

  const canCreate = hasPermission(PERMISSIONS.CREATE_PUNCHLIST_ITEMS);
  const canEdit = hasPermission(PERMISSIONS.EDIT_PUNCHLIST_ITEMS);
  const canDelete = hasPermission(PERMISSIONS.DELETE_PUNCHLIST_ITEMS);

  // Taggable people are project members — the membership record's own
  // `identifier` is the membership row, not the user, so unwrap to
  // `member.member` for the actual user id/name the backend expects
  // in `mention_ids`.
  const taggableMembers = useMemo<TaggableMember[]>(
    () =>
      (projectMembers ?? []).map((m) => ({
        identifier: m.member.identifier,
        name: m.member.name,
      })),
    [projectMembers]
  );

  const [draft, setDraft] = useState("");
  const [draftMentionIds, setDraftMentionIds] = useState<string[]>([]);
  const [posting, setPosting] = useState(false);
  const [editingNoteId, setEditingNoteId] = useState<string | null>(null);
  const [editDraft, setEditDraft] = useState("");
  const [editMentionIds, setEditMentionIds] = useState<string[]>([]);
  const [savingEdit, setSavingEdit] = useState(false);
  const [noteToDelete, setNoteToDelete] = useState<PunchlistItemNote | null>(
    null
  );

  const handlePost = async () => {
    const content = draft.trim();
    if (!content) return;
    setPosting(true);
    try {
      await addNote(content, draftMentionIds);
      setDraft("");
      setDraftMentionIds([]);
      onActivityChange?.();
    } catch (err) {
      handleError(err, { showToast, fallbackMessage: t("commentPostError") });
    } finally {
      setPosting(false);
    }
  };

  const beginEditNote = (note: PunchlistItemNote) => {
    setEditingNoteId(note.identifier);
    setEditDraft(note.text);
    setEditMentionIds(note.mentions.map((m) => m.identifier));
  };
  const cancelEditNote = () => {
    setEditingNoteId(null);
    setEditDraft("");
    setEditMentionIds([]);
  };
  const saveEditNote = async () => {
    if (!editingNoteId) return;
    const content = editDraft.trim();
    if (!content) return;
    setSavingEdit(true);
    try {
      await editNote(editingNoteId, content, editMentionIds);
      setEditingNoteId(null);
      setEditDraft("");
      setEditMentionIds([]);
      onActivityChange?.();
    } catch (err) {
      handleError(err, {
        showToast,
        fallbackMessage: t("commentUpdateError"),
      });
    } finally {
      setSavingEdit(false);
    }
  };

  const fieldClassName =
    "w-full text-sm text-gray-900 dark:text-white bg-white dark:bg-gray-900 border border-gray-300 dark:border-gray-600 rounded-md px-3 py-2 focus:outline-none focus:ring-2 focus:ring-blue-500 focus:border-blue-500";
  const editFieldClassName =
    "w-full text-sm text-gray-900 dark:text-white bg-white dark:bg-gray-900 border border-blue-500 rounded-md px-3 py-2 focus:outline-none focus:ring-2 focus:ring-blue-500";

  return (
    <div className="mt-5 pt-5 border-t border-gray-100 dark:border-gray-700/60">
      <h3 className="flex items-center gap-2 text-xs font-semibold uppercase tracking-wide text-gray-500 dark:text-gray-400 mb-3">
        <span>{t("commentsHeader")}</span>
        {notes && notes.length > 0 && (
          <span className="inline-flex items-center justify-center min-w-[18px] h-[18px] px-1 text-[10px] font-semibold rounded bg-gray-100 dark:bg-gray-700 text-gray-700 dark:text-gray-300">
            {notes.length}
          </span>
        )}
      </h3>

      {loading && notes === null && (
        <div className="space-y-3 mb-4">
          {Array.from({ length: 2 }).map((_, i) => (
            <div
              key={i}
              className="h-12 rounded-md bg-gray-100 dark:bg-gray-800 animate-pulse"
            />
          ))}
        </div>
      )}

      {error && (
        <p className="text-sm text-red-600 dark:text-red-400 mb-3">
          {error.message || t("commentLoadError")}
        </p>
      )}

      {notes && notes.length === 0 && !loading && (
        <p className="text-sm italic text-gray-500 dark:text-gray-400 mb-4">
          {t("commentEmpty")}
        </p>
      )}

      {notes && notes.length > 0 && (
        <ul className="space-y-4 mb-4">
          {notes.map((note) => {
            const isOwn = currentUser?.identifier === note.author.identifier;
            const isEditing = editingNoteId === note.identifier;
            const wasEdited = note.dateModified !== note.dateCreated;
            return (
              <li key={note.identifier} className="flex items-start gap-3 group">
                <span
                  className={`w-7 h-7 rounded-full flex items-center justify-center text-[11px] font-semibold flex-shrink-0 ${toneOf(
                    note.author.name
                  )}`}
                  aria-hidden="true"
                >
                  {initialsOf(note.author.name)}
                </span>
                <div className="flex-1 min-w-0">
                  <div className="flex items-center gap-2">
                    <p className="text-sm">
                      <span className="font-semibold text-gray-900 dark:text-white">
                        {note.author.name}
                      </span>{" "}
                      <span className="text-xs text-gray-500 dark:text-gray-400">
                        {formatTimestamp(note.dateCreated)}
                        {wasEdited && ` · ${t("commentEdited")}`}
                      </span>
                    </p>
                    {isOwn && !isEditing && (canEdit || canDelete) && (
                      <div className="flex items-center gap-1 opacity-0 group-hover:opacity-100 transition-opacity">
                        {canEdit && (
                          <button
                            type="button"
                            onClick={() => beginEditNote(note)}
                            className="p-1 text-gray-400 hover:text-blue-600 dark:hover:text-blue-400 transition-colors"
                            aria-label={t("commentEdit")}
                            title={t("commentEdit")}
                          >
                            <PencilIcon className="w-3.5 h-3.5" />
                          </button>
                        )}
                        {canDelete && (
                          <button
                            type="button"
                            onClick={() => setNoteToDelete(note)}
                            className="p-1 text-gray-400 hover:text-red-600 dark:hover:text-red-400 transition-colors"
                            aria-label={t("commentDelete")}
                            title={t("commentDelete")}
                          >
                            <TrashIcon className="w-3.5 h-3.5" />
                          </button>
                        )}
                      </div>
                    )}
                  </div>
                  {isEditing ? (
                    <div className="mt-1.5 space-y-2">
                      <MentionTextarea
                        value={editDraft}
                        mentionIds={editMentionIds}
                        onChange={(next, ids) => {
                          setEditDraft(next);
                          setEditMentionIds(ids);
                        }}
                        members={taggableMembers}
                        rows={3}
                        autoFocus
                        className={editFieldClassName}
                        onSubmitShortcut={saveEditNote}
                      />
                      <div className="flex items-center gap-1">
                        <button
                          type="button"
                          onClick={saveEditNote}
                          disabled={savingEdit || !editDraft.trim()}
                          className="inline-flex items-center justify-center w-8 h-8 rounded-md border border-gray-300 dark:border-gray-600 bg-white dark:bg-gray-800 text-gray-700 dark:text-gray-200 hover:bg-gray-50 dark:hover:bg-gray-700 disabled:opacity-50 disabled:cursor-not-allowed transition-colors"
                          aria-label={t("commentSave")}
                        >
                          <CheckIcon className="w-4 h-4" />
                        </button>
                        <button
                          type="button"
                          onClick={cancelEditNote}
                          disabled={savingEdit}
                          className="inline-flex items-center justify-center w-8 h-8 rounded-md border border-gray-300 dark:border-gray-600 bg-white dark:bg-gray-800 text-gray-700 dark:text-gray-200 hover:bg-gray-50 dark:hover:bg-gray-700 disabled:opacity-50 disabled:cursor-not-allowed transition-colors"
                          aria-label={t("commentCancel")}
                        >
                          <XMarkIcon className="w-4 h-4" />
                        </button>
                      </div>
                    </div>
                  ) : (
                    <p className="text-sm text-gray-700 dark:text-gray-300 whitespace-pre-line mt-0.5">
                      {renderTextWithMentions(note.text, note.mentions)}
                    </p>
                  )}
                </div>
              </li>
            );
          })}
        </ul>
      )}

      {canCreate && (
        <div className="space-y-2">
          <MentionTextarea
            value={draft}
            mentionIds={draftMentionIds}
            onChange={(next, ids) => {
              setDraft(next);
              setDraftMentionIds(ids);
            }}
            members={taggableMembers}
            rows={2}
            placeholder={t("commentPlaceholder")}
            className={fieldClassName}
            onSubmitShortcut={handlePost}
          />
          <div className="flex justify-end">
            <button
              type="button"
              onClick={handlePost}
              disabled={posting || !draft.trim()}
              className="inline-flex items-center px-3 py-1.5 text-xs font-medium text-white bg-blue-600 hover:bg-blue-700 rounded-md disabled:opacity-50 disabled:cursor-not-allowed transition-colors"
            >
              {posting ? t("commentPosting") : t("commentPost")}
            </button>
          </div>
        </div>
      )}

      <DeleteConfirmModal
        isOpen={!!noteToDelete}
        onClose={() => setNoteToDelete(null)}
        onConfirm={async () => {
          if (!noteToDelete) return;
          await removeNote(noteToDelete.identifier);
          onActivityChange?.();
        }}
        title={t("commentDeleteTitle")}
        message={t("commentDeleteMessage")}
        successMessage={t("commentDeleteSuccess")}
        errorMessage={t("commentDeleteError")}
      />
    </div>
  );
}
