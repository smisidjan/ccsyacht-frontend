"use client";

import { useState } from "react";
import { useTranslations } from "next-intl";
import BaseModal from "./BaseModal";
import PunchlistItemForm from "@/app/components/forms/PunchlistItemForm";
import { punchlistItemsApi } from "@/lib/api/punchlist-items";
import { useProjectMembers } from "@/lib/api";
import { useToast } from "@/app/context/ToastContext";
import type { PunchlistItemPriority } from "@/lib/api/types";

interface CreatePunchlistItemModalProps {
  isOpen: boolean;
  onClose: () => void;
  projectId: string;
  stageId: string;
  onSuccess?: () => void;
}

const MAX_FILE_SIZE = 20 * 1024 * 1024; // 20MB

export default function CreatePunchlistItemModal({
  isOpen,
  onClose,
  projectId,
  stageId,
  onSuccess,
}: CreatePunchlistItemModalProps) {
  const t = useTranslations("punchlist");
  const { showToast } = useToast();
  const { data: projectMembers } = useProjectMembers(projectId);

  const [title, setTitle] = useState("");
  const [description, setDescription] = useState("");
  const [priority, setPriority] = useState<PunchlistItemPriority>("medium");
  const [dueDate, setDueDate] = useState("");
  const [selectedAssignees, setSelectedAssignees] = useState<string[]>([]);
  const [selectedFiles, setSelectedFiles] = useState<File[]>([]);

  const handleFileChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    const files = Array.from(e.target.files || []);
    const validFiles: File[] = [];

    for (const file of files) {
      if (file.size > MAX_FILE_SIZE) {
        showToast("error", `${file.name}: ${t("maxFileSize")}`);
        continue;
      }
      validFiles.push(file);
    }

    setSelectedFiles((prev) => [...prev, ...validFiles]);
  };

  const removeFile = (index: number) => {
    setSelectedFiles((prev) => prev.filter((_, i) => i !== index));
  };

  const handleSubmit = async () => {
    // Step 1: Create the punchlist item
    const newItem = await punchlistItemsApi.create(projectId, stageId, {
      title: title.trim(),
      description: description.trim() || undefined,
      priority,
      due_date: dueDate || undefined,
      assignee_ids: selectedAssignees.length > 0 ? selectedAssignees : undefined,
    });

    // Step 2: Upload attachments if any
    if (selectedFiles.length > 0) {
      for (const file of selectedFiles) {
        try {
          await punchlistItemsApi.uploadAttachment(projectId, newItem.identifier, file);
        } catch (uploadError: any) {
          console.error(`Failed to upload ${file.name}:`, uploadError);
          showToast("error", `Failed to upload ${file.name}`);
        }
      }
    }
  };

  const toggleAssignee = (userId: string) => {
    setSelectedAssignees((prev) =>
      prev.includes(userId)
        ? prev.filter((id) => id !== userId)
        : [...prev, userId]
    );
  };

  return (
    <BaseModal
      isOpen={isOpen}
      onClose={onClose}
      title={t("createItem")}
      formId="create-punchlist-form"
      onSubmit={handleSubmit}
      successMessage={t("createSuccess")}
      errorFallbackMessage={t("createError")}
      onSuccessCallback={onSuccess}
      submitDisabled={!title.trim()}
      size="sm"
    >
      <PunchlistItemForm
        title={title}
        onTitleChange={setTitle}
        description={description}
        onDescriptionChange={setDescription}
        priority={priority}
        onPriorityChange={setPriority}
        dueDate={dueDate}
        onDueDateChange={setDueDate}
        assignees={selectedAssignees}
        onToggleAssignee={toggleAssignee}
        files={selectedFiles}
        onFileChange={handleFileChange}
        onFileRemove={removeFile}
        projectMembers={projectMembers || undefined}
        translations={{
          punchlistItemTitle: t("name"),
          punchlistTitlePlaceholder: t("namePlaceholder"),
          punchlistDescription: t("description"),
          punchlistDescriptionPlaceholder: t("descriptionPlaceholder"),
          punchlistPriority: t("priority"),
          priorityLow: t("priorityLow"),
          priorityMedium: t("priorityMedium"),
          priorityHigh: t("priorityHigh"),
          punchlistDueDate: t("dueDate"),
          attachments: t("attachments"),
          uploadAttachment: t("uploadAttachment"),
          maxFileSize: t("maxFileSize"),
          assignees: t("assignees"),
        }}
      />
    </BaseModal>
  );
}
