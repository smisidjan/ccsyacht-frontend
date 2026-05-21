"use client";

import { useRef } from "react";
import FormInput from "@/app/components/ui/FormInput";
import FormTextarea from "@/app/components/ui/FormTextarea";
import Button from "@/app/components/ui/Button";
import { RichTextEditor } from "@/app/components/ui/RichTextEditor";
import {
  DocumentIcon,
  ArrowUpTrayIcon,
  XMarkIcon,
} from "@heroicons/react/24/outline";

interface ExistingFile {
  fileName: string;
  contentSize: string;
  encodingFormat: string;
}

interface KickoffDocumentTemplateFormProps {
  name: string;
  description: string;
  content: Record<string, unknown>;
  isActive: boolean;
  file: File | null;
  existingFile: ExistingFile | null;
  removeExistingFile: boolean;
  onNameChange: (value: string) => void;
  onDescriptionChange: (value: string) => void;
  onContentChange: (value: Record<string, unknown>) => void;
  onIsActiveChange: (value: boolean) => void;
  onFileChange: (file: File | null) => void;
  onRemoveExistingFile: (remove: boolean) => void;
  translations: {
    name: string;
    namePlaceholder: string;
    description: string;
    descriptionPlaceholder: string;
    content: string;
    contentPlaceholder: string;
    isActive: string;
    file: string;
    fileHint: string;
    uploadFile: string;
    removeFile: string;
    currentFile: string;
  };
}

const ACCEPTED_FILE_TYPES = ".pdf,.doc,.docx,.odt";
const MAX_FILE_SIZE = 10 * 1024 * 1024; // 10MB

export default function KickoffDocumentTemplateForm({
  name,
  description,
  content,
  isActive,
  file,
  existingFile,
  removeExistingFile,
  onNameChange,
  onDescriptionChange,
  onContentChange,
  onIsActiveChange,
  onFileChange,
  onRemoveExistingFile,
  translations: t,
}: KickoffDocumentTemplateFormProps) {
  const fileInputRef = useRef<HTMLInputElement>(null);

  const handleFileSelect = (e: React.ChangeEvent<HTMLInputElement>) => {
    const selectedFile = e.target.files?.[0];
    if (selectedFile) {
      if (selectedFile.size > MAX_FILE_SIZE) {
        alert("File size must be less than 10MB");
        return;
      }
      onFileChange(selectedFile);
      // If there was an existing file marked for removal, keep that state
      // The new file will replace it
    }
  };

  const handleRemoveNewFile = () => {
    onFileChange(null);
    if (fileInputRef.current) {
      fileInputRef.current.value = "";
    }
  };

  const handleRemoveExistingFile = () => {
    onRemoveExistingFile(true);
  };

  const handleRestoreExistingFile = () => {
    onRemoveExistingFile(false);
  };

  const formatFileSize = (bytes: number): string => {
    if (bytes < 1024) return `${bytes} B`;
    if (bytes < 1024 * 1024) return `${(bytes / 1024).toFixed(1)} KB`;
    return `${(bytes / (1024 * 1024)).toFixed(1)} MB`;
  };

  const showExistingFile = existingFile && !removeExistingFile && !file;
  const showNewFile = file !== null;
  const showRemovedFile = existingFile && removeExistingFile && !file;

  return (
    <div className="space-y-4">
      {/* Name */}
      <FormInput
        id="kickoff-document-template-name"
        label={t.name}
        value={name}
        onChange={(e) => onNameChange(e.target.value)}
        placeholder={t.namePlaceholder}
        required
      />

      {/* Description */}
      <FormTextarea
        id="kickoff-document-template-description"
        label={t.description}
        value={description}
        onChange={(e) => onDescriptionChange(e.target.value)}
        placeholder={t.descriptionPlaceholder}
        rows={2}
      />

      {/* File Upload */}
      <div>
        <label className="block text-sm font-medium text-gray-700 dark:text-gray-300 mb-2">
          {t.file}
        </label>

        {/* Existing file display */}
        {showExistingFile && (
          <div className="flex items-center justify-between p-3 bg-gray-50 dark:bg-gray-800 border border-gray-200 dark:border-gray-700 rounded-lg mb-2">
            <div className="flex items-center gap-3">
              <DocumentIcon className="w-8 h-8 text-blue-500" />
              <div>
                <p className="text-sm font-medium text-gray-900 dark:text-white">
                  {existingFile.fileName}
                </p>
                <p className="text-xs text-gray-500 dark:text-gray-400">
                  {existingFile.contentSize}
                </p>
              </div>
            </div>
            <Button
              type="button"
              variant="ghost"
              size="sm"
              onClick={handleRemoveExistingFile}
              className="text-red-500 hover:text-red-600"
            >
              <XMarkIcon className="w-4 h-4" />
            </Button>
          </div>
        )}

        {/* Removed file notice */}
        {showRemovedFile && (
          <div className="flex items-center justify-between p-3 bg-red-50 dark:bg-red-900/20 border border-red-200 dark:border-red-800 rounded-lg mb-2">
            <div className="flex items-center gap-3">
              <DocumentIcon className="w-8 h-8 text-red-400" />
              <div>
                <p className="text-sm font-medium text-red-600 dark:text-red-400 line-through">
                  {existingFile.fileName}
                </p>
                <p className="text-xs text-red-500 dark:text-red-400">
                  Will be removed on save
                </p>
              </div>
            </div>
            <Button
              type="button"
              variant="ghost"
              size="sm"
              onClick={handleRestoreExistingFile}
              className="text-blue-500 hover:text-blue-600"
            >
              Restore
            </Button>
          </div>
        )}

        {/* New file display */}
        {showNewFile && (
          <div className="flex items-center justify-between p-3 bg-green-50 dark:bg-green-900/20 border border-green-200 dark:border-green-800 rounded-lg mb-2">
            <div className="flex items-center gap-3">
              <DocumentIcon className="w-8 h-8 text-green-500" />
              <div>
                <p className="text-sm font-medium text-gray-900 dark:text-white">
                  {file.name}
                </p>
                <p className="text-xs text-gray-500 dark:text-gray-400">
                  {formatFileSize(file.size)} • New file
                </p>
              </div>
            </div>
            <Button
              type="button"
              variant="ghost"
              size="sm"
              onClick={handleRemoveNewFile}
              className="text-red-500 hover:text-red-600"
            >
              <XMarkIcon className="w-4 h-4" />
            </Button>
          </div>
        )}

        {/* Upload button */}
        <div className="flex items-center gap-3">
          <input
            ref={fileInputRef}
            type="file"
            accept={ACCEPTED_FILE_TYPES}
            onChange={handleFileSelect}
            className="hidden"
            id="kickoff-document-file-input"
          />
          <Button
            type="button"
            variant="secondary"
            size="sm"
            onClick={() => fileInputRef.current?.click()}
          >
            <ArrowUpTrayIcon className="w-4 h-4 mr-1" />
            {t.uploadFile}
          </Button>
          <span className="text-xs text-gray-500 dark:text-gray-400">
            {t.fileHint}
          </span>
        </div>
      </div>

      {/* Content Editor — shared rich text component handles
          toolbar + TipTap setup + sanitisation. */}
      <div>
        <label className="block text-sm font-medium text-gray-700 dark:text-gray-300 mb-2">
          {t.content}
        </label>
        <RichTextEditor
          content={content}
          onChange={onContentChange}
          placeholder={t.contentPlaceholder}
        />
      </div>

      {/* Is Active */}
      <div className="flex items-center">
        <input
          id="kickoff-document-template-active"
          type="checkbox"
          checked={isActive}
          onChange={(e) => onIsActiveChange(e.target.checked)}
          className="h-4 w-4 text-blue-600 focus:ring-blue-500 border-gray-300 rounded"
        />
        <label
          htmlFor="kickoff-document-template-active"
          className="ml-2 block text-sm text-gray-700 dark:text-gray-300"
        >
          {t.isActive}
        </label>
      </div>
    </div>
  );
}
