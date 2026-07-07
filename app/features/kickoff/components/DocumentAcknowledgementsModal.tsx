"use client";

import { useState, useEffect, useMemo } from "react";
import { useTranslations } from "next-intl";
import Modal from "@/app/components/ui/Modal";
import LoadingSkeleton from "@/app/components/ui/LoadingSkeleton";
import Alert from "@/app/components/ui/Alert";
import { setupTasksApi } from "@/lib/api";
import { useCurrentUserContext } from "@/app/context/CurrentUserContext";
import { useToast } from "@/app/context/ToastContext";
import { handleError } from "@/lib/utils/errors";
import RequiredDocumentsSection from "./KickoffMeetingModal/RequiredDocumentsSection";
import type { SetupTask, RequiredDocument } from "@/lib/api/types";
import type { NormalizedRequiredDocument, NormalizedAcknowledgement } from "./KickoffMeetingModal/types";

interface Props {
  isOpen: boolean;
  onClose: () => void;
  projectId: string;
  taskId: string;
  onUpdate?: () => void;
}

function normalizeAcknowledgements(
  rawAcks: RequiredDocument["acknowledgements"]
): NormalizedAcknowledgement[] {
  if (!rawAcks) return [];
  const arr = Array.isArray(rawAcks) ? rawAcks : Object.values(rawAcks as Record<string, unknown>);
  return (arr as Array<Record<string, unknown>>).map((ack) => {
    const agent = ack.agent as Record<string, string> | undefined;
    return {
      identifier: agent?.identifier ?? (ack.identifier as string) ?? "",
      name: agent?.name ?? (ack.name as string) ?? "Unknown",
      acknowledgedAt: (ack.dateCreated as string) ?? (ack.acknowledgedAt as string) ?? null,
      hasRead: (ack.hasRead as boolean) ?? false,
      readAt: (ack.readAt as string) ?? null,
      hasAgreed: (ack.hasAgreed as boolean | null) ?? null,
      agreedAt: (ack.agreedAt as string) ?? null,
      disagreementReason: (ack.disagreementReason as string) ?? null,
    };
  });
}

export default function DocumentAcknowledgementsModal({ isOpen, onClose, projectId, taskId, onUpdate }: Props) {
  const t = useTranslations("projectDetail.setupTasks.kickoffMeeting");
  const tCommon = useTranslations("common");
  const { showToast } = useToast();
  const { currentUser } = useCurrentUserContext();

  const [task, setTask] = useState<SetupTask | null>(null);
  const [requiredDocuments, setRequiredDocuments] = useState<NormalizedRequiredDocument[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [expandedDocId, setExpandedDocId] = useState<string | null>(null);
  const [acknowledgingDocId, setAcknowledgingDocId] = useState<string | null>(null);

  // Disagree sub-modal
  const [disagreeDocId, setDisagreeDocId] = useState<string | null>(null);
  const [disagreementReason, setDisagreementReason] = useState("");
  const [isSubmittingDisagree, setIsSubmittingDisagree] = useState(false);

  useEffect(() => {
    if (isOpen && taskId) fetchData();
  }, [isOpen, taskId]);

  const fetchData = async (silent = false) => {
    try {
      if (!silent) setLoading(true);
      setError(null);
      const [taskRes, docsRes] = await Promise.all([
        setupTasksApi.getById(projectId, taskId),
        setupTasksApi.getRequiredDocuments(projectId, taskId).catch(() => [] as RequiredDocument[]),
      ]);
      setTask(taskRes.data ?? taskRes);
      setRequiredDocuments(
        (Array.isArray(docsRes) ? docsRes : []).map((doc) => ({
          ...doc,
          acknowledgements: normalizeAcknowledgements(doc.acknowledgements),
        }))
      );
    } catch (err) {
      setError(handleError(err, { severity: "console", fallbackMessage: t("loadError") }));
    } finally {
      if (!silent) setLoading(false);
    }
  };

  const isAttendee = useMemo(() => {
    if (!task || !currentUser) return false;
    return task.assignees?.some((a) => a.identifier === currentUser.identifier) ?? false;
  }, [task, currentUser]);

  const handleAcknowledge = async (docId: string, agreed: boolean, reason?: string) => {
    try {
      setAcknowledgingDocId(docId);
      await setupTasksApi.acknowledgeDocument(projectId, taskId, docId, agreed, reason);
      showToast("success", agreed ? t("agreeSuccess") : t("disagreeSuccess"));
      await fetchData(true);
      onUpdate?.();
    } catch {
      showToast("error", t("acknowledgeError"));
    } finally {
      setAcknowledgingDocId(null);
    }
  };

  const handleDisagreeSubmit = async () => {
    if (!disagreeDocId || !disagreementReason.trim()) return;
    try {
      setIsSubmittingDisagree(true);
      await setupTasksApi.acknowledgeDocument(projectId, taskId, disagreeDocId, false, disagreementReason.trim());
      showToast("success", t("disagreeSuccess"));
      setDisagreeDocId(null);
      setDisagreementReason("");
      await fetchData(true);
      onUpdate?.();
    } catch {
      showToast("error", t("acknowledgeError"));
    } finally {
      setIsSubmittingDisagree(false);
    }
  };

  const hasUserRespondedToDocument = (doc: NormalizedRequiredDocument): boolean => {
    if (!currentUser) return false;
    const ack = doc.acknowledgements.find((a) => a.identifier === currentUser.identifier);
    return ack?.hasAgreed !== null && ack?.hasAgreed !== undefined;
  };

  const hasDocumentDisagreement = (doc: NormalizedRequiredDocument): boolean =>
    doc.acknowledgements.some((a) => a.hasAgreed === false);

  const isDocumentResubmission = (doc: NormalizedRequiredDocument): boolean => {
    const actualAckCount = doc.acknowledgements.filter(
      (a) => a.hasAgreed === true || a.hasAgreed === false
    ).length;
    if (actualAckCount > 0) return false;
    const docCategory = doc.category?.identifier ?? doc.category?.name;
    if (!docCategory) return false;
    return requiredDocuments.some((other) => {
      if (other.identifier === doc.identifier) return false;
      const otherCategory = other.category?.identifier ?? other.category?.name;
      return otherCategory === docCategory && other.acknowledgements.some((a) => a.hasAgreed === false);
    });
  };

  return (
    <>
      <Modal
        isOpen={isOpen}
        onClose={onClose}
        title={t("requiredDocuments")}
        size="lg"
        actions={[{ label: tCommon("close"), onClick: onClose, variant: "secondary" }]}
      >
        {loading ? (
          <LoadingSkeleton type="list" rows={4} />
        ) : error ? (
          <Alert type="error" message={error} />
        ) : requiredDocuments.length === 0 ? (
          <p className="text-sm text-gray-500 dark:text-gray-400">{t("noRequiredDocuments")}</p>
        ) : task ? (
          <RequiredDocumentsSection
            task={task}
            projectId={projectId}
            taskId={taskId}
            requiredDocuments={requiredDocuments}
            expandedDocId={expandedDocId}
            setExpandedDocId={setExpandedDocId}
            acknowledgingDocId={acknowledgingDocId}
            isAttendee={isAttendee}
            onAcknowledge={handleAcknowledge}
            onDisagreeClick={(docId) => { setDisagreeDocId(docId); setDisagreementReason(""); }}
            hasUserRespondedToDocument={hasUserRespondedToDocument}
            hasDocumentDisagreement={hasDocumentDisagreement}
            isDocumentResubmission={isDocumentResubmission}
          />
        ) : null}
      </Modal>

      {/* Disagree reason sub-modal */}
      <Modal
        isOpen={!!disagreeDocId}
        onClose={() => { setDisagreeDocId(null); setDisagreementReason(""); }}
        title={t("disagreeTitle")}
        size="sm"
        actions={[
          {
            label: tCommon("cancel"),
            onClick: () => { setDisagreeDocId(null); setDisagreementReason(""); },
            variant: "secondary",
          },
          {
            label: t("submitDisagree"),
            onClick: handleDisagreeSubmit,
            variant: "danger",
            loading: isSubmittingDisagree,
            disabled: isSubmittingDisagree || !disagreementReason.trim(),
          },
        ]}
      >
        <div className="space-y-4">
          <p className="text-gray-600 dark:text-gray-400">{t("disagreeDescription")}</p>
          <textarea
            value={disagreementReason}
            onChange={(e) => setDisagreementReason(e.target.value)}
            placeholder={t("disagreePlaceholder")}
            rows={4}
            className="w-full px-3 py-2 border border-gray-300 dark:border-gray-600 rounded-lg bg-white dark:bg-gray-800 text-gray-900 dark:text-white placeholder-gray-400 dark:placeholder-gray-500 focus:ring-2 focus:ring-blue-500 focus:border-transparent resize-none"
            autoFocus
          />
        </div>
      </Modal>
    </>
  );
}
