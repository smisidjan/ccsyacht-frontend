"use client";

import { useState } from "react";
import { useTranslations } from "next-intl";
import BaseModal from "./BaseModal";
import RemarkForm from "@/app/components/forms/RemarkForm";
import { stageRemarksApi } from "@/lib/api/stage-remarks";
import { useToast } from "@/app/context/ToastContext";

interface CreateRemarkModalProps {
  isOpen: boolean;
  onClose: () => void;
  projectId: string;
  stageId: string;
  onSuccess?: () => void;
}

const MAX_FILE_SIZE = 20 * 1024 * 1024; // 20MB

export default function CreateRemarkModal({
  isOpen,
  onClose,
  projectId,
  stageId,
  onSuccess,
}: CreateRemarkModalProps) {
  const t = useTranslations("stageRemarks");
  const { showToast } = useToast();

  const [content, setContent] = useState("");
  const [selectedFiles, setSelectedFiles] = useState<File[]>([]);

  const handleFileChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    const files = Array.from(e.target.files || []);
    const validFiles: File[] = [];

    for (const file of files) {
      if (file.size > MAX_FILE_SIZE) {
        showToast("error", `${file.name}: Max 20MB`);
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
    // Step 1: Create the remark
    const newRemark = await stageRemarksApi.create(projectId, stageId, {
      content: content.trim()
    });

    // Step 2: Upload attachments if any
    if (selectedFiles.length > 0) {
      for (const file of selectedFiles) {
        try {
          await stageRemarksApi.uploadAttachment(projectId, newRemark.identifier, file);
        } catch (uploadError: any) {
          console.error(`Failed to upload ${file.name}:`, uploadError);
          showToast("error", `Failed to upload ${file.name}`);
        }
      }
    }

    // Reset form
    setContent("");
    setSelectedFiles([]);
  };

  return (
    <BaseModal
      isOpen={isOpen}
      onClose={onClose}
      title={t("createRemark")}
      formId="create-remark-form"
      onSubmit={handleSubmit}
      successMessage={t("createSuccess")}
      errorFallbackMessage={t("createError")}
      onSuccessCallback={onSuccess}
      submitDisabled={!content.trim()}
      size="sm"
    >
      <RemarkForm
        content={content}
        onContentChange={setContent}
        files={selectedFiles}
        onFileChange={handleFileChange}
        onFileRemove={removeFile}
        translations={{
          remarkContent: t("remarkContent"),
          remarkPlaceholder: t("remarkPlaceholder"),
          attachments: t("attachments"),
          uploadAttachment: t("uploadAttachment"),
          maxFileSize: t("maxFileSize"),
        }}
      />
    </BaseModal>
  );
}
