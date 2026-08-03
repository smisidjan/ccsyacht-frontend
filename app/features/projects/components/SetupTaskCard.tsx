"use client";

import { useState } from "react";
import { useTranslations } from "next-intl";
import {
  ArrowRightIcon,
  CheckCircleIcon,
  ClockIcon,
  DocumentIcon,
  MapIcon,
  Squares2X2Icon,
  UsersIcon,
  LockClosedIcon,
} from "@heroicons/react/24/outline";
import { useIsTruncated } from "@/lib/hooks/useIsTruncated";
import { useProjectMembers, useProjectSigners } from "@/lib/api";
import type { SetupTask, SetupTaskType, DocumentType } from "@/lib/api/types";

interface SetupTaskCardProps {
  task: SetupTask;
  projectId: string;
  documentTypes?: DocumentType[];
  allTasks?: SetupTask[];
  onDefineDecks?: () => void;
  onViewDecks?: () => void;
  onDefineAreas?: () => void;
}

interface SubRowProps {
  icon: React.ReactNode;
  label: string;
  statusLabel: string;
  statusVariant: "green" | "amber" | "gray";
  actionLabel?: string;
  onAction?: () => void;
  actionHref?: string;
  completed?: boolean;
  disabled?: boolean;
}

const statusVariantClasses = {
  green: "text-green-600 dark:text-green-400",
  amber: "text-amber-600 dark:text-amber-400",
  gray: "text-gray-500 dark:text-gray-400",
};

function SubRow({ icon, label, statusLabel, statusVariant, actionLabel, onAction, actionHref, completed, disabled }: SubRowProps) {
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
      {actionLabel && (
        actionHref ? (
          <a
            href={actionHref}
            className="inline-flex items-center gap-1 px-2.5 py-1 rounded-md text-xs font-semibold bg-gray-100 dark:bg-gray-700 text-gray-700 dark:text-gray-200 hover:bg-gray-200 dark:hover:bg-gray-600 transition-colors flex-shrink-0"
          >
            {actionLabel}
            <ArrowRightIcon className="w-3 h-3" />
          </a>
        ) : (
          <button
            type="button"
            onClick={onAction}
            disabled={disabled}
            className="inline-flex items-center gap-1 px-2.5 py-1 rounded-md text-xs font-semibold bg-gray-100 dark:bg-gray-700 text-gray-700 dark:text-gray-200 hover:bg-gray-200 dark:hover:bg-gray-600 transition-colors flex-shrink-0 disabled:opacity-40 disabled:cursor-not-allowed"
          >
            {actionLabel}
            <ArrowRightIcon className="w-3 h-3" />
          </button>
        )
      )}
    </div>
  );
}

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

function AddMembersAndSignersRows({ projectId }: { projectId: string }) {
  const t = useTranslations("projectDetail.setupTasks");
  const { data: members } = useProjectMembers(projectId);
  const { data: signers } = useProjectSigners(projectId);

  const membersCompleted = (members?.length || 0) > 0;
  const signersCompleted = (signers?.length || 0) > 0;

  return (
    <>
      <SubRow
        icon={<UsersIcon className="w-4 h-4" />}
        label={t("addMembers.title")}
        statusLabel={membersCompleted ? t("completed") : t("pending")}
        statusVariant={membersCompleted ? "green" : "gray"}
        actionLabel={membersCompleted ? undefined : t("addMembers.action")}
        actionHref={membersCompleted ? undefined : "#members"}
        completed={membersCompleted}
      />
      <SubRow
        icon={<UsersIcon className="w-4 h-4" />}
        label={t("addSigners.title")}
        statusLabel={signersCompleted ? t("completed") : t("pending")}
        statusVariant={signersCompleted ? "green" : "gray"}
        actionLabel={signersCompleted ? undefined : t("addSigners.action")}
        actionHref={signersCompleted ? undefined : "#signers"}
        completed={signersCompleted}
      />
    </>
  );
}

function taskTypeToCamelCase(taskType: SetupTaskType): string {
  switch (taskType) {
    case "upload_documents": return "uploadDocuments";
    case "add_members_and_signers": return "addMembersAndSigners";
    case "add_members": return "addMembers";
    case "add_signers": return "addSigners";
    case "kickoff_meeting": return "kickoffMeeting";
    case "define_decks": return "defineDecks";
    case "define_areas_and_stages": return "defineAreasAndStages";
    default: return taskType;
  }
}

export default function SetupTaskCard({ task, projectId, documentTypes, allTasks: _allTasks, onDefineDecks, onViewDecks, onDefineAreas }: SetupTaskCardProps) {
  const t = useTranslations("projectDetail.setupTasks");

  const isCompleted = task.isComplete || task.actionStatus === "completed";
  const translationKey = taskTypeToCamelCase(task.additionalType);

  const badge = isCompleted
    ? { bg: "bg-green-100 dark:bg-green-900/20 text-green-700 dark:text-green-400", icon: <CheckCircleIcon className="w-3.5 h-3.5" />, label: t("completed") }
    : task.isLocked
    ? { bg: "bg-red-100 dark:bg-red-900/20 text-red-700 dark:text-red-400", icon: <LockClosedIcon className="w-3.5 h-3.5" />, label: t("blocked") }
    : { bg: "bg-amber-100 dark:bg-amber-900/20 text-amber-700 dark:text-amber-400", icon: <ClockIcon className="w-3.5 h-3.5" />, label: t("pending") };

  const renderSubRows = () => {
    switch (task.additionalType) {
      case "define_decks":
        return isCompleted ? (
          <SubRow
            icon={<Squares2X2Icon className="w-4 h-4" />}
            label={t("defineDecks.action")}
            statusLabel={t("completed")}
            statusVariant="green"
            actionLabel={t("viewDecks")}
            onAction={onViewDecks}
            completed
          />
        ) : (
          <SubRow
            icon={<Squares2X2Icon className="w-4 h-4" />}
            label={t("defineDecks.action")}
            statusLabel={t("pending")}
            statusVariant="gray"
            actionLabel={t("createDecks")}
            onAction={onDefineDecks}
          />
        );

      case "define_areas_and_stages":
        return task.isLocked ? (
          <LockedRow
            icon={<MapIcon className="w-4 h-4" />}
            label={t("defineAreasAndStages.title")}
            statusLabel={t("defineAreasAndStages.lockedMessage")}
          />
        ) : (
          <SubRow
            icon={<MapIcon className="w-4 h-4" />}
            label={t("defineAreasAndStages.title")}
            statusLabel={isCompleted ? t("completed") : t("pending")}
            statusVariant={isCompleted ? "green" : "gray"}
            actionLabel={t("defineAreasAndStages.action")}
            onAction={onDefineAreas}
            completed={isCompleted}
          />
        );

      case "upload_documents": {
        const requiredDocs = documentTypes?.filter((dt) => dt.isRequired) || [];
        const requiredNotAssigned = requiredDocs.filter((doc) => !doc.assignees || doc.assignees.length === 0);
        const assignedDocs = requiredDocs.filter((doc) => doc.assignees && doc.assignees.length > 0);

        if (requiredDocs.length === 0) {
          return (
            <SubRow
              icon={<DocumentIcon className="w-4 h-4" />}
              label={t("uploadDocuments.action")}
              statusLabel={isCompleted ? t("completed") : t("pending")}
              statusVariant={isCompleted ? "green" : "gray"}
              actionLabel={isCompleted ? undefined : t("uploadDocuments.action")}
              actionHref={isCompleted ? undefined : "#documents"}
              completed={isCompleted}
            />
          );
        }

        return (
          <>
            {requiredNotAssigned.map((doc) => (
              <SubRow
                key={doc.identifier}
                icon={<DocumentIcon className="w-4 h-4" />}
                label={doc.name}
                statusLabel={doc.documentCount > 0 ? t("completed") : t("uploadDocuments.missing")}
                statusVariant={doc.documentCount > 0 ? "green" : "amber"}
                actionLabel={doc.documentCount > 0 ? undefined : t("uploadDocuments.upload")}
                actionHref={doc.documentCount > 0 ? undefined : "#documents"}
                completed={doc.documentCount > 0}
              />
            ))}
            {assignedDocs.map((doc) => (
              <LockedRow
                key={doc.identifier}
                icon={<DocumentIcon className="w-4 h-4" />}
                label={doc.name}
                statusLabel={doc.documentCount > 0 ? t("completed") : t("uploadDocuments.waitingFor", { name: doc.assignees?.[0]?.name || "" })}
              />
            ))}
          </>
        );
      }

      case "add_members_and_signers":
        return <AddMembersAndSignersRows projectId={projectId} />;

      case "add_members":
      case "add_signers":
        return (
          <SubRow
            icon={<UsersIcon className="w-4 h-4" />}
            label={t(`${translationKey}.title`)}
            statusLabel={isCompleted ? t("completed") : t("pending")}
            statusVariant={isCompleted ? "green" : "gray"}
            actionLabel={isCompleted ? undefined : t(`${translationKey}.action`)}
            actionHref={isCompleted ? undefined : "#settings"}
            completed={isCompleted}
          />
        );

      default:
        return null;
    }
  };

  return (
    <div className="bg-white dark:bg-gray-800 rounded-xl shadow-lg dark:shadow-gray-900/30 border border-gray-100 dark:border-gray-700 flex flex-col">
      {/* Header */}
      <div className="p-5 pb-4">
        <div className="flex items-start justify-between gap-3">
          <h3 className="text-base font-semibold text-gray-900 dark:text-white">{task.name}</h3>
          <span className={`inline-flex items-center gap-1 px-2.5 py-1 rounded-full text-xs font-medium flex-shrink-0 ${badge.bg}`}>
            {badge.icon}
            {badge.label}
          </span>
        </div>
      </div>

      {/* Sub-rows */}
      <div className="border-t border-gray-100 dark:border-gray-700 divide-y divide-gray-100 dark:divide-gray-700">
        {renderSubRows()}
      </div>
    </div>
  );
}
