import { useState } from "react";
import { useToast } from "@/app/context/ToastContext";

interface UseModalFormOptions<T extends { identifier?: string } | { id?: string }> {
  onSubmit: (data: any, item?: T) => Promise<void>;
  onDelete?: (item: T) => Promise<void>;
  resetForm: () => void;
  populateForm?: (item: T) => void;
  successMessages?: {
    create?: string;
    update?: string;
    delete?: string;
  };
}

export function useModalForm<T extends { identifier?: string } | { id?: string }>(
  options: UseModalFormOptions<T>
) {
  const { onSubmit, onDelete, resetForm, populateForm, successMessages = {} } = options;
  const { showToast } = useToast();

  const [isOpen, setIsOpen] = useState(false);
  const [selectedItem, setSelectedItem] = useState<T | null>(null);
  const [error, setError] = useState<string | null>(null);

  const isEditMode = !!selectedItem;

  const openCreate = () => {
    setSelectedItem(null);
    resetForm();
    setError(null);
    setIsOpen(true);
  };

  const openEdit = (item: T) => {
    setSelectedItem(item);
    if (populateForm) {
      populateForm(item);
    }
    setError(null);
    setIsOpen(true);
  };

  const close = () => {
    setIsOpen(false);
    setSelectedItem(null);
    setError(null);
  };

  const submit = async (formData: any) => {
    setError(null);

    try {
      await onSubmit(formData, selectedItem || undefined);

      if (selectedItem && successMessages.update) {
        showToast("success", successMessages.update);
      } else if (!selectedItem && successMessages.create) {
        showToast("success", successMessages.create);
      }

      close();
    } catch (err) {
      const errorMessage = err instanceof Error ? err.message : "An error occurred";
      setError(errorMessage);
      throw err;
    }
  };

  const deleteItem = async (item: T) => {
    if (!onDelete) return;

    try {
      await onDelete(item);
      if (successMessages.delete) {
        showToast("success", successMessages.delete);
      }
    } catch (err) {
      const errorMessage = err instanceof Error ? err.message : "Failed to delete";
      showToast("error", errorMessage);
      throw err;
    }
  };

  return {
    // State
    isOpen,
    selectedItem,
    isEditMode,
    error,

    // Actions
    openCreate,
    openEdit,
    close,
    submit,
    deleteItem,
  };
}
