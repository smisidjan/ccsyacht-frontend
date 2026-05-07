"use client";

import { useEffect, useMemo, useState } from "react";
import dynamic from "next/dynamic";
import { useTranslations } from "next-intl";
import Modal from "@/app/components/ui/Modal";
import FormSelect from "@/app/components/ui/FormSelect";
import FormInput from "@/app/components/ui/FormInput";
import FormTextarea from "@/app/components/ui/FormTextarea";
import Button from "@/app/components/ui/Button";
import Alert from "@/app/components/ui/Alert";
import { areasApi, useAreas, useDecks } from "@/lib/api";
import { useGAImage } from "@/lib/hooks/useGAImage";
import type {
  AreaPolygonPoint,
  GeneralArrangement,
  ApiError,
} from "@/lib/api/types";

// Lazy: AreaPolygonDrawer pulls in the leaflet bundle. Keep it out of routes
// that don't open this modal.
const AreaPolygonDrawer = dynamic(() => import("./AreaPolygonDrawer"), {
  ssr: false,
});

interface CreateAndDefineAreaModalProps {
  isOpen: boolean;
  onClose: () => void;
  projectId: string;
  generalArrangement: GeneralArrangement | undefined;
  onSuccess?: () => void;
}

export default function CreateAndDefineAreaModal({
  isOpen,
  onClose,
  projectId,
  generalArrangement,
  onSuccess,
}: CreateAndDefineAreaModalProps) {
  const t = useTranslations("areas");
  const { data: decks, loading: decksLoading } = useDecks(projectId);

  // The GA image is auth-gated, so we fetch it through the same flow that
  // OverviewTab + the deck-define modal already use: rewrite the URL to a
  // proxy pathname, then resolve to a blob URL via useGAImage.
  const gaImageUrl = useMemo(() => {
    if (!generalArrangement?.imageUrl) return undefined;
    const apiBase = process.env.NEXT_PUBLIC_API_URL || "/api";
    return apiBase.startsWith("/")
      ? new URL(generalArrangement.imageUrl).pathname
      : generalArrangement.imageUrl;
  }, [generalArrangement?.imageUrl]);
  const { imageBlobUrl: gaBlobUrl } = useGAImage(gaImageUrl);

  const [selectedDeckId, setSelectedDeckId] = useState("");
  const [polygon, setPolygon] = useState<AreaPolygonPoint[]>([]);
  const [isClosed, setIsClosed] = useState(false);
  const [name, setName] = useState("");
  const [description, setDescription] = useState("");
  const [error, setError] = useState<string | null>(null);
  const [submitting, setSubmitting] = useState(false);

  // Reset everything when the modal opens. Avoids leftover state from a
  // previous create.
  useEffect(() => {
    if (!isOpen) return;
    setSelectedDeckId("");
    setPolygon([]);
    setIsClosed(false);
    setName("");
    setDescription("");
    setError(null);
  }, [isOpen]);

  // Picking a different deck clears any in-progress polygon — the user is
  // starting over for that region.
  useEffect(() => {
    setPolygon([]);
    setIsClosed(false);
  }, [selectedDeckId]);

  const selectedDeck = useMemo(
    () => decks?.find((d) => d.identifier === selectedDeckId),
    [decks, selectedDeckId]
  );

  const { data: existingAreasInDeck } = useAreas(projectId, selectedDeckId);

  const deckOptions = useMemo(
    () => [
      { value: "", label: t("selectDeckPlaceholder") },
      ...(decks ?? []).map((d) => ({ value: d.identifier, label: d.name })),
    ],
    [decks, t]
  );

  // Map existing areas (with polygons) to the drawer format.
  const existingAreasForDrawer = useMemo(
    () =>
      (existingAreasInDeck ?? [])
        .filter((a) => Array.isArray(a.polygon) && a.polygon.length >= 3)
        .map((a) => ({
          id: a.identifier,
          name: a.name,
          polygon: a.polygon!,
        })),
    [existingAreasInDeck]
  );

  const deckBounds = useMemo(() => {
    const bb = selectedDeck?.boundingBox;
    if (!bb) return null;
    return {
      x1: bb.x,
      y1: bb.y,
      x2: bb.x + bb.width,
      y2: bb.y + bb.height,
    };
  }, [selectedDeck]);

  const canSave =
    !!selectedDeckId && isClosed && polygon.length >= 3 && name.trim().length > 0;

  const handleReset = () => {
    setPolygon([]);
    setIsClosed(false);
  };

  const handleSave = async () => {
    if (!canSave || !selectedDeckId) return;
    setError(null);
    setSubmitting(true);
    try {
      await areasApi.create(projectId, selectedDeckId, {
        name: name.trim(),
        description: description.trim() || undefined,
        polygon,
      });
      onSuccess?.();
      onClose();
    } catch (e) {
      const apiError = e as ApiError | undefined;
      setError(apiError?.message ?? t("areaCreatedError"));
    } finally {
      setSubmitting(false);
    }
  };

  const ga = generalArrangement;
  const hasGA = !!gaBlobUrl && !!ga?.imageWidth && !!ga?.imageHeight;

  // Drawing-state hint shown beneath the form fields.
  const drawingHint = (() => {
    if (!selectedDeckId) return t("hintSelectDeck");
    if (polygon.length === 0) return t("hintStartDrawing");
    if (polygon.length < 3) return t("hintAddMoreVertices");
    if (!isClosed) return t("hintClosePolygon");
    return t("hintPolygonReady");
  })();

  return (
    <Modal
      isOpen={isOpen}
      onClose={onClose}
      title={t("createAndDefineAreaTitle")}
      size="2xl"
      disableBackdropClick
    >
      <div className="flex flex-col md:flex-row gap-0 md:gap-4 h-[70vh]">
        {/* Left: GA viewer */}
        <div className="relative flex-1 min-h-[300px] bg-gray-50 dark:bg-gray-900 rounded-lg overflow-hidden border border-gray-200 dark:border-gray-700">
          {hasGA && selectedDeckId ? (
            <AreaPolygonDrawer
              imageUrl={gaBlobUrl!}
              imageWidth={ga!.imageWidth!}
              imageHeight={ga!.imageHeight!}
              deckBounds={deckBounds ?? undefined}
              existingAreas={existingAreasForDrawer}
              polygon={polygon}
              isClosed={isClosed}
              onChange={(p, c) => {
                setPolygon(p);
                setIsClosed(c);
              }}
            />
          ) : (
            <div className="flex items-center justify-center h-full text-base font-medium text-gray-600 dark:text-gray-300 px-6 text-center">
              {!hasGA ? t("noGAUploaded") : t("selectDeckToStart")}
            </div>
          )}
        </div>

        {/* Right: form */}
        <div className="md:w-80 flex flex-col gap-4 md:border-l md:pl-4 md:border-gray-200 md:dark:border-gray-700">
          <FormSelect
            id="area-deck"
            label={t("deck")}
            options={deckOptions}
            value={selectedDeckId}
            onChange={(e) => setSelectedDeckId(e.target.value)}
            required
            disabled={decksLoading}
          />

          <FormInput
            id="area-name"
            label={t("areaName")}
            value={name}
            onChange={(e) => setName(e.target.value)}
            required
            disabled={!isClosed}
            placeholder={t("areaNamePlaceholder")}
          />

          <FormTextarea
            id="area-description"
            label={t("areaDescription")}
            value={description}
            onChange={(e) => setDescription(e.target.value)}
            rows={3}
            disabled={!isClosed}
            placeholder={t("areaDescriptionPlaceholder")}
          />

          <p className="text-xs text-gray-500 dark:text-gray-400">{drawingHint}</p>

          {polygon.length > 0 && (
            <Button variant="ghost" size="sm" onClick={handleReset}>
              {t("resetPolygon")}
            </Button>
          )}

          {error && <Alert type="error" message={error} />}

          <div className="mt-auto flex justify-end gap-2 pt-4 border-t border-gray-200 dark:border-gray-700">
            <Button variant="secondary" onClick={onClose} disabled={submitting}>
              {t("cancel")}
            </Button>
            <Button
              variant="primary"
              onClick={handleSave}
              disabled={!canSave || submitting}
              loading={submitting}
            >
              {t("save")}
            </Button>
          </div>
        </div>
      </div>
    </Modal>
  );
}
