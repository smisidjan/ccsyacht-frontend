"use client";

import { useTranslations } from "next-intl";
import DocumentAccordionItem from "./DocumentAccordionItem";
import type { RequiredDocumentsProps } from "./types";

export default function RequiredDocumentsSection({
  task,
  projectId,
  requiredDocuments,
  expandedDocId,
  setExpandedDocId,
  acknowledgingDocId,
  isAttendee,
  onAcknowledge,
  onDisagreeClick,
  hasUserRespondedToDocument,
  hasDocumentDisagreement,
  isDocumentResubmission,
}: RequiredDocumentsProps) {
  const t = useTranslations("projectDetail.setupTasks.kickoffMeeting");

  if (requiredDocuments.length === 0) return null;

  return (
    <div className="space-y-2">
      <h4 className="text-sm font-semibold text-gray-900 dark:text-white">
        {t("requiredDocuments")}
      </h4>
      <p className="text-xs text-gray-500 dark:text-gray-400">
        {t("requiredDocumentsDescription")}
      </p>

      <div className="divide-y divide-gray-200 dark:divide-gray-700 border border-gray-200 dark:border-gray-700 rounded-lg overflow-hidden">
        {requiredDocuments.map((doc) => (
          <DocumentAccordionItem
            key={doc.identifier}
            doc={doc}
            task={task}
            projectId={projectId}
            isExpanded={expandedDocId === doc.identifier}
            onToggle={() =>
              setExpandedDocId(expandedDocId === doc.identifier ? null : doc.identifier)
            }
            acknowledgingDocId={acknowledgingDocId}
            isAttendee={isAttendee}
            onAcknowledge={onAcknowledge}
            onDisagreeClick={onDisagreeClick}
            userHasResponded={hasUserRespondedToDocument(doc)}
            hasDisagreement={hasDocumentDisagreement(doc)}
            isResubmission={isDocumentResubmission(doc)}
          />
        ))}
      </div>
    </div>
  );
}
