"use client";

import { useState, useMemo } from "react";
import { useTranslations } from "next-intl";
import { UserCircleIcon, CheckIcon, UserPlusIcon } from "@heroicons/react/24/outline";
import BaseModal from "@/app/components/modals/BaseModal";
import FormInput from "@/app/components/ui/FormInput";
import FormTextarea from "@/app/components/ui/FormTextarea";
import type { User, AddDocumentTypeAssigneeRequest } from "@/lib/api/types";

interface AssignDocumentModalProps {
  isOpen: boolean;
  onClose: () => void;
  onSubmit: (data: AddDocumentTypeAssigneeRequest) => Promise<void>;
  documentTypeName: string;
  availableUsers: User[];
  existingAssigneeIds: string[];
  currentUserId?: string;
  projectId?: string;
}

export default function AssignDocumentModal({
  isOpen,
  onClose,
  onSubmit,
  documentTypeName,
  availableUsers,
  existingAssigneeIds,
  currentUserId,
  projectId,
}: AssignDocumentModalProps) {
  const t = useTranslations("documentTypes.assignees");

  const [selectedUserId, setSelectedUserId] = useState("");
  const [searchInput, setSearchInput] = useState("");
  const [message, setMessage] = useState("");
  const [dueDate, setDueDate] = useState("");
  const [sendNotification, setSendNotification] = useState(true);

  // Filter out already assigned users AND current user
  const filteredAvailableUsers = useMemo(() => {
    return availableUsers.filter(
      (user) => !existingAssigneeIds.includes(user.id) && user.id !== currentUserId
    );
  }, [availableUsers, existingAssigneeIds, currentUserId]);

  // Filter users based on search input
  const filteredUsers = useMemo(() => {
    if (!searchInput.trim()) return filteredAvailableUsers;
    const query = searchInput.toLowerCase().trim();
    return filteredAvailableUsers.filter(
      (user) =>
        user.name.toLowerCase().includes(query) ||
        user.email.toLowerCase().includes(query)
    );
  }, [filteredAvailableUsers, searchInput]);

  const handleSelectUser = (userId: string) => {
    setSelectedUserId(userId);
    const user = filteredAvailableUsers.find((u) => u.id === userId);
    if (user) {
      setSearchInput(user.email);
    }
  };

  const handleSubmit = async () => {
    if (!selectedUserId) return;
    await onSubmit({
      user_id: selectedUserId,
      message: message.trim() || undefined,
      due_date: dueDate || undefined,
      send_notification: sendNotification,
    });
    resetForm();
  };

  const resetForm = () => {
    setSelectedUserId("");
    setSearchInput("");
    setMessage("");
    setDueDate("");
    setSendNotification(true);
    onClose();
  };

  // Get tomorrow's date as minimum for due date
  const tomorrow = new Date();
  tomorrow.setDate(tomorrow.getDate() + 1);
  const minDate = tomorrow.toISOString().split("T")[0];

  return (
    <BaseModal
      isOpen={isOpen}
      onClose={resetForm}
      title={t("assignModal.title")}
      size="md"
      formId="assign-document-form"
      onSubmit={handleSubmit}
      successMessage={t("assignModal.success")}
      errorFallbackMessage={t("assignModal.error")}
      submitLabel={t("assignModal.submit")}
      submitDisabled={!selectedUserId}
    >
      <div className="space-y-4">
        {/* Document type info */}
        <div className="bg-gray-50 dark:bg-gray-700/50 rounded-lg p-3">
          <p className="text-sm text-gray-600 dark:text-gray-400">
            {t("assignModal.forDocumentType")}
          </p>
          <p className="font-medium text-gray-900 dark:text-white">
            {documentTypeName}
          </p>
        </div>

        {/* Search input */}
        <div>
          <label
            htmlFor="user-search"
            className="block text-sm font-medium text-gray-700 dark:text-gray-300 mb-2"
          >
            {t("assignModal.selectUser")} <span className="text-red-500">*</span>
          </label>
          <input
            id="user-search"
            type="text"
            value={searchInput}
            onChange={(e) => {
              setSearchInput(e.target.value);
              setSelectedUserId("");
            }}
            placeholder={t("assignModal.searchPlaceholder")}
            className="w-full px-4 py-2.5 rounded-lg border border-gray-300 dark:border-gray-600 bg-white dark:bg-gray-700 text-gray-900 dark:text-white focus:ring-2 focus:ring-blue-500 focus:border-transparent"
            autoComplete="off"
          />
        </div>

        {/* User list */}
        {filteredUsers.length > 0 && (
          <div className="border border-gray-200 dark:border-gray-600 rounded-lg max-h-48 overflow-y-auto">
            {filteredUsers.slice(0, 8).map((user) => (
              <button
                key={user.id}
                type="button"
                onClick={() => handleSelectUser(user.id)}
                className={`w-full px-4 py-3 flex items-center gap-3 hover:bg-gray-100 dark:hover:bg-gray-600 transition-colors text-left border-b border-gray-100 dark:border-gray-700 last:border-b-0 ${
                  selectedUserId === user.id ? "bg-blue-50 dark:bg-blue-900/20" : ""
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
                {selectedUserId === user.id && (
                  <CheckIcon className="w-5 h-5 text-blue-600 dark:text-blue-400 flex-shrink-0" />
                )}
              </button>
            ))}
          </div>
        )}

        {/* No users available message */}
        {filteredUsers.length === 0 && searchInput.trim() && (
          <div className="px-4 py-3 text-sm text-gray-500 dark:text-gray-400 text-center border border-gray-200 dark:border-gray-600 rounded-lg">
            {t("assignModal.noResults")}
          </div>
        )}

        {filteredAvailableUsers.length === 0 && !searchInput.trim() && (
          <div className="px-4 py-4 text-center border border-gray-200 dark:border-gray-600 rounded-lg bg-gray-50 dark:bg-gray-700/50">
            <UserPlusIcon className="w-8 h-8 text-gray-400 dark:text-gray-500 mx-auto mb-2" />
            <p className="text-sm text-gray-600 dark:text-gray-400 mb-2">
              {t("assignModal.noUsersAvailable")}
            </p>
            {projectId && (
              <button
                type="button"
                onClick={() => {
                  onClose();
                  // Use setTimeout to ensure modal closes first, then change hash
                  setTimeout(() => {
                    window.location.hash = "settings";
                  }, 100);
                }}
                className="text-sm text-blue-600 hover:text-blue-700 dark:text-blue-400 dark:hover:text-blue-300 font-medium"
              >
                {t("assignModal.addMembersLink")}
              </button>
            )}
          </div>
        )}

        {/* Message field */}
        <FormTextarea
          id="assign-message"
          label={t("assignModal.message")}
          value={message}
          onChange={(e) => setMessage(e.target.value)}
          placeholder={t("assignModal.messagePlaceholder")}
          rows={3}
        />

        {/* Due date */}
        <FormInput
          id="due-date"
          type="date"
          label={t("assignModal.dueDate")}
          value={dueDate}
          onChange={(e) => setDueDate(e.target.value)}
          min={minDate}
        />

        {/* Send notification checkbox */}
        <label className="flex items-center gap-3 cursor-pointer">
          <input
            type="checkbox"
            checked={sendNotification}
            onChange={(e) => setSendNotification(e.target.checked)}
            className="w-4 h-4 text-blue-600 border-gray-300 rounded focus:ring-blue-500"
          />
          <span className="text-sm text-gray-700 dark:text-gray-300">
            {t("assignModal.sendNotification")}
          </span>
        </label>
      </div>
    </BaseModal>
  );
}
