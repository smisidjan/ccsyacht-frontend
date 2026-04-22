"use client";

import { useTranslations } from "next-intl";
import {
  DocumentIcon,
  EyeIcon,
  TrashIcon,
  ClockIcon,
  CheckIcon,
  ArrowUpTrayIcon,
} from "@heroicons/react/24/outline";
import Button from "@/app/components/ui/Button";
import Tooltip from "@/app/components/ui/Tooltip";
import type { MeetingDocumentProps } from "./types";

export default function MeetingDocumentSection({
  task,
  projectId,
  taskId,
  meetingDocument,
  canEditProject,
  isUploadingDocument,
  onUpload,
  onDelete,
  isAttendee,
  currentUserAttendee,
}: MeetingDocumentProps) {
  const t = useTranslations("projectDetail.setupTasks.kickoffMeeting");

  if (task.actionStatus === "pending") return null;

  const getDocumentUrl = (documentId: string) => {
    const token = localStorage.getItem("token") || "";
    const tenantUrl = localStorage.getItem("tenantUrl") || "";
    return `${process.env.NEXT_PUBLIC_API_URL || "/api"}/projects/${projectId}/setup-task/${taskId}/documents/${documentId}/download?token=${encodeURIComponent(token)}&tenant=${encodeURIComponent(tenantUrl)}&inline=true`;
  };

  return (
    <div className="space-y-3">
      <h4 className="text-sm font-semibold text-gray-900 dark:text-white">
        {t("meetingDocument")}
      </h4>

      {meetingDocument ? (
        <div className="space-y-3">
          {/* Document card */}
          <div className="flex items-center justify-between p-4 bg-gray-50 dark:bg-gray-800/50 rounded-lg border border-gray-200 dark:border-gray-700">
            <div className="flex items-center gap-3">
              <DocumentIcon className="w-8 h-8 text-blue-500" />
              <div>
                <p className="text-sm font-medium text-gray-900 dark:text-white">
                  {meetingDocument.name}
                </p>
                <p className="text-xs text-gray-500 dark:text-gray-400">
                  {meetingDocument.author?.name} •{" "}
                  {meetingDocument.dateCreated &&
                    new Date(meetingDocument.dateCreated).toLocaleDateString()}
                </p>
              </div>
            </div>
            <div className="flex items-center gap-2">
              <a
                href={getDocumentUrl(meetingDocument.identifier)}
                target="_blank"
                rel="noopener noreferrer"
                className="p-2 text-blue-600 dark:text-blue-400 hover:bg-blue-100 dark:hover:bg-blue-900/20 rounded-lg"
              >
                <EyeIcon className="w-5 h-5" />
              </a>
              {canEditProject && task.actionStatus !== "completed" && (
                <button
                  onClick={() => onDelete(meetingDocument.identifier)}
                  className="p-2 text-red-600 dark:text-red-400 hover:bg-red-100 dark:hover:bg-red-900/20 rounded-lg"
                >
                  <TrashIcon className="w-5 h-5" />
                </button>
              )}
            </div>
          </div>

          {/* Signature status */}
          {task.assignees && task.assignees.length > 0 && (
            <div className="flex items-center justify-between">
              <div className="flex items-center gap-3">
                <div className="flex -space-x-2">
                  {task.assignees.map((assignee) => (
                    <Tooltip
                      key={assignee.identifier}
                      content={`${assignee.name}\n${
                        assignee.hasSigned
                          ? t("meetingDocumentSigned")
                          : t("meetingDocumentPending")
                      }`}
                      position="top"
                      multiline
                    >
                      <div
                        className={`w-7 h-7 rounded-full flex items-center justify-center text-xs font-medium ring-2 ring-white dark:ring-gray-800 cursor-default transition-transform duration-150 hover:scale-125 hover:z-10 ${
                          assignee.hasSigned
                            ? "bg-green-100 dark:bg-green-900/30 text-green-700 dark:text-green-400"
                            : "bg-gray-100 dark:bg-gray-700 text-gray-400 dark:text-gray-500"
                        }`}
                      >
                        {assignee.hasSigned ? (
                          <CheckIcon className="w-4 h-4" />
                        ) : (
                          <ClockIcon className="w-4 h-4" />
                        )}
                      </div>
                    </Tooltip>
                  ))}
                </div>
                <span className="text-xs text-gray-500 dark:text-gray-400">
                  {task.assignees.filter((a) => a.hasSigned).length}/
                  {task.assignees.length}
                </span>
              </div>

              {/* Sign button for current user */}
              {isAttendee &&
                currentUserAttendee &&
                !currentUserAttendee.hasSigned &&
                task.actionStatus !== "completed" && (
                  <Button
                    variant="primary"
                    size="sm"
                    onClick={() => {
                      /* TODO: implement signing */
                    }}
                  >
                    <CheckIcon className="w-4 h-4" />
                    {t("signMeetingDocument")}
                  </Button>
                )}
            </div>
          )}
        </div>
      ) : canEditProject && task.actionStatus !== "completed" ? (
        <label className="flex flex-col items-center justify-center p-8 border-2 border-dashed border-gray-300 dark:border-gray-600 rounded-lg hover:border-blue-500 dark:hover:border-blue-400 cursor-pointer transition-colors">
          <input
            type="file"
            className="hidden"
            onChange={onUpload}
            disabled={isUploadingDocument}
            accept=".pdf,.doc,.docx"
          />
          <ArrowUpTrayIcon className="w-8 h-8 text-gray-400 mb-2" />
          <span className="text-sm font-medium text-gray-700 dark:text-gray-300">
            {isUploadingDocument ? t("uploading") : t("uploadMeetingDocument")}
          </span>
          <span className="text-xs text-gray-500 dark:text-gray-400 mt-1">
            PDF, DOC, DOCX
          </span>
        </label>
      ) : (
        <p className="text-sm text-gray-500 dark:text-gray-400 italic py-4 text-center">
          {t("noMeetingDocument")}
        </p>
      )}
    </div>
  );
}
