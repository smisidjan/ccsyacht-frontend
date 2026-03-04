"use client";

import { useState } from "react";
import { useTranslations } from "next-intl";
import { PlusIcon, XMarkIcon } from "@heroicons/react/24/outline";
import { DocumentIcon } from "@heroicons/react/24/solid";
import Modal from "@/app/components/ui/Modal";
import FormInput from "@/app/components/ui/FormInput";
import FormTextarea from "@/app/components/ui/FormTextarea";
import FormSelect from "@/app/components/ui/FormSelect";
import Button from "@/app/components/ui/Button";

interface DocumentType {
  id: string;
  name: string;
  required: boolean;
}

interface CreateProjectModalProps {
  isOpen: boolean;
  onClose: () => void;
  onSubmit: (data: ProjectFormData) => void;
  shipyards: { id: string; name: string }[];
  projectTypes: { id: string; name: string }[];
}

export interface ProjectFormData {
  name: string;
  description: string;
  shipyardId: string;
  projectTypeId: string;
  generalArrangement: File | null;
  documentTypes: DocumentType[];
}

const defaultDocumentTypes: DocumentType[] = [
  { id: "1", name: "Contract", required: true },
  { id: "2", name: "Planning painter", required: true },
  { id: "3", name: "Acceptance report", required: false },
  { id: "4", name: "Release form", required: false },
  { id: "5", name: "Survey report", required: false },
  { id: "6", name: "Other", required: false },
];

export default function CreateProjectModal({
  isOpen,
  onClose,
  onSubmit,
  shipyards,
  projectTypes,
}: CreateProjectModalProps) {
  const t = useTranslations("createProject");
  const [formData, setFormData] = useState<ProjectFormData>({
    name: "",
    description: "",
    shipyardId: "",
    projectTypeId: "",
    generalArrangement: null,
    documentTypes: defaultDocumentTypes,
  });
  const [newDocTypeName, setNewDocTypeName] = useState("");

  const handleSubmit = (e: React.FormEvent) => {
    e.preventDefault();
    onSubmit(formData);
  };

  const handleFileChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0] || null;
    setFormData({ ...formData, generalArrangement: file });
  };

  const toggleDocTypeRequired = (id: string) => {
    setFormData({
      ...formData,
      documentTypes: formData.documentTypes.map((dt) =>
        dt.id === id ? { ...dt, required: !dt.required } : dt
      ),
    });
  };

  const removeDocType = (id: string) => {
    setFormData({
      ...formData,
      documentTypes: formData.documentTypes.filter((dt) => dt.id !== id),
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
        },
      ],
    });
    setNewDocTypeName("");
  };

  const shipyardOptions = [
    { value: "", label: t("selectShipyard") },
    ...shipyards.map((s) => ({ value: s.id, label: s.name })),
  ];

  const projectTypeOptions = [
    { value: "", label: "---------" },
    ...projectTypes.map((pt) => ({ value: pt.id, label: pt.name })),
  ];

  const footer = (
    <div className="flex justify-end gap-3">
      <Button type="button" variant="secondary" onClick={onClose}>
        {t("cancel")}
      </Button>
      <Button type="submit" form="create-project-form">
        <DocumentIcon className="w-4 h-4" />
        {t("createProject")}
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

        <FormTextarea
          id="project-description"
          label={t("description")}
          value={formData.description}
          onChange={(e) => setFormData({ ...formData, description: e.target.value })}
          rows={3}
        />

        <FormSelect
          id="shipyard"
          label={t("yardOwner")}
          value={formData.shipyardId}
          onChange={(e) => setFormData({ ...formData, shipyardId: e.target.value })}
          options={shipyardOptions}
          required
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

        <div>
          <label className="block text-sm font-medium text-gray-700 dark:text-gray-300 mb-2">
            {t("documentTypes")}
          </label>
          <div className="border border-gray-200 dark:border-gray-700 rounded-lg overflow-hidden">
            <table className="w-full">
              <thead className="bg-gray-50 dark:bg-gray-700/50">
                <tr>
                  <th className="px-4 py-3 text-left text-sm font-medium text-gray-700 dark:text-gray-300">
                    {t("name")}
                  </th>
                  <th className="px-4 py-3 text-center text-sm font-medium text-gray-700 dark:text-gray-300">
                    {t("required")}
                  </th>
                  <th className="px-4 py-3 text-center text-sm font-medium text-gray-700 dark:text-gray-300">
                    {t("delete")}
                  </th>
                </tr>
              </thead>
              <tbody className="divide-y divide-gray-200 dark:divide-gray-700">
                {formData.documentTypes.map((docType) => (
                  <tr key={docType.id}>
                    <td className="px-4 py-3 text-sm text-gray-900 dark:text-gray-100">
                      {docType.name}
                    </td>
                    <td className="px-4 py-3 text-center">
                      <input
                        type="checkbox"
                        checked={docType.required}
                        onChange={() => toggleDocTypeRequired(docType.id)}
                        className="w-5 h-5 rounded border-gray-300 text-blue-600 focus:ring-blue-500"
                      />
                    </td>
                    <td className="px-4 py-3 text-center">
                      <button
                        type="button"
                        onClick={() => removeDocType(docType.id)}
                        className="text-red-500 hover:text-red-700 transition-colors"
                      >
                        <XMarkIcon className="w-5 h-5" />
                      </button>
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>

          <div className="mt-3 flex gap-2">
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
        </div>
      </form>
    </Modal>
  );
}
