"use client";

import { useState, useEffect, useMemo } from "react";
import { useTranslations } from "next-intl";
import {
  DocumentTextIcon,
  PlusIcon,
  PencilIcon,
  TrashIcon,
  MagnifyingGlassIcon,
  ShieldCheckIcon,
  CheckCircleIcon,
  XCircleIcon,
  EyeIcon,
} from "@heroicons/react/24/outline";
import FilterPopover from "@/app/components/ui/FilterPopover";
import { calculateDocumentStatus } from "@/app/features/documents/components/DocumentAcknowledgementStatus";
import { normalizeAcknowledgements } from "@/lib/utils/typeNormalization";
import { useDocumentTypes } from "@/lib/api/document-types";
import { useDocuments } from "@/lib/api/documents";
import { setupTasksApi } from "@/lib/api/setup-tasks";
import { useProjectMembers, useProjectSigners } from "@/lib/api/project-members";
import { useCurrentUserContext } from "@/app/context/CurrentUserContext";
import { usePermission } from "@/lib/hooks/usePermission";
import { useMinimumLoadingTime } from "@/lib/hooks/useMinimumLoadingTime";
import { useRealtimeDocuments } from "@/lib/hooks/useRealtimeProject";
import { PERMISSIONS } from "@/lib/constants/permissions";
import { useToast } from "@/app/context/ToastContext";
import Button from "@/app/components/ui/Button";
import LoadingSkeleton from "@/app/components/ui/LoadingSkeleton";
import Alert from "@/app/components/ui/Alert";
import type { DropdownMenuItem } from "@/app/components/ui/DropdownMenu";
import { UploadDocumentModal, AssignDocumentModal } from "@/app/features/documents";
import DocumentTypeModal from "./DocumentTypeModal";
import DocumentTypeSidebar from "./DocumentTypeSidebar";
import DocumentsPanel from "./DocumentsPanel";
import DocumentViewerModal from "./DocumentViewerModal";
import BaseModal from "@/app/components/modals/BaseModal";
import DeleteConfirmModal from "@/app/components/modals/DeleteConfirmModal";
import { handleError } from "@/lib/utils/errors";
import { documentsApi } from "@/lib/api/documents";
import type {
  Document,
  UploadDocumentRequest,
  DocumentType,
  DocumentTypeAssignee,
  CreateDocumentTypeRequest,
  AddDocumentTypeAssigneeRequest,
} from "@/lib/api/types";

interface DocumentsTabProps {
  projectId: string;
  projectStatus?: "setup" | "active" | "archived" | "completed";
}

export default function DocumentsTab({ projectId, projectStatus }: DocumentsTabProps) {
  const t = useTranslations("projectDetail.documents");
  const tDocTypes = useTranslations("documentTypes");
  const { hasPermission } = usePermission();
  const { showToast } = useToast();

  // Fetch document types with assignees
  const {
    data: documentTypes,
    loading: rawTypesLoading,
    error: typesError,
    refetch: refetchDocumentTypes,
    createDocumentType,
    updateDocumentType,
    deleteDocumentType,
    addAssignee,
    removeAssignee,
    notifyAssignee,
  } = useDocumentTypes(projectId, { includeAssignees: true });

  // Fetch project members for assignee selection
  const { data: projectMembers } = useProjectMembers(projectId);
  const { data: projectSigners } = useProjectSigners(projectId);
  const { currentUser } = useCurrentUserContext();

  // Map ProjectMember[] to User[] format for AssignDocumentModal
  const availableUsers = useMemo(() => {
    if (!projectMembers) return [];
    return projectMembers.map((pm) => ({
      id: pm.member.identifier,
      name: pm.member.name,
      email: pm.member.email,
      emailVerified: true,
      dateCreated: pm.dateCreated,
      dateModified: pm.dateCreated,
      roles: [],
      active: true,
    }));
  }, [projectMembers]);

  const defaultSigners = useMemo(() => {
    if (!projectSigners) return [];
    return projectSigners.map((s) => ({
      id: s.member.identifier,
      name: s.member.name,
      email: s.member.email,
    }));
  }, [projectSigners]);

  const defaultSignerIds = useMemo(
    () => new Set(defaultSigners.map((s) => s.id)),
    [defaultSigners]
  );

  const [hasActiveMeeting, setHasActiveMeeting] = useState(false);
  useEffect(() => {
    setupTasksApi.getAll(projectId).then((res) => {
      setHasActiveMeeting(
        (res.data || []).some(
          (t) => t.additionalType === "kickoff_meeting" && !t.isComplete
        )
      );
    }).catch(() => {});
  }, [projectId]);

  // State
  const [selectedTypeId, setSelectedTypeId] = useState<string | null>(null);
  const [showMobileDetail, setShowMobileDetail] = useState(false);
  // The search input + filter live above the right panel and scope
  // to the documents inside the selected document type. Each filter
  // axis is OR within itself, AND across axes. The uploader options
  // are derived from the actual authors that show up in `documents`,
  // so the popover stays in sync with the data.
  const [documentSearchQuery, setDocumentSearchQuery] = useState("");
  const [selectedStatuses, setSelectedStatuses] = useState<string[]>([]);
  const [selectedUploaders, setSelectedUploaders] = useState<string[]>([]);
  const [selectedDateRanges, setSelectedDateRanges] = useState<string[]>([]);
  const [isUploadModalOpen, setIsUploadModalOpen] = useState(false);
  // Document currently being viewed inline via the eye-icon button.
  // Cleared when the modal closes.
  const [viewingDocument, setViewingDocument] = useState<Document | null>(null);
  const [isCreateTypeModalOpen, setIsCreateTypeModalOpen] = useState(false);
  const [isEditTypeModalOpen, setIsEditTypeModalOpen] = useState(false);
  const [isDeleteModalOpen, setIsDeleteModalOpen] = useState(false);
  const [isAssignModalOpen, setIsAssignModalOpen] = useState(false);
  const [typeToEdit, setTypeToEdit] = useState<DocumentType | null>(null);
  const [typeToDelete, setTypeToDelete] = useState<DocumentType | null>(null);
  const [assigneeToRemove, setAssigneeToRemove] = useState<DocumentTypeAssignee | null>(null);
  const [documentToDecline, setDocumentToDecline] = useState<Document | null>(null);
  const [declineReason, setDeclineReason] = useState("");

  // Fetch documents for selected type
  const {
    data: documents,
    loading: rawDocumentsLoading,
    error: documentsError,
    downloadDocument,
    uploadDocument,
    refetch: refetchDocuments,
  } = useDocuments(projectId, selectedTypeId ?? "");

  // Fetch ALL documents (no typeId) to power the top-level pending review block
  const { data: allDocuments, refetch: refetchAllDocuments } = useDocuments(projectId);

  const typesLoading = useMinimumLoadingTime(rawTypesLoading);
  const documentsLoading = useMinimumLoadingTime(rawDocumentsLoading);

  // Documents pending review by the current user (across ALL types)
  const pendingMyReviewDocs = useMemo(() => {
    if (!allDocuments || !currentUser?.identifier) return [];
    return allDocuments.filter(
      (doc) =>
        doc.approvalStatus === "pending_review" &&
        doc.reviewers?.some((r) => r.identifier === currentUser.identifier && !r.hasReviewed)
    );
  }, [allDocuments, currentUser?.identifier]);

  // Sort document types: required first, then alphabetically
  const sortedDocumentTypes = useMemo(() => {
    if (!documentTypes) return [];
    return [...documentTypes].sort((a, b) => {
      if (a.isRequired && !b.isRequired) return -1;
      if (!a.isRequired && b.isRequired) return 1;
      return a.name.localeCompare(b.name);
    });
  }, [documentTypes]);

  // Distinct uploader options for the filter, derived from the
  // documents currently loaded for the selected type. Built off the
  // raw `documents` (not the filtered list) so toggling the filter
  // doesn't make options disappear.
  const uploaderOptions = useMemo(() => {
    if (!documents) return [];
    const seen = new Map<string, string>();
    for (const doc of documents) {
      const id = doc.author.identifier;
      if (id && !seen.has(id)) {
        seen.set(id, doc.author.name);
      }
    }
    return Array.from(seen, ([value, label]) => ({ value, label })).sort((a, b) =>
      a.label.localeCompare(b.label)
    );
  }, [documents]);

  // Documents narrowed by search, status, uploader, and upload-date
  // filters. Each axis is OR-within / AND-across. Status mirrors the
  // logic used by the status badge (totalRequired === 0 with no acks
  // = pending_review) so the filter and the visible badge agree.
  const filteredDocuments = useMemo(() => {
    if (!documents) return documents;
    const q = documentSearchQuery.trim().toLowerCase();
    const now = Date.now();
    const sevenDays = 7 * 24 * 60 * 60 * 1000;
    const thirtyDays = 30 * 24 * 60 * 60 * 1000;
    return documents.filter((doc) => {
      if (q && !doc.name.toLowerCase().includes(q)) return false;

      if (selectedStatuses.length > 0) {
        const acks = normalizeAcknowledgements(doc.acknowledgements);
        const totalRequired =
          doc.totalAssignees || doc.totalRequiredAcknowledgers || 0;
        const status =
          !totalRequired && acks.length === 0
            ? "pending_review"
            : calculateDocumentStatus(acks, totalRequired);
        if (!selectedStatuses.includes(status)) return false;
      }

      if (selectedUploaders.length > 0) {
        const id = doc.author.identifier;
        if (!id || !selectedUploaders.includes(id)) return false;
      }

      if (selectedDateRanges.length > 0) {
        const age = now - new Date(doc.dateCreated).getTime();
        const inRange = selectedDateRanges.some((token) => {
          if (token === "last7days") return age <= sevenDays;
          if (token === "last30days") return age <= thirtyDays;
          if (token === "older") return age > thirtyDays;
          return false;
        });
        if (!inRange) return false;
      }

      return true;
    });
  }, [
    documents,
    documentSearchQuery,
    selectedStatuses,
    selectedUploaders,
    selectedDateRanges,
  ]);

  // Auto-select first document type
  useEffect(() => {
    if (!selectedTypeId && sortedDocumentTypes.length > 0) {
      setSelectedTypeId(sortedDocumentTypes[0].identifier);
    }
  }, [selectedTypeId, sortedDocumentTypes]);

  // Real-time updates
  useRealtimeDocuments(projectId, () => {
    refetchDocuments();
    refetchDocumentTypes();
  });

  // Permissions
  const canUploadDocuments = hasPermission(PERMISSIONS.UPLOAD_DOCUMENTS);
  const canDownloadDocuments = hasPermission(PERMISSIONS.DOWNLOAD_DOCUMENTS);
  const canCreateDocumentTypes = hasPermission(PERMISSIONS.CREATE_DOCUMENT_TYPES);
  const canEditDocumentTypes = hasPermission(PERMISSIONS.EDIT_DOCUMENT_TYPES);
  const canDeleteDocumentTypes = hasPermission(PERMISSIONS.DELETE_DOCUMENT_TYPES);
  const isReadOnly = projectStatus === "archived" || projectStatus === "completed";

  const selectedType = documentTypes?.find((type) => type.identifier === selectedTypeId);
  const currentUserAssignment = selectedType?.assignees?.find(
    (assignee) => assignee.identifier === currentUser?.identifier
  );
  const isCurrentUserAssigneeWithPendingTask = currentUserAssignment && !currentUserAssignment.isCompleted;

  // Handlers
  const handleUploadDocument = async (data: UploadDocumentRequest) => {
    if (!selectedTypeId) return;
    await uploadDocument(selectedTypeId, data);
    refetchDocumentTypes();
    refetchDocuments();
    refetchAllDocuments();
    setIsUploadModalOpen(false);
  };

  const handleDownload = async (docId: string, fileName: string) => {
    try {
      await downloadDocument(docId, fileName);
    } catch (error) {
      handleError(error, { severity: "console", context: "Downloading document" });
    }
  };

  const handleCreateDocumentType = async (data: CreateDocumentTypeRequest) => {
    await createDocumentType(data);
    showToast("success", tDocTypes("createModal.success"));
    setIsCreateTypeModalOpen(false);
  };

  const handleEditDocumentType = async (data: CreateDocumentTypeRequest) => {
    if (!typeToEdit) return;
    try {
      await updateDocumentType(typeToEdit.identifier, data);
      showToast("success", tDocTypes("editModal.success"));
      setIsEditTypeModalOpen(false);
      setTypeToEdit(null);
    } catch (error: any) {
      if (error.status === 403) {
        showToast("error", tDocTypes("editModal.lockedError"));
        throw new Error(tDocTypes("editModal.lockedError"));
      }
      throw error;
    }
  };

  const handleDeleteDocumentType = async () => {
    if (!typeToDelete) return;
    await deleteDocumentType(typeToDelete.identifier);
    if (selectedTypeId === typeToDelete.identifier) {
      setSelectedTypeId(null);
    }
  };

  const handleAddAssignee = async (data: AddDocumentTypeAssigneeRequest) => {
    if (!selectedTypeId) return;
    await addAssignee(selectedTypeId, data);
    showToast("success", tDocTypes("assignees.assignModal.success"));
    setIsAssignModalOpen(false);
  };

  const handleRemoveAssignee = (assignee: DocumentTypeAssignee) => {
    setAssigneeToRemove(assignee);
  };

  const confirmRemoveAssignee = async () => {
    if (!selectedTypeId || !assigneeToRemove) return;
    await removeAssignee(selectedTypeId, assigneeToRemove.identifier);
    showToast("success", tDocTypes("assignees.removeSuccess"));
    setAssigneeToRemove(null);
  };

  const handleApproveDocument = async (docId: string) => {
    try {
      await documentsApi.approve(projectId, docId);
      showToast("success", t("approveSuccess"));
      refetchDocuments();
      refetchAllDocuments();
    } catch (error) {
      handleError(error, { severity: "toast", context: "Approving document" });
    }
  };

  const handleDeclineDocument = async () => {
    if (!documentToDecline || !declineReason.trim()) return;
    await documentsApi.decline(projectId, documentToDecline.identifier, declineReason.trim());
    showToast("success", t("declineSuccess"));
    setDocumentToDecline(null);
    setDeclineReason("");
    refetchDocuments();
    refetchAllDocuments();
  };

  const handleNotifyAssignee = async (assignee: DocumentTypeAssignee) => {
    if (!selectedTypeId) return;
    await notifyAssignee(selectedTypeId, assignee.identifier);
    showToast("success", tDocTypes("assignees.notifySuccess", { name: assignee.name }));
  };

  const getDropdownMenuItems = (type: DocumentType): DropdownMenuItem[] => {
    const items: DropdownMenuItem[] = [];
    if (canEditDocumentTypes && !type.isLocked && !isReadOnly) {
      items.push({
        label: tDocTypes("edit"),
        icon: PencilIcon,
        onClick: () => {
          setTypeToEdit(type);
          setIsEditTypeModalOpen(true);
        },
      });
    }
    if (canDeleteDocumentTypes && !type.isLocked && !isReadOnly) {
      items.push({
        label: tDocTypes("delete"),
        icon: TrashIcon,
        variant: "danger",
        onClick: () => {
          setTypeToDelete(type);
          setIsDeleteModalOpen(true);
        },
      });
    }
    return items;
  };

  const handleSelectType = (typeId: string) => {
    setSelectedTypeId(typeId);
    setShowMobileDetail(true);
  };

  // Loading state
  if (typesLoading) {
    return <LoadingSkeleton type="list" rows={5} />;
  }

  // Error state
  if (typesError) {
    return <Alert type="error" message={typesError.message || t("loadError")} />;
  }

  // Empty state
  if (!documentTypes || documentTypes.length === 0) {
    return (
      <>
        <div className="text-center py-16 bg-gradient-to-br from-white to-gray-50 dark:from-gray-800 dark:to-gray-900 rounded-2xl border-2 border-dashed border-gray-300 dark:border-gray-700">
          <DocumentTextIcon className="w-16 h-16 text-gray-300 dark:text-gray-600 mx-auto mb-4" />
          <h3 className="text-lg font-semibold text-gray-900 dark:text-white mb-2">
            {t("noDocumentTypes")}
          </h3>
          <p className="text-gray-600 dark:text-gray-400 mb-6 max-w-sm mx-auto">
            {t("createFirstDocumentType")}
          </p>
          {canCreateDocumentTypes && !isReadOnly && (
            <Button onClick={() => setIsCreateTypeModalOpen(true)}>
              <PlusIcon className="w-4 h-4" />
              {tDocTypes("addNew")}
            </Button>
          )}
        </div>
        <DocumentTypeModal
          isOpen={isCreateTypeModalOpen}
          onClose={() => setIsCreateTypeModalOpen(false)}
          onSubmit={handleCreateDocumentType}
          projectId={projectId}
        />
      </>
    );
  }

  return (
    <div className="space-y-4">
      {/* Pending review — flat list, no container */}
      {pendingMyReviewDocs.length > 0 && (
        <div>
          <div className="flex items-center gap-1.5 mb-1.5">
            <ShieldCheckIcon className="w-3.5 h-3.5 text-amber-500 dark:text-amber-400 flex-shrink-0" />
            <span className="text-xs font-semibold text-amber-600 dark:text-amber-400">
              {t("pendingReviewTitle")}
            </span>
          </div>
          <div className="divide-y divide-gray-100 dark:divide-gray-700/60 border border-gray-200 dark:border-gray-700 rounded-xl overflow-hidden shadow-sm bg-white dark:bg-gray-800">
            {pendingMyReviewDocs.map((doc) => (
              <div
                key={doc.identifier}
                className="flex items-center gap-3 px-3 py-2.5 hover:bg-gray-50 dark:hover:bg-gray-700/30 transition-colors"
              >
                <div className="flex-1 min-w-0 flex items-center gap-2">
                  {doc.category?.name && (
                    <span className="flex-shrink-0 text-[10px] font-semibold uppercase tracking-wide text-gray-400 dark:text-gray-500">
                      {doc.category.name}
                    </span>
                  )}
                  {doc.category?.name && <span className="text-gray-200 dark:text-gray-700 flex-shrink-0">·</span>}
                  <p className="text-xs text-gray-700 dark:text-gray-300 truncate">{doc.name}</p>
                </div>
                <div className="flex items-center gap-1 flex-shrink-0">
                  <button
                    onClick={() => setViewingDocument(doc)}
                    className="p-1.5 rounded text-gray-400 hover:text-blue-600 dark:hover:text-blue-400 hover:bg-blue-50 dark:hover:bg-blue-900/20 transition-colors"
                    title={t("view")}
                  >
                    <EyeIcon className="w-3.5 h-3.5" />
                  </button>
                  <button
                    onClick={() => handleApproveDocument(doc.identifier)}
                    className="inline-flex items-center gap-1 px-2.5 py-1 rounded text-[11px] font-semibold text-green-700 dark:text-green-400 hover:bg-green-50 dark:hover:bg-green-900/20 transition-colors"
                  >
                    <CheckCircleIcon className="w-3 h-3" />
                    {t("approve")}
                  </button>
                  <button
                    onClick={() => { setDocumentToDecline(doc); setDeclineReason(""); }}
                    className="inline-flex items-center gap-1 px-2.5 py-1 rounded text-[11px] font-semibold text-red-600 dark:text-red-400 hover:bg-red-50 dark:hover:bg-red-900/20 transition-colors"
                  >
                    <XCircleIcon className="w-3 h-3" />
                    {t("decline")}
                  </button>
                </div>
              </div>
            ))}
          </div>
        </div>
      )}

      <div className="flex flex-col lg:flex-row gap-4 lg:gap-6">
        {/* Left Sidebar */}
        <DocumentTypeSidebar
          documentTypes={sortedDocumentTypes}
          selectedTypeId={selectedTypeId}
          onSelectType={handleSelectType}
          onCreateType={() => setIsCreateTypeModalOpen(true)}
          getMenuItems={getDropdownMenuItems}
          canCreateDocumentTypes={canCreateDocumentTypes}
          isReadOnly={isReadOnly}
          showMobileDetail={showMobileDetail}
        />

      {/* Right column — search + filter live above the documents
          panel because every axis (search, status, uploader, upload
          date) operates on the documents inside the selected type. */}
      <div className={`${showMobileDetail ? "block" : "hidden"} lg:block flex-1 flex flex-col min-w-0`}>
        <div className="flex items-center flex-wrap gap-3 mb-6">
          <div className="relative flex-1 max-w-sm">
            <MagnifyingGlassIcon className="w-4 h-4 absolute left-3 top-1/2 -translate-y-1/2 text-gray-400" />
            <input
              type="text"
              placeholder={t("searchPlaceholder")}
              value={documentSearchQuery}
              onChange={(e) => setDocumentSearchQuery(e.target.value)}
              className="w-full pl-9 pr-3 py-1.5 text-sm border border-gray-300 dark:border-gray-600 rounded-md bg-white dark:bg-gray-800 text-gray-900 dark:text-white focus:outline-none focus:ring-2 focus:ring-blue-500 focus:border-blue-500"
            />
          </div>
          <FilterPopover
            triggerLabel={t("filterLabel")}
            sections={[
              {
                id: "status",
                label: t("filterCategoryStatus"),
                searchPlaceholder: t("filterSearchStatus"),
                options: [
                  { value: "draft", label: t("filterStatusDraft") },
                  {
                    value: "pending_review",
                    label: t("filterStatusPendingReview"),
                  },
                  { value: "active", label: t("filterStatusActive") },
                  { value: "disputed", label: t("filterStatusDisputed") },
                ],
                selected: selectedStatuses,
                onChange: setSelectedStatuses,
              },
              {
                id: "uploader",
                label: t("filterCategoryUploader"),
                searchPlaceholder: t("filterSearchUploader"),
                emptyLabel: t("filterUploaderEmpty"),
                options: uploaderOptions,
                selected: selectedUploaders,
                onChange: setSelectedUploaders,
              },
              {
                id: "date",
                label: t("filterCategoryDate"),
                searchPlaceholder: t("filterSearchDate"),
                options: [
                  { value: "last7days", label: t("filterDateLast7Days") },
                  { value: "last30days", label: t("filterDateLast30Days") },
                  { value: "older", label: t("filterDateOlder") },
                ],
                selected: selectedDateRanges,
                onChange: setSelectedDateRanges,
              },
            ]}
            onClearAll={
              selectedStatuses.length > 0 ||
              selectedUploaders.length > 0 ||
              selectedDateRanges.length > 0
                ? () => {
                    setSelectedStatuses([]);
                    setSelectedUploaders([]);
                    setSelectedDateRanges([]);
                  }
                : undefined
            }
            activeCountLabel={(count) =>
              t("filterActiveCount", { count })
            }
            clearAllLabel={t("filterClear")}
          />
        </div>

        <DocumentsPanel
          selectedType={selectedType}
          documents={filteredDocuments}
          documentsLoading={documentsLoading}
          documentsError={documentsError}
          onBackToList={() => setShowMobileDetail(false)}
          onUpload={() => setIsUploadModalOpen(true)}
          onAssign={() => setIsAssignModalOpen(true)}
          onDownload={handleDownload}
          onView={setViewingDocument}
          onNotifyAssignee={handleNotifyAssignee}
          onRemoveAssignee={handleRemoveAssignee}
          canUploadDocuments={canUploadDocuments}
          canDownloadDocuments={canDownloadDocuments}
          canEditDocumentTypes={canEditDocumentTypes}
          isCurrentUserAssigneeWithPendingTask={!!isCurrentUserAssigneeWithPendingTask}
          isReadOnly={isReadOnly}
        />
      </div>

      {/* Modals */}
      {selectedType && (
        <>
          <UploadDocumentModal
            isOpen={isUploadModalOpen}
            onClose={() => setIsUploadModalOpen(false)}
            onSubmit={handleUploadDocument}
            documentTypeName={selectedType.name}
            defaultSigners={defaultSigners}
            availableReviewers={availableUsers
              .filter((u) => !defaultSignerIds.has(u.id))
              .map((u) => ({ id: u.id, name: u.name, email: u.email ?? "" }))}
            hasActiveMeeting={hasActiveMeeting}
          />
          <AssignDocumentModal
            isOpen={isAssignModalOpen}
            onClose={() => setIsAssignModalOpen(false)}
            onSubmit={handleAddAssignee}
            documentTypeName={selectedType.name}
            availableUsers={availableUsers}
            existingAssigneeIds={selectedType.assignees?.map((a) => a.identifier) || []}
            currentUserId={currentUser?.identifier}
            projectId={projectId}
          />
        </>
      )}

      <DocumentTypeModal
        isOpen={isCreateTypeModalOpen}
        onClose={() => setIsCreateTypeModalOpen(false)}
        onSubmit={handleCreateDocumentType}
        projectId={projectId}
      />

      {typeToEdit && (
        <DocumentTypeModal
          isOpen={isEditTypeModalOpen}
          onClose={() => {
            setIsEditTypeModalOpen(false);
            setTypeToEdit(null);
          }}
          onSubmit={handleEditDocumentType}
          documentType={typeToEdit}
          projectId={projectId}
        />
      )}

      <BaseModal
        isOpen={isDeleteModalOpen}
        onClose={() => {
          setIsDeleteModalOpen(false);
          setTypeToDelete(null);
        }}
        title={tDocTypes("deleteModal.title")}
        formId="delete-document-type-form"
        onSubmit={handleDeleteDocumentType}
        successMessage={tDocTypes("deleteModal.success")}
        errorFallbackMessage={tDocTypes("deleteModal.error")}
        submitLabel={tDocTypes("deleteModal.confirm")}
        submitVariant="danger"
        submitDisabled={typeToDelete?.documentCount ? typeToDelete.documentCount > 0 : false}
      >
        <div className="space-y-4">
          <p className="text-gray-700 dark:text-gray-300">
            {tDocTypes("deleteModal.message", { name: typeToDelete?.name || "" })}
          </p>
          {typeToDelete && typeToDelete.documentCount > 0 && (
            <Alert
              type="warning"
              message={tDocTypes("deleteModal.hasDocuments", { count: typeToDelete.documentCount })}
            />
          )}
        </div>
      </BaseModal>

      {/* Remove Assignee Confirmation Modal */}
      <DeleteConfirmModal
        isOpen={!!assigneeToRemove}
        onClose={() => setAssigneeToRemove(null)}
        onConfirm={confirmRemoveAssignee}
        title={tDocTypes("assignees.removeModal.title")}
        message={tDocTypes("assignees.removeModal.message", { name: assigneeToRemove?.name || "" })}
        successMessage={tDocTypes("assignees.removeSuccess")}
        errorMessage={tDocTypes("assignees.removeError")}
        confirmLabel={tDocTypes("assignees.removeModal.confirm")}
      />

      {/* Decline document modal */}
      <BaseModal
        isOpen={!!documentToDecline}
        onClose={() => { setDocumentToDecline(null); setDeclineReason(""); }}
        title={t("declineModal.title")}
        formId="decline-document-form"
        onSubmit={handleDeclineDocument}
        successMessage={t("declineSuccess")}
        errorFallbackMessage={t("declineError")}
        submitLabel={t("decline")}
        submitVariant="danger"
        submitDisabled={!declineReason.trim()}
      >
        <div className="space-y-4">
          <p className="text-sm text-gray-700 dark:text-gray-300">
            {t("declineModal.message", { name: documentToDecline?.name || "" })}
          </p>
          <div>
            <label className="block text-sm font-medium text-gray-700 dark:text-gray-300 mb-1.5">
              {t("declineModal.reasonLabel")} <span className="text-red-500">*</span>
            </label>
            <textarea
              value={declineReason}
              onChange={(e) => setDeclineReason(e.target.value)}
              placeholder={t("declineModal.reasonPlaceholder")}
              rows={3}
              className="w-full px-3 py-2.5 rounded-lg border border-gray-300 dark:border-gray-600 bg-white dark:bg-gray-700 text-gray-900 dark:text-white placeholder-gray-400 focus:outline-none focus:ring-2 focus:ring-blue-500 focus:border-blue-500 text-sm resize-none"
            />
          </div>
        </div>
      </BaseModal>

      {/* Inline document viewer — driven by the eye-icon button on
          the documents panel. Document shape is structurally a
          superset of SetupTaskDocument; cast keeps TS happy. */}
      {viewingDocument && (
        <DocumentViewerModal
          isOpen={!!viewingDocument}
          onClose={() => setViewingDocument(null)}
          attachment={viewingDocument as unknown as Parameters<typeof DocumentViewerModal>[0]["attachment"]}
          downloadUrl={documentsApi.getDownloadUrl(projectId, viewingDocument.identifier)}
        />
      )}
      </div>
    </div>
  );
}
