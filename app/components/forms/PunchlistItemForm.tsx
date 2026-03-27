"use client";

import { PlusIcon, XMarkIcon } from "@heroicons/react/24/outline";
import FormInput from "@/app/components/ui/FormInput";
import type { PunchlistItemPriority, ProjectMember } from "@/lib/api/types";

interface PunchlistItemFormProps {
  title: string;
  onTitleChange: (title: string) => void;
  description: string;
  onDescriptionChange: (description: string) => void;
  priority: PunchlistItemPriority;
  onPriorityChange: (priority: PunchlistItemPriority) => void;
  dueDate: string;
  onDueDateChange: (date: string) => void;
  assignees: string[];
  onToggleAssignee: (userId: string) => void;
  files: File[];
  onFileChange: (e: React.ChangeEvent<HTMLInputElement>) => void;
  onFileRemove: (index: number) => void;
  projectMembers?: ProjectMember[];
  translations: {
    punchlistItemTitle: string;
    punchlistTitlePlaceholder: string;
    punchlistDescription: string;
    punchlistDescriptionPlaceholder: string;
    punchlistPriority: string;
    priorityLow: string;
    priorityMedium: string;
    priorityHigh: string;
    punchlistDueDate: string;
    attachments: string;
    uploadAttachment: string;
    maxFileSize: string;
    assignees: string;
  };
}

const MAX_FILE_SIZE = 20 * 1024 * 1024; // 20MB

export default function PunchlistItemForm({
  title,
  onTitleChange,
  description,
  onDescriptionChange,
  priority,
  onPriorityChange,
  dueDate,
  onDueDateChange,
  assignees,
  onToggleAssignee,
  files,
  onFileChange,
  onFileRemove,
  projectMembers,
  translations: t,
}: PunchlistItemFormProps) {
  return (
    <div className="space-y-4">
      {/* Title */}
      <FormInput
        id="punchlist-title"
        label={t.punchlistItemTitle}
        value={title}
        onChange={(e) => onTitleChange(e.target.value)}
        placeholder={t.punchlistTitlePlaceholder}
        required
      />

      {/* Description */}
      <div>
        <label className="block text-sm font-medium text-gray-700 dark:text-gray-300 mb-2">
          {t.punchlistDescription}
        </label>
        <textarea
          value={description}
          onChange={(e) => onDescriptionChange(e.target.value)}
          placeholder={t.punchlistDescriptionPlaceholder}
          rows={3}
          className="w-full px-3 py-2 border border-gray-300 dark:border-gray-600 rounded-lg bg-white dark:bg-gray-800 text-gray-900 dark:text-gray-100 focus:ring-2 focus:ring-blue-500 focus:border-blue-500"
        />
      </div>

      {/* Priority */}
      <div>
        <label className="block text-sm font-medium text-gray-700 dark:text-gray-300 mb-2">
          {t.punchlistPriority}
        </label>
        <select
          value={priority}
          onChange={(e) => onPriorityChange(e.target.value as PunchlistItemPriority)}
          className="w-full px-3 py-2 border border-gray-300 dark:border-gray-600 rounded-lg bg-white dark:bg-gray-800 text-gray-900 dark:text-gray-100 focus:ring-2 focus:ring-blue-500 focus:border-blue-500"
        >
          <option value="low">{t.priorityLow}</option>
          <option value="medium">{t.priorityMedium}</option>
          <option value="high">{t.priorityHigh}</option>
        </select>
      </div>

      {/* Due Date */}
      <FormInput
        id="punchlist-due-date"
        label={t.punchlistDueDate}
        type="date"
        value={dueDate}
        onChange={(e) => onDueDateChange(e.target.value)}
      />

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
              accept="image/*,.pdf,.doc,.docx"
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

      {/* Assignees */}
      {projectMembers && projectMembers.length > 0 && (
        <div>
          <label className="block text-sm font-medium text-gray-700 dark:text-gray-300 mb-2">
            {t.assignees}
          </label>
          <div className="space-y-2 max-h-48 overflow-y-auto border border-gray-200 dark:border-gray-700 rounded-lg p-3 bg-gray-50 dark:bg-gray-900">
            {projectMembers.map((member) => (
              <label
                key={member.identifier}
                className="flex items-center gap-2 cursor-pointer hover:bg-white dark:hover:bg-gray-800 p-2 rounded transition-colors"
              >
                <input
                  type="checkbox"
                  checked={assignees.includes(member.member.identifier)}
                  onChange={() => onToggleAssignee(member.member.identifier)}
                  className="rounded border-gray-300 dark:border-gray-600 text-blue-600 focus:ring-blue-500"
                />
                <span className="text-sm text-gray-900 dark:text-white">
                  {member.member.name}
                </span>
                <span className="text-xs text-gray-500 dark:text-gray-400">
                  ({member.roleName})
                </span>
              </label>
            ))}
          </div>
        </div>
      )}
    </div>
  );
}
