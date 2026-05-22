"use client";

import { useEffect, useMemo, useRef, useState } from "react";
import { useTranslations } from "next-intl";
import {
  MagnifyingGlassIcon,
  UserPlusIcon,
  CheckIcon,
} from "@heroicons/react/24/outline";
import { punchlistItemsApi } from "@/lib/api/punchlist-items";
import { useProjectMembersFromContext } from "@/app/context/ProjectContext";
import { useToast } from "@/app/context/ToastContext";
import { handleError } from "@/lib/utils/errors";
import type { PunchlistItemAssignee } from "@/lib/api/types";

interface PunchlistAssigneePickerProps {
  projectId: string;
  itemId: string;
  assignees: PunchlistItemAssignee[];
  canEdit: boolean;
  /** "stack" — small overlapping avatar chips (used in the row).
   *  "pills" — name + initials pills (used in the detail panel). */
  display?: "stack" | "pills";
  /** Bubble back up to the parent so the list / detail refetches when
   *  assignees change. */
  onChange?: () => void;
}

const palette = [
  "bg-blue-100 text-blue-700 dark:bg-blue-900/40 dark:text-blue-300",
  "bg-emerald-100 text-emerald-700 dark:bg-emerald-900/40 dark:text-emerald-300",
  "bg-amber-100 text-amber-700 dark:bg-amber-900/40 dark:text-amber-300",
  "bg-violet-100 text-violet-700 dark:bg-violet-900/40 dark:text-violet-300",
  "bg-rose-100 text-rose-700 dark:bg-rose-900/40 dark:text-rose-300",
  "bg-sky-100 text-sky-700 dark:bg-sky-900/40 dark:text-sky-300",
];

const initialsOf = (name: string) =>
  name
    .split(/\s+/)
    .filter(Boolean)
    .slice(0, 2)
    .map((p) => p[0]?.toUpperCase() ?? "")
    .join("") || "?";

const toneOf = (name: string) => {
  let hash = 0;
  for (let i = 0; i < name.length; i++)
    hash = (hash * 31 + name.charCodeAt(i)) | 0;
  return palette[Math.abs(hash) % palette.length];
};

/** Assignee picker shared by row + detail. Click the trigger to open
 *  a member-list popover; toggling a checkbox immediately hits the
 *  backend add/remove endpoints so the user doesn't deal with a
 *  separate Save step. Project members are sourced from the project
 *  context (one fetch up the tree, no per-pick request). */
export default function PunchlistAssigneePicker({
  projectId,
  itemId,
  assignees,
  canEdit,
  display = "stack",
  onChange,
}: PunchlistAssigneePickerProps) {
  const t = useTranslations("punchlist");
  const { showToast } = useToast();
  const { data: projectMembers } = useProjectMembersFromContext();
  const [open, setOpen] = useState(false);
  const [query, setQuery] = useState("");
  const [pendingId, setPendingId] = useState<string | null>(null);
  const wrapperRef = useRef<HTMLDivElement | null>(null);

  useEffect(() => {
    if (!open) return;
    const handleClick = (e: MouseEvent) => {
      if (!wrapperRef.current?.contains(e.target as Node)) setOpen(false);
    };
    const handleKey = (e: KeyboardEvent) => {
      if (e.key === "Escape") setOpen(false);
    };
    document.addEventListener("mousedown", handleClick);
    document.addEventListener("keydown", handleKey);
    return () => {
      document.removeEventListener("mousedown", handleClick);
      document.removeEventListener("keydown", handleKey);
    };
  }, [open]);

  const assignedIds = useMemo(
    () => new Set(assignees.map((a) => a.identifier)),
    [assignees]
  );

  const filteredMembers = useMemo(() => {
    if (!projectMembers) return [];
    const q = query.trim().toLowerCase();
    return projectMembers.filter((m) =>
      q ? m.member.name.toLowerCase().includes(q) : true
    );
  }, [projectMembers, query]);

  const toggle = async (userId: string, userName: string) => {
    setPendingId(userId);
    try {
      if (assignedIds.has(userId)) {
        await punchlistItemsApi.removeAssignee(projectId, itemId, userId);
        showToast("success", t("assigneeRemoved", { name: userName }));
      } else {
        await punchlistItemsApi.addAssignees(projectId, itemId, {
          user_ids: [userId],
        });
        showToast("success", t("assigneeAdded", { name: userName }));
      }
      onChange?.();
    } catch (err) {
      handleError(err, {
        showToast,
        fallbackMessage: t("assigneeUpdateError"),
      });
    } finally {
      setPendingId(null);
    }
  };

  // Trigger button — different visual for stack vs pills.
  const triggerInner =
    display === "stack" ? (
      assignees.length > 0 ? (
        <div className="flex items-center -space-x-1">
          {assignees.slice(0, 3).map((a) => (
            <AvatarWithHover
              key={a.identifier}
              name={a.name}
              email={a.email}
              tone={toneOf(a.name)}
            >
              <span
                className={`w-6 h-6 rounded-full flex items-center justify-center text-[10px] font-semibold border border-white dark:border-gray-800 ${toneOf(
                  a.name
                )}`}
              >
                {initialsOf(a.name)}
              </span>
            </AvatarWithHover>
          ))}
          {assignees.length > 3 && (
            <span className="w-6 h-6 rounded-full bg-gray-200 dark:bg-gray-700 text-[10px] font-semibold text-gray-700 dark:text-gray-300 flex items-center justify-center border border-white dark:border-gray-800">
              +{assignees.length - 3}
            </span>
          )}
        </div>
      ) : (
        <span
          className="w-6 h-6 rounded-full bg-gray-100 dark:bg-gray-700 border border-dashed border-gray-300 dark:border-gray-600 flex items-center justify-center text-gray-400"
          title={t("assignSomeone")}
        >
          <UserPlusIcon className="w-3.5 h-3.5" />
        </span>
      )
    ) : assignees.length > 0 ? (
      <div className="flex items-center flex-wrap gap-1.5">
        {assignees.map((a) => (
          <AvatarWithHover
            key={a.identifier}
            name={a.name}
            email={a.email}
            tone={toneOf(a.name)}
          >
            <span className="inline-flex items-center gap-1.5 pl-0.5 pr-2 py-0.5 rounded-full bg-gray-100 dark:bg-gray-700/70 text-xs font-medium text-gray-800 dark:text-gray-200">
              <span
                className={`w-5 h-5 rounded-full text-[10px] font-semibold flex items-center justify-center ${toneOf(
                  a.name
                )}`}
              >
                {initialsOf(a.name)}
              </span>
              {a.name}
            </span>
          </AvatarWithHover>
        ))}
      </div>
    ) : (
      <span className="inline-flex items-center gap-1 text-xs text-gray-500 dark:text-gray-400">
        <UserPlusIcon className="w-3.5 h-3.5" />
        {t("assignSomeone")}
      </span>
    );

  // Read-only path — no popover, no hover affordance, just the
  // current state.
  if (!canEdit) {
    return <span className="inline-block">{triggerInner}</span>;
  }

  return (
    <div className="relative inline-block" ref={wrapperRef}>
      <button
        type="button"
        onClick={(e) => {
          e.stopPropagation();
          setOpen((v) => !v);
        }}
        className="inline-flex items-center rounded hover:opacity-80 transition-opacity"
        title={t("editAssignees")}
        aria-haspopup="menu"
        aria-expanded={open}
      >
        {triggerInner}
      </button>

      {open && (
        <div
          className="absolute right-0 mt-1 z-30 w-[260px] bg-white dark:bg-gray-800 border border-gray-200 dark:border-gray-700 rounded-lg shadow-xl overflow-hidden"
          onClick={(e) => e.stopPropagation()}
        >
          <div className="p-2 border-b border-gray-100 dark:border-gray-700">
            <div className="relative">
              <MagnifyingGlassIcon className="w-4 h-4 absolute left-2.5 top-1/2 -translate-y-1/2 text-gray-400" />
              <input
                type="text"
                value={query}
                onChange={(e) => setQuery(e.target.value)}
                placeholder={t("assigneeSearchPlaceholder")}
                autoFocus
                className="w-full pl-8 pr-2 py-1.5 text-sm border border-gray-200 dark:border-gray-700 rounded-md bg-white dark:bg-gray-900 text-gray-900 dark:text-white focus:outline-none focus:ring-2 focus:ring-blue-500"
              />
            </div>
          </div>
          <div className="max-h-64 overflow-y-auto py-1">
            {filteredMembers.length === 0 ? (
              <p className="px-3 py-3 text-xs text-gray-500 dark:text-gray-400">
                {projectMembers && projectMembers.length === 0
                  ? t("noProjectMembers")
                  : t("noMatchingMembers")}
              </p>
            ) : (
              filteredMembers.map((m) => {
                const id = m.member.identifier;
                const name = m.member.name;
                const isChecked = assignedIds.has(id);
                const isPending = pendingId === id;
                return (
                  <button
                    key={id}
                    type="button"
                    disabled={isPending}
                    onClick={() => toggle(id, name)}
                    className="w-full flex items-center gap-2 px-3 py-1.5 text-left text-sm hover:bg-gray-50 dark:hover:bg-gray-700/60 transition-colors disabled:opacity-50 disabled:cursor-wait"
                  >
                    <span
                      className={`w-7 h-7 rounded-full flex items-center justify-center text-[11px] font-semibold ${toneOf(
                        name
                      )}`}
                    >
                      {initialsOf(name)}
                    </span>
                    <span className="flex-1 min-w-0 truncate text-gray-900 dark:text-white">
                      {name}
                    </span>
                    {isChecked && (
                      <CheckIcon className="w-4 h-4 text-blue-600 dark:text-blue-400" />
                    )}
                  </button>
                );
              })
            )}
          </div>
        </div>
      )}
    </div>
  );
}

/** Avatar wrapped in a hover-card with name + email. Pure CSS show /
 *  hide via `group-hover` so we don't need any state or portal — and
 *  it sits above sibling avatars in the stack thanks to z-index on the
 *  hovered group. */
function AvatarWithHover({
  name,
  email,
  tone,
  children,
}: {
  name: string;
  email: string;
  tone: string;
  children: React.ReactNode;
}) {
  return (
    <span className="relative group inline-flex hover:z-10">
      {children}
      <span
        className="pointer-events-none absolute left-1/2 -translate-x-1/2 bottom-full mb-2 z-50 opacity-0 scale-95 group-hover:opacity-100 group-hover:scale-100 transition-all duration-150"
        role="tooltip"
      >
        <span className="block min-w-[200px] bg-white dark:bg-gray-800 border border-gray-200 dark:border-gray-700 rounded-lg shadow-xl px-3 py-2.5">
          <span className="flex items-center gap-2.5">
            <span
              className={`w-9 h-9 rounded-full flex items-center justify-center text-sm font-semibold ${tone}`}
            >
              {name
                .split(/\s+/)
                .filter(Boolean)
                .slice(0, 2)
                .map((p) => p[0]?.toUpperCase() ?? "")
                .join("") || "?"}
            </span>
            <span className="flex flex-col min-w-0">
              <span className="text-sm font-semibold text-gray-900 dark:text-white truncate">
                {name}
              </span>
              <span className="text-xs text-gray-500 dark:text-gray-400 truncate">
                {email}
              </span>
            </span>
          </span>
        </span>
        {/* Pointer arrow below the card. */}
        <span className="block absolute left-1/2 -translate-x-1/2 top-full w-2 h-2 -mt-1 rotate-45 bg-white dark:bg-gray-800 border-r border-b border-gray-200 dark:border-gray-700" />
      </span>
    </span>
  );
}
