"use client";

import { useMemo } from "react";
import { useTranslations } from "next-intl";
import { useProjectMembersFromContext } from "@/app/context/ProjectContext";
import type { PunchlistItem } from "@/lib/api/types";

interface PunchlistAssigneeQuickFilterProps {
  /** Currently loaded items — the avatar row is derived from their
   *  assignees so only relevant people show up (vs. the entire project
   *  member list). */
  items: PunchlistItem[];
  /** Selected user IDs — same axis as `PunchlistFilters.assigneeIds`,
   *  so toggling here updates the same filter the popover uses. */
  selectedIds: string[];
  onToggle: (userId: string) => void;
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

interface AssigneeInfo {
  id: string;
  name: string;
  email: string;
  role: string;
}

/** Avatar quick-filter row rendered next to the punchlist search.
 *  Click an avatar to toggle it in the assignee filter. Each avatar
 *  has a hover card with name, email, and project role. */
export default function PunchlistAssigneeQuickFilter({
  items,
  selectedIds,
  onToggle,
}: PunchlistAssigneeQuickFilterProps) {
  const t = useTranslations("punchlist");
  const { data: members } = useProjectMembersFromContext();

  // Build the set of unique assignees from the loaded items, decorated
  // with role information from the project members list. Sorted by
  // name for a stable layout.
  const assignees = useMemo<AssigneeInfo[]>(() => {
    const seen = new Map<string, AssigneeInfo>();
    for (const item of items) {
      for (const a of item.assignees) {
        if (seen.has(a.identifier)) continue;
        const pm = members?.find(
          (m) => m.member.identifier === a.identifier
        );
        seen.set(a.identifier, {
          id: a.identifier,
          name: a.name,
          email: a.email,
          role: pm?.roleName ?? "",
        });
      }
    }
    return Array.from(seen.values()).sort((a, b) =>
      a.name.localeCompare(b.name)
    );
  }, [items, members]);

  if (assignees.length === 0) return null;

  return (
    <div
      className="flex items-center flex-wrap gap-1.5"
      role="group"
      aria-label={t("filterCategoryAssignee")}
    >
      {assignees.map((a) => {
        const selected = selectedIds.includes(a.id);
        return (
          <span key={a.id} className="relative group inline-flex hover:z-10">
            <button
              type="button"
              onClick={() => onToggle(a.id)}
              aria-pressed={selected}
              aria-label={a.name}
              className={`w-7 h-7 rounded-full flex items-center justify-center text-[11px] font-semibold transition-all ${toneOf(
                a.name
              )} ${
                selected
                  ? "ring-2 ring-blue-500 ring-offset-2 ring-offset-white dark:ring-offset-gray-900"
                  : "hover:ring-2 hover:ring-gray-300 dark:hover:ring-gray-600 hover:ring-offset-1 hover:ring-offset-white dark:hover:ring-offset-gray-900 opacity-90 hover:opacity-100"
              }`}
            >
              {initialsOf(a.name)}
            </button>

            {/* Hover card with name + email + role */}
            <span
              className="pointer-events-none absolute left-1/2 -translate-x-1/2 top-full mt-2 z-50 opacity-0 scale-95 group-hover:opacity-100 group-hover:scale-100 transition-all duration-150"
              role="tooltip"
            >
              <span className="block min-w-[220px] bg-white dark:bg-gray-800 border border-gray-200 dark:border-gray-700 rounded-lg shadow-xl px-3 py-2.5">
                <span className="flex items-center gap-2.5">
                  <span
                    className={`w-9 h-9 rounded-full flex items-center justify-center text-sm font-semibold flex-shrink-0 ${toneOf(
                      a.name
                    )}`}
                  >
                    {initialsOf(a.name)}
                  </span>
                  <span className="flex flex-col min-w-0">
                    <span className="text-sm font-semibold text-gray-900 dark:text-white truncate">
                      {a.name}
                    </span>
                    <span className="text-xs text-gray-500 dark:text-gray-400 truncate">
                      {a.email}
                    </span>
                    {a.role && (
                      <span className="text-[10px] mt-0.5 inline-block self-start px-1.5 py-0.5 rounded bg-gray-100 dark:bg-gray-700 text-gray-700 dark:text-gray-300 font-medium uppercase tracking-wide">
                        {a.role}
                      </span>
                    )}
                  </span>
                </span>
              </span>
              <span className="block absolute left-1/2 -translate-x-1/2 bottom-full w-2 h-2 -mb-1 rotate-45 bg-white dark:bg-gray-800 border-l border-t border-gray-200 dark:border-gray-700" />
            </span>
          </span>
        );
      })}
    </div>
  );
}
