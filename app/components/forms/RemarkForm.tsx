"use client";

import { PlusIcon, XMarkIcon } from "@heroicons/react/24/outline";

interface RemarkFormProps {
  content: string;
  onContentChange: (content: string) => void;
  files: File[];
  onFileChange: (e: React.ChangeEvent<HTMLInputElement>) => void;
  onFileRemove: (index: number) => void;
  translations: {
    remarkContent: string;
    remarkPlaceholder: string;
    attachments: string;
    uploadAttachment: string;
    maxFileSize: string;
  };
}

const MAX_FILE_SIZE = 20 * 1024 * 1024; // 20MB

export default function RemarkForm({
  content,
  onContentChange,
  files,
  onFileChange,
  onFileRemove,
  translations: t,
}: RemarkFormProps) {
  return (
    <div className="space-y-4">
      {/* Content Textarea */}
      <div>
        <label className="block text-sm font-medium text-gray-700 dark:text-gray-300 mb-2">
          {t.remarkContent}
        </label>
        <textarea
          value={content}
          onChange={(e) => onContentChange(e.target.value)}
          placeholder={t.remarkPlaceholder}
          rows={5}
          className="w-full px-3 py-2 border border-gray-300 dark:border-gray-600 rounded-lg bg-white dark:bg-gray-800 text-gray-900 dark:text-gray-100 focus:ring-2 focus:ring-blue-500 focus:border-blue-500"
        />
      </div>

      {/* File Upload */}
      <div>
        <label className="block text-sm font-medium text-gray-700 dark:text-gray-300 mb-2">
          {t.attachments}
        </label>
        <div className="flex items-center gap-3 mb-2">
          <label className="cursor-pointer">
            <input
              type="file"
              multiple
              onChange={onFileChange}
              className="hidden"
              accept="image/*,.pdf,.doc,.docx,.xls,.xlsx"
            />
            <div className="flex items-center gap-2 px-4 py-2 bg-gray-100 dark:bg-gray-700 rounded-lg hover:bg-gray-200 dark:hover:bg-gray-600 transition-colors">
              <PlusIcon className="w-5 h-5 text-gray-600 dark:text-gray-400" />
              <span className="text-sm text-gray-700 dark:text-gray-300">
                {t.uploadAttachment}
              </span>
            </div>
          </label>
          <span className="text-xs text-gray-500 dark:text-gray-400">{t.maxFileSize}</span>
        </div>

        {/* Selected Files */}
        {files.length > 0 && (
          <div className="space-y-2">
            {files.map((file, index) => (
              <div
                key={index}
                className="flex items-center justify-between p-2 bg-gray-50 dark:bg-gray-700 rounded-lg"
              >
                <span className="text-sm text-gray-700 dark:text-gray-300 truncate">
                  {file.name}
                </span>
                <button
                  type="button"
                  onClick={() => onFileRemove(index)}
                  className="p-1 text-gray-400 hover:text-red-600 dark:hover:text-red-400"
                >
                  <XMarkIcon className="w-4 h-4" />
                </button>
              </div>
            ))}
          </div>
        )}
      </div>
    </div>
  );
}
