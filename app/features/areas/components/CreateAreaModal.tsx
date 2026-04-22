"use client";

import { useState, useEffect } from "react";
import { useTranslations } from "next-intl";
import BaseModal from "@/app/components/modals/BaseModal";
import FormInput from "@/app/components/ui/FormInput";
import FormTextarea from "@/app/components/ui/FormTextarea";
import SelectOrCreateSection from "@/app/components/ui/SelectOrCreateSection";
import { areasApi, decksApi, useDecks } from "@/lib/api";
import { areaTemplatesApi } from "@/lib/api/area-templates";
import type { CreateAreaRequest, CreateDeckRequest, AreaTemplate } from "@/lib/api/types";

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

  const [areaTemplates, setAreaTemplates] = useState<AreaTemplate[]>([]);
  const [areaOption, setAreaOption] = useState<"template" | "new">("template");
  const [selectedTemplateId, setSelectedTemplateId] = useState("");
  const [areaName, setAreaName] = useState("");
  const [areaDescription, setAreaDescription] = useState("");
  const [deckOption, setDeckOption] = useState<"existing" | "new">("existing");
  const [selectedDeckId, setSelectedDeckId] = useState("");
  const [newDeckName, setNewDeckName] = useState("");
  const [newDeckDescription, setNewDeckDescription] = useState("");

  // Load area templates
  useEffect(() => {
    if (isOpen) {
      loadTemplates();
    }
  }, [isOpen]);

  const loadTemplates = async () => {
    try {
      const response = await areaTemplatesApi.getAll({ active_only: true });
      setAreaTemplates(response.data || []);
    } catch (error) {
      console.error("Failed to load area templates:", error);
      setAreaTemplates([]);
    }
  };

  // Handle template selection
  useEffect(() => {
    if (selectedTemplateId && areaOption === "template") {
      const template = areaTemplates.find((t) => t.identifier === selectedTemplateId);
      if (template) {
        setAreaName(template.name);
        setAreaDescription(template.description || "");
      }
    }
  }, [selectedTemplateId, areaTemplates, areaOption]);

  // Reset form when modal opens
  useEffect(() => {
    if (isOpen) {
      setAreaOption("template");
      setSelectedTemplateId("");
      setAreaName("");
      setAreaDescription("");
      setDeckOption("existing");
      setSelectedDeckId("");
      setNewDeckName("");
      setNewDeckDescription("");
    }
  }, [isOpen]);

  // Auto-select first template if available
  useEffect(() => {
    if (areaTemplates && areaTemplates.length > 0 && !selectedTemplateId && areaOption === "template") {
      setSelectedTemplateId(areaTemplates[0].identifier);
    }
  }, [areaTemplates, selectedTemplateId, areaOption]);

  // Clear form fields when switching to "new" mode
  useEffect(() => {
    if (areaOption === "new") {
      setAreaName("");
      setAreaDescription("");
    }
  }, [areaOption]);

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
      };
      const newDeck = await decksApi.create(projectId, deckData);
      deckId = newDeck.identifier;
    }

    // Create the area
    const areaData: CreateAreaRequest = {
      name: areaName.trim(),
      description: areaDescription.trim() || undefined,
    };

    await areasApi.create(projectId, deckId, areaData);
    onSuccess?.();
  };

  const templateOptions = [
    ...(areaTemplates || []).map((template) => ({
      value: template.identifier,
      label: template.description
        ? `${template.name} - ${template.description}`
        : template.name,
    })),
  ];

  const deckOptions = [
    ...(decks || []).map((deck) => ({
      value: deck.identifier,
      label: deck.description
        ? `${deck.name} - ${deck.description}`
        : deck.name,
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
        {/* Area Selection */}
        <div>
          <SelectOrCreateSection
            title={t("areaSelection")}
            mode={areaOption}
            onModeChange={(mode) => setAreaOption(mode)}
            selectLabel={t("areaFromTemplate")}
            createLabel={t("createNewArea")}
            selectModeValue="template"
            selectDropdownLabel={t("selectArea")}
            selectDropdownValue={selectedTemplateId}
            selectDropdownOptions={templateOptions}
            onSelectChange={(value) => setSelectedTemplateId(value)}
            selectRequired={true}
            selectDisabled={!areaTemplates || areaTemplates.length === 0}
            noItemsMessage={t("noAreaTemplatesAvailable")}
            createFormContent={
              <>
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
              </>
            }
          />
        </div>

        {/* Deck Selection */}
        <div className="pt-4 border-t border-gray-200 dark:border-gray-700">
          {decksLoading ? (
            <div className="animate-pulse">
              <div className="h-10 bg-gray-200 dark:bg-gray-700 rounded" />
            </div>
          ) : (
            <SelectOrCreateSection
              title={t("deckSelection")}
              mode={deckOption}
              onModeChange={(mode) => setDeckOption(mode)}
              selectLabel={t("selectExistingDeck")}
              createLabel={t("createNewDeck")}
              selectDropdownLabel={t("selectDeck")}
              selectDropdownValue={selectedDeckId}
              selectDropdownOptions={deckOptions}
              onSelectChange={(value) => setSelectedDeckId(value)}
              selectRequired={true}
              selectDisabled={!decks || decks.length === 0}
              noItemsMessage={t("noDecksAvailable")}
              createFormContent={
                <>
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
                </>
              }
            />
          )}
        </div>
      </div>
    </BaseModal>
  );
}
