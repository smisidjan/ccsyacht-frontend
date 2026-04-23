"use client";

import { useTranslations } from "next-intl";
import {
  ClockIcon,
  CheckCircleIcon,
  ExclamationCircleIcon,
  BellIcon,
  XMarkIcon,
} from "@heroicons/react/24/outline";
import type { DocumentTypeAssignee } from "@/lib/api/types";

interface AssigneesListProps {
  assignees: DocumentTypeAssignee[] | undefined;
  onNotify: (assignee: DocumentTypeAssignee) => void;
  onRemove: (assignee: DocumentTypeAssignee) => void;
  isReadOnly: boolean;
}

export default function AssigneesList({
  assignees,
  onNotify,
  onRemove,
  isReadOnly,
}: AssigneesListProps) {
  const tDocTypes = useTranslations("documentTypes");

  return (
    <div className="flex items-center gap-2 flex-wrap">
      <span className="text-xs text-gray-500 dark:text-gray-400">
        {tDocTypes("assignees.title")}:
      </span>
      {!assignees || assignees.length === 0 ? (
        <span className="text-xs text-gray-400 dark:text-gray-500 italic">
          {tDocTypes("assignees.noAssignees")}
        </span>
      ) : (
        <div className="flex items-center gap-1.5 flex-wrap">
          {assignees.map((assignee) => (
            <AssigneeChip
              key={assignee.identifier}
              assignee={assignee}
              onNotify={onNotify}
              onRemove={onRemove}
              isReadOnly={isReadOnly}
            />
          ))}
        </div>
      )}
    </div>
  );
}

interface AssigneeChipProps {
  assignee: DocumentTypeAssignee;
  onNotify: (assignee: DocumentTypeAssignee) => void;
  onRemove: (assignee: DocumentTypeAssignee) => void;
  isReadOnly: boolean;
}

function AssigneeChip({ assignee, onNotify, onRemove, isReadOnly }: AssigneeChipProps) {
  const tDocTypes = useTranslations("documentTypes");

  const chipClasses = assignee.isCompleted
    ? "bg-green-100 dark:bg-green-900/30 text-green-700 dark:text-green-400"
    : assignee.isOverdue
    ? "bg-red-100 dark:bg-red-900/30 text-red-700 dark:text-red-400"
    : "bg-blue-100 dark:bg-blue-900/30 text-blue-700 dark:text-blue-400";

  const StatusIcon = assignee.isCompleted
    ? CheckCircleIcon
    : assignee.isOverdue
    ? ExclamationCircleIcon
    : ClockIcon;

  return (
    <div
      className={`inline-flex items-center gap-1.5 px-2 py-1 rounded-full text-xs font-medium ${chipClasses}`}
    >
      <StatusIcon className="w-3.5 h-3.5" />
      <span className="truncate max-w-[100px]">{assignee.name}</span>
      {!assignee.isCompleted && !isReadOnly && (
        <>
          <button
            onClick={() => onNotify(assignee)}
            className="p-0.5 hover:bg-white/50 dark:hover:bg-black/20 rounded transition-colors"
            title={tDocTypes("assignees.sendReminder")}
          >
            <BellIcon className="w-3 h-3" />
          </button>
          <button
            onClick={() => onRemove(assignee)}
            className="p-0.5 hover:bg-white/50 dark:hover:bg-black/20 rounded transition-colors"
            title={tDocTypes("assignees.remove")}
          >
            <XMarkIcon className="w-3 h-3" />
          </button>
        </>
      )}
    </div>
  );
}
