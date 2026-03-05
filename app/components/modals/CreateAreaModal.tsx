"use client";

import { useState, useEffect } from "react";
import { useTranslations } from "next-intl";
import BaseModal from "./BaseModal";
import FormInput from "@/app/components/ui/FormInput";
import FormTextarea from "@/app/components/ui/FormTextarea";
import FormSelect from "@/app/components/ui/FormSelect";
import Alert from "@/app/components/ui/Alert";
import { areasApi, decksApi, useDecks } from "@/lib/api";
import type { CreateAreaRequest, CreateDeckRequest } from "@/lib/api/types";

interface CreateAreaModalProps {
  isOpen: boolean;
  onClose: () => void;
  projectId: string;
  onSuccess?: () => void;
}

export default function CreateAreaModal({
  isOpen,
  onClose,
  projectId,
  onSuccess,
}: CreateAreaModalProps) {
  const t = useTranslations("areas");
  const { data: decks, loading: decksLoading } = useDecks(projectId);

  const [areaName, setAreaName] = useState("");
  const [areaDescription, setAreaDescription] = useState("");
  const [areaPosition, setAreaPosition] = useState("1");
  const [deckOption, setDeckOption] = useState<"existing" | "new">("existing");
  const [selectedDeckId, setSelectedDeckId] = useState("");
  const [newDeckName, setNewDeckName] = useState("");
  const [newDeckDescription, setNewDeckDescription] = useState("");
  const [newDeckPosition, setNewDeckPosition] = useState("1");

  // Reset form when modal opens
  useEffect(() => {
    if (isOpen) {
      setAreaName("");
      setAreaDescription("");
      setAreaPosition("1");
      setDeckOption("existing");
      setSelectedDeckId("");
      setNewDeckName("");
      setNewDeckDescription("");
      setNewDeckPosition("1");
    }
  }, [isOpen]);

  // Auto-select first deck if available
  useEffect(() => {
    if (decks && decks.length > 0 && !selectedDeckId && deckOption === "existing") {
      setSelectedDeckId(decks[0].identifier);
    }
  }, [decks, selectedDeckId, deckOption]);

  const handleSubmit = async () => {
    let deckId = selectedDeckId;

    // If creating a new deck, create it first
    if (deckOption === "new") {
      const deckData: CreateDeckRequest = {
        name: newDeckName,
        description: newDeckDescription || undefined,
        sort_order: parseInt(newDeckPosition, 10),
      };
      const newDeck = await decksApi.create(projectId, deckData);
      deckId = newDeck.identifier;
    }

    // Create the area
    const areaData: CreateAreaRequest = {
      name: areaName,
      description: areaDescription || undefined,
      sort_order: parseInt(areaPosition, 10),
    };

    await areasApi.create(projectId, deckId, areaData);
    onSuccess?.();
  };

  const deckOptions = [
    ...(decks || []).map((deck) => ({
      value: deck.identifier,
      label: deck.name,
    })),
  ];

  return (
    <BaseModal
      isOpen={isOpen}
      onClose={onClose}
      title={t("createAreaTitle")}
      size="md"
      formId="create-area-form"
      onSubmit={handleSubmit}
      successMessage={t("areaCreatedSuccess")}
      errorFallbackMessage={t("areaCreatedError")}
    >
      <div className="space-y-4">
        {/* Area Details */}
        <div>
          <h3 className="text-sm font-semibold text-gray-900 dark:text-white mb-3">
            {t("areaDetails")}
          </h3>

          <div className="space-y-4">
            <FormInput
              id="area-name"
              label={t("areaName")}
              value={areaName}
              onChange={(e) => setAreaName(e.target.value)}
              required
              placeholder={t("areaNamePlaceholder")}
            />

            <FormTextarea
              id="area-description"
              label={t("areaDescription")}
              value={areaDescription}
              onChange={(e) => setAreaDescription(e.target.value)}
              rows={3}
              placeholder={t("areaDescriptionPlaceholder")}
            />

            <FormInput
              id="area-position"
              type="number"
              label={t("position")}
              value={areaPosition}
              onChange={(e) => setAreaPosition(e.target.value)}
              required
              min="1"
              hint={t("positionHint")}
            />
          </div>
        </div>

        {/* Deck Selection */}
        <div className="pt-4 border-t border-gray-200 dark:border-gray-700">
          <h3 className="text-sm font-semibold text-gray-900 dark:text-white mb-3">
            {t("deckSelection")}
          </h3>

          {decksLoading && (
            <div className="animate-pulse">
              <div className="h-10 bg-gray-200 dark:bg-gray-700 rounded" />
            </div>
          )}

          {!decksLoading && (
            <>
              <div className="flex gap-4 mb-4">
                <label className="flex items-center">
                  <input
                    type="radio"
                    name="deck-option"
                    value="existing"
                    checked={deckOption === "existing"}
                    onChange={() => setDeckOption("existing")}
                    className="mr-2"
                    disabled={!decks || decks.length === 0}
                  />
                  <span className="text-sm text-gray-700 dark:text-gray-300">
                    {t("selectExistingDeck")}
                  </span>
                </label>

                <label className="flex items-center">
                  <input
                    type="radio"
                    name="deck-option"
                    value="new"
                    checked={deckOption === "new"}
                    onChange={() => setDeckOption("new")}
                    className="mr-2"
                  />
                  <span className="text-sm text-gray-700 dark:text-gray-300">
                    {t("createNewDeck")}
                  </span>
                </label>
              </div>

              {deckOption === "existing" && (
                <>
                  {decks && decks.length > 0 ? (
                    <FormSelect
                      id="deck-select"
                      label={t("selectDeck")}
                      value={selectedDeckId}
                      onChange={(e) => setSelectedDeckId(e.target.value)}
                      options={deckOptions}
                      required
                    />
                  ) : (
                    <Alert
                      type="info"
                      message={t("noDecksAvailable")}
                    />
                  )}
                </>
              )}

              {deckOption === "new" && (
                <div className="space-y-4 p-4 bg-gray-50 dark:bg-gray-800 rounded-lg">
                  <FormInput
                    id="new-deck-name"
                    label={t("deckName")}
                    value={newDeckName}
                    onChange={(e) => setNewDeckName(e.target.value)}
                    required
                    placeholder={t("deckNamePlaceholder")}
                  />

                  <FormTextarea
                    id="new-deck-description"
                    label={t("deckDescription")}
                    value={newDeckDescription}
                    onChange={(e) => setNewDeckDescription(e.target.value)}
                    rows={2}
                    placeholder={t("deckDescriptionPlaceholder")}
                  />

                  <FormInput
                    id="new-deck-position"
                    type="number"
                    label={t("position")}
                    value={newDeckPosition}
                    onChange={(e) => setNewDeckPosition(e.target.value)}
                    required
                    min="1"
                    hint={t("positionHint")}
                  />
                </div>
              )}
            </>
          )}
        </div>
      </div>
    </BaseModal>
  );
}
