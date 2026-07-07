"use client";

import { useState, useEffect, useMemo } from "react";
import { useTranslations } from "next-intl";
import Modal from "@/app/components/ui/Modal";
import LoadingSkeleton from "@/app/components/ui/LoadingSkeleton";
import Alert from "@/app/components/ui/Alert";
import { setupTasksApi } from "@/lib/api";
import { useCurrentUserContext } from "@/app/context/CurrentUserContext";
import { handleError } from "@/lib/utils/errors";
import CollaborativeDocumentSection from "./KickoffMeetingModal/CollaborativeDocumentSection";
import type { SetupTask } from "@/lib/api/types";

interface Props {
  isOpen: boolean;
  onClose: () => void;
  projectId: string;
  taskId: string;
  onUpdate?: () => void;
}

export default function MeetingDocumentModal({ isOpen, onClose, projectId, taskId, onUpdate }: Props) {
  const t = useTranslations("projectDetail.setupTasks.kickoffMeeting");
  const tCommon = useTranslations("common");
  const { currentUser } = useCurrentUserContext();

  const [task, setTask] = useState<SetupTask | null>(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);

  useEffect(() => {
    if (isOpen && taskId) fetchTask();
  }, [isOpen, taskId]);

  const fetchTask = async () => {
    try {
      setLoading(true);
      setError(null);
      const res = await setupTasksApi.getById(projectId, taskId);
      setTask(res.data ?? res);
    } catch (err) {
      setError(handleError(err, { severity: "console", fallbackMessage: t("loadError") }));
    } finally {
      setLoading(false);
    }
  };

  const isAttendee = useMemo(() => {
    if (!task || !currentUser) return false;
    return task.assignees?.some((a) => a.identifier === currentUser.identifier) ?? false;
  }, [task, currentUser]);

  return (
    <Modal
      isOpen={isOpen}
      onClose={onClose}
      title={t("meetingDocument")}
      size="xl"
      actions={[{ label: tCommon("close"), onClick: onClose, variant: "secondary" }]}
    >
      {loading ? (
        <LoadingSkeleton type="list" rows={4} />
      ) : error ? (
        <Alert type="error" message={error} />
      ) : task ? (
        <CollaborativeDocumentSection
          task={task}
          projectId={projectId}
          taskId={taskId}
          currentUser={currentUser}
          isAttendee={isAttendee}
          onUpdate={() => { fetchTask(); onUpdate?.(); }}
        />
      ) : null}
    </Modal>
  );
}
