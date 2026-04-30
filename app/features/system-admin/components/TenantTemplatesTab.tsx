"use client";

import { useState, useEffect } from "react";
import { useTranslations } from "next-intl";
import TabNavState from "@/app/components/ui/TabNavState";
import type { StateTab } from "@/app/components/ui/TabNavState";
import Table from "@/app/components/ui/Table";
import Button from "@/app/components/ui/Button";
import Modal from "@/app/components/ui/Modal";
import {
  StageTemplateForm,
  DocumentTypeTemplateForm,
  AreaTemplateForm,
  ChecklistTemplateForm,
  KickoffDocumentTemplateForm,
} from "@/app/features/system-admin";
import { PlusIcon, ExclamationTriangleIcon } from "@heroicons/react/24/outline";
import { useModalForm } from "@/lib/hooks/useModalForm";
import { useToast } from "@/app/context/ToastContext";
import { handleError } from "@/lib/utils/errors";
import {
  systemStageTemplatesApi,
  systemDocumentTypeTemplatesApi,
  systemAreaTemplatesApi,
  systemChecklistTemplatesApi,
  systemKickoffDocumentTemplatesApi,
} from "@/lib/api/system";
import type {
  StageTemplate,
  DocumentTypeTemplate,
  AreaTemplate,
  ChecklistTemplate,
  KickoffDocumentTemplate,
} from "@/lib/api/types";

interface TenantTemplatesTabProps {
  tenantId: string;
}

type TemplateTabType = "stages" | "documentTypes" | "areas" | "checklists" | "kickoffDocuments";

export default function TenantTemplatesTab({ tenantId }: TenantTemplatesTabProps) {
  const t = useTranslations("systemSettings.templates");
  const tCommon = useTranslations("common");
  const { showToast } = useToast();
  const [activeTab, setActiveTab] = useState<TemplateTabType>("stages");

  // Stages state
  const [stages, setStages] = useState<StageTemplate[]>([]);
  const [stagesLoading, setStagesLoading] = useState(true);
  const [stagesError, setStagesError] = useState<string | null>(null);
  const [stageName, setStageName] = useState("");
  const [stageDescription, setStageDescription] = useState("");
  const [stageRequiresReleaseForm, setStageRequiresReleaseForm] = useState(false);
  const [stageIsActive, setStageIsActive] = useState(true);

  // Document Types state
  const [documentTypes, setDocumentTypes] = useState<DocumentTypeTemplate[]>([]);
  const [documentTypesLoading, setDocumentTypesLoading] = useState(true);
  const [documentTypesError, setDocumentTypesError] = useState<string | null>(null);
  const [docTypeName, setDocTypeName] = useState("");
  const [docTypeIsRequired, setDocTypeIsRequired] = useState(false);
  const [docTypeIsLocked, setDocTypeIsLocked] = useState(false);
  const [docTypeIsActive, setDocTypeIsActive] = useState(true);

  // Areas state
  const [areas, setAreas] = useState<AreaTemplate[]>([]);
  const [areasLoading, setAreasLoading] = useState(true);
  const [areasError, setAreasError] = useState<string | null>(null);
  const [areaName, setAreaName] = useState("");
  const [areaDescription, setAreaDescription] = useState("");
  const [areaIsActive, setAreaIsActive] = useState(true);

  // Checklists state
  const [checklists, setChecklists] = useState<ChecklistTemplate[]>([]);
  const [checklistsLoading, setChecklistsLoading] = useState(true);
  const [checklistsError, setChecklistsError] = useState<string | null>(null);
  const [checklistDescription, setChecklistDescription] = useState("");
  const [checklistIsActive, setChecklistIsActive] = useState(true);

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
  type DeleteTemplate = StageTemplate | DocumentTypeTemplate | AreaTemplate | ChecklistTemplate | KickoffDocumentTemplate;
  const [deleteModal, setDeleteModal] = useState<{
    isOpen: boolean;
    template: DeleteTemplate | null;
    type: "stage" | "documentType" | "area" | "checklist" | "kickoffDocument" | null;
  }>({
    isOpen: false,
    template: null,
    type: null,
  });
  const [isDeleting, setIsDeleting] = useState(false);

  // Fetch functions
  const fetchStages = async () => {
    try {
      setStagesLoading(true);
      const response = await systemStageTemplatesApi.getAll(tenantId);
      setStages(response.data);
      setStagesError(null);
    } catch (err) {
      setStagesError(err instanceof Error ? err.message : "Failed to load templates");
    } finally {
      setStagesLoading(false);
    }
  };

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

  const fetchAreas = async () => {
    try {
      setAreasLoading(true);
      const response = await systemAreaTemplatesApi.getAll(tenantId);
      setAreas(response.data);
      setAreasError(null);
    } catch (err) {
      setAreasError(err instanceof Error ? err.message : "Failed to load templates");
    } finally {
      setAreasLoading(false);
    }
  };

  const fetchChecklists = async () => {
    try {
      setChecklistsLoading(true);
      const response = await systemChecklistTemplatesApi.getAll(tenantId, { type: "kickoff_meeting" });
      setChecklists(response.data);
      setChecklistsError(null);
    } catch (err) {
      setChecklistsError(err instanceof Error ? err.message : "Failed to load templates");
    } finally {
      setChecklistsLoading(false);
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
  const openDeleteModal = (template: DeleteTemplate, type: "stage" | "documentType" | "area" | "checklist" | "kickoffDocument") => {
    setDeleteModal({ isOpen: true, template, type });
  };

  const closeDeleteModal = () => {
    setDeleteModal({ isOpen: false, template: null, type: null });
  };

  const getTemplateDisplayName = (template: DeleteTemplate | null): string => {
    if (!template) return "";
    if ("name" in template) return template.name;
    if ("description" in template) return template.description;
    return "";
  };

  const handleDelete = async () => {
    if (!deleteModal.template || !deleteModal.type) return;

    setIsDeleting(true);
    try {
      switch (deleteModal.type) {
        case "stage":
          await systemStageTemplatesApi.delete(tenantId, deleteModal.template.identifier);
          await fetchStages();
          showToast("success", t("deleteSuccess"));
          break;
        case "documentType":
          await systemDocumentTypeTemplatesApi.delete(tenantId, deleteModal.template.identifier);
          await fetchDocumentTypes();
          showToast("success", t("deleteSuccess"));
          break;
        case "area":
          await systemAreaTemplatesApi.delete(tenantId, deleteModal.template.identifier);
          await fetchAreas();
          showToast("success", t("deleteSuccess"));
          break;
        case "checklist":
          await systemChecklistTemplatesApi.delete(tenantId, deleteModal.template.identifier);
          await fetchChecklists();
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
  const stageModal = useModalForm<StageTemplate>({
    onSubmit: async (_, template) => {
      const data = {
        name: stageName,
        description: stageDescription || undefined,
        requires_release_form: stageRequiresReleaseForm,
        is_active: stageIsActive,
      };
      if (template) {
        await systemStageTemplatesApi.update(tenantId, template.identifier, data);
      } else {
        await systemStageTemplatesApi.create(tenantId, data);
      }
      await fetchStages();
    },
    resetForm: () => {
      setStageName("");
      setStageDescription("");
      setStageRequiresReleaseForm(false);
      setStageIsActive(true);
    },
    populateForm: (template) => {
      setStageName(template.name);
      setStageDescription(template.description || "");
      setStageRequiresReleaseForm(template.requiresReleaseForm);
      setStageIsActive(template.isActive);
    },
    successMessages: {
      create: "Stage template created successfully",
      update: "Stage template updated successfully",
    },
  });

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

  const areaModal = useModalForm<AreaTemplate>({
    onSubmit: async (_, template) => {
      const data = {
        name: areaName,
        description: areaDescription || undefined,
        is_active: areaIsActive,
      };
      if (template) {
        await systemAreaTemplatesApi.update(tenantId, template.identifier, data);
      } else {
        await systemAreaTemplatesApi.create(tenantId, data);
      }
      await fetchAreas();
    },
    resetForm: () => {
      setAreaName("");
      setAreaDescription("");
      setAreaIsActive(true);
    },
    populateForm: (template) => {
      setAreaName(template.name);
      setAreaDescription(template.description || "");
      setAreaIsActive(template.isActive);
    },
    successMessages: {
      create: "Area template created successfully",
      update: "Area template updated successfully",
    },
  });

  const checklistModal = useModalForm<ChecklistTemplate>({
    onSubmit: async (_, template) => {
      const data = {
        type: "kickoff_meeting" as const,
        description: checklistDescription,
        sort_order: 0,
        is_active: checklistIsActive,
      };
      if (template) {
        await systemChecklistTemplatesApi.update(tenantId, template.identifier, {
          description: checklistDescription,
          is_active: checklistIsActive,
        });
      } else {
        await systemChecklistTemplatesApi.create(tenantId, data);
      }
      await fetchChecklists();
    },
    resetForm: () => {
      setChecklistDescription("");
      setChecklistIsActive(true);
    },
    populateForm: (template) => {
      setChecklistDescription(template.description);
      setChecklistIsActive(template.isActive);
    },
    successMessages: {
      create: "Checklist item created successfully",
      update: "Checklist item updated successfully",
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
    fetchStages();
    fetchDocumentTypes();
    fetchAreas();
    fetchChecklists();
    fetchKickoffDocuments();
  }, [tenantId]);

  const tabs: StateTab[] = [
    { key: "stages", label: t("stagesTab") },
    { key: "documentTypes", label: t("documentTypesTab") },
    { key: "areas", label: t("areasTab") },
    { key: "checklists", label: t("checklistsTab") },
    { key: "kickoffDocuments", label: t("kickoffDocumentsTab") },
  ];

  // Column configurations
  const stageColumns = [
    {
      key: "name",
      header: t("name"),
      cell: (stage: StageTemplate) => (
        <span className="font-medium text-gray-900 dark:text-white">{stage.name}</span>
      ),
    },
    {
      key: "description",
      header: t("description"),
      cell: (stage: StageTemplate) => (
        <span className="text-gray-500 dark:text-gray-400">{stage.description || "-"}</span>
      ),
    },
    {
      key: "requiresReleaseForm",
      header: t("requiresReleaseForm"),
      cell: (stage: StageTemplate) => (
        <span className="text-gray-500 dark:text-gray-400">
          {stage.requiresReleaseForm ? "Yes" : "No"}
        </span>
      ),
    },
    {
      key: "active",
      header: t("active"),
      cell: (stage: StageTemplate) => (
        <span className="text-gray-500 dark:text-gray-400">{stage.isActive ? "Yes" : "No"}</span>
      ),
    },
    {
      key: "actions",
      header: t("actions"),
      headerClassName: "text-center",
      className: "text-right",
      cell: (stage: StageTemplate) => (
        <div className="space-x-2">
          <Button variant="ghost" size="sm" onClick={() => stageModal.openEdit(stage)}>
            {t("edit")}
          </Button>
          {stage.canDelete && (
            <Button
              variant="ghost"
              size="sm"
              onClick={() => openDeleteModal(stage, "stage")}
            >
              {t("delete")}
            </Button>
          )}
        </div>
      ),
    },
  ];

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

  const areaColumns = [
    {
      key: "name",
      header: t("name"),
      cell: (area: AreaTemplate) => (
        <span className="font-medium text-gray-900 dark:text-white">{area.name}</span>
      ),
    },
    {
      key: "description",
      header: t("description"),
      cell: (area: AreaTemplate) => (
        <span className="text-gray-500 dark:text-gray-400">{area.description || "-"}</span>
      ),
    },
    {
      key: "active",
      header: t("active"),
      cell: (area: AreaTemplate) => (
        <span className="text-gray-500 dark:text-gray-400">{area.isActive ? "Yes" : "No"}</span>
      ),
    },
    {
      key: "actions",
      header: t("actions"),
      headerClassName: "text-center",
      className: "text-right",
      cell: (area: AreaTemplate) => (
        <div className="space-x-2">
          <Button variant="ghost" size="sm" onClick={() => areaModal.openEdit(area)}>
            {t("edit")}
          </Button>
          {area.canDelete && (
            <Button
              variant="ghost"
              size="sm"
              onClick={() => openDeleteModal(area, "area")}
            >
              {t("delete")}
            </Button>
          )}
        </div>
      ),
    },
  ];

  const checklistColumns = [
    {
      key: "description",
      header: t("description"),
      cell: (checklist: ChecklistTemplate) => (
        <span className="font-medium text-gray-900 dark:text-white">{checklist.description}</span>
      ),
    },
    {
      key: "active",
      header: t("active"),
      cell: (checklist: ChecklistTemplate) => (
        <span className="text-gray-500 dark:text-gray-400">{checklist.isActive ? "Yes" : "No"}</span>
      ),
    },
    {
      key: "actions",
      header: t("actions"),
      headerClassName: "text-center",
      className: "text-right",
      cell: (checklist: ChecklistTemplate) => (
        <div className="space-x-2">
          <Button variant="ghost" size="sm" onClick={() => checklistModal.openEdit(checklist)}>
            {t("edit")}
          </Button>
          {checklist.canDelete && (
            <Button
              variant="ghost"
              size="sm"
              onClick={() => openDeleteModal(checklist, "checklist")}
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
            <div className="flex justify-between items-center">
              <h2 className="text-lg font-semibold text-gray-900 dark:text-white">
                {t("stagesTab")}
              </h2>
              <Button variant="primary" onClick={stageModal.openCreate}>
                <PlusIcon className="w-4 h-4" />
                {t("create")}
              </Button>
            </div>
            <Table
              columns={stageColumns}
              data={stages}
              keyExtractor={(stage) => stage.identifier}
              loading={stagesLoading}
              error={stagesError}
              emptyMessage={t("noTemplates")}
            />
            <Modal
              isOpen={stageModal.isOpen}
              onClose={stageModal.close}
              title={stageModal.isEditMode ? t("edit") : t("create")}
              size="md"
              isForm={true}
              formId="stage-template-form"
              onSubmit={() => stageModal.submit({})}
              error={stageModal.error}
              actions={[
                {
                  label: tCommon("cancel"),
                  onClick: stageModal.close,
                  variant: "secondary",
                },
                {
                  label: stageModal.isEditMode ? tCommon("save") : t("create"),
                  type: "submit",
                  variant: "primary",
                },
              ]}
            >
              <StageTemplateForm
                name={stageName}
                description={stageDescription}
                requiresReleaseForm={stageRequiresReleaseForm}
                isActive={stageIsActive}
                onNameChange={setStageName}
                onDescriptionChange={setStageDescription}
                onRequiresReleaseFormChange={setStageRequiresReleaseForm}
                onIsActiveChange={setStageIsActive}
                translations={{
                  name: t("name"),
                  namePlaceholder: "Enter stage name",
                  description: t("description"),
                  descriptionPlaceholder: "Enter description (optional)",
                  requiresReleaseForm: t("requiresReleaseForm"),
                  isActive: t("active"),
                }}
              />
            </Modal>
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

        {activeTab === "areas" && (
          <div className="space-y-4">
            <div className="flex justify-between items-center">
              <h2 className="text-lg font-semibold text-gray-900 dark:text-white">
                {t("areasTab")}
              </h2>
              <Button variant="primary" onClick={areaModal.openCreate}>
                <PlusIcon className="w-4 h-4" />
                {t("create")}
              </Button>
            </div>
            <Table
              columns={areaColumns}
              data={areas}
              keyExtractor={(area) => area.identifier}
              loading={areasLoading}
              error={areasError}
              emptyMessage={t("noTemplates")}
            />
            <Modal
              isOpen={areaModal.isOpen}
              onClose={areaModal.close}
              title={areaModal.isEditMode ? t("edit") : t("create")}
              size="md"
              isForm={true}
              formId="area-template-form"
              onSubmit={() => areaModal.submit({})}
              error={areaModal.error}
              actions={[
                {
                  label: tCommon("cancel"),
                  onClick: areaModal.close,
                  variant: "secondary",
                },
                {
                  label: areaModal.isEditMode ? tCommon("save") : t("create"),
                  type: "submit",
                  variant: "primary",
                },
              ]}
            >
              <AreaTemplateForm
                name={areaName}
                description={areaDescription}
                isActive={areaIsActive}
                onNameChange={setAreaName}
                onDescriptionChange={setAreaDescription}
                onIsActiveChange={setAreaIsActive}
                translations={{
                  name: t("name"),
                  namePlaceholder: "Enter area name",
                  description: t("description"),
                  descriptionPlaceholder: "Enter description (optional)",
                  isActive: t("active"),
                }}
              />
            </Modal>
          </div>
        )}

        {activeTab === "checklists" && (
          <div className="space-y-4">
            <div className="flex justify-between items-center">
              <h2 className="text-lg font-semibold text-gray-900 dark:text-white">
                {t("checklistsTab")}
              </h2>
              <Button variant="primary" onClick={checklistModal.openCreate}>
                <PlusIcon className="w-4 h-4" />
                {t("create")}
              </Button>
            </div>
            <Table
              columns={checklistColumns}
              data={checklists}
              keyExtractor={(checklist) => checklist.identifier}
              loading={checklistsLoading}
              error={checklistsError}
              emptyMessage={t("noTemplates")}
            />
            <Modal
              isOpen={checklistModal.isOpen}
              onClose={checklistModal.close}
              title={checklistModal.isEditMode ? t("edit") : t("create")}
              size="md"
              isForm={true}
              formId="checklist-template-form"
              onSubmit={() => checklistModal.submit({})}
              error={checklistModal.error}
              actions={[
                {
                  label: tCommon("cancel"),
                  onClick: checklistModal.close,
                  variant: "secondary",
                },
                {
                  label: checklistModal.isEditMode ? tCommon("save") : t("create"),
                  type: "submit",
                  variant: "primary",
                },
              ]}
            >
              <ChecklistTemplateForm
                description={checklistDescription}
                isActive={checklistIsActive}
                onDescriptionChange={setChecklistDescription}
                onIsActiveChange={setChecklistIsActive}
                translations={{
                  description: t("description"),
                  descriptionPlaceholder: "Enter checklist item description",
                  isActive: t("active"),
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
                  type: deleteModal.type === "stage" ? t("stagesTab") :
                        deleteModal.type === "documentType" ? t("documentTypesTab") :
                        deleteModal.type === "area" ? t("areasTab") :
                        deleteModal.type === "kickoffDocument" ? t("kickoffDocumentsTab") :
                        t("checklistsTab"),
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
