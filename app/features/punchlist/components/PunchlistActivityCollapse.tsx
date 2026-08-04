"use client";

import { useEffect, useState } from "react";
import { useTranslations } from "next-intl";
import { ChevronDownIcon } from "@heroicons/react/24/outline";
import { useLogbook } from "@/lib/api";

interface PunchlistActivityCollapseProps {
  projectId: string;
  itemId: string;
  /** Bumped by the parent on any mutation so the activity feed picks
   *  up the new entry without remounting. */
  refreshTrigger?: number;
}

/** Verb shown next to the actor's name, derived from the logbook
 *  entry's action type. Falls back to a humanised version of the
 *  raw key if the backend ever emits a type we haven't mapped yet. */
const actionLabel = (
  name: string,
  t: (key: string) => string
): string => {
  switch (name) {
    case "punchlist_item_created":
      return t("activityCreated");
    case "punchlist_item_updated":
      return t("activityUpdated");
    case "punchlist_item_status_changed":
      return t("activityStatusChanged");
    case "punchlist_item_deleted":
      return t("activityDeleted");
    case "punchlist_item_assignees_added":
      return t("activityAssigneesAdded");
    case "punchlist_item_assignee_removed":
      return t("activityAssigneeRemoved");
    case "punchlist_attachment_uploaded":
      return t("activityAttachmentUploaded");
    case "punchlist_attachment_deleted":
      return t("activityAttachmentDeleted");
    case "punchlist_item_comment_added":
      return t("activityCommentAdded");
    default:
      // Humanise the raw key so we never end up with a blank verb.
      return name.replace(/_/g, " ");
  }
};

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

/** Jira-style Activity section on the punchlist detail panel —
 *  collapsible header, "History" sub-tab (the only one we support
 *  today), and a chronological list of entries pulled from the
 *  project logbook filtered down to this single item. */
export default function PunchlistActivityCollapse({
  projectId,
  itemId,
  refreshTrigger,
}: PunchlistActivityCollapseProps) {
  const t = useTranslations("punchlist");
  const [expanded, setExpanded] = useState(true);

  const { data: entries, loading, error, refetch } = useLogbook(projectId, {
    punchlist_item_id: itemId,
    per_page: 50,
  });

  // Re-fetch when the parent signals a mutation. `refreshTrigger`
  // started life inside the filters key but that put it on the wire
  // as `?page=…`, which the backend obediently honoured and answered
  // with an empty page. Keep it out of the filters and just nudge
  // refetch() from an effect.
  useEffect(() => {
    if (refreshTrigger === undefined || refreshTrigger === 0) return;
    refetch();
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [refreshTrigger]);

  return (
    <div className="mt-5 pt-5 border-t border-gray-100 dark:border-gray-700/60">
      <button
        type="button"
        onClick={() => setExpanded((v) => !v)}
        className="flex items-center gap-2 text-sm font-semibold text-gray-900 dark:text-white hover:opacity-80 transition-opacity"
        aria-expanded={expanded}
      >
        <ChevronDownIcon
          className={`w-4 h-4 transition-transform ${
            expanded ? "" : "-rotate-90"
          }`}
          aria-hidden="true"
        />
        {t("activityHeader")}
      </button>

      {expanded && (
        <div className="mt-3">
          {loading && entries === null && (
            <div className="space-y-3">
              {Array.from({ length: 3 }).map((_, i) => (
                <div
                  key={i}
                  className="h-12 rounded-md bg-gray-100 dark:bg-gray-800 animate-pulse"
                />
              ))}
            </div>
          )}

          {error && (
            <p className="text-sm text-red-600 dark:text-red-400">
              {error.message || t("activityLoadError")}
            </p>
          )}

          {!loading && entries && entries.length === 0 && (
            <p className="text-sm italic text-gray-500 dark:text-gray-400">
              {t("activityEmpty")}
            </p>
          )}

          {entries && entries.length > 0 && (
            <ul className="space-y-4">
              {entries.map((entry) => {
                const actorName = entry.agent?.name ?? t("activityUnknownUser");
                return (
                  <li key={entry.identifier} className="flex items-start gap-3">
                    <span
                      className={`w-7 h-7 rounded-full flex items-center justify-center text-[11px] font-semibold flex-shrink-0 ${toneOf(
                        actorName
                      )}`}
                      aria-hidden="true"
                    >
                      {initialsOf(actorName)}
                    </span>
                    <div className="flex-1 min-w-0">
                      <p className="text-sm text-gray-900 dark:text-white">
                        <span className="font-semibold">{actorName}</span>{" "}
                        <span className="text-gray-600 dark:text-gray-400">
                          {actionLabel(entry.name, t)}
                        </span>
                      </p>
                      <p className="text-xs text-gray-500 dark:text-gray-400 mt-0.5">
                        {formatTimestamp(entry.startTime)}
                      </p>
                      {entry.description && (
                        <p className="text-xs text-gray-700 dark:text-gray-300 mt-1.5">
                          {entry.description}
                        </p>
                      )}
                    </div>
                  </li>
                );
              })}
            </ul>
          )}
        </div>
      )}
    </div>
  );
}
