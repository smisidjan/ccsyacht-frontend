"use client";

import { useState, useEffect } from "react";
import { useTranslations } from "next-intl";
import { systemDocumentTypeTemplatesApi } from "@/lib/api/system";
import type { DocumentTypeTemplate } from "@/lib/api/types";
import Button from "@/app/components/ui/Button";
import Spinner from "@/app/components/ui/Spinner";
import Alert from "@/app/components/ui/Alert";
import Modal from "@/app/components/ui/Modal";
import { DocumentTypeTemplateForm } from "@/app/features/system-admin";
import { PlusIcon } from "@heroicons/react/24/outline";
import { useModalForm } from "@/lib/hooks/useModalForm";

interface DocumentTypeTemplatesTableProps {
  tenantId: string;
}

export default function DocumentTypeTemplatesTable({ tenantId }: DocumentTypeTemplatesTableProps) {
  const t = useTranslations("systemSettings.templates");
  const tCommon = useTranslations("common");

  const [templates, setTemplates] = useState<DocumentTypeTemplate[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);

  // Form state
  const [name, setName] = useState("");
  const [isRequired, setIsRequired] = useState(false);
  const [isLocked, setIsLocked] = useState(false);
  const [isActive, setIsActive] = useState(true);

  const modal = useModalForm<DocumentTypeTemplate>({
    onSubmit: async (_, template) => {
      const data = {
        name,
        is_required: isRequired,
        is_locked: isLocked,
        is_active: isActive,
      };

      if (template) {
        await systemDocumentTypeTemplatesApi.update(tenantId, template.identifier, data);
      } else {
        await systemDocumentTypeTemplatesApi.create(tenantId, data);
      }
      await fetchTemplates();
    },
    resetForm: () => {
      setName("");
      setIsRequired(false);
      setIsLocked(false);
      setIsActive(true);
    },
    populateForm: (template) => {
      setName(template.name);
      setIsRequired(template.isRequired);
      setIsLocked(template.isLocked);
      setIsActive(template.isActive);
    },
    successMessages: {
      create: "Document type template created successfully",
      update: "Document type template updated successfully",
    },
  });

  useEffect(() => {
    fetchTemplates();
  }, [tenantId]);

  const fetchTemplates = async () => {
    try {
      setLoading(true);
      const response = await systemDocumentTypeTemplatesApi.getAll(tenantId);
      setTemplates(response.data);
      setError(null);
    } catch (err) {
      setError(err instanceof Error ? err.message : "Failed to load templates");
    } finally {
      setLoading(false);
    }
  };

  if (loading) {
    return (
      <div className="flex items-center justify-center py-12">
        <Spinner />
      </div>
    );
  }

  if (error) {
    return <Alert type="error" message={error} />;
  }

  return (
    <div className="space-y-4">
      <div className="flex justify-between items-center">
        <h2 className="text-lg font-semibold text-gray-900 dark:text-white">
          {t("documentTypesTab")}
        </h2>
        <Button variant="primary" onClick={modal.openCreate}>
          <PlusIcon className="w-4 h-4" />
          {t("create")}
        </Button>
      </div>

      {templates.length === 0 ? (
        <div className="text-center py-12 text-gray-500 dark:text-gray-400">
          {t("noTemplates")}
        </div>
      ) : (
        <div className="bg-white dark:bg-gray-800 rounded-lg shadow overflow-hidden">
          <table className="min-w-full divide-y divide-gray-200 dark:divide-gray-700">
            <thead className="bg-gray-50 dark:bg-gray-900">
              <tr>
                <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 dark:text-gray-400 uppercase tracking-wider">
                  {t("name")}
                </th>
                <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 dark:text-gray-400 uppercase tracking-wider">
                  {t("required")}
                </th>
                <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 dark:text-gray-400 uppercase tracking-wider">
                  {t("locked")}
                </th>
                <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 dark:text-gray-400 uppercase tracking-wider">
                  {t("active")}
                </th>
                <th className="px-6 py-3 text-right text-xs font-medium text-gray-500 dark:text-gray-400 uppercase tracking-wider">
                  {t("actions")}
                </th>
              </tr>
            </thead>
            <tbody className="bg-white dark:bg-gray-800 divide-y divide-gray-200 dark:divide-gray-700">
              {templates.map((template) => (
                <tr key={template.identifier}>
                  <td className="px-6 py-4 whitespace-nowrap text-sm font-medium text-gray-900 dark:text-white">
                    {template.name}
                  </td>
                  <td className="px-6 py-4 whitespace-nowrap text-sm text-gray-500 dark:text-gray-400">
                    {template.isRequired ? "Yes" : "No"}
                  </td>
                  <td className="px-6 py-4 whitespace-nowrap text-sm text-gray-500 dark:text-gray-400">
                    {template.isLocked ? "Yes" : "No"}
                  </td>
                  <td className="px-6 py-4 whitespace-nowrap text-sm text-gray-500 dark:text-gray-400">
                    {template.isActive ? "Yes" : "No"}
                  </td>
                  <td className="px-6 py-4 whitespace-nowrap text-right text-sm font-medium">
                    <Button variant="ghost" size="sm" onClick={() => modal.openEdit(template)}>
                      {t("edit")}
                    </Button>
                    <Button variant="ghost" size="sm">
                      {t("delete")}
                    </Button>
                  </td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>
      )}

      {/* Create/Edit Modal */}
      <Modal
        isOpen={modal.isOpen}
        onClose={modal.close}
        title={modal.isEditMode ? t("edit") : t("create")}
        size="md"
        isForm={true}
        formId="document-type-template-form"
        onSubmit={() => modal.submit({})}
        error={modal.error}
        actions={[
          {
            label: tCommon("cancel"),
            onClick: modal.close,
            variant: "secondary",
          },
          {
            label: modal.isEditMode ? tCommon("save") : t("create"),
            type: "submit",
            variant: "primary",
          },
        ]}
      >
        <DocumentTypeTemplateForm
          name={name}
          isRequired={isRequired}
          isLocked={isLocked}
          isActive={isActive}
          onNameChange={setName}
          onIsRequiredChange={setIsRequired}
          onIsLockedChange={setIsLocked}
          onIsActiveChange={setIsActive}
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
  );
}
