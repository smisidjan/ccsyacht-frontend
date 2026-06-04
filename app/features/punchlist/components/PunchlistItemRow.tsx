"use client";

import { useTranslations } from "next-intl";
import {
  ClockIcon,
  PaperClipIcon,
  MapPinIcon,
} from "@heroicons/react/24/outline";
import { CheckCircleIcon } from "@heroicons/react/24/solid";
import PunchlistStatusDropdown from "./PunchlistStatusDropdown";
import PunchlistPriorityDropdown from "./PunchlistPriorityDropdown";
import PunchlistAssigneePicker from "./PunchlistAssigneePicker";
import type {
  PunchlistItem,
  PunchlistItemPriority,
  PunchlistItemStatus,
  StageStatus,
} from "@/lib/api/types";

interface PunchlistItemRowProps {
  item: PunchlistItem;
  projectId: string;
  isSelected: boolean;
  onSelect: () => void;
  stageStatus?: StageStatus;
  canEdit: boolean;
  /** Project-wide display number — rendered as `#N` (top-level) or
   *  `#N.M` (child sub-item) next to the title so users can refer to
   *  an item by a short number instead of the UUID. The parent
   *  computes it from the full project tree so the same item gets
   *  the same number in every view. Omitted when the parent doesn't
   *  have that mapping at hand. */
  displayNumber?: string | number;
  /** When the detail panel is open the list column shrinks to ~⅓ of
   *  the screen — secondary fields (the "Created by" reporter) are
   *  hidden then so the title can keep using the available width. */
  compact?: boolean;
  /** Project-level views surface deck / area / stage breadcrumbs
   *  inline; stage-level views don't need them since context is
   *  implicit. Hidden on small / compact widths. */
  showLocation?: boolean;
  /** Optional dot rendered in front of the title — used on the GA
   *  tab where each row's pin / stage colour is the primary visual
   *  anchor mapping the row back to the marker on the drawing. */
  stageColor?: string | null;
  /** Sub-rows render against a slightly grey background to read as
   *  "indented under the parent" — but the default hover colour is
   *  that same grey, so the hover state visually disappears. When
   *  `true`, the row picks a darker hover tone so mousing over a
   *  child still produces an obvious highlight. */
  isSubRow?: boolean;
  /** External highlight — used by the GA tab to mirror a pin hover on
   *  the map into the matching list row, so hovering a pin lights up
   *  its row and vice versa. Same visual weight as the local hover
   *  state but driven by props instead of native :hover. */
  isHighlighted?: boolean;
  onChangeStatus: (next: PunchlistItemStatus) => void;
  onChangePriority: (next: PunchlistItemPriority) => void;
  onRequestCancel: () => void;
  onAssigneesChange: () => void;
}

/** Single-row representation of a punchlist item — modelled on the
 *  Jira backlog row. Title leads the row, priority + status
 *  dropdowns and the assignee stack sit to the right. Click on the
 *  row selects it; dropdowns stop propagation so changing a value
 *  doesn't simultaneously open/close the detail panel. */
export default function PunchlistItemRow({
  item,
  projectId,
  isSelected,
  onSelect,
  stageStatus,
  canEdit,
  displayNumber,
  compact = false,
  showLocation = false,
  stageColor,
  isSubRow = false,
  isHighlighted = false,
  onChangeStatus,
  onChangePriority,
  onRequestCancel,
  onAssigneesChange,
}: PunchlistItemRowProps) {
  const t = useTranslations("punchlist");

  return (
    // role-button div instead of a real <button> so the status
    // dropdown (which is itself a button + popover) can live inside
    // without producing invalid nested-button HTML.
    <div
      role="button"
      tabIndex={0}
      onClick={onSelect}
      onKeyDown={(e) => {
        if (e.key === "Enter" || e.key === " ") {
          e.preventDefault();
          onSelect();
        }
      }}
      className={`w-full flex items-center gap-3 px-4 py-2.5 text-left cursor-pointer transition-colors border-l-2 ${
        isSelected
          ? "bg-blue-50 dark:bg-blue-900/20 border-l-blue-500"
          : isHighlighted
            ? isSubRow
              ? "bg-gray-100 dark:bg-gray-700/70 border-l-transparent"
              : "bg-gray-50 dark:bg-gray-700/40 border-l-transparent"
            : isSubRow
              ? "border-l-transparent hover:bg-gray-100 dark:hover:bg-gray-700/70"
              : "border-l-transparent hover:bg-gray-50 dark:hover:bg-gray-700/40"
      }`}
    >
      {/* Leading status anchor. Completed items get a green
          checkmark so "done" reads at a glance without the user
          having to scan to the status pill on the right; everything
          else falls back to the stage-color dot the parent supplied
          (the visual link back to the GA marker). */}
      {item.status === "done" ? (
        <CheckCircleIcon
          className="w-4 h-4 flex-shrink-0 text-green-500 dark:text-green-400"
          aria-hidden="true"
        />
      ) : stageColor ? (
        <span
          className="w-2.5 h-2.5 rounded-full flex-shrink-0 border border-white dark:border-gray-800 shadow-sm"
          style={{ backgroundColor: stageColor }}
          aria-hidden="true"
        />
      ) : null}

      {/* Short numeric id — `#1`, `#2`, ... — assigned by the parent
          based on project-wide creation order so an item keeps the
          same number wherever it shows up. Skipped when the parent
          doesn't have that mapping. */}
      {(typeof displayNumber === "number" || typeof displayNumber === "string") && (
        <span className="font-mono text-xs text-gray-400 dark:text-gray-500 flex-shrink-0">
          #{displayNumber}
        </span>
      )}

      <span className="flex-1 min-w-0 text-sm font-medium text-gray-900 dark:text-white truncate">
        {item.name}
      </span>

      {/* Location breadcrumb — only on project-level lists where the
          item could come from any stage; hidden when the panel is
          open to give the title more room. Inline children carried
          under a parent ship without `stage` loaded — guard the
          access so expanding a parent row doesn't crash. */}
      {showLocation && !compact && item.stage?.area && (
        <span
          className="hidden md:inline-flex items-center gap-1 text-xs text-gray-500 dark:text-gray-400 flex-shrink-0 truncate max-w-[220px]"
          title={`${
            item.stage.area.deck ? `${item.stage.area.deck.name} / ` : ""
          }${item.stage.area.name} / ${item.stage.name}`}
        >
          <MapPinIcon className="w-3.5 h-3.5" />
          <span className="truncate">
            {item.stage.area.deck && `${item.stage.area.deck.name} / `}
            {item.stage.area.name} / {item.stage.name}
          </span>
        </span>
      )}

      {/* Reporter — only shown when the list has room (detail panel
          closed). Hidden in compact mode so the title gets the width
          back. Some API surfaces (e.g. child items inlined under a
          parent) ship without the creator relation loaded — guard
          the access so a missing field doesn't crash the row. */}
      {!compact && item.creator?.name && (
        <span
          className="hidden md:inline text-xs text-gray-500 dark:text-gray-400 flex-shrink-0 truncate max-w-[180px]"
          title={t("createdBy", { name: item.creator.name })}
        >
          {t("createdBy", { name: item.creator.name })}
        </span>
      )}

      {item.attachmentCount > 0 && (
        <span
          className="flex items-center gap-1 text-xs text-gray-500 dark:text-gray-400 flex-shrink-0"
          title={t("attachmentsCount", { count: item.attachmentCount })}
        >
          <PaperClipIcon className="w-3.5 h-3.5" />
          {item.attachmentCount}
        </span>
      )}

      {item.dueDate && (
        <span
          className={`hidden sm:inline-flex items-center gap-1 text-xs flex-shrink-0 ${
            item.isOverdue
              ? "text-red-600 dark:text-red-400 font-medium"
              : "text-gray-500 dark:text-gray-400"
          }`}
        >
          <ClockIcon className="w-3.5 h-3.5" />
          {new Date(item.dueDate).toLocaleDateString()}
        </span>
      )}

      <div className="flex-shrink-0" onClick={(e) => e.stopPropagation()}>
        <PunchlistPriorityDropdown
          priority={item.priority}
          canEdit={canEdit}
          onChange={onChangePriority}
        />
      </div>

      <div className="flex-shrink-0" onClick={(e) => e.stopPropagation()}>
        <PunchlistStatusDropdown
          status={item.status}
          stageStatus={stageStatus}
          canEdit={canEdit}
          onChange={onChangeStatus}
          onRequestCancel={onRequestCancel}
        />
      </div>

      {/* Assignee picker — click to add/remove. Wrapped in an
          onClick=stopPropagation div so opening the popover doesn't
          also toggle the row selection. */}
      <div className="flex-shrink-0" onClick={(e) => e.stopPropagation()}>
        <PunchlistAssigneePicker
          projectId={projectId}
          itemId={item.identifier}
          assignees={item.assignees}
          canEdit={canEdit}
          display="stack"
          onChange={onAssigneesChange}
        />
      </div>
    </div>
  );
}

