"use client";

import { useState, useEffect } from "react";
import { useTranslations } from "next-intl";
import { PencilIcon } from "@heroicons/react/24/outline";
import BaseModal from "./BaseModal";
import FormInput from "@/app/components/ui/FormInput";
import RemarkForm from "@/app/components/forms/RemarkForm";
import PunchlistItemForm from "@/app/components/forms/PunchlistItemForm";
import { gaPinsApi } from "@/lib/api/ga-pins";
import { stageRemarksApi } from "@/lib/api/stage-remarks";
import { punchlistItemsApi } from "@/lib/api/punchlist-items";
import { useDecks } from "@/lib/api/decks";
import { useAreas } from "@/lib/api/areas";
import { useStages } from "@/lib/api/stages";
import { useProjectMembers } from "@/lib/api";
import type { GAPin, CreateGAPinRequest, UpdateGAPinRequest, PunchlistItemPriority } from "@/lib/api/types";

interface CreateGAPinModalProps {
  isOpen: boolean;
  onClose: () => void;
  projectId: string;
  initialPosition: { x: number; y: number } | null;
  initialData?: GAPin | null;
  onSuccess?: () => void;
}

const DEFAULT_COLORS = [
  "#3B82F6", // Blue
  "#EF4444", // Red
  "#10B981", // Green
  "#F59E0B", // Yellow
  "#8B5CF6", // Purple
  "#EC4899", // Pink
  "#06B6D4", // Cyan
  "#F97316", // Orange
];

export default function CreateGAPinModal({
  isOpen,
  onClose,
  projectId,
  initialPosition,
  initialData,
  onSuccess,
}: CreateGAPinModalProps) {
  const t = useTranslations("gaViewer");
  const isEditing = !!initialData;

  const [label, setLabel] = useState("");
  const [x, setX] = useState(50);
  const [y, setY] = useState(50);
  const [color, setColor] = useState(DEFAULT_COLORS[0]);

  // Cascading selection state
  const [selectedDeckId, setSelectedDeckId] = useState<string>("");
  const [selectedAreaId, setSelectedAreaId] = useState<string>("");
  const [selectedStageId, setSelectedStageId] = useState<string>("");

  // Edit mode: track which fields have been opened for editing
  const [editingFields, setEditingFields] = useState<Set<"deck" | "area" | "stage">>(new Set());

  // Optional remark or punchlist item (only for create mode)
  const [addRemarkOrPunchlist, setAddRemarkOrPunchlist] = useState(false);
  const [activeTab, setActiveTab] = useState<"remark" | "punchlist">("remark");
  const [remarkContent, setRemarkContent] = useState("");
  const [remarkFiles, setRemarkFiles] = useState<File[]>([]);
  const [punchlistTitle, setPunchlistTitle] = useState("");
  const [punchlistDescription, setPunchlistDescription] = useState("");
  const [punchlistPriority, setPunchlistPriority] = useState<PunchlistItemPriority>("medium");
  const [punchlistDueDate, setPunchlistDueDate] = useState("");
  const [punchlistAssignees, setPunchlistAssignees] = useState<string[]>([]);
  const [punchlistFiles, setPunchlistFiles] = useState<File[]>([]);

  // Fetch decks, areas, and stages
  const { data: decks } = useDecks(projectId);
  const { data: areas } = useAreas(projectId, selectedDeckId || undefined);
  const { data: stages } = useStages(projectId, selectedAreaId);
  const { data: projectMembers } = useProjectMembers(projectId);

  // Initialize form with data
  useEffect(() => {
    if (initialData) {
      setLabel(initialData.label || "");
      setX(initialData.x);
      setY(initialData.y);
      setColor(initialData.color || DEFAULT_COLORS[0]);
      setSelectedDeckId(initialData.deck.identifier);
      setSelectedAreaId(initialData.area.identifier);
      setSelectedStageId(initialData.stage.identifier);
    } else if (initialPosition) {
      setX(initialPosition.x);
      setY(initialPosition.y);
      setLabel("");
      setColor(DEFAULT_COLORS[0]);
      // Reset selections for new pin
      setSelectedDeckId("");
      setSelectedAreaId("");
      setSelectedStageId("");
    } else {
      setLabel("");
      setColor(DEFAULT_COLORS[0]);
      setSelectedDeckId("");
      setSelectedAreaId("");
      setSelectedStageId("");
    }
  }, [initialData, initialPosition]);

  // Auto-select if only one deck available
  useEffect(() => {
    if (!isEditing && decks && decks.length === 1 && !selectedDeckId) {
      setSelectedDeckId(decks[0].identifier);
    }
  }, [decks, isEditing, selectedDeckId]);

  // Auto-select if only one area available
  useEffect(() => {
    if (!isEditing && selectedDeckId && areas && areas.length === 1 && !selectedAreaId) {
      setSelectedAreaId(areas[0].identifier);
    }
  }, [areas, isEditing, selectedDeckId, selectedAreaId]);

  // Auto-select if only one stage available
  useEffect(() => {
    if (!isEditing && selectedAreaId && stages && stages.length === 1 && !selectedStageId) {
      setSelectedStageId(stages[0].identifier);
    }
  }, [stages, isEditing, selectedAreaId, selectedStageId]);

  // Check if selected stage is completed (disable punchlist if so)
  const selectedStage = stages?.find((s) => s.identifier === selectedStageId);
  const isStageCompleted = selectedStage?.status.name === "completed";

  // Handle deck selection change
  const handleDeckChange = (deckId: string) => {
    setSelectedDeckId(deckId);
    setSelectedAreaId(""); // Reset area selection
    setSelectedStageId(""); // Reset stage selection
    // In edit mode, auto-open area selection after deck change
    if (isEditing && editingFields.has("deck")) {
      setEditingFields((prev) => new Set([...prev, "area"]));
    }
  };

  // Handle area selection change
  const handleAreaChange = (areaId: string) => {
    setSelectedAreaId(areaId);
    setSelectedStageId(""); // Reset stage selection
    // In edit mode, auto-open stage selection after area change
    if (isEditing && editingFields.has("area")) {
      setEditingFields((prev) => new Set([...prev, "stage"]));
    }
  };

  // File handling for remarks
  const handleRemarkFileChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    const files = Array.from(e.target.files || []);
    const validFiles: File[] = [];
    const MAX_FILE_SIZE = 20 * 1024 * 1024; // 20MB

    for (const file of files) {
      if (file.size > MAX_FILE_SIZE) {
        alert(`${file.name}: Max 20MB`);
        continue;
      }
      validFiles.push(file);
    }

    setRemarkFiles((prev) => [...prev, ...validFiles]);
  };

  const removeRemarkFile = (index: number) => {
    setRemarkFiles((prev) => prev.filter((_, i) => i !== index));
  };

  // File handling for punchlist items
  const handlePunchlistFileChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    const files = Array.from(e.target.files || []);
    const validFiles: File[] = [];
    const MAX_FILE_SIZE = 20 * 1024 * 1024; // 20MB

    for (const file of files) {
      if (file.size > MAX_FILE_SIZE) {
        alert(`${file.name}: Max 20MB`);
        continue;
      }
      validFiles.push(file);
    }

    setPunchlistFiles((prev) => [...prev, ...validFiles]);
  };

  const removePunchlistFile = (index: number) => {
    setPunchlistFiles((prev) => prev.filter((_, i) => i !== index));
  };

  // Toggle assignee selection
  const toggleAssignee = (userId: string) => {
    setPunchlistAssignees((prev) =>
      prev.includes(userId)
        ? prev.filter((id) => id !== userId)
        : [...prev, userId]
    );
  };

  const handleSubmit = async () => {
    if (isEditing && initialData) {
      // Update existing pin
      const updateData: UpdateGAPinRequest = {
        stage_id: selectedStageId !== initialData.stage.identifier ? selectedStageId : undefined,
        label: label.trim() || undefined,
        x,
        y,
        color,
      };
      await gaPinsApi.update(projectId, initialData.identifier, updateData);
    } else {
      // Create new pin
      const createData: CreateGAPinRequest = {
        stage_id: selectedStageId,
        label: label.trim() || undefined,
        x,
        y,
        color,
      };
      await gaPinsApi.create(projectId, createData);

      // Create remark or punchlist item if checkbox is enabled
      if (addRemarkOrPunchlist) {
        // Create remark if provided
        if (remarkContent.trim()) {
          const newRemark = await stageRemarksApi.create(projectId, selectedStageId, {
            content: remarkContent.trim(),
          });

          // Upload attachments if any
          if (remarkFiles.length > 0) {
            for (const file of remarkFiles) {
              try {
                await stageRemarksApi.uploadAttachment(projectId, newRemark.identifier, file);
              } catch (error) {
                console.error(`Failed to upload ${file.name}:`, error);
              }
            }
          }
        }

        // Create punchlist item if provided (only if stage is not completed)
        if (!isStageCompleted && punchlistTitle.trim()) {
          const newItem = await punchlistItemsApi.create(projectId, selectedStageId, {
            title: punchlistTitle.trim(),
            description: punchlistDescription.trim() || undefined,
            priority: punchlistPriority,
            due_date: punchlistDueDate || undefined,
            assignee_ids: punchlistAssignees.length > 0 ? punchlistAssignees : undefined,
          });

          // Upload attachments if any
          if (punchlistFiles.length > 0) {
            for (const file of punchlistFiles) {
              try {
                await punchlistItemsApi.uploadAttachment(projectId, newItem.identifier, file);
              } catch (error) {
                console.error(`Failed to upload ${file.name}:`, error);
              }
            }
          }
        }
      }
    }
  };

  return (
    <BaseModal
      isOpen={isOpen}
      onClose={onClose}
      title={isEditing ? t("editPin") : t("addPin")}
      formId="ga-pin-form"
      onSubmit={handleSubmit}
      successMessage={isEditing ? t("updateSuccess") : t("createSuccess")}
      errorFallbackMessage={isEditing ? t("updateError") : t("createError")}
      onSuccessCallback={onSuccess}
      submitDisabled={!isEditing && !selectedStageId}
      size="md"
    >
      <div className="space-y-5">
        {/* Deck and Area Selection (side by side) */}
        <div className="grid grid-cols-2 gap-4">
          {/* Deck Selection */}
          <div>
            <label className="block text-sm font-medium text-gray-700 dark:text-gray-300 mb-2">
              {decks && decks.length === 1 ? t("deck") : t("selectDeck")}
            </label>
            {isEditing ? (
              // Edit mode: show text with optional edit icon
              decks && decks.length > 1 && editingFields.has("deck") ? (
                <select
                  id="deck"
                  value={selectedDeckId}
                  onChange={(e) => handleDeckChange(e.target.value)}
                  className="w-full px-3 py-2 border border-gray-300 dark:border-gray-600 rounded-lg bg-white dark:bg-gray-800 text-gray-900 dark:text-gray-100 focus:ring-2 focus:ring-blue-500 focus:border-blue-500"
                >
                  <option value="">{t("chooseDeck")}</option>
                  {decks?.map((deck) => (
                    <option key={deck.identifier} value={deck.identifier}>
                      {deck.name}
                    </option>
                  ))}
                </select>
              ) : (
                <div className="flex items-center gap-2">
                  <p className="text-gray-900 dark:text-gray-100 py-2 flex-1">
                    {decks?.find((d) => d.identifier === selectedDeckId)?.name || "-"}
                  </p>
                  {decks && decks.length > 1 && (
                    <button
                      type="button"
                      onClick={() => setEditingFields((prev) => new Set([...prev, "deck"]))}
                      className="p-2 text-gray-400 hover:text-blue-600 dark:hover:text-blue-400 transition-colors"
                      title={t("editPin")}
                    >
                      <PencilIcon className="w-4 h-4" />
                    </button>
                  )}
                </div>
              )
            ) : (
              // Create mode: show text for 1 option, dropdown for multiple
              decks && decks.length === 1 ? (
                <p className="text-gray-900 dark:text-gray-100 py-2">
                  {decks[0].name}
                </p>
              ) : (
                <select
                  id="deck"
                  value={selectedDeckId}
                  onChange={(e) => handleDeckChange(e.target.value)}
                  className="w-full px-3 py-2 border border-gray-300 dark:border-gray-600 rounded-lg bg-white dark:bg-gray-800 text-gray-900 dark:text-gray-100 focus:ring-2 focus:ring-blue-500 focus:border-blue-500"
                  required
                >
                  <option value="">{t("chooseDeck")}</option>
                  {decks?.map((deck) => (
                    <option key={deck.identifier} value={deck.identifier}>
                      {deck.name}
                    </option>
                  ))}
                </select>
              )
            )}
          </div>

          {/* Area Selection */}
          {selectedDeckId && (
            <div>
              <label className="block text-sm font-medium text-gray-700 dark:text-gray-300 mb-2">
                {areas && areas.length === 1 ? t("area") : t("selectArea")}
              </label>
              {isEditing ? (
                // Edit mode: show text with optional edit icon
                areas && areas.length > 1 && editingFields.has("area") ? (
                  <select
                    id="area"
                    value={selectedAreaId}
                    onChange={(e) => handleAreaChange(e.target.value)}
                    className="w-full px-3 py-2 border border-gray-300 dark:border-gray-600 rounded-lg bg-white dark:bg-gray-800 text-gray-900 dark:text-gray-100 focus:ring-2 focus:ring-blue-500 focus:border-blue-500"
                  >
                    <option value="">{t("chooseArea")}</option>
                    {areas?.map((area) => (
                      <option key={area.identifier} value={area.identifier}>
                        {area.name}
                      </option>
                    ))}
                  </select>
                ) : (
                  <div className="flex items-center gap-2">
                    <p className="text-gray-900 dark:text-gray-100 py-2 flex-1">
                      {areas?.find((a) => a.identifier === selectedAreaId)?.name || "-"}
                    </p>
                    {areas && areas.length > 1 && (
                      <button
                        type="button"
                        onClick={() => setEditingFields((prev) => new Set([...prev, "area"]))}
                        className="p-2 text-gray-400 hover:text-blue-600 dark:hover:text-blue-400 transition-colors"
                        title={t("editPin")}
                      >
                        <PencilIcon className="w-4 h-4" />
                      </button>
                    )}
                  </div>
                )
              ) : (
                // Create mode: show text for 1 option, dropdown for multiple
                areas && areas.length === 1 ? (
                  <p className="text-gray-900 dark:text-gray-100 py-2">
                    {areas[0].name}
                  </p>
                ) : (
                  <select
                    id="area"
                    value={selectedAreaId}
                    onChange={(e) => handleAreaChange(e.target.value)}
                    className="w-full px-3 py-2 border border-gray-300 dark:border-gray-600 rounded-lg bg-white dark:bg-gray-800 text-gray-900 dark:text-gray-100 focus:ring-2 focus:ring-blue-500 focus:border-blue-500"
                    required
                  >
                    <option value="">{t("chooseArea")}</option>
                    {areas?.map((area) => (
                      <option key={area.identifier} value={area.identifier}>
                        {area.name}
                      </option>
                    ))}
                  </select>
                )
              )}
            </div>
          )}
        </div>

        {/* Stage Selection */}
        {selectedAreaId && (
          <div>
            <label className="block text-sm font-medium text-gray-700 dark:text-gray-300 mb-2">
              {stages && stages.length === 1 ? t("stage") : t("selectStage")}
            </label>
            {isEditing ? (
              // Edit mode: show text with optional edit icon
              stages && stages.length > 1 && editingFields.has("stage") ? (
                <select
                  id="stage"
                  value={selectedStageId}
                  onChange={(e) => setSelectedStageId(e.target.value)}
                  className="w-full px-3 py-2 border border-gray-300 dark:border-gray-600 rounded-lg bg-white dark:bg-gray-800 text-gray-900 dark:text-gray-100 focus:ring-2 focus:ring-blue-500 focus:border-blue-500"
                >
                  <option value="">{t("chooseStage")}</option>
                  {stages?.map((stage) => (
                    <option key={stage.identifier} value={stage.identifier}>
                      {stage.name}
                    </option>
                  ))}
                </select>
              ) : (
                <div className="flex items-center gap-2">
                  <p className="text-gray-900 dark:text-gray-100 py-2 flex-1">
                    {stages?.find((s) => s.identifier === selectedStageId)?.name || "-"}
                  </p>
                  {stages && stages.length > 1 && (
                    <button
                      type="button"
                      onClick={() => setEditingFields((prev) => new Set([...prev, "stage"]))}
                      className="p-2 text-gray-400 hover:text-blue-600 dark:hover:text-blue-400 transition-colors"
                      title={t("editPin")}
                    >
                      <PencilIcon className="w-4 h-4" />
                    </button>
                  )}
                </div>
              )
            ) : (
              // Create mode: show text for 1 option, dropdown for multiple
              stages && stages.length === 1 ? (
                <p className="text-gray-900 dark:text-gray-100 py-2">
                  {stages[0].name}
                </p>
              ) : (
                <select
                  id="stage"
                  value={selectedStageId}
                  onChange={(e) => setSelectedStageId(e.target.value)}
                  className="w-full px-3 py-2 border border-gray-300 dark:border-gray-600 rounded-lg bg-white dark:bg-gray-800 text-gray-900 dark:text-gray-100 focus:ring-2 focus:ring-blue-500 focus:border-blue-500"
                  required
                >
                  <option value="">{t("chooseStage")}</option>
                  {stages?.map((stage) => (
                    <option key={stage.identifier} value={stage.identifier}>
                      {stage.name}
                    </option>
                  ))}
                </select>
              )
            )}
          </div>
        )}

        {/* Label and Color Picker (side by side) */}
        <div className="grid grid-cols-[1fr_auto] gap-4 items-start">
          {/* Label */}
          <FormInput
            id="label"
            label={t("pinLabel")}
            value={label}
            onChange={(e) => setLabel(e.target.value)}
            placeholder={t("pinLabelPlaceholder")}
          />

          {/* Color Picker */}
          <div className="pt-7">
            <input
              type="color"
              value={color}
              onChange={(e) => setColor(e.target.value)}
              className="w-16 h-10 rounded-lg border border-gray-300 dark:border-gray-600 cursor-pointer"
              title={t("pinColor")}
            />
          </div>
        </div>

        {/* Preview */}
        <div className="p-4 bg-gray-50 dark:bg-gray-700/50 rounded-lg">
          <p className="text-xs font-medium text-gray-700 dark:text-gray-300 mb-2">
            {t("preview")}
          </p>
          <div className="flex items-center gap-3">
            <div
              className="w-8 h-8 rounded-full border-4 border-white dark:border-gray-800 shadow-lg"
              style={{ backgroundColor: color }}
            />
            <p className="text-sm text-gray-600 dark:text-gray-400">
              {label || t("unnamedPin")}
            </p>
          </div>
        </div>

        {/* Optional Remark or Punchlist Item (Create mode only) */}
        {!isEditing && selectedStageId && (
          <div className="border-t border-gray-200 dark:border-gray-700 pt-5">
            {/* Checkbox */}
            <label className="flex items-center gap-2 cursor-pointer mb-4">
              <input
                type="checkbox"
                checked={addRemarkOrPunchlist}
                onChange={(e) => setAddRemarkOrPunchlist(e.target.checked)}
                className="rounded border-gray-300 dark:border-gray-600 text-blue-600 focus:ring-blue-500"
              />
              <span className="text-sm font-medium text-gray-700 dark:text-gray-300">
                {isStageCompleted ? t("addRemarkCheckbox") : t("addRemarkOrPunchlistCheckbox")}
              </span>
            </label>

            {/* Tabs and Content */}
            {addRemarkOrPunchlist && (
              <>
                {/* Tabs (only show if stage is NOT completed) */}
                {!isStageCompleted && (
                  <div className="flex border-b border-gray-200 dark:border-gray-700 mb-4">
                    <button
                      type="button"
                      onClick={() => setActiveTab("remark")}
                      className={`px-4 py-2 text-sm font-medium transition-colors ${
                        activeTab === "remark"
                          ? "border-b-2 border-blue-600 text-blue-600 dark:text-blue-400"
                          : "text-gray-600 dark:text-gray-400 hover:text-gray-900 dark:hover:text-gray-200"
                      }`}
                    >
                      {t("remarkTab")}
                    </button>
                    <button
                      type="button"
                      onClick={() => setActiveTab("punchlist")}
                      className={`px-4 py-2 text-sm font-medium transition-colors ${
                        activeTab === "punchlist"
                          ? "border-b-2 border-blue-600 text-blue-600 dark:text-blue-400"
                          : "text-gray-600 dark:text-gray-400 hover:text-gray-900 dark:hover:text-gray-200"
                      }`}
                    >
                      {t("punchlistTab")}
                    </button>
                  </div>
                )}

                {/* Tab Content */}
                <div className="space-y-4">
                  {isStageCompleted || activeTab === "remark" ? (
                    <RemarkForm
                      content={remarkContent}
                      onContentChange={setRemarkContent}
                      files={remarkFiles}
                      onFileChange={handleRemarkFileChange}
                      onFileRemove={removeRemarkFile}
                      translations={{
                        remarkContent: t("remarkContent"),
                        remarkPlaceholder: t("remarkPlaceholder"),
                        attachments: t("attachments"),
                        uploadAttachment: t("uploadAttachment"),
                        maxFileSize: "Max 20MB",
                      }}
                    />
                  ) : (
                    <PunchlistItemForm
                      title={punchlistTitle}
                      onTitleChange={setPunchlistTitle}
                      description={punchlistDescription}
                      onDescriptionChange={setPunchlistDescription}
                      priority={punchlistPriority}
                      onPriorityChange={setPunchlistPriority}
                      dueDate={punchlistDueDate}
                      onDueDateChange={setPunchlistDueDate}
                      assignees={punchlistAssignees}
                      onToggleAssignee={toggleAssignee}
                      files={punchlistFiles}
                      onFileChange={handlePunchlistFileChange}
                      onFileRemove={removePunchlistFile}
                      projectMembers={projectMembers || undefined}
                      translations={{
                        punchlistItemTitle: t("punchlistItemTitle"),
                        punchlistTitlePlaceholder: t("punchlistTitlePlaceholder"),
                        punchlistDescription: t("punchlistDescription"),
                        punchlistDescriptionPlaceholder: t("punchlistDescriptionPlaceholder"),
                        punchlistPriority: t("punchlistPriority"),
                        priorityLow: t("priorityLow"),
                        priorityMedium: t("priorityMedium"),
                        priorityHigh: t("priorityHigh"),
                        punchlistDueDate: t("punchlistDueDate"),
                        attachments: t("attachments"),
                        uploadAttachment: t("uploadAttachment"),
                        maxFileSize: "Max 20MB",
                        assignees: t("assignees"),
                      }}
                    />
                  )}
                </div>
              </>
            )}
          </div>
        )}
      </div>
    </BaseModal>
  );
}
