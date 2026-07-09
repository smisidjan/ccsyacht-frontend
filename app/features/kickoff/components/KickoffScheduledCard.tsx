"use client";

import { useState } from "react";
import { useTranslations } from "next-intl";
import {
  CalendarIcon,
  ClockIcon,
  CheckCircleIcon,
  DocumentCheckIcon,
  PencilSquareIcon,
  ArrowRightIcon,
  UserIcon,
  ComputerDesktopIcon,
  LinkIcon,
  LockClosedIcon,
  ClockIcon as ClockOutlineIcon,
} from "@heroicons/react/24/outline";
import AttendeeAvatar from "./shared/AttendeeAvatar";
import DocumentAcknowledgementsModal from "./DocumentAcknowledgementsModal";
import MeetingDocumentModal from "./MeetingDocumentModal";
import { useIsTruncated } from "@/lib/hooks/useIsTruncated";
import type { SetupTask, DocumentType } from "@/lib/api/types";

interface KickoffScheduledCardProps {
  task: SetupTask;
  projectId: string;
  onOpen: (taskId: string) => void;
  documentTypes?: DocumentType[];
  allTasks?: SetupTask[];
}

export default function KickoffScheduledCard({
  task,
  projectId,
  onOpen,
  documentTypes,
  allTasks,
}: KickoffScheduledCardProps) {
  const t = useTranslations("projectDetail.setupTasks");
  const tKickoff = useTranslations("projectDetail.setupTasks.kickoffMeeting");
  const [activeModal, setActiveModal] = useState<"docs" | "meetingDoc" | null>(null);

  const signedCount = task.assignees.filter((a) => a.hasSigned).length;
  const totalCount = task.assignees.length;
  const isCompleted = task.isComplete || task.actionStatus === "completed";
  const isScheduled = task.actionStatus === "scheduled";
  const isPending = !isScheduled && !isCompleted;

  // Blocking check (same logic as SetupTaskCard)
  const requiredDocs = documentTypes?.filter((dt) => dt.isRequired) || [];
  const requiredNotAssigned = requiredDocs.filter((doc) => !doc.assignees || doc.assignees.length === 0);
  const allRequiredDocsUploaded = requiredNotAssigned.length === 0 || requiredNotAssigned.every((doc) => doc.documentCount > 0);
  const addMembersTask = allTasks?.find((t) => t.additionalType === "add_members");
  const membersAdded = addMembersTask ? (addMembersTask.isComplete || addMembersTask.actionStatus === "completed") : true;
  const isBlocked = isPending && (!allRequiredDocsUploaded || !membersAdded);

  // Meeting document access: locked only when no attendees yet; comments-only when pending or scheduled
  const meetingDocLocked = isPending && totalCount === 0;
  const meetingDocCommentsOnly = !isCompleted;

  // Badge
  const badge = isCompleted
    ? { bg: "bg-green-100 dark:bg-green-900/20 text-green-700 dark:text-green-400", icon: <CheckCircleIcon className="w-3.5 h-3.5" />, label: t("completed") }
    : isScheduled
    ? { bg: "bg-blue-100 dark:bg-blue-900/20 text-blue-700 dark:text-blue-400", icon: <CalendarIcon className="w-3.5 h-3.5" />, label: t("scheduled") }
    : isBlocked
    ? { bg: "bg-red-100 dark:bg-red-900/20 text-red-700 dark:text-red-400", icon: <LockClosedIcon className="w-3.5 h-3.5" />, label: t("blocked") }
    : { bg: "bg-amber-100 dark:bg-amber-900/20 text-amber-700 dark:text-amber-400", icon: <ClockOutlineIcon className="w-3.5 h-3.5" />, label: t("pending") };

  return (
    <div className="bg-white dark:bg-gray-800 rounded-xl shadow-lg dark:shadow-gray-900/30 border border-gray-100 dark:border-gray-700 flex flex-col">
      {/* Header */}
      <div className="p-5 pb-4">
        <div className="flex items-start justify-between gap-3 mb-3">
          <h3 className="text-base font-semibold text-gray-900 dark:text-white">{task.name}</h3>
          <div className="flex items-center gap-1.5 flex-shrink-0 flex-wrap justify-end">
            <span className={`inline-flex items-center gap-1 px-2.5 py-1 rounded-full text-xs font-medium ${badge.bg}`}>
              {badge.icon}
              {badge.label}
            </span>
            {task.meetingFormat && (isScheduled || isCompleted) && (
              <span
                className={`inline-flex items-center gap-1 px-2.5 py-1 rounded-full text-xs font-medium ${
                  task.meetingFormat === "live"
                    ? "bg-purple-100 dark:bg-purple-900/20 text-purple-700 dark:text-purple-400"
                    : "bg-blue-100 dark:bg-blue-900/20 text-blue-700 dark:text-blue-400"
                }`}
              >
                {task.meetingFormat === "live" ? (
                  <UserIcon className="w-3.5 h-3.5" />
                ) : (
                  <ComputerDesktopIcon className="w-3.5 h-3.5" />
                )}
                {task.meetingFormat === "live" ? t("meetingFormat.inPerson") : t("meetingFormat.online")}
              </span>
            )}
          </div>
        </div>

        {/* Date / time (only when scheduled or completed) */}
        {task.scheduledDate && (isScheduled || isCompleted) && (
          <div className="flex flex-wrap items-center gap-x-4 gap-y-1 text-sm">
            <span className="flex items-center gap-1.5 text-gray-700 dark:text-gray-300 font-medium">
              <CalendarIcon className="w-4 h-4 text-blue-500 dark:text-blue-400 flex-shrink-0" />
              {new Date(task.scheduledDate).toLocaleDateString(undefined, {
                weekday: "short",
                day: "numeric",
                month: "short",
                year: "numeric",
              })}
            </span>
            <span className="flex items-center gap-1.5 text-gray-500 dark:text-gray-400">
              <ClockIcon className="w-4 h-4 flex-shrink-0" />
              {new Date(task.scheduledDate).toLocaleTimeString(undefined, { hour: "2-digit", minute: "2-digit" })}
              {task.scheduledEndDate && (
                <> – {new Date(task.scheduledEndDate).toLocaleTimeString(undefined, { hour: "2-digit", minute: "2-digit" })}</>
              )}
            </span>
          </div>
        )}
        {task.meetingFormat === "online" && task.meetingLink && (isScheduled || isCompleted) && (
          <a
            href={task.meetingLink}
            target="_blank"
            rel="noopener noreferrer"
            className="mt-2 inline-flex items-center gap-1.5 text-xs text-blue-600 dark:text-blue-400 hover:underline"
          >
            <LinkIcon className="w-3.5 h-3.5 flex-shrink-0" />
            <span className="truncate max-w-[220px]">{task.meetingLink}</span>
          </a>
        )}
      </div>

      {/* Sub-item rows */}
      <div className="border-t border-gray-100 dark:border-gray-700 divide-y divide-gray-100 dark:divide-gray-700">

        {/* 1 — Document Acknowledgements */}
        {totalCount === 0 ? (
          <LockedRow
            icon={<DocumentCheckIcon className="w-4 h-4" />}
            label={tKickoff("documentStatus")}
            statusLabel={tKickoff("subItems.lockedUntilAttendees")}
          />
        ) : (
          <SubRow
            icon={<DocumentCheckIcon className="w-4 h-4" />}
            label={tKickoff("documentStatus")}
            statusLabel={
              task.allDocumentsAcknowledged
                ? tKickoff("allDocumentsAcknowledged")
                : tKickoff("subItems.reviewRequired")
            }
            statusVariant={task.allDocumentsAcknowledged ? "green" : "amber"}
            actionLabel={tKickoff("subItems.review")}
            onAction={() => setActiveModal("docs")}
            completed={task.allDocumentsAcknowledged}
          />
        )}

        {/* 2 — Kick-off Meeting Document */}
        {meetingDocLocked ? (
          <LockedRow
            icon={<PencilSquareIcon className="w-4 h-4" />}
            label={tKickoff("meetingDocument")}
            statusLabel={tKickoff("subItems.lockedUntilScheduled")}
          />
        ) : (
          <SubRow
            icon={<PencilSquareIcon className="w-4 h-4" />}
            label={tKickoff("meetingDocument")}
            statusLabel={
              isCompleted && task.allSigned
                ? tKickoff("allSigned")
                : isCompleted
                ? tKickoff("subItems.signedProgress", { signed: signedCount, total: totalCount })
                : meetingDocCommentsOnly
                ? tKickoff("subItems.commentsOnly")
                : tKickoff("subItems.signedProgress", { signed: signedCount, total: totalCount })
            }
            statusVariant={isCompleted && task.allSigned ? "green" : meetingDocCommentsOnly ? "gray" : "amber"}
            actionLabel={tKickoff("subItems.review")}
            onAction={() => setActiveModal("meetingDoc")}
            completed={isCompleted && task.allSigned}
          />
        )}

        {/* 3 — Schedule Meeting */}
        {isCompleted ? (
          /* Completed: just show attendee info */
          <div className="flex items-center gap-3 px-5 py-3">
            <span className="text-green-500 dark:text-green-400 flex-shrink-0">
              <CalendarIcon className="w-4 h-4" />
            </span>
            <span className="text-sm text-gray-700 dark:text-gray-300 flex-1 min-w-0">
              {tKickoff("attendees")}
            </span>
            <div className="flex items-center gap-2 flex-shrink-0">
              <div className="flex -space-x-1.5">
                {task.assignees.map((a) => (
                  <AttendeeAvatar
                    key={a.identifier}
                    name={a.name}
                    status={a.hasSigned ? "signed" : "unsigned"}
                    email={a.email}
                    size="sm"
                  />
                ))}
              </div>
              <span className="text-xs text-gray-500 dark:text-gray-400">
                {signedCount}/{totalCount}
              </span>
            </div>
          </div>
        ) : isScheduled ? (
          /* Scheduled: show attendees */
          <div className="flex items-center gap-3 px-5 py-3">
            <span className="text-blue-500 dark:text-blue-400 flex-shrink-0">
              <CalendarIcon className="w-4 h-4" />
            </span>
            <span className="text-sm text-gray-700 dark:text-gray-300 flex-1 min-w-0">
              {tKickoff("attendees")}
            </span>
            <div className="flex items-center gap-2 flex-shrink-0">
              <div className="flex -space-x-1.5">
                {task.assignees.map((a) => (
                  <AttendeeAvatar
                    key={a.identifier}
                    name={a.name}
                    status={a.hasSigned ? "signed" : "unsigned"}
                    email={a.email}
                    size="sm"
                  />
                ))}
              </div>
              <span className="text-xs text-gray-500 dark:text-gray-400">
                {signedCount}/{totalCount}
              </span>
            </div>
          </div>
        ) : isBlocked ? (
          /* Blocked: same locked appearance as the rows above */
          <LockedRow
            icon={<CalendarIcon className="w-4 h-4" />}
            label={tKickoff("action")}
            statusLabel={tKickoff("subItems.lockedUntilUnblocked")}
          />
        ) : (
          /* Pending: not scheduled yet but can schedule */
          <SubRow
            icon={<CalendarIcon className="w-4 h-4" />}
            label={tKickoff("action")}
            statusLabel={tKickoff("subItems.notScheduled")}
            statusVariant="gray"
            actionLabel={tKickoff("subItems.schedule")}
            onAction={() => onOpen(task.identifier)}
          />
        )}
      </div>

      {/* Modals */}
      <DocumentAcknowledgementsModal
        isOpen={activeModal === "docs"}
        onClose={() => setActiveModal(null)}
        projectId={projectId}
        taskId={task.identifier}
      />
      <MeetingDocumentModal
        isOpen={activeModal === "meetingDoc"}
        onClose={() => setActiveModal(null)}
        projectId={projectId}
        taskId={task.identifier}
      />
    </div>
  );
}

// ─── Sub-row ──────────────────────────────────────────────────────────────────

const statusVariantClasses = {
  green: "text-green-600 dark:text-green-400",
  amber: "text-amber-600 dark:text-amber-400",
  gray:  "text-gray-500 dark:text-gray-400",
};

interface SubRowProps {
  icon: React.ReactNode;
  label: string;
  statusLabel: string;
  statusVariant: "green" | "amber" | "gray";
  actionLabel: string;
  onAction: () => void;
  completed?: boolean;
  disabled?: boolean;
}

function SubRow({ icon, label, statusLabel, statusVariant, actionLabel, onAction, completed, disabled }: SubRowProps) {
  const [isLabelHovered, setIsLabelHovered] = useState(false);
  const { ref, isTruncated } = useIsTruncated<HTMLSpanElement>(isLabelHovered);
  const expanded = isTruncated && isLabelHovered;

  return (
    <div className="flex items-center gap-3 px-5 py-3">
      <span className={`flex-shrink-0 ${completed ? "text-green-500 dark:text-green-400" : "text-gray-400 dark:text-gray-500"}`}>
        {icon}
      </span>
      <span
        ref={ref}
        onMouseEnter={() => setIsLabelHovered(true)}
        onMouseLeave={() => setIsLabelHovered(false)}
        className={`text-sm text-gray-700 dark:text-gray-300 flex-1 min-w-0 truncate ${expanded ? "whitespace-normal" : ""}`}
        title={label}
      >
        {label}
      </span>
      <span className={`text-xs font-medium flex-shrink-0 ${expanded ? "hidden" : ""} ${statusVariantClasses[statusVariant]}`}>
        {statusLabel}
      </span>
      <button
        type="button"
        onClick={onAction}
        disabled={disabled}
        className="inline-flex items-center gap-1 px-2.5 py-1 rounded-md text-xs font-semibold bg-gray-100 dark:bg-gray-700 text-gray-700 dark:text-gray-200 hover:bg-gray-200 dark:hover:bg-gray-600 transition-colors flex-shrink-0 disabled:opacity-40 disabled:cursor-not-allowed"
      >
        {actionLabel}
        <ArrowRightIcon className="w-3 h-3" />
      </button>
    </div>
  );
}

// ─── Locked row ───────────────────────────────────────────────────────────────

function LockedRow({ icon, label, statusLabel }: { icon: React.ReactNode; label: string; statusLabel: string }) {
  const [isLabelHovered, setIsLabelHovered] = useState(false);
  const { ref, isTruncated } = useIsTruncated<HTMLSpanElement>(isLabelHovered);
  const expanded = isTruncated && isLabelHovered;

  return (
    <div className="flex items-center gap-3 px-5 py-3 opacity-50">
      <span className="flex-shrink-0 text-gray-400 dark:text-gray-500">{icon}</span>
      <span
        ref={ref}
        onMouseEnter={() => setIsLabelHovered(true)}
        onMouseLeave={() => setIsLabelHovered(false)}
        className={`text-sm text-gray-700 dark:text-gray-300 flex-1 min-w-0 truncate ${expanded ? "whitespace-normal" : ""}`}
        title={label}
      >
        {label}
      </span>
      <span className={`text-xs font-medium text-gray-400 dark:text-gray-500 flex-shrink-0 ${expanded ? "hidden" : ""}`}>{statusLabel}</span>
      <span className="flex items-center justify-center w-7 h-6 flex-shrink-0">
        <LockClosedIcon className="w-3.5 h-3.5 text-gray-400 dark:text-gray-500" />
      </span>
    </div>
  );
}
