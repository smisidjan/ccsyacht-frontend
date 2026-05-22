"use client";

import { useTranslations } from "next-intl";
import {
  DocumentTextIcon,
  ArrowUpTrayIcon,
  ArrowDownTrayIcon,
  EyeIcon,
  UserPlusIcon,
  ChevronLeftIcon,
} from "@heroicons/react/24/outline";
import Button from "@/app/components/ui/Button";
import Table from "@/app/components/ui/Table";
import LoadingSkeleton from "@/app/components/ui/LoadingSkeleton";
import Alert from "@/app/components/ui/Alert";
import { DocumentStatusBadge, calculateDocumentStatus } from "@/app/components/ui/DocumentAcknowledgementStatus";
import { normalizeAcknowledgements } from "@/lib/utils/typeNormalization";
import AssigneesList from "./AssigneesList";
import DocumentAcknowledgementsSummary from "./DocumentAcknowledgementsSummary";
import type { Document, DocumentType, DocumentTypeAssignee } from "@/lib/api/types";

interface DocumentsPanelProps {
  selectedType: DocumentType | undefined;
  documents: Document[] | null | undefined;
  documentsLoading: boolean;
  documentsError: { message?: string } | null;
  showMobileDetail: boolean;
  onBackToList: () => void;
  onUpload: () => void;
  onAssign: () => void;
  onDownload: (docId: string, fileName: string) => void;
  /** Opens the inline document viewer (eye icon) for the row. */
  onView: (doc: Document) => void;
  onNotifyAssignee: (assignee: DocumentTypeAssignee) => void;
  onRemoveAssignee: (assignee: DocumentTypeAssignee) => void;
  canUploadDocuments: boolean;
  canDownloadDocuments: boolean;
  canEditDocumentTypes: boolean;
  isCurrentUserAssigneeWithPendingTask: boolean;
  isReadOnly: boolean;
}

export default function DocumentsPanel({
  selectedType,
  documents,
  documentsLoading,
  documentsError,
  showMobileDetail,
  onBackToList,
  onUpload,
  onAssign,
  onDownload,
  onView,
  onNotifyAssignee,
  onRemoveAssignee,
  canUploadDocuments,
  canDownloadDocuments,
  canEditDocumentTypes,
  isCurrentUserAssigneeWithPendingTask,
  isReadOnly,
}: DocumentsPanelProps) {
  const t = useTranslations("projectDetail.documents");
  const tDocTypes = useTranslations("documentTypes");

  return (
    <div className={`${showMobileDetail ? "block" : "hidden"} lg:block flex-1 flex flex-col min-w-0 gap-4 lg:gap-6`}>
      <div className="bg-white dark:bg-gray-800 rounded-2xl border border-gray-200 dark:border-gray-700 shadow-lg flex flex-col flex-1 min-h-0">
        {/* Header */}
        <div className="p-4 lg:p-6 border-b border-gray-200 dark:border-gray-700">
          {/* Title row */}
          <div className="flex items-center justify-between gap-3 mb-3">
            <div className="flex items-center gap-2 lg:gap-3 min-w-0">
              <button
                onClick={onBackToList}
                className="lg:hidden p-1.5 -ml-1.5 text-gray-500 hover:text-gray-700 dark:text-gray-400 dark:hover:text-gray-200 rounded-lg hover:bg-gray-100 dark:hover:bg-gray-700 transition-colors"
              >
                <ChevronLeftIcon className="w-5 h-5" />
              </button>
              <h3 className="font-semibold text-gray-900 dark:text-white text-sm lg:text-base truncate">
                {selectedType?.name} ({documents?.length || 0})
              </h3>
            </div>
            <div className="flex items-center gap-2">
              {/* System-managed types (e.g. Release forms) are populated
                  by another part of the product; manual uploads and
                  request flows don't apply. The type itself stays
                  visible in the sidebar so the user can read the
                  documents inside it. */}
              {canEditDocumentTypes &&
                !isReadOnly &&
                !selectedType?.isSystemManaged && (
                  <Button variant="secondary" size="sm" onClick={onAssign}>
                    <UserPlusIcon className="w-4 h-4" />
                    <span className="hidden sm:inline">{tDocTypes("assignees.assign")}</span>
                  </Button>
                )}
              {(canUploadDocuments || isCurrentUserAssigneeWithPendingTask) &&
                !isReadOnly &&
                !selectedType?.isSystemManaged && (
                  <Button size="sm" onClick={onUpload}>
                    <ArrowUpTrayIcon className="w-4 h-4" />
                    <span className="hidden sm:inline">{t("upload")}</span>
                  </Button>
                )}
            </div>
          </div>

          {/* Assignees row — also hidden for system-managed types
              since there's nothing for an assignee to action. */}
          {selectedType &&
            canEditDocumentTypes &&
            !selectedType.isSystemManaged && (
              <AssigneesList
                assignees={selectedType.assignees}
                onNotify={onNotifyAssignee}
                onRemove={onRemoveAssignee}
                isReadOnly={isReadOnly}
              />
            )}

          {/* Document Acknowledgements Summary — only relevant for
              types where users actively acknowledge documents.
              System-managed types skip the whole assign/ack flow. */}
          {documents &&
            documents.length > 0 &&
            !selectedType?.isSystemManaged && (
              <DocumentAcknowledgementsSummary documents={documents} />
            )}
        </div>

        {/* Content */}
        <div className="flex-1 overflow-auto">
          {documentsLoading ? (
            <div className="p-4 lg:p-6">
              <LoadingSkeleton type="list" rows={5} />
            </div>
          ) : documentsError ? (
            <div className="p-4 lg:p-6">
              <Alert type="error" message={documentsError.message || t("loadError")} />
            </div>
          ) : !documents || documents.length === 0 ? (
            <EmptyDocumentsState message={t("noDocumentsInType")} />
          ) : (
            <>
              {/* Mobile: Card layout */}
              <div className="lg:hidden divide-y divide-gray-100 dark:divide-gray-700">
                {documents.map((doc) => (
                  <DocumentMobileCard
                    key={doc.identifier}
                    document={doc}
                    onDownload={onDownload}
                    onView={onView}
                    canDownload={canDownloadDocuments}
                    downloadLabel={t("download")}
                    viewLabel={t("view")}
                    hideStatus={!!selectedType?.isSystemManaged}
                  />
                ))}
              </div>

              {/* Desktop: Table layout */}
              <div className="hidden lg:block">
                <DocumentsTable
                  documents={documents}
                  onDownload={onDownload}
                  onView={onView}
                  canDownload={canDownloadDocuments}
                  t={t}
                  hideStatus={!!selectedType?.isSystemManaged}
                />
              </div>
            </>
          )}
        </div>
      </div>
    </div>
  );
}

// Empty state component
function EmptyDocumentsState({ message }: { message: string }) {
  return (
    <div className="flex flex-col items-center justify-center h-full p-6 lg:p-8 text-center">
      <DocumentTextIcon className="w-12 h-12 lg:w-16 lg:h-16 text-gray-300 dark:text-gray-600 mb-3 lg:mb-4" />
      <p className="text-sm lg:text-base text-gray-600 dark:text-gray-400">{message}</p>
    </div>
  );
}

// Mobile document card
interface DocumentMobileCardProps {
  document: Document;
  onDownload: (docId: string, fileName: string) => void;
  onView: (doc: Document) => void;
  canDownload: boolean;
  downloadLabel: string;
  viewLabel: string;
  /** Status badge is hidden for system-managed types — the
   *  ack/assign flow doesn't apply there. */
  hideStatus?: boolean;
}

function DocumentMobileCard({ document, onDownload, onView, canDownload, downloadLabel, viewLabel, hideStatus }: DocumentMobileCardProps) {
  const acks = normalizeAcknowledgements(document.acknowledgements);
  const totalRequired = document.totalAssignees || document.totalRequiredAcknowledgers || 0;
  const status = (!totalRequired && acks.length === 0)
    ? "pending_review" as const
    : calculateDocumentStatus(acks, totalRequired);

  return (
    <div className="p-4 flex items-center gap-3">
      <DocumentTextIcon className="w-8 h-8 text-gray-400 flex-shrink-0" />
      <div className="flex-1 min-w-0">
        <p className="text-sm font-medium text-gray-900 dark:text-white truncate">
          {document.name}
        </p>
        <div className="flex items-center gap-2 text-xs text-gray-500 dark:text-gray-400 mt-0.5">
          <span>{document.contentSize}</span>
          <span>-</span>
          <span>{document.author.name}</span>
        </div>
        {document.description && (
          <p className="text-xs text-gray-500 dark:text-gray-400 mt-1 line-clamp-1">
            {document.description}
          </p>
        )}
        {!hideStatus && (
          <div className="mt-2">
            <DocumentStatusBadge status={status} />
          </div>
        )}
      </div>
      <div className="flex items-center gap-1 flex-shrink-0">
        <button
          onClick={() => onView(document)}
          className="p-2 text-blue-600 hover:text-blue-700 dark:text-blue-400 dark:hover:text-blue-300 rounded-lg hover:bg-blue-50 dark:hover:bg-blue-900/20 transition-colors"
          title={viewLabel}
        >
          <EyeIcon className="w-5 h-5" />
        </button>
        {canDownload && (
          <button
            onClick={() => onDownload(document.identifier, document.fileName)}
            className="p-2 text-blue-600 hover:text-blue-700 dark:text-blue-400 dark:hover:text-blue-300 rounded-lg hover:bg-blue-50 dark:hover:bg-blue-900/20 transition-colors"
            title={downloadLabel}
          >
            <ArrowDownTrayIcon className="w-5 h-5" />
          </button>
        )}
      </div>
    </div>
  );
}

// Desktop documents table
interface DocumentsTableProps {
  documents: Document[];
  onDownload: (docId: string, fileName: string) => void;
  onView: (doc: Document) => void;
  canDownload: boolean;
  t: (key: string) => string;
  /** Status column is hidden for system-managed types — the
   *  ack/assign flow doesn't apply there. */
  hideStatus?: boolean;
}

function DocumentsTable({ documents, onDownload, onView, canDownload, t, hideStatus }: DocumentsTableProps) {
  return (
    <Table
      columns={[
        {
          key: "name",
          header: t("documentName"),
          cell: (doc: Document) => (
            <div className="flex items-center gap-3">
              <DocumentTextIcon className="w-5 h-5 text-gray-400 flex-shrink-0" />
              <div className="min-w-0">
                <p className="text-sm font-medium text-gray-900 dark:text-white truncate">
                  {doc.name}
                </p>
                {doc.description && (
                  <p className="text-xs text-gray-600 dark:text-gray-400 truncate">
                    {doc.description}
                  </p>
                )}
              </div>
            </div>
          ),
        },
        {
          key: "size",
          header: t("size"),
          cell: (doc: Document) => (
            <span className="text-sm text-gray-600 dark:text-gray-400">
              {doc.contentSize}
            </span>
          ),
        },
        {
          key: "uploadedBy",
          header: t("uploadedBy"),
          cell: (doc: Document) => (
            <span className="text-sm text-gray-600 dark:text-gray-400">
              {doc.author.name}
            </span>
          ),
        },
        {
          key: "uploadedAt",
          header: t("uploadedAt"),
          cell: (doc: Document) => (
            <span className="text-sm text-gray-600 dark:text-gray-400">
              {new Date(doc.dateCreated).toLocaleDateString()}
            </span>
          ),
        },
        ...(hideStatus
          ? []
          : [
              {
                key: "status",
                header: t("status"),
                cell: (doc: Document) => {
                  const acks = normalizeAcknowledgements(doc.acknowledgements);
                  const totalRequired =
                    doc.totalAssignees || doc.totalRequiredAcknowledgers || 0;

                  if (!totalRequired && acks.length === 0) {
                    return <DocumentStatusBadge status="pending_review" />;
                  }

                  const status = calculateDocumentStatus(acks, totalRequired);
                  return <DocumentStatusBadge status={status} />;
                },
              },
            ]),
        {
          key: "actions",
          header: t("actions"),
          headerClassName: "text-right",
          className: "text-right",
          cell: (doc: Document) => (
            <div className="flex items-center justify-end gap-1">
              <button
                onClick={() => onView(doc)}
                className="p-2 text-blue-600 hover:text-blue-700 dark:text-blue-400 dark:hover:text-blue-300 rounded-lg hover:bg-blue-50 dark:hover:bg-blue-900/20 transition-colors"
                title={t("view")}
              >
                <EyeIcon className="w-4 h-4" />
              </button>
              {canDownload && (
                <button
                  onClick={() => onDownload(doc.identifier, doc.fileName)}
                  className="p-2 text-blue-600 hover:text-blue-700 dark:text-blue-400 dark:hover:text-blue-300 rounded-lg hover:bg-blue-50 dark:hover:bg-blue-900/20 transition-colors"
                  title={t("download")}
                >
                  <ArrowDownTrayIcon className="w-4 h-4" />
                </button>
              )}
            </div>
          ),
        },
      ]}
      data={documents}
      keyExtractor={(doc) => doc.identifier}
      emptyMessage={t("noDocuments")}
    />
  );
}
