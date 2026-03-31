"use client";

import { useState, useEffect } from "react";
import { useTranslations } from "next-intl";
import {
  DocumentTextIcon,
  ArrowUpTrayIcon,
  ArrowDownTrayIcon,
  FolderIcon,
  PlusIcon,
  PencilIcon,
  TrashIcon,
} from "@heroicons/react/24/outline";
import { useDocumentTypes } from "@/lib/api/document-types";
import { useDocuments } from "@/lib/api/documents";
import { usePermission } from "@/lib/hooks/usePermission";
import { useMinimumLoadingTime } from "@/lib/hooks/useMinimumLoadingTime";
import { useRealtimeDocuments } from "@/lib/hooks/useRealtimeProject";
import { PERMISSIONS } from "@/lib/constants/permissions";
import { useToast } from "@/app/context/ToastContext";
import Button from "@/app/components/ui/Button";
import Table from "@/app/components/ui/Table";
import LoadingSkeleton from "@/app/components/ui/LoadingSkeleton";
import Alert from "@/app/components/ui/Alert";
import DropdownMenu from "@/app/components/ui/DropdownMenu";
import type { DropdownMenuItem } from "@/app/components/ui/DropdownMenu";
import UploadDocumentModal from "@/app/components/modals/UploadDocumentModal";
import DocumentTypeModal from "@/app/components/modals/DocumentTypeModal";
import BaseModal from "@/app/components/modals/BaseModal";
import type { UploadDocumentRequest, Document, DocumentType, CreateDocumentTypeRequest } from "@/lib/api/types";

interface DocumentsTabProps {
  projectId: string;
  projectStatus?: "setup" | "active" | "archived" | "completed";
}

export default function DocumentsTab({ projectId, projectStatus }: DocumentsTabProps) {
  const t = useTranslations("projectDetail.documents");
  const tDocTypes = useTranslations("documentTypes");
  const { hasPermission } = usePermission();
  const { showToast } = useToast();

  // Fetch document types
  const {
    data: documentTypes,
    loading: rawTypesLoading,
    error: typesError,
    refetch: refetchDocumentTypes,
    createDocumentType,
    updateDocumentType,
    deleteDocumentType,
  } = useDocumentTypes(projectId);

  // State for selected document type
  const [selectedTypeId, setSelectedTypeId] = useState<string | null>(null);
  const [isUploadModalOpen, setIsUploadModalOpen] = useState(false);
  const [isCreateTypeModalOpen, setIsCreateTypeModalOpen] = useState(false);
  const [isEditTypeModalOpen, setIsEditTypeModalOpen] = useState(false);
  const [isDeleteModalOpen, setIsDeleteModalOpen] = useState(false);
  const [typeToEdit, setTypeToEdit] = useState<DocumentType | null>(null);
  const [typeToDelete, setTypeToDelete] = useState<DocumentType | null>(null);

  // Fetch documents for selected type (only when we have a typeId)
  const {
    data: documents,
    loading: rawDocumentsLoading,
    error: documentsError,
    downloadDocument,
    uploadDocument,
    refetch: refetchDocuments,
  } = useDocuments(projectId, selectedTypeId ?? ""); // Empty string prevents fetch until typeId is set

  const typesLoading = useMinimumLoadingTime(rawTypesLoading);
  const documentsLoading = useMinimumLoadingTime(rawDocumentsLoading);

  // Auto-select first document type if none selected
  useEffect(() => {
    if (!selectedTypeId && documentTypes && documentTypes.length > 0) {
      setSelectedTypeId(documentTypes[0].identifier);
    }
  }, [selectedTypeId, documentTypes]);

  // Real-time updates for documents
  useRealtimeDocuments(projectId, () => {
    refetchDocuments();
    refetchDocumentTypes(); // Update document counts in sidebar
  });

  // Permissions
  const canUploadDocuments = hasPermission(PERMISSIONS.UPLOAD_DOCUMENTS);
  const canDownloadDocuments = hasPermission(PERMISSIONS.DOWNLOAD_DOCUMENTS);
  const canCreateDocumentTypes = hasPermission(PERMISSIONS.CREATE_DOCUMENT_TYPES);
  const canEditDocumentTypes = hasPermission(PERMISSIONS.EDIT_DOCUMENT_TYPES);
  const canDeleteDocumentTypes = hasPermission(PERMISSIONS.DELETE_DOCUMENT_TYPES);

  const isReadOnly = projectStatus === "archived" || projectStatus === "completed";

  const selectedType = documentTypes?.find((type) => type.identifier === selectedTypeId);

  const handleUploadDocument = async (data: UploadDocumentRequest) => {
    if (!selectedTypeId) return;
    await uploadDocument(selectedTypeId, data);
    refetchDocumentTypes(); // Refresh document types to update counts and Required labels
    setIsUploadModalOpen(false);
  };

  const handleDownload = async (docId: string, fileName: string) => {
    try {
      await downloadDocument(docId, fileName);
    } catch (error) {
      console.error("Failed to download document:", error);
    }
  };

  const handleCreateDocumentType = async (data: CreateDocumentTypeRequest) => {
    try {
      await createDocumentType(data);
      showToast("success", tDocTypes("createModal.success"));
      setIsCreateTypeModalOpen(false);
    } catch (error: any) {
      // Error handled by BaseModal
      throw error;
    }
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
    // If we deleted the selected type, select another one
    if (selectedTypeId === typeToDelete.identifier) {
      setSelectedTypeId(null);
    }
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

  if (typesLoading) {
    return <LoadingSkeleton type="list" rows={5} />;
  }

  if (typesError) {
    return <Alert type="error" message={typesError.message || t("loadError")} />;
  }

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

        {/* Create Document Type Modal */}
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
    <div className="flex gap-6">
      {/* Left Sidebar - Document Types */}
      <div className="w-80 flex-shrink-0">
        <div className="bg-white dark:bg-gray-800 rounded-2xl border border-gray-200 dark:border-gray-700 shadow-lg flex flex-col max-h-[calc(100vh-240px)]">
          <div className="p-4 border-b border-gray-200 dark:border-gray-700 flex-shrink-0">
            <div className="flex items-center justify-between">
              <div className="flex items-center gap-2 text-gray-900 dark:text-white">
                <FolderIcon className="w-5 h-5" />
                <h3 className="font-semibold">{t("documentTypes")}</h3>
              </div>
              {canCreateDocumentTypes && !isReadOnly && (
                <button
                  onClick={() => setIsCreateTypeModalOpen(true)}
                  className="p-1.5 text-blue-600 hover:text-blue-700 dark:text-blue-400 dark:hover:text-blue-300 rounded-lg hover:bg-blue-50 dark:hover:bg-blue-900/20 transition-colors"
                  title={tDocTypes("addNew")}
                >
                  <PlusIcon className="w-5 h-5" />
                </button>
              )}
            </div>
          </div>
          <div className="overflow-y-auto overflow-x-visible">
            {documentTypes.map((type) => {
              const menuItems = getDropdownMenuItems(type);
              return (
                <div
                  key={type.identifier}
                  className={`flex items-center justify-between transition-colors ${
                    selectedTypeId === type.identifier
                      ? "bg-blue-600 text-white"
                      : "hover:bg-gray-50 dark:hover:bg-gray-700/50 text-gray-900 dark:text-white"
                  }`}
                >
                  <button
                    onClick={() => setSelectedTypeId(type.identifier)}
                    className="flex-1 flex items-center justify-between p-4 text-left"
                  >
                    <div className="flex items-center gap-3 flex-1 min-w-0">
                      <FolderIcon className="w-5 h-5 flex-shrink-0" />
                      <div className="flex flex-col min-w-0">
                        <span className="font-medium truncate">{type.name}</span>
                      </div>
                    </div>
                    {type.isRequired && type.documentCount === 0 ? (
                      <span
                        className={`flex-shrink-0 px-2 py-1 text-xs rounded-full ${
                          selectedTypeId === type.identifier
                            ? "bg-white/20 text-red-600"
                            : "bg-gray-100 dark:bg-gray-700 text-gray-700 dark:text-gray-300 text-red-600 dark:text-red-400"
                        }`}
                      >
                        {t("required")}
                      </span>
                    ) : (
                      <span
                        className={`flex-shrink-0 px-2 py-1 text-xs rounded-full ${
                          selectedTypeId === type.identifier
                            ? "bg-white/20 text-white"
                            : "bg-gray-100 dark:bg-gray-700 text-gray-700 dark:text-gray-300"
                        }`}
                      >
                        {type.documentCount}
                      </span>
                    )}
                  </button>
                  {menuItems.length > 0 && (
                    <div
                      className="pr-2"
                      onClick={(e) => e.stopPropagation()}
                    >
                      <DropdownMenu items={menuItems} />
                    </div>
                  )}
                </div>
              );
            })}
          </div>
        </div>
      </div>

      {/* Right Content - Documents Table */}
      <div className="flex-1 flex flex-col min-w-0">
        {/* Documents Table */}
        <div className="bg-white dark:bg-gray-800 rounded-2xl border border-gray-200 dark:border-gray-700 shadow-lg flex flex-col max-h-[calc(100vh-240px)]">
          <div className="p-6 border-b border-gray-200 dark:border-gray-700 flex items-center justify-between">
            <h3 className="font-semibold text-gray-900 dark:text-white">
              {selectedType?.name} ({documents?.length || 0})
            </h3>
            {canUploadDocuments && !isReadOnly && (
              <Button onClick={() => setIsUploadModalOpen(true)}>
                <ArrowUpTrayIcon className="w-4 h-4" />
                {t("upload")}
              </Button>
            )}
          </div>

          <div className="flex-1 overflow-auto">
            {documentsLoading ? (
              <div className="p-6">
                <LoadingSkeleton type="list" rows={5} />
              </div>
            ) : documentsError ? (
              <div className="p-6">
                <Alert type="error" message={documentsError.message || t("loadError")} />
              </div>
            ) : !documents || documents.length === 0 ? (
              <div className="flex flex-col items-center justify-center h-full p-8 text-center">
                <DocumentTextIcon className="w-16 h-16 text-gray-300 dark:text-gray-600 mb-4" />
                <p className="text-gray-600 dark:text-gray-400">{t("noDocumentsInType")}</p>
              </div>
            ) : (
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
                  {
                    key: "actions",
                    header: t("actions"),
                    headerClassName: "text-right",
                    className: "text-right",
                    cell: (doc: Document) => (
                      <div className="flex items-center justify-end gap-2">
                        {canDownloadDocuments && (
                          <button
                            onClick={() => handleDownload(doc.identifier, doc.fileName)}
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
            )}
          </div>
        </div>
      </div>

      {/* Upload Modal */}
      {selectedType && (
        <UploadDocumentModal
          isOpen={isUploadModalOpen}
          onClose={() => setIsUploadModalOpen(false)}
          onSubmit={handleUploadDocument}
          documentTypeName={selectedType.name}
        />
      )}

      {/* Create Document Type Modal */}
      <DocumentTypeModal
        isOpen={isCreateTypeModalOpen}
        onClose={() => setIsCreateTypeModalOpen(false)}
        onSubmit={handleCreateDocumentType}
        projectId={projectId}
      />

      {/* Edit Document Type Modal */}
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

      {/* Delete Confirmation Modal */}
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
    </div>
  );
}
