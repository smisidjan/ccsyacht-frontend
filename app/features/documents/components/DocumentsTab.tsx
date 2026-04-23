"use client";

import { useState, useEffect, useMemo } from "react";
import { useTranslations } from "next-intl";
import { DocumentTextIcon, PlusIcon, PencilIcon, TrashIcon } from "@heroicons/react/24/outline";
import { useDocumentTypes } from "@/lib/api/document-types";
import { useDocuments } from "@/lib/api/documents";
import { useProjectMembers } from "@/lib/api/project-members";
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
import BaseModal from "@/app/components/modals/BaseModal";
import DeleteConfirmModal from "@/app/components/modals/DeleteConfirmModal";
import { handleError } from "@/lib/utils/errors";
import type {
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

  // State
  const [selectedTypeId, setSelectedTypeId] = useState<string | null>(null);
  const [showMobileDetail, setShowMobileDetail] = useState(false);
  const [isUploadModalOpen, setIsUploadModalOpen] = useState(false);
  const [isCreateTypeModalOpen, setIsCreateTypeModalOpen] = useState(false);
  const [isEditTypeModalOpen, setIsEditTypeModalOpen] = useState(false);
  const [isDeleteModalOpen, setIsDeleteModalOpen] = useState(false);
  const [isAssignModalOpen, setIsAssignModalOpen] = useState(false);
  const [typeToEdit, setTypeToEdit] = useState<DocumentType | null>(null);
  const [typeToDelete, setTypeToDelete] = useState<DocumentType | null>(null);
  const [assigneeToRemove, setAssigneeToRemove] = useState<DocumentTypeAssignee | null>(null);

  // Fetch documents for selected type
  const {
    data: documents,
    loading: rawDocumentsLoading,
    error: documentsError,
    downloadDocument,
    uploadDocument,
    refetch: refetchDocuments,
  } = useDocuments(projectId, selectedTypeId ?? "");

  const typesLoading = useMinimumLoadingTime(rawTypesLoading);
  const documentsLoading = useMinimumLoadingTime(rawDocumentsLoading);

  // Sort document types: required first, then alphabetically
  const sortedDocumentTypes = useMemo(() => {
    if (!documentTypes) return [];
    return [...documentTypes].sort((a, b) => {
      if (a.isRequired && !b.isRequired) return -1;
      if (!a.isRequired && b.isRequired) return 1;
      return a.name.localeCompare(b.name);
    });
  }, [documentTypes]);

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

      {/* Right Panel */}
      <DocumentsPanel
        selectedType={selectedType}
        documents={documents}
        documentsLoading={documentsLoading}
        documentsError={documentsError}
        showMobileDetail={showMobileDetail}
        onBackToList={() => setShowMobileDetail(false)}
        onUpload={() => setIsUploadModalOpen(true)}
        onAssign={() => setIsAssignModalOpen(true)}
        onDownload={handleDownload}
        onNotifyAssignee={handleNotifyAssignee}
        onRemoveAssignee={handleRemoveAssignee}
        canUploadDocuments={canUploadDocuments}
        canDownloadDocuments={canDownloadDocuments}
        canEditDocumentTypes={canEditDocumentTypes}
        isCurrentUserAssigneeWithPendingTask={!!isCurrentUserAssigneeWithPendingTask}
        isReadOnly={isReadOnly}
      />

      {/* Modals */}
      {selectedType && (
        <>
          <UploadDocumentModal
            isOpen={isUploadModalOpen}
            onClose={() => setIsUploadModalOpen(false)}
            onSubmit={handleUploadDocument}
            documentTypeName={selectedType.name}
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
    </div>
  );
}
