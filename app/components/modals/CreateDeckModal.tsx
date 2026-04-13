"use client";

import { useState, useEffect } from "react";
import { useTranslations } from "next-intl";
import Modal from "@/app/components/ui/Modal";
import DeckForm from "@/app/components/forms/DeckForm";
import GAPreview from "@/app/components/ga/GAPreview";
import { decksApi, useDecks } from "@/lib/api/decks";
import { useModalForm } from "@/lib/hooks/useModalForm";
import type { Deck } from "@/lib/api/types";

interface CreateDeckModalProps {
  isOpen: boolean;
  onClose: () => void;
  projectId: string;
  onSuccess?: () => void;
  // GA Image props for preview
  gaImageUrl?: string;
  gaImageWidth?: number;
  gaImageHeight?: number;
}

export default function CreateDeckModal({
  isOpen,
  onClose,
  projectId,
  onSuccess,
  gaImageUrl,
  gaImageWidth,
  gaImageHeight,
}: CreateDeckModalProps) {
  const t = useTranslations("decks");
  const tCommon = useTranslations("common");

  // Form state
  const [name, setName] = useState("");
  const [description, setDescription] = useState("");
  const [color, setColor] = useState("#3B82F6");

  // Position state for marking on GA
  const [x, setX] = useState(50);
  const [y, setY] = useState(50);

  const modal = useModalForm<Deck>({
    onSubmit: async (_, deck) => {
      if (deck) {
        await decksApi.update(projectId, deck.identifier, {
          name: name.trim(),
          description: description.trim() || undefined,
        });
      } else {
        await decksApi.create(projectId, {
          name: name.trim(),
          description: description.trim() || undefined,
        });
      }
      onSuccess?.();
    },
    resetForm: () => {
      setName("");
      setDescription("");
      setColor("#3B82F6");
      setX(50);
      setY(50);
    },
    populateForm: (deck) => {
      setName(deck.name);
      setDescription(deck.description || "");
    },
    successMessages: {
      create: t("createSuccess"),
      update: t("updateSuccess"),
    },
  });

  // Sync external isOpen with internal modal state
  useEffect(() => {
    if (isOpen && !modal.isOpen) {
      modal.openCreate();
    } else if (!isOpen && modal.isOpen) {
      modal.close();
    }
  }, [isOpen]);

  // Handle close
  const handleClose = () => {
    modal.close();
    onClose();
  };

  // Handle position change from dragging marker in preview
  const handlePositionChange = (newX: number, newY: number) => {
    setX(newX);
    setY(newY);
  };

  // Check if we should show the GA preview
  const showGAPreview = !!(gaImageUrl && gaImageWidth && gaImageHeight);

  return (
    <Modal
      isOpen={isOpen}
      onClose={handleClose}
      title={modal.isEditMode ? t("editDeck") : t("createDeck")}
      size={showGAPreview ? "2xl" : "md"}
      isForm={true}
      formId="deck-form"
      onSubmit={() => modal.submit({})}
      error={modal.error}
      actions={[
        {
          label: tCommon("cancel"),
          onClick: handleClose,
          variant: "secondary",
        },
        {
          label: modal.isEditMode ? tCommon("save") : t("createDeck"),
          type: "submit",
          variant: "primary",
          disabled: !name.trim(),
        },
      ]}
    >
      <div className={showGAPreview ? "flex gap-6" : ""}>
        {/* Left: GA Preview */}
        {showGAPreview && (
          <div className="w-1/2 flex-shrink-0">
            <p className="text-sm font-medium text-gray-700 dark:text-gray-300 mb-2">
              {t("deckLocation")}
            </p>
            <p className="text-xs text-gray-500 dark:text-gray-400 mb-3">
              {t("markDeckArea")}
            </p>
            <div className="h-[400px]">
              <GAPreview
                imageUrl={gaImageUrl}
                imageWidth={gaImageWidth}
                imageHeight={gaImageHeight}
                x={x}
                y={y}
                color={color}
                onPositionChange={handlePositionChange}
              />
            </div>
          </div>
        )}

        {/* Right: Form fields */}
        <div className={showGAPreview ? "w-1/2" : ""}>
          <DeckForm
            name={name}
            description={description}
            color={color}
            onNameChange={setName}
            onDescriptionChange={setDescription}
            onColorChange={setColor}
            translations={{
              name: t("name"),
              namePlaceholder: t("namePlaceholder"),
              description: t("description"),
              descriptionPlaceholder: t("descriptionPlaceholder"),
              color: t("color"),
            }}
          />
        </div>
      </div>
    </Modal>
  );
}
