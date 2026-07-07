"use client";

import { useState, useMemo } from "react";
import { useTranslations } from "next-intl";
import {
  UserCircleIcon,
  CheckIcon,
  ShieldCheckIcon,
  XMarkIcon,
} from "@heroicons/react/24/outline";
import BaseModal from "@/app/components/modals/BaseModal";
import FormTextarea from "@/app/components/ui/FormTextarea";
import type { UploadDocumentRequest } from "@/lib/api/types";

interface PersonOption {
  id: string;
  name: string;
  email: string;
}

interface UploadDocumentModalProps {
  isOpen: boolean;
  onClose: () => void;
  onSubmit: (data: UploadDocumentRequest) => Promise<void>;
  documentTypeName: string;
  /** Members who are default signers for this document type — shown as info, not selectable. */
  defaultSigners?: PersonOption[];
  /** Additional project members who can be picked as extra reviewers (default signers already excluded). */
  availableReviewers?: PersonOption[];
}

export default function UploadDocumentModal({
  isOpen,
  onClose,
  onSubmit,
  documentTypeName,
  defaultSigners = [],
  availableReviewers = [],
}: UploadDocumentModalProps) {
  const t = useTranslations("systemSettings.tenantDetail.projects.detail.documents.uploadModal");

  const [description, setDescription] = useState("");
  const [file, setFile] = useState<File | null>(null);
  const [selectedReviewerIds, setSelectedReviewerIds] = useState<string[]>([]);
  const [reviewerSearch, setReviewerSearch] = useState("");

  const filteredReviewers = useMemo(() => {
    if (!reviewerSearch.trim()) return availableReviewers;
    const q = reviewerSearch.toLowerCase();
    return availableReviewers.filter(
      (u) => u.name.toLowerCase().includes(q) || u.email.toLowerCase().includes(q)
    );
  }, [availableReviewers, reviewerSearch]);

  const handleSubmit = async () => {
    if (!file) {
      throw new Error(t("fileRequired"));
    }

    await onSubmit({
      title: file.name,
      description: description || undefined,
      file,
      reviewer_ids: selectedReviewerIds.length > 0 ? selectedReviewerIds : undefined,
    });

    setDescription("");
    setFile(null);
    setSelectedReviewerIds([]);
    setReviewerSearch("");
  };

  const handleFileChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    setFile(e.target.files?.[0] || null);
  };

  const toggleReviewer = (id: string) => {
    setSelectedReviewerIds((prev) =>
      prev.includes(id) ? prev.filter((r) => r !== id) : [...prev, id]
    );
  };

  const removeReviewer = (id: string) => {
    setSelectedReviewerIds((prev) => prev.filter((r) => r !== id));
  };

  const selectedReviewers = availableReviewers.filter((u) =>
    selectedReviewerIds.includes(u.id)
  );

  const hasReviewers = availableReviewers.length > 0;

  return (
    <BaseModal
      isOpen={isOpen}
      onClose={onClose}
      title={t("title", { type: documentTypeName })}
      formId="upload-document-form"
      onSubmit={handleSubmit}
      successMessage={t("success")}
      errorFallbackMessage={t("error")}
      submitLabel={t("upload")}
    >
      <div className="space-y-5">
        {/* File Input */}
        <div>
          <label className="block text-sm font-medium text-gray-700 dark:text-gray-300 mb-2">
            {t("file")}
          </label>
          <input
            type="file"
            onChange={handleFileChange}
            accept=".pdf,.doc,.docx,.xls,.xlsx,.jpg,.jpeg,.png"
            required
            className="w-full px-4 py-2.5 rounded-lg border border-gray-300 dark:border-gray-600 bg-white dark:bg-gray-700 text-gray-900 dark:text-white file:mr-4 file:py-2 file:px-4 file:rounded-lg file:border-0 file:text-sm file:font-medium file:bg-gray-100 dark:file:bg-gray-600 file:text-gray-700 dark:file:text-gray-200 hover:file:bg-gray-200 dark:hover:file:bg-gray-500 transition-all"
          />
          {file && (
            <p className="mt-2 text-sm text-gray-600 dark:text-gray-400">
              {t("selectedFile")}: {file.name} ({(file.size / 1024 / 1024).toFixed(2)} MB)
            </p>
          )}
        </div>

        {/* Description */}
        <FormTextarea
          id="document-description"
          label={t("descriptionOptional")}
          value={description}
          onChange={(e) => setDescription(e.target.value)}
          placeholder={t("descriptionPlaceholder")}
          rows={3}
        />

        {/* Default signers info block */}
        {defaultSigners.length > 0 && (
          <div className="rounded-lg border border-blue-200 dark:border-blue-800 bg-blue-50 dark:bg-blue-900/20 p-3">
            <div className="flex items-center gap-1.5 mb-2">
              <ShieldCheckIcon className="w-4 h-4 text-blue-600 dark:text-blue-400 flex-shrink-0" />
              <span className="text-sm font-medium text-blue-700 dark:text-blue-300">
                {t("defaultSigners")}
              </span>
            </div>
            <p className="text-xs text-blue-600 dark:text-blue-400 mb-2">
              {t("defaultSignersDescription")}
            </p>
            <div className="space-y-1">
              {defaultSigners.map((signer) => (
                <div key={signer.id} className="flex items-center gap-2">
                  <div className="w-5 h-5 bg-blue-100 dark:bg-blue-900/40 rounded-full flex items-center justify-center flex-shrink-0">
                    <UserCircleIcon className="w-3.5 h-3.5 text-blue-500 dark:text-blue-400" />
                  </div>
                  <span className="text-sm text-blue-800 dark:text-blue-200">{signer.name}</span>
                  <span className="text-xs text-blue-500 dark:text-blue-400">{signer.email}</span>
                </div>
              ))}
            </div>
          </div>
        )}

        {/* Extra reviewer picker */}
        {hasReviewers && (
          <div>
            <label className="block text-sm font-medium text-gray-700 dark:text-gray-300 mb-1">
              {t("reviewers")}
            </label>
            <p className="text-xs text-gray-500 dark:text-gray-400 mb-2">
              {t("reviewersDescription")}
            </p>

            {/* Selected reviewer chips */}
            {selectedReviewers.length > 0 && (
              <div className="flex flex-wrap gap-1.5 mb-2">
                {selectedReviewers.map((r) => (
                  <span
                    key={r.id}
                    className="inline-flex items-center gap-1 pl-2 pr-1 py-0.5 rounded-full text-xs font-medium bg-blue-100 dark:bg-blue-900/30 text-blue-700 dark:text-blue-300"
                  >
                    {r.name}
                    <button
                      type="button"
                      onClick={() => removeReviewer(r.id)}
                      className="ml-0.5 p-0.5 rounded-full hover:bg-blue-200 dark:hover:bg-blue-800 transition-colors"
                    >
                      <XMarkIcon className="w-3 h-3" />
                    </button>
                  </span>
                ))}
              </div>
            )}

            {/* Search input */}
            <input
              type="text"
              value={reviewerSearch}
              onChange={(e) => setReviewerSearch(e.target.value)}
              placeholder={t("reviewersSearchPlaceholder")}
              className="w-full px-4 py-2.5 rounded-lg border border-gray-300 dark:border-gray-600 bg-white dark:bg-gray-700 text-gray-900 dark:text-white focus:ring-2 focus:ring-blue-500 focus:border-transparent text-sm mb-1"
              autoComplete="off"
            />

            {/* Reviewer list */}
            {filteredReviewers.length > 0 ? (
              <div className="border border-gray-200 dark:border-gray-600 rounded-lg max-h-40 overflow-y-auto">
                {filteredReviewers.map((user) => {
                  const isSelected = selectedReviewerIds.includes(user.id);
                  return (
                    <button
                      key={user.id}
                      type="button"
                      onClick={() => toggleReviewer(user.id)}
                      className={`w-full px-4 py-3 flex items-center gap-3 hover:bg-gray-50 dark:hover:bg-gray-700 transition-colors text-left border-b border-gray-100 dark:border-gray-700 last:border-b-0 ${
                        isSelected ? "bg-blue-50 dark:bg-blue-900/20" : ""
                      }`}
                    >
                      <div className="w-8 h-8 bg-blue-100 dark:bg-blue-900/30 rounded-full flex items-center justify-center flex-shrink-0">
                        <UserCircleIcon className="w-5 h-5 text-blue-600 dark:text-blue-400" />
                      </div>
                      <div className="min-w-0 flex-1">
                        <p className="text-sm font-medium text-gray-900 dark:text-white truncate">
                          {user.name}
                        </p>
                        <p className="text-xs text-gray-500 dark:text-gray-400 truncate">
                          {user.email}
                        </p>
                      </div>
                      {isSelected && (
                        <CheckIcon className="w-4 h-4 text-blue-600 dark:text-blue-400 flex-shrink-0" />
                      )}
                    </button>
                  );
                })}
              </div>
            ) : reviewerSearch.trim() ? (
              <div className="px-4 py-3 text-sm text-gray-500 dark:text-gray-400 text-center border border-gray-200 dark:border-gray-600 rounded-lg">
                {t("reviewersNoResults")}
              </div>
            ) : null}
          </div>
        )}
      </div>
    </BaseModal>
  );
}
