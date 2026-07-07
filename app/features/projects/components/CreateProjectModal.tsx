"use client";

import { useState, useEffect } from "react";
import { useTranslations } from "next-intl";
import { PlusIcon, XMarkIcon, LockClosedIcon } from "@heroicons/react/24/outline";
import { DocumentIcon } from "@heroicons/react/24/solid";
import Modal from "@/app/components/ui/Modal";
import FormInput from "@/app/components/ui/FormInput";
import FormTextarea from "@/app/components/ui/FormTextarea";
import FormSelect from "@/app/components/ui/FormSelect";
import Button from "@/app/components/ui/Button";
import Table from "@/app/components/ui/Table";
import SelectOrCreateSection from "@/app/components/ui/SelectOrCreateSection";
import { InlineShipyardForm } from "@/app/features/shipyards";
import { useToast } from "@/app/context/ToastContext";
import { getErrorMessage } from "@/lib/utils/errors";
import { useDocumentTypeTemplates } from "@/lib/api/document-type-templates";
import { useInlineShipyardCreation } from "@/lib/hooks/useInlineShipyardCreation";

interface DocumentType {
  id: string;
  name: string;
  required: boolean;
  isLocked: boolean;
}

interface CreateProjectModalProps {
  isOpen: boolean;
  onClose: () => void;
  onSubmit: (data: ProjectFormData) => Promise<void>;
  shipyards: { id: string; name: string; isKeyside?: boolean }[];
  projectTypes: { id: string; name: string }[];
  onShipyardCreated: (shipyard: { id: string; name: string }) => void;
}

export interface ProjectFormData {
  name: string;
  description: string;
  shipyardId: string;
  keysideNote: string;
  projectTypeId: string;
  externalId: string;
  generalArrangement: File | null;
  documentTypes: DocumentType[];
  includeKickoffMeeting: boolean;
}

export default function CreateProjectModal({
  isOpen,
  onClose,
  onSubmit,
  shipyards,
  projectTypes,
  onShipyardCreated,
}: CreateProjectModalProps) {
  const t = useTranslations("createProject");
  const { showToast } = useToast();

  // Fetch document type templates from backend
  const { data: templates } = useDocumentTypeTemplates({ active_only: true });

  const keysideShipyard = shipyards.find((s) => s.isKeyside);
  const regularShipyards = shipyards.filter((s) => !s.isKeyside);

  const [shipyardMode, setShipyardMode] = useState<"existing" | "new" | "keyside">("existing");
  const [formData, setFormData] = useState<ProjectFormData>({
    name: "",
    description: "",
    shipyardId: "",
    keysideNote: "",
    projectTypeId: "",
    externalId: "",
    generalArrangement: null,
    documentTypes: [],
    includeKickoffMeeting: true,
  });
  const [newDocTypeName, setNewDocTypeName] = useState("");
  const [loading, setLoading] = useState(false);

  // Inline shipyard creation using hook
  const shipyardCreation = useInlineShipyardCreation({
    onSuccess: (shipyard) => {
      onShipyardCreated(shipyard);
      setFormData((prev) => ({ ...prev, shipyardId: shipyard.id }));
      setShipyardMode("existing");
      showToast("success", t("shipyardCreated"));
    },
    onError: () => {
      showToast("error", t("shipyardCreateError"));
    },
  });

  const handleShipyardModeChange = (mode: "existing" | "new" | "keyside") => {
    setShipyardMode(mode);
    if (mode === "new") {
      shipyardCreation.setShowInlineForm(true);
    } else {
      shipyardCreation.handleCancel();
    }
    if (mode === "keyside") {
      setFormData((prev) => ({ ...prev, shipyardId: keysideShipyard?.id || "" }));
    } else if (mode === "existing") {
      setFormData((prev) => ({ ...prev, shipyardId: "" }));
    }
  };

  // Initialize document types from templates when they load
  useEffect(() => {
    if (templates && templates.length > 0) {
      const templateTypes: DocumentType[] = templates
        .sort((a, b) => {
          // First: is_locked=true items
          if (a.isLocked && !b.isLocked) return -1;
          if (!a.isLocked && b.isLocked) return 1;

          // Second: is_required=true items
          if (a.isRequired && !b.isRequired) return -1;
          if (!a.isRequired && b.isRequired) return 1;

          // Rest: maintain original order
          return 0;
        })
        .map((template) => ({
          id: template.identifier,
          name: template.name,
          required: template.isRequired,
          isLocked: template.isLocked,
        }));

      setFormData((prev) => ({
        ...prev,
        documentTypes: templateTypes,
      }));
    }
  }, [templates]);

  const handleSubmit = async (e: React.FormEvent<HTMLFormElement>) => {
    e.preventDefault();
    setLoading(true);

    try {
      await onSubmit(formData);
      showToast("success", t("success"));
      onClose();
      // Reset form - will be repopulated with templates via useEffect
      setFormData({
        name: "",
        description: "",
        shipyardId: "",
        keysideNote: "",
        projectTypeId: "",
        externalId: "",
        generalArrangement: null,
        documentTypes: [],
        includeKickoffMeeting: true,
      });
      setShipyardMode("existing");
      setNewDocTypeName("");
    } catch (err) {
      const errorMessage = getErrorMessage(err, t("error"));
      showToast("error", errorMessage);
    } finally {
      setLoading(false);
    }
  };

  const handleFileChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0] || null;
    setFormData({ ...formData, generalArrangement: file });
  };

  const toggleDocTypeRequired = (id: string) => {
    setFormData({
      ...formData,
      documentTypes: formData.documentTypes.map((dt) =>
        // Only allow toggling if not locked
        dt.id === id && !dt.isLocked ? { ...dt, required: !dt.required } : dt
      ),
    });
  };

  const removeDocType = (id: string) => {
    // Only allow removing if not locked
    setFormData({
      ...formData,
      documentTypes: formData.documentTypes.filter((dt) => dt.id !== id || dt.isLocked),
    });
  };

  const addDocType = () => {
    if (!newDocTypeName.trim()) return;
    setFormData({
      ...formData,
      documentTypes: [
        ...formData.documentTypes,
        {
          id: Date.now().toString(),
          name: newDocTypeName.trim(),
          required: false,
          isLocked: false,
        },
      ],
    });
    setNewDocTypeName("");
  };

  const shipyardSelectOptions = [
    { value: "", label: "---------" },
    ...regularShipyards.map((s) => ({ value: s.id, label: s.name })),
  ];

  const projectTypeOptions = [
    { value: "", label: "---------" },
    ...projectTypes.map((pt) => ({ value: pt.id, label: pt.name })),
  ];

  const footer = (
    <div className="flex justify-end gap-3">
      <Button type="button" variant="secondary" onClick={onClose} disabled={loading}>
        {t("cancel")}
      </Button>
      <Button type="submit" form="create-project-form" loading={loading} disabled={loading}>
        <DocumentIcon className="w-4 h-4" />
        {loading ? t("creating") : t("createProject")}
      </Button>
    </div>
  );

  return (
    <Modal
      isOpen={isOpen}
      onClose={onClose}
      title={t("title")}
      footer={footer}
      size="lg"
    >
      <form id="create-project-form" onSubmit={handleSubmit} className="space-y-6">
        <FormInput
          id="project-name"
          type="text"
          label={t("projectName")}
          value={formData.name}
          onChange={(e) => setFormData({ ...formData, name: e.target.value })}
          required
        />

        <FormInput
          id="external-id"
          type="text"
          label={t("externalId")}
          value={formData.externalId}
          onChange={(e) => setFormData({ ...formData, externalId: e.target.value })}
        />

        <FormTextarea
          id="project-description"
          label={t("description")}
          value={formData.description}
          onChange={(e) => setFormData({ ...formData, description: e.target.value })}
          rows={3}
        />

        <SelectOrCreateSection<"existing" | "new" | "keyside">
          title={t("yardOwner")}
          mode={shipyardMode}
          onModeChange={handleShipyardModeChange}
          selectLabel={t("selectShipyard")}
          createLabel={t("addShipyard")}
          selectDropdownLabel={t("selectShipyard")}
          selectDropdownValue={formData.shipyardId}
          selectDropdownOptions={shipyardSelectOptions}
          onSelectChange={(value) => setFormData({ ...formData, shipyardId: value })}
          selectRequired={true}
          selectDisabled={regularShipyards.length === 0}
          noItemsMessage={t("noShipyardsAvailable")}
          createFormContent={
            <InlineShipyardForm
              name={shipyardCreation.name}
              address={shipyardCreation.address}
              contactName={shipyardCreation.contactName}
              contactEmail={shipyardCreation.contactEmail}
              contactPhone={shipyardCreation.contactPhone}
              onNameChange={shipyardCreation.setName}
              onAddressChange={shipyardCreation.setAddress}
              onContactNameChange={shipyardCreation.setContactName}
              onContactEmailChange={shipyardCreation.setContactEmail}
              onContactPhoneChange={shipyardCreation.setContactPhone}
              onSubmit={shipyardCreation.handleCreate}
              onCancel={shipyardCreation.handleCancel}
              isLoading={shipyardCreation.isCreating}
            />
          }
          extraModeValue="keyside"
          extraModeLabel={keysideShipyard ? t("keyside") : undefined}
          extraContent={
            <div className="space-y-2 p-4 bg-gray-50 dark:bg-gray-800 rounded-lg">
              <label className="block text-sm font-medium text-gray-700 dark:text-gray-300">
                {t("keysideNote")} <span className="text-red-500">*</span>
              </label>
              <textarea
                value={formData.keysideNote}
                onChange={(e) => setFormData({ ...formData, keysideNote: e.target.value })}
                placeholder={t("keysideNotePlaceholder")}
                rows={3}
                required={shipyardMode === "keyside"}
                className="w-full px-4 py-2.5 rounded-lg border border-gray-300 dark:border-gray-600 bg-white dark:bg-gray-700 text-gray-900 dark:text-white placeholder-gray-500 dark:placeholder-gray-400 focus:ring-2 focus:ring-blue-500 focus:border-transparent resize-none"
              />
            </div>
          }
        />

        <FormSelect
          id="project-type"
          label={t("projectType")}
          value={formData.projectTypeId}
          onChange={(e) => setFormData({ ...formData, projectTypeId: e.target.value })}
          options={projectTypeOptions}
          required
        />

        <div>
          <label className="block text-sm font-medium text-gray-700 dark:text-gray-300 mb-2">
            {t("generalArrangement")} <span className="text-red-500">*</span>
          </label>
          <input
            type="file"
            accept=".pdf"
            onChange={handleFileChange}
            required
            className="w-full px-4 py-2.5 rounded-lg border border-gray-300 dark:border-gray-600 bg-white dark:bg-gray-700 text-gray-900 dark:text-white file:mr-4 file:py-2 file:px-4 file:rounded-lg file:border-0 file:text-sm file:font-medium file:bg-gray-100 dark:file:bg-gray-600 file:text-gray-700 dark:file:text-gray-200 hover:file:bg-gray-200 dark:hover:file:bg-gray-500 transition-all"
          />
          <p className="mt-1 text-sm text-gray-500 dark:text-gray-400">
            {t("uploadPdfRequired")}
          </p>
        </div>

        <Table
          label={t("documentTypes")}
          columns={[
            {
              key: "name",
              header: t("name"),
              cell: (docType: DocumentType) => (
                <span className="text-sm text-gray-900 dark:text-gray-100">
                  {docType.name}
                </span>
              ),
              headerClassName: "text-left",
            },
            {
              key: "required",
              header: t("required"),
              cell: (docType: DocumentType) => (
                <input
                  type="checkbox"
                  checked={docType.required}
                  disabled={docType.isLocked}
                  onChange={() => !docType.isLocked && toggleDocTypeRequired(docType.id)}
                  className={`w-5 h-5 rounded border-gray-300 text-blue-600 ${
                    docType.isLocked
                      ? "opacity-60 cursor-not-allowed"
                      : "focus:ring-blue-500"
                  }`}
                />
              ),
              headerClassName: "text-center",
              className: "text-center",
            },
            {
              key: "delete",
              header: t("delete"),
              cell: (docType: DocumentType) => (
                docType.isLocked ? (
                  <LockClosedIcon className="w-5 h-5 text-gray-400 mx-auto" />
                ) : (
                  <button
                    type="button"
                    onClick={() => removeDocType(docType.id)}
                    className="text-red-500 hover:text-red-700 transition-colors"
                  >
                    <XMarkIcon className="w-5 h-5" />
                  </button>
                )
              ),
              headerClassName: "text-center",
              className: "text-center",
            },
          ]}
          data={formData.documentTypes}
          keyExtractor={(docType: DocumentType) => docType.id}
          rowClassName={(docType: DocumentType) =>
            docType.isLocked ? "bg-gray-50 dark:bg-gray-800/50" : ""
          }
          minWidth="100%"
          footer={
            <div className="flex gap-2">
              <input
                type="text"
                value={newDocTypeName}
                onChange={(e) => setNewDocTypeName(e.target.value)}
                onKeyDown={(e) => {
                  if (e.key === "Enter") {
                    e.preventDefault();
                    addDocType();
                  }
                }}
                placeholder={t("addDocumentTypePlaceholder")}
                className="flex-1 px-4 py-2 rounded-lg border border-gray-300 dark:border-gray-600 bg-white dark:bg-gray-700 text-gray-900 dark:text-white placeholder-gray-500 dark:placeholder-gray-400 focus:ring-2 focus:ring-blue-500 focus:border-transparent"
              />
              <Button
                type="button"
                variant="primary"
                onClick={addDocType}
                disabled={!newDocTypeName.trim()}
              >
                <PlusIcon className="w-4 h-4" />
                {t("add")}
              </Button>
            </div>
          }
        />

        {/* Kickoff meeting — enterprise toggle */}
        <div className="rounded-xl border border-gray-200 dark:border-gray-700 bg-gray-50 dark:bg-gray-800/50 p-5">
          <div className="flex items-start justify-between gap-4">
            <div className="flex-1 min-w-0">
              <p className="text-sm font-semibold text-gray-900 dark:text-white mb-1">
                {t("kickoffMeeting.title")}
              </p>
              <p className="text-sm text-gray-500 dark:text-gray-400">
                {formData.includeKickoffMeeting
                  ? t("kickoffMeeting.enabledDescription")
                  : t("kickoffMeeting.disabledDescription")}
              </p>
            </div>
            <button
              type="button"
              role="switch"
              aria-checked={formData.includeKickoffMeeting}
              onClick={() =>
                setFormData((prev) => ({
                  ...prev,
                  includeKickoffMeeting: !prev.includeKickoffMeeting,
                }))
              }
              className={`relative flex-shrink-0 w-11 h-6 rounded-full transition-colors focus:outline-none focus:ring-2 focus:ring-blue-500 focus:ring-offset-2 dark:focus:ring-offset-gray-900 ${
                formData.includeKickoffMeeting
                  ? "bg-blue-600"
                  : "bg-gray-300 dark:bg-gray-600"
              }`}
            >
              <span
                className={`absolute top-0.5 left-0.5 w-5 h-5 bg-white rounded-full shadow transition-transform ${
                  formData.includeKickoffMeeting ? "translate-x-5" : "translate-x-0"
                }`}
              />
            </button>
          </div>
        </div>
      </form>
    </Modal>
  );
}
