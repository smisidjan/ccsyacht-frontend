"use client";

import { useState, useEffect } from "react";
import dynamic from "next/dynamic";
import { useTranslations } from "next-intl";
import TabNavState from "@/app/components/ui/TabNavState";
import type { StateTab } from "@/app/components/ui/TabNavState";
import Table from "@/app/components/ui/Table";
import Button from "@/app/components/ui/Button";
import Modal from "@/app/components/ui/Modal";
import {
  DocumentTypeTemplateForm,
  StageTemplatesBulkEditor,
} from "@/app/features/system-admin";

// Lazy: pulls in TipTap. Keeps the system-admin route compile fast in dev.
const KickoffDocumentTemplateForm = dynamic(
  () => import("./KickoffDocumentTemplateForm"),
  { ssr: false }
);
import { PlusIcon, ExclamationTriangleIcon } from "@heroicons/react/24/outline";
import { useModalForm } from "@/lib/hooks/useModalForm";
import { useToast } from "@/app/context/ToastContext";
import { handleError } from "@/lib/utils/errors";
import {
  systemDocumentTypeTemplatesApi,
  systemKickoffDocumentTemplatesApi,
} from "@/lib/api/system";
import type {
  DocumentTypeTemplate,
  KickoffDocumentTemplate,
} from "@/lib/api/types";

interface TenantTemplatesTabProps {
  tenantId: string;
}

type TemplateTabType = "stages" | "documentTypes" | "kickoffDocuments";

export default function TenantTemplatesTab({ tenantId }: TenantTemplatesTabProps) {
  const t = useTranslations("systemSettings.templates");
  const tCommon = useTranslations("common");
  const { showToast } = useToast();
  const [activeTab, setActiveTab] = useState<TemplateTabType>("stages");

  // Document Types state
  const [documentTypes, setDocumentTypes] = useState<DocumentTypeTemplate[]>([]);
  const [documentTypesLoading, setDocumentTypesLoading] = useState(true);
  const [documentTypesError, setDocumentTypesError] = useState<string | null>(null);
  const [docTypeName, setDocTypeName] = useState("");
  const [docTypeIsRequired, setDocTypeIsRequired] = useState(false);
  const [docTypeIsLocked, setDocTypeIsLocked] = useState(false);
  const [docTypeIsActive, setDocTypeIsActive] = useState(true);

  // Kickoff Documents state
  const [kickoffDocuments, setKickoffDocuments] = useState<KickoffDocumentTemplate[]>([]);
  const [kickoffDocumentsLoading, setKickoffDocumentsLoading] = useState(true);
  const [kickoffDocumentsError, setKickoffDocumentsError] = useState<string | null>(null);
  const [kickoffDocName, setKickoffDocName] = useState("");
  const [kickoffDocDescription, setKickoffDocDescription] = useState("");
  const [kickoffDocContent, setKickoffDocContent] = useState<Record<string, unknown>>({});
  const [kickoffDocIsActive, setKickoffDocIsActive] = useState(true);
  const [kickoffDocFile, setKickoffDocFile] = useState<File | null>(null);
  const [kickoffDocExistingFile, setKickoffDocExistingFile] = useState<{
    fileName: string;
    contentSize: string;
    encodingFormat: string;
  } | null>(null);
  const [kickoffDocRemoveFile, setKickoffDocRemoveFile] = useState(false);

  // Delete modal state
  type DeleteTemplate = DocumentTypeTemplate | KickoffDocumentTemplate;
  const [deleteModal, setDeleteModal] = useState<{
    isOpen: boolean;
    template: DeleteTemplate | null;
    type: "documentType" | "kickoffDocument" | null;
  }>({
    isOpen: false,
    template: null,
    type: null,
  });
  const [isDeleting, setIsDeleting] = useState(false);

  // Fetch functions
  const fetchDocumentTypes = async () => {
    try {
      setDocumentTypesLoading(true);
      const response = await systemDocumentTypeTemplatesApi.getAll(tenantId);
      setDocumentTypes(response.data);
      setDocumentTypesError(null);
    } catch (err) {
      setDocumentTypesError(err instanceof Error ? err.message : "Failed to load templates");
    } finally {
      setDocumentTypesLoading(false);
    }
  };

  const fetchKickoffDocuments = async () => {
    try {
      setKickoffDocumentsLoading(true);
      const response = await systemKickoffDocumentTemplatesApi.getAll(tenantId);
      setKickoffDocuments(response.data);
      setKickoffDocumentsError(null);
    } catch (err) {
      setKickoffDocumentsError(err instanceof Error ? err.message : "Failed to load templates");
    } finally {
      setKickoffDocumentsLoading(false);
    }
  };

  // Delete handlers
  const openDeleteModal = (
    template: DeleteTemplate,
    type: "documentType" | "kickoffDocument"
  ) => {
    setDeleteModal({ isOpen: true, template, type });
  };

  const closeDeleteModal = () => {
    setDeleteModal({ isOpen: false, template: null, type: null });
  };

  const getTemplateDisplayName = (template: DeleteTemplate | null): string => {
    if (!template) return "";
    return template.name;
  };

  const handleDelete = async () => {
    if (!deleteModal.template || !deleteModal.type) return;

    setIsDeleting(true);
    try {
      switch (deleteModal.type) {
        case "documentType":
          await systemDocumentTypeTemplatesApi.delete(tenantId, deleteModal.template.identifier);
          await fetchDocumentTypes();
          showToast("success", t("deleteSuccess"));
          break;
        case "kickoffDocument":
          await systemKickoffDocumentTemplatesApi.delete(tenantId, deleteModal.template.identifier);
          await fetchKickoffDocuments();
          showToast("success", t("deleteSuccess"));
          break;
      }
      closeDeleteModal();
    } catch (err) {
      handleError(err, { showToast, fallbackMessage: t("deleteFailed") });
    } finally {
      setIsDeleting(false);
    }
  };

  // Modal hooks

  const documentTypeModal = useModalForm<DocumentTypeTemplate>({
    onSubmit: async (_, template) => {
      const data = {
        name: docTypeName,
        is_required: docTypeIsRequired,
        is_locked: docTypeIsLocked,
        is_active: docTypeIsActive,
      };
      if (template) {
        await systemDocumentTypeTemplatesApi.update(tenantId, template.identifier, data);
      } else {
        await systemDocumentTypeTemplatesApi.create(tenantId, data);
      }
      await fetchDocumentTypes();
    },
    resetForm: () => {
      setDocTypeName("");
      setDocTypeIsRequired(false);
      setDocTypeIsLocked(false);
      setDocTypeIsActive(true);
    },
    populateForm: (template) => {
      setDocTypeName(template.name);
      setDocTypeIsRequired(template.isRequired);
      setDocTypeIsLocked(template.isLocked);
      setDocTypeIsActive(template.isActive);
    },
    successMessages: {
      create: "Document type template created successfully",
      update: "Document type template updated successfully",
    },
  });

  const kickoffDocumentModal = useModalForm<KickoffDocumentTemplate>({
    onSubmit: async (_, template) => {
      // Use FormData if there's a file to upload
      if (kickoffDocFile || kickoffDocRemoveFile) {
        const formData = new FormData();
        formData.append("name", kickoffDocName);
        if (kickoffDocDescription) {
          formData.append("description", kickoffDocDescription);
        }
        if (kickoffDocContent && Object.keys(kickoffDocContent).length > 0) {
          formData.append("content", JSON.stringify(kickoffDocContent));
        }
        formData.append("is_active", kickoffDocIsActive ? "1" : "0");
        if (kickoffDocFile) {
          formData.append("file", kickoffDocFile);
        }
        if (kickoffDocRemoveFile && !kickoffDocFile) {
          formData.append("remove_file", "1");
        }

        if (template) {
          await systemKickoffDocumentTemplatesApi.updateWithFile(tenantId, template.identifier, formData);
        } else {
          await systemKickoffDocumentTemplatesApi.createWithFile(tenantId, formData);
        }
      } else {
        // Regular JSON request
        const data = {
          name: kickoffDocName,
          description: kickoffDocDescription || undefined,
          content: kickoffDocContent,
          is_active: kickoffDocIsActive,
        };
        if (template) {
          await systemKickoffDocumentTemplatesApi.update(tenantId, template.identifier, data);
        } else {
          await systemKickoffDocumentTemplatesApi.create(tenantId, data);
        }
      }
      await fetchKickoffDocuments();
    },
    resetForm: () => {
      setKickoffDocName("");
      setKickoffDocDescription("");
      setKickoffDocContent({});
      setKickoffDocIsActive(true);
      setKickoffDocFile(null);
      setKickoffDocExistingFile(null);
      setKickoffDocRemoveFile(false);
    },
    populateForm: (template) => {
      setKickoffDocName(template.name);
      setKickoffDocDescription(template.description || "");
      setKickoffDocContent(template.content || {});
      setKickoffDocIsActive(template.isActive);
      setKickoffDocFile(null);
      setKickoffDocRemoveFile(false);
      if (template.hasFile && template.file) {
        setKickoffDocExistingFile({
          fileName: template.file.fileName,
          contentSize: template.file.contentSize,
          encodingFormat: template.file.encodingFormat,
        });
      } else {
        setKickoffDocExistingFile(null);
      }
    },
    successMessages: {
      create: "Kickoff document template created successfully",
      update: "Kickoff document template updated successfully",
    },
  });

  useEffect(() => {
    fetchDocumentTypes();
    fetchKickoffDocuments();
  }, [tenantId]);

  const tabs: StateTab[] = [
    { key: "stages", label: t("stagesTab") },
    { key: "documentTypes", label: t("documentTypesTab") },
    { key: "kickoffDocuments", label: t("kickoffDocumentsTab") },
  ];

  // Column configurations
  const documentTypeColumns = [
    {
      key: "name",
      header: t("name"),
      cell: (docType: DocumentTypeTemplate) => (
        <span className="font-medium text-gray-900 dark:text-white">{docType.name}</span>
      ),
    },
    {
      key: "required",
      header: t("required"),
      cell: (docType: DocumentTypeTemplate) => (
        <span className="text-gray-500 dark:text-gray-400">
          {docType.isRequired ? "Yes" : "No"}
        </span>
      ),
    },
    {
      key: "locked",
      header: t("locked"),
      cell: (docType: DocumentTypeTemplate) => (
        <span className="text-gray-500 dark:text-gray-400">
          {docType.isLocked ? "Yes" : "No"}
        </span>
      ),
    },
    {
      key: "active",
      header: t("active"),
      cell: (docType: DocumentTypeTemplate) => (
        <span className="text-gray-500 dark:text-gray-400">
          {docType.isActive ? "Yes" : "No"}
        </span>
      ),
    },
    {
      key: "actions",
      header: t("actions"),
      headerClassName: "text-center",
      className: "text-right",
      cell: (docType: DocumentTypeTemplate) => (
        <div className="space-x-2">
          <Button variant="ghost" size="sm" onClick={() => documentTypeModal.openEdit(docType)}>
            {t("edit")}
          </Button>
          {docType.canDelete && (
            <Button
              variant="ghost"
              size="sm"
              onClick={() => openDeleteModal(docType, "documentType")}
            >
              {t("delete")}
            </Button>
          )}
        </div>
      ),
    },
  ];

  const kickoffDocumentColumns = [
    {
      key: "name",
      header: t("name"),
      cell: (doc: KickoffDocumentTemplate) => (
        <span className="font-medium text-gray-900 dark:text-white">{doc.name}</span>
      ),
    },
    {
      key: "active",
      header: t("active"),
      cell: (doc: KickoffDocumentTemplate) => (
        <span className="text-gray-500 dark:text-gray-400">{doc.isActive ? "Yes" : "No"}</span>
      ),
    },
    {
      key: "dateModified",
      header: t("lastModified"),
      cell: (doc: KickoffDocumentTemplate) => (
        <span className="text-gray-500 dark:text-gray-400">
          {new Date(doc.dateModified).toLocaleDateString()}
        </span>
      ),
    },
    {
      key: "actions",
      header: t("actions"),
      headerClassName: "text-center",
      className: "text-right",
      cell: (doc: KickoffDocumentTemplate) => (
        <div className="space-x-2">
          <Button variant="ghost" size="sm" onClick={() => kickoffDocumentModal.openEdit(doc)}>
            {t("edit")}
          </Button>
          {doc.canDelete && (
            <Button
              variant="ghost"
              size="sm"
              onClick={() => openDeleteModal(doc, "kickoffDocument")}
            >
              {t("delete")}
            </Button>
          )}
        </div>
      ),
    },
  ];

  return (
    <div className="space-y-6">
      {/* Sub-tabs */}
      <TabNavState
        tabs={tabs}
        activeTab={activeTab}
        onChange={(key) => setActiveTab(key as TemplateTabType)}
      />

      {/* Tab Content */}
      <div>
        {activeTab === "stages" && (
          <div className="space-y-4">
            <h2 className="text-lg font-semibold text-gray-900 dark:text-white">
              {t("stagesTab")}
            </h2>
            <StageTemplatesBulkEditor tenantId={tenantId} />
          </div>
        )}

        {activeTab === "documentTypes" && (
          <div className="space-y-4">
            <div className="flex justify-between items-center">
              <h2 className="text-lg font-semibold text-gray-900 dark:text-white">
                {t("documentTypesTab")}
              </h2>
              <Button variant="primary" onClick={documentTypeModal.openCreate}>
                <PlusIcon className="w-4 h-4" />
                {t("create")}
              </Button>
            </div>
            <Table
              columns={documentTypeColumns}
              data={documentTypes}
              keyExtractor={(docType) => docType.identifier}
              loading={documentTypesLoading}
              error={documentTypesError}
              emptyMessage={t("noTemplates")}
            />
            <Modal
              isOpen={documentTypeModal.isOpen}
              onClose={documentTypeModal.close}
              title={documentTypeModal.isEditMode ? t("edit") : t("create")}
              size="md"
              isForm={true}
              formId="document-type-template-form"
              onSubmit={() => documentTypeModal.submit({})}
              error={documentTypeModal.error}
              actions={[
                {
                  label: tCommon("cancel"),
                  onClick: documentTypeModal.close,
                  variant: "secondary",
                },
                {
                  label: documentTypeModal.isEditMode ? tCommon("save") : t("create"),
                  type: "submit",
                  variant: "primary",
                },
              ]}
            >
              <DocumentTypeTemplateForm
                name={docTypeName}
                isRequired={docTypeIsRequired}
                isLocked={docTypeIsLocked}
                isActive={docTypeIsActive}
                onNameChange={setDocTypeName}
                onIsRequiredChange={setDocTypeIsRequired}
                onIsLockedChange={setDocTypeIsLocked}
                onIsActiveChange={setDocTypeIsActive}
                translations={{
                  name: t("name"),
                  namePlaceholder: "Enter document type name",
                  required: t("required"),
                  locked: t("locked"),
                  active: t("active"),
                }}
              />
            </Modal>
          </div>
        )}

        {activeTab === "kickoffDocuments" && (
          <div className="space-y-4">
            <div className="flex justify-between items-center">
              <h2 className="text-lg font-semibold text-gray-900 dark:text-white">
                {t("kickoffDocumentsTab")}
              </h2>
              <Button variant="primary" onClick={kickoffDocumentModal.openCreate}>
                <PlusIcon className="w-4 h-4" />
                {t("create")}
              </Button>
            </div>
            <Table
              columns={kickoffDocumentColumns}
              data={kickoffDocuments}
              keyExtractor={(doc) => doc.identifier}
              loading={kickoffDocumentsLoading}
              error={kickoffDocumentsError}
              emptyMessage={t("noTemplates")}
            />
            <Modal
              isOpen={kickoffDocumentModal.isOpen}
              onClose={kickoffDocumentModal.close}
              title={kickoffDocumentModal.isEditMode ? t("edit") : t("create")}
              size="lg"
              isForm={true}
              formId="kickoff-document-template-form"
              onSubmit={() => kickoffDocumentModal.submit({})}
              error={kickoffDocumentModal.error}
              actions={[
                {
                  label: tCommon("cancel"),
                  onClick: kickoffDocumentModal.close,
                  variant: "secondary",
                },
                {
                  label: kickoffDocumentModal.isEditMode ? tCommon("save") : t("create"),
                  type: "submit",
                  variant: "primary",
                },
              ]}
            >
              <KickoffDocumentTemplateForm
                name={kickoffDocName}
                description={kickoffDocDescription}
                content={kickoffDocContent}
                isActive={kickoffDocIsActive}
                file={kickoffDocFile}
                existingFile={kickoffDocExistingFile}
                removeExistingFile={kickoffDocRemoveFile}
                onNameChange={setKickoffDocName}
                onDescriptionChange={setKickoffDocDescription}
                onContentChange={setKickoffDocContent}
                onIsActiveChange={setKickoffDocIsActive}
                onFileChange={setKickoffDocFile}
                onRemoveExistingFile={setKickoffDocRemoveFile}
                translations={{
                  name: t("name"),
                  namePlaceholder: t("kickoffDocumentNamePlaceholder"),
                  description: t("description"),
                  descriptionPlaceholder: t("kickoffDocumentDescriptionPlaceholder"),
                  content: t("content"),
                  contentPlaceholder: t("kickoffDocumentContentPlaceholder"),
                  isActive: t("active"),
                  file: t("file"),
                  fileHint: t("fileHint"),
                  uploadFile: t("uploadFile"),
                  removeFile: t("removeFile"),
                  currentFile: t("currentFile"),
                }}
              />
            </Modal>
          </div>
        )}
      </div>

      {/* Delete Confirmation Modal */}
      <Modal
        isOpen={deleteModal.isOpen}
        onClose={closeDeleteModal}
        title={tCommon("deleteConfirmation")}
        size="sm"
        actions={[
          {
            label: tCommon("cancel"),
            onClick: closeDeleteModal,
            variant: "secondary",
          },
          {
            label: tCommon("delete"),
            onClick: handleDelete,
            variant: "danger",
            loading: isDeleting,
          },
        ]}
      >
        <div className="space-y-4">
          <div className="flex items-start gap-3">
            <div className="flex-shrink-0">
              <ExclamationTriangleIcon className="h-6 w-6 text-red-600 dark:text-red-500" />
            </div>
            <div className="flex-1">
              <p className="text-sm text-gray-700 dark:text-gray-300">
                {tCommon("deleteWarning", {
                  type: deleteModal.type === "documentType"
                    ? t("documentTypesTab")
                    : t("kickoffDocumentsTab"),
                  name: getTemplateDisplayName(deleteModal.template),
                })}
              </p>
              <p className="mt-2 text-sm text-gray-500 dark:text-gray-400">
                {tCommon("deleteWarningSubtext")}
              </p>
            </div>
          </div>
        </div>
      </Modal>
    </div>
  );
}
