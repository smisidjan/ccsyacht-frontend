"use client";

import { useState, useEffect, useCallback } from "react";
import { useTranslations } from "next-intl";
import Modal from "@/app/components/ui/Modal";
import Button from "@/app/components/ui/Button";
import FormInput from "@/app/components/ui/FormInput";
import { GAViewerWithDraw, type DeckBounds, type ExistingDeck } from "@/app/features/ga";
import { decksApi } from "@/lib/api/decks";
import { useToast } from "@/app/context/ToastContext";
import { PencilIcon, TrashIcon } from "@heroicons/react/24/outline";
import type { Deck } from "@/lib/api/types";
import { handleError } from "@/lib/utils/errors";

interface PendingDeck {
  id: string;
  name: string;
  description: string;
  bounds: DeckBounds | null;
  isExisting?: boolean; // Track if this deck already exists in the database
}

// Fixed blue color for all decks
const DECK_COLOR = "#3B82F6";

// LocalStorage key prefix
const STORAGE_KEY_PREFIX = "ccs_deck_modal_";

interface CreateDeckModalProps {
  isOpen: boolean;
  onClose: () => void;
  projectId: string;
  onSuccess?: () => void;
  gaImageUrl?: string;
  gaImageWidth?: number;
  gaImageHeight?: number;
  existingDecks?: Deck[]; // Existing decks from API for edit mode
  editMode?: boolean; // True when viewing/editing existing decks
}

// Helper to convert API deck to internal PendingDeck format
function apiDeckToPendingDeck(deck: Deck): PendingDeck {
  const bounds: DeckBounds | null = deck.boundingBox
    ? {
        x1: deck.boundingBox.x,
        y1: deck.boundingBox.y,
        x2: deck.boundingBox.x + deck.boundingBox.width,
        y2: deck.boundingBox.y + deck.boundingBox.height,
      }
    : null;

  return {
    id: deck.identifier,
    name: deck.name,
    description: deck.description || "",
    bounds,
    isExisting: true,
  };
}

export default function CreateDeckModal({
  isOpen,
  onClose,
  projectId,
  onSuccess,
  gaImageUrl,
  gaImageWidth,
  gaImageHeight,
  existingDecks,
  editMode = false,
}: CreateDeckModalProps) {
  const t = useTranslations("decks");
  const tCommon = useTranslations("common");
  const { showToast } = useToast();

  // LocalStorage key specific to this project
  const storageKey = `${STORAGE_KEY_PREFIX}${projectId}`;

  // List of pending decks to be saved
  const [pendingDecks, setPendingDecks] = useState<PendingDeck[]>([]);

  // Currently editing deck ID (null = adding new)
  const [editingDeckId, setEditingDeckId] = useState<string | null>(null);

  // Form state for current deck
  const [name, setName] = useState("");
  const [description, setDescription] = useState("");
  const [bounds, setBounds] = useState<DeckBounds | null>(null);

  // Loading/error states
  const [isSubmitting, setIsSubmitting] = useState(false);
  const [error, setError] = useState<string | null>(null);

  // Check if we should show the GA preview
  const showGAPreview = !!(gaImageUrl && gaImageWidth && gaImageHeight);

  // Load data on mount - either from API (edit mode) or localStorage (create mode)
  useEffect(() => {
    if (isOpen) {
      if (editMode && existingDecks) {
        // Edit mode: load existing decks from API
        setPendingDecks(existingDecks.map(apiDeckToPendingDeck));
      } else {
        // Create mode: load from localStorage
        try {
          const saved = localStorage.getItem(storageKey);
          if (saved) {
            const data = JSON.parse(saved);
            if (data.pendingDecks && Array.isArray(data.pendingDecks)) {
              setPendingDecks(data.pendingDecks);
            }
          }
        } catch (e) {
          handleError(e, { severity: "console", context: "Loading deck data from localStorage" });
        }
      }
    }
  }, [isOpen, storageKey, editMode, existingDecks]);

  // Save to localStorage whenever pendingDecks changes (only in create mode)
  useEffect(() => {
    if (isOpen && !editMode && pendingDecks.length > 0) {
      try {
        localStorage.setItem(storageKey, JSON.stringify({ pendingDecks }));
      } catch (e) {
        handleError(e, { severity: "console", context: "Saving deck data to localStorage" });
      }
    }
  }, [pendingDecks, isOpen, storageKey, editMode]);

  // Reset form for new deck
  const resetForm = useCallback(() => {
    setName("");
    setDescription("");
    setBounds(null);
    setEditingDeckId(null);
    setError(null);
  }, []);

  // Add deck to list
  const handleAddDeck = () => {
    if (!name.trim()) return;

    if (editingDeckId) {
      // Update existing deck in list
      setPendingDecks((prev) =>
        prev.map((d) =>
          d.id === editingDeckId
            ? { ...d, name: name.trim(), description: description.trim(), bounds }
            : d
        )
      );
    } else {
      // Add new deck to list
      const newDeck: PendingDeck = {
        id: crypto.randomUUID(),
        name: name.trim(),
        description: description.trim(),
        bounds,
      };
      setPendingDecks((prev) => [...prev, newDeck]);
    }

    resetForm();
  };

  // Edit deck from list
  const handleEditDeck = (deck: PendingDeck) => {
    setEditingDeckId(deck.id);
    setName(deck.name);
    setDescription(deck.description);
    setBounds(deck.bounds);
  };

  // Remove deck from list
  const handleRemoveDeck = (deckId: string) => {
    setPendingDecks((prev) => prev.filter((d) => d.id !== deckId));
    if (editingDeckId === deckId) {
      resetForm();
    }
  };

  // Cancel editing (reset to add mode)
  const handleCancelEdit = () => {
    resetForm();
  };

  // Save all decks
  const handleSaveAll = async () => {
    if (pendingDecks.length === 0) return;

    setIsSubmitting(true);
    setError(null);

    try {
      // Process all decks sequentially
      for (const deck of pendingDecks) {
        // Convert bounds from (x1,y1,x2,y2) to (bbox_x, bbox_y, bbox_width, bbox_height)
        const bboxData = deck.bounds
          ? {
              bbox_x: deck.bounds.x1,
              bbox_y: deck.bounds.y1,
              bbox_width: deck.bounds.x2 - deck.bounds.x1,
              bbox_height: deck.bounds.y2 - deck.bounds.y1,
            }
          : {};

        if (deck.isExisting) {
          // Update existing deck
          await decksApi.update(projectId, deck.id, {
            name: deck.name,
            description: deck.description || undefined,
            ...bboxData,
          });
        } else {
          // Create new deck
          await decksApi.create(projectId, {
            name: deck.name,
            description: deck.description || undefined,
            ...bboxData,
          });
        }
      }

      // Clear localStorage after successful save (only in create mode)
      if (!editMode) {
        localStorage.removeItem(storageKey);
      }

      showToast("success", editMode ? t("decksUpdatedSuccess") : t("decksCreatedSuccess", { count: pendingDecks.length }));
      setPendingDecks([]);
      resetForm();
      onSuccess?.();
      onClose();
    } catch (err) {
      setError(err instanceof Error ? err.message : editMode ? t("updateError") : t("createError"));
    } finally {
      setIsSubmitting(false);
    }
  };

  // Handle close - don't clear data, it's saved in localStorage
  const handleClose = () => {
    resetForm();
    onClose();
  };

  // Clear all data (explicit action) - only in create mode
  const handleClearAll = () => {
    if (editMode) return; // Don't allow clearing in edit mode
    setPendingDecks([]);
    resetForm();
    localStorage.removeItem(storageKey);
  };

  // Convert pending decks to ExistingDeck format for the viewer
  const existingDecksForViewer: ExistingDeck[] = pendingDecks
    .filter((d) => d.bounds !== null && d.id !== editingDeckId)
    .map((d) => ({
      id: d.id,
      name: d.name,
      color: DECK_COLOR,
      bounds: d.bounds!,
    }));

  // Handle clicking a deck on the viewer
  const handleDeckClick = (deckId: string) => {
    const deck = pendingDecks.find((d) => d.id === deckId);
    if (deck) {
      handleEditDeck(deck);
    }
  };

  return (
    <Modal
      isOpen={isOpen}
      onClose={handleClose}
      title={editMode ? t("manageDecks") : t("defineDecks")}
      size="2xl"
      error={error}
      actions={[
        {
          label: tCommon("close"),
          onClick: handleClose,
          variant: "secondary",
        },
        {
          label: editMode ? t("saveChanges") : t("saveAllDecks", { count: pendingDecks.length }),
          onClick: handleSaveAll,
          variant: "primary",
          disabled: pendingDecks.length === 0 || isSubmitting,
          loading: isSubmitting,
        },
      ]}
    >
      <div className="flex gap-6">
        {/* Left: GA Preview */}
        {showGAPreview && (
          <div className="w-1/2 flex-shrink-0">
            <p className="text-sm font-medium text-gray-700 dark:text-gray-300 mb-2">
              {t("deckLocation")}
            </p>
            <p className="text-xs text-gray-500 dark:text-gray-400 mb-3">
              {t("markDeckArea")}
            </p>
            <div
              className="h-[800px]"
              style={{
                width: gaImageWidth && gaImageHeight
                  ? `${800 * (gaImageWidth / gaImageHeight)}px`
                  : "100%",
                maxWidth: "100%",
              }}
            >
              <GAViewerWithDraw
                imageUrl={gaImageUrl}
                imageWidth={gaImageWidth}
                imageHeight={gaImageHeight}
                color={DECK_COLOR}
                bounds={bounds}
                onBoundsChange={setBounds}
                existingDecks={existingDecksForViewer}
                selectedDeckId={editingDeckId}
                onDeckClick={handleDeckClick}
              />
            </div>
          </div>
        )}

        {/* Right: Form and list */}
        <div className={showGAPreview ? "w-1/2 flex flex-col" : "flex-1"}>
          {/* Form */}
          <div className="mb-4">
            <h3 className="text-sm font-medium text-gray-700 dark:text-gray-300 mb-3">
              {editingDeckId ? t("editDeck") : t("addNewDeck")}
            </h3>
            <div className="space-y-4">
              <FormInput
                id="deck-name"
                label={t("name")}
                value={name}
                onChange={(e) => setName(e.target.value)}
                placeholder={t("namePlaceholder")}
                required
              />
              <FormInput
                id="deck-description"
                label={t("description")}
                value={description}
                onChange={(e) => setDescription(e.target.value)}
                placeholder={t("descriptionPlaceholder")}
              />
            </div>
            <div className="flex gap-2 mt-4">
              <Button
                onClick={handleAddDeck}
                disabled={!name.trim()}
                variant="secondary"
              >
                {editingDeckId ? t("updateDeck") : t("addDeck")}
              </Button>
              {editingDeckId && (
                <Button onClick={handleCancelEdit} variant="ghost">
                  {tCommon("cancel")}
                </Button>
              )}
            </div>
          </div>

          {/* Divider */}
          <hr className="border-gray-200 dark:border-gray-700 my-4" />

          {/* Decks list */}
          <div className="flex-1 overflow-auto">
            <div className="flex items-center justify-between mb-3">
              <h3 className="text-sm font-medium text-gray-700 dark:text-gray-300">
                {editMode ? t("decks") : t("addedDecks")} ({pendingDecks.length})
              </h3>
              {!editMode && pendingDecks.length > 0 && (
                <button
                  type="button"
                  onClick={handleClearAll}
                  className="text-xs text-red-600 dark:text-red-400 hover:underline"
                >
                  {tCommon("clearAll")}
                </button>
              )}
            </div>
            {pendingDecks.length === 0 ? (
              <p className="text-sm text-gray-500 dark:text-gray-400 italic">
                {editMode ? t("noDecks") : t("noDecksAdded")}
              </p>
            ) : (
              <ul className="space-y-2">
                {pendingDecks.map((deck) => (
                  <li
                    key={deck.id}
                    className={`flex items-center justify-between p-3 rounded-lg border ${
                      editingDeckId === deck.id
                        ? "border-blue-500 bg-blue-50 dark:bg-blue-900/20"
                        : "border-gray-200 dark:border-gray-700 bg-gray-50 dark:bg-gray-800"
                    }`}
                  >
                    <div className="flex items-center gap-3">
                      <div
                        className="w-4 h-4 rounded-full flex-shrink-0"
                        style={{ backgroundColor: DECK_COLOR }}
                      />
                      <div>
                        <p className="text-sm font-medium text-gray-900 dark:text-white">
                          {deck.name}
                        </p>
                        {deck.description && (
                          <p className="text-xs text-gray-500 dark:text-gray-400 truncate max-w-[180px]">
                            {deck.description}
                          </p>
                        )}
                      </div>
                    </div>
                    <div className="flex items-center gap-1">
                      <button
                        type="button"
                        onClick={() => handleEditDeck(deck)}
                        className="p-1.5 text-gray-500 hover:text-blue-600 dark:text-gray-400 dark:hover:text-blue-400 transition-colors"
                        title={tCommon("edit")}
                      >
                        <PencilIcon className="w-4 h-4" />
                      </button>
                      <button
                        type="button"
                        onClick={() => handleRemoveDeck(deck.id)}
                        className="p-1.5 text-gray-500 hover:text-red-600 dark:text-gray-400 dark:hover:text-red-400 transition-colors"
                        title={tCommon("remove")}
                      >
                        <TrashIcon className="w-4 h-4" />
                      </button>
                    </div>
                  </li>
                ))}
              </ul>
            )}
          </div>
        </div>
      </div>
    </Modal>
  );
}
