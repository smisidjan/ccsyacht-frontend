"use client";

import { useState, useEffect, useCallback } from "react";
import { useTranslations } from "next-intl";
import Modal from "@/app/components/ui/Modal";
import Button from "@/app/components/ui/Button";
import FormInput from "@/app/components/ui/FormInput";
import { GAViewerWithDraw, type DeckBounds, type ExistingDeck } from "@/app/features/ga";
import { decksApi } from "@/lib/api/decks";
import { useToast } from "@/app/context/ToastContext";
import { PencilIcon, PlusIcon, TrashIcon } from "@heroicons/react/24/outline";
import type { Deck, DeckSideProfileInput } from "@/lib/api/types";
import { handleError } from "@/lib/utils/errors";

interface PendingSideProfile {
  /** Local UUID — also used as the dnd/draw target id and React key. */
  id: string;
  /** Server identifier when this profile already exists; absent means
   *  "create on save". The bulk-replace endpoint uses this to reconcile. */
  identifier?: string;
  /** User-editable prefix of the profile name. The full name persisted on
   *  the backend is composed as `${namePrefix} - ${deckName}`, so the
   *  prefix typically encodes the side (e.g. "SB", "PS"). */
  namePrefix: string;
  bounds: DeckBounds | null;
}

const SIDE_PROFILE_NAME_SEPARATOR = " - ";

/** Compose the full side-profile name from the editable prefix and the
 *  parent deck's name. Returns just the prefix when the deck doesn't have
 *  a name yet (the suffix would be meaningless). */
function buildSideProfileName(prefix: string, deckName: string): string {
  const trimmedPrefix = prefix.trim();
  const trimmedDeck = deckName.trim();
  if (!trimmedDeck) return trimmedPrefix;
  return `${trimmedPrefix}${SIDE_PROFILE_NAME_SEPARATOR}${trimmedDeck}`;
}

/** Inverse of `buildSideProfileName`: strip the ` - {deckName}` suffix from
 *  an existing profile name so the user only edits the prefix portion in
 *  the form. Legacy names that don't match the pattern stay intact. */
function extractSideProfilePrefix(fullName: string, deckName: string): string {
  if (!deckName) return fullName;
  const suffix = `${SIDE_PROFILE_NAME_SEPARATOR}${deckName}`;
  return fullName.endsWith(suffix) ? fullName.slice(0, -suffix.length) : fullName;
}

interface PendingDeck {
  id: string;
  name: string;
  description: string;
  bounds: DeckBounds | null;
  sideProfiles: PendingSideProfile[];
  isExisting?: boolean; // Track if this deck already exists in the database
}

/** What the user is currently drawing on the GA. The primary deck rect and
 *  each side profile share the same canvas — only one is interactive at a
 *  time. Other shapes are rendered as read-only `existingDecks` overlays. */
type DrawTarget =
  | { kind: "deck" }
  | { kind: "sideProfile"; id: string };

// Blue for the primary deck rectangle, purple for side profiles. Picked so
// they're clearly different on the GA without clashing with the typical
// drawing background.
const DECK_COLOR = "#3B82F6";
const SIDE_PROFILE_COLOR = "#A855F7";

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
  const placement = deck.deckPlacement;
  const bounds: DeckBounds | null = placement
    ? {
        x1: placement.bbox_x,
        y1: placement.bbox_y,
        x2: placement.bbox_x + placement.bbox_width,
        y2: placement.bbox_y + placement.bbox_height,
      }
    : null;

  const sideProfiles: PendingSideProfile[] = deck.sideProfiles.map((sp) => ({
    id: sp.identifier,
    identifier: sp.identifier,
    // Strip the deck-name suffix so the input round-trips cleanly: name on
    // the backend is "SB - Deck 08", user edits "SB" here.
    namePrefix: extractSideProfilePrefix(sp.name, deck.name),
    bounds: {
      x1: sp.bbox_x,
      y1: sp.bbox_y,
      x2: sp.bbox_x + sp.bbox_width,
      y2: sp.bbox_y + sp.bbox_height,
    },
  }));

  return {
    id: deck.identifier,
    name: deck.name,
    description: deck.description || "",
    bounds,
    sideProfiles,
    isExisting: true,
  };
}

function boundsToBbox(b: DeckBounds) {
  return {
    bbox_x: b.x1,
    bbox_y: b.y1,
    bbox_width: b.x2 - b.x1,
    bbox_height: b.y2 - b.y1,
  };
}

/** Backfill optional fields on a deck record. Cached entries in localStorage
 *  from a previous build may be missing newer keys like `sideProfiles`, or
 *  may carry the older `{ name }` shape from before the prefix split.
 *  Shape them into the current type rather than refuse to load. */
function normalizePendingDeck(deck: Partial<PendingDeck> & { id?: string }): PendingDeck {
  const deckName = deck.name ?? "";
  const sideProfiles: PendingSideProfile[] = Array.isArray(deck.sideProfiles)
    ? deck.sideProfiles.map((spRaw) => {
        // Legacy cached entries may carry a `{ name }` field from before the
        // prefix split. Read both possibilities through `unknown` rather than
        // tightening the input type.
        const sp = spRaw as Partial<PendingSideProfile> & { name?: string };
        return {
          id: sp.id ?? crypto.randomUUID(),
          identifier: sp.identifier,
          // Prefer the new field; fall back to extracting from the old `name`
          // field on legacy cached entries.
          namePrefix:
            sp.namePrefix !== undefined
              ? sp.namePrefix
              : extractSideProfilePrefix(sp.name ?? "", deckName),
          bounds: sp.bounds ?? null,
        };
      })
    : [];
  return {
    id: deck.id ?? crypto.randomUUID(),
    name: deckName,
    description: deck.description ?? "",
    bounds: deck.bounds ?? null,
    sideProfiles,
    isExisting: deck.isExisting,
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
  const [sideProfiles, setSideProfiles] = useState<PendingSideProfile[]>([]);
  /** Which rectangle is currently interactive on the GA canvas. Only one
   *  can be drawn at a time; the rest render as read-only overlays. */
  const [drawTarget, setDrawTarget] = useState<DrawTarget>({ kind: "deck" });

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
        // Create mode: load from localStorage. Persisted entries from older
        // builds may lack newer fields (e.g. `sideProfiles`); run them
        // through `normalizePendingDeck` so the rest of the component can
        // trust the shape.
        try {
          const saved = localStorage.getItem(storageKey);
          if (saved) {
            const data = JSON.parse(saved);
            if (data.pendingDecks && Array.isArray(data.pendingDecks)) {
              setPendingDecks(data.pendingDecks.map(normalizePendingDeck));
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
    setSideProfiles([]);
    setDrawTarget({ kind: "deck" });
    setEditingDeckId(null);
    setError(null);
  }, []);

  // Active bounds + setter routed via the current draw target. The viewer
  // sees a single "what is being drawn" pair; we fan out behind the scenes.
  const activeBounds: DeckBounds | null =
    drawTarget.kind === "deck"
      ? bounds
      : sideProfiles.find((sp) => sp.id === drawTarget.id)?.bounds ?? null;

  const handleBoundsChange = (next: DeckBounds | null) => {
    if (drawTarget.kind === "deck") {
      setBounds(next);
    } else {
      const targetId = drawTarget.id;
      setSideProfiles((prev) =>
        prev.map((sp) => (sp.id === targetId ? { ...sp, bounds: next } : sp))
      );
    }
  };

  // Add deck to list
  const handleAddDeck = () => {
    if (!name.trim()) return;

    if (editingDeckId) {
      // Update existing deck in list
      setPendingDecks((prev) =>
        prev.map((d) =>
          d.id === editingDeckId
            ? {
                ...d,
                name: name.trim(),
                description: description.trim(),
                bounds,
                sideProfiles,
              }
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
        sideProfiles,
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
    setSideProfiles(deck.sideProfiles);
    setDrawTarget({ kind: "deck" });
  };

  // Side profile mutations — all routed through the in-edit deck form.
  const handleAddSideProfile = () => {
    const id = crypto.randomUUID();
    setSideProfiles((prev) => [
      ...prev,
      { id, namePrefix: "", bounds: null },
    ]);
    // Auto-focus the new profile for drawing so the user can immediately
    // sketch its rectangle without an extra click.
    setDrawTarget({ kind: "sideProfile", id });
  };

  const handleSideProfilePrefixChange = (id: string, value: string) => {
    setSideProfiles((prev) =>
      prev.map((sp) => (sp.id === id ? { ...sp, namePrefix: value } : sp))
    );
  };

  const handleRemoveSideProfile = (id: string) => {
    setSideProfiles((prev) => prev.filter((sp) => sp.id !== id));
    if (drawTarget.kind === "sideProfile" && drawTarget.id === id) {
      setDrawTarget({ kind: "deck" });
    }
  };

  const handleSelectSideProfile = (id: string) => {
    setDrawTarget({ kind: "sideProfile", id });
  };

  const handleSelectDeckTarget = () => {
    setDrawTarget({ kind: "deck" });
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
        // Convert bounds from (x1,y1,x2,y2) to the placement bbox shape the
        // API expects. Omitting `deck_placement` keeps the existing one;
        // we only send it when the user actually drew a rectangle.
        const placement = deck.bounds ? boundsToBbox(deck.bounds) : null;

        // Build the side-profiles replace payload. Drop entries the user
        // hasn't completed (no rectangle drawn or empty prefix) so the
        // backend never sees a half-filled profile. The persisted name
        // composes the prefix with the parent deck's name.
        const sideProfilesPayload: DeckSideProfileInput[] = deck.sideProfiles
          .filter((sp) => sp.bounds !== null && sp.namePrefix.trim() !== "")
          .map((sp) => ({
            ...(sp.identifier ? { identifier: sp.identifier } : {}),
            name: buildSideProfileName(sp.namePrefix, deck.name),
            ...boundsToBbox(sp.bounds!),
          }));

        if (deck.isExisting) {
          // Update: always send `side_profiles` (full replace semantics —
          // entries kept via their `identifier`, removed ones get deleted).
          await decksApi.update(projectId, deck.id, {
            name: deck.name,
            description: deck.description || undefined,
            ...(placement ? { deck_placement: placement } : {}),
            side_profiles: sideProfilesPayload,
          });
        } else {
          // Create: only send `side_profiles` when there are any — keeps
          // the payload minimal for the common "no profiles" case.
          await decksApi.create(projectId, {
            name: deck.name,
            description: deck.description || undefined,
            ...(placement ? { deck_placement: placement } : {}),
            ...(sideProfilesPayload.length > 0
              ? { side_profiles: sideProfilesPayload }
              : {}),
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

  // Build the read-only overlay set rendered alongside whatever rectangle
  // the user is actively drawing. Three buckets:
  //  1. Each other pending deck's primary rectangle (blue).
  //  2. Each other pending deck's side profiles (purple) — these are the
  //     committed-but-not-saved entries you can see in the "Added Decks"
  //     list. Skipped for the deck currently in edit; its profiles come
  //     from the local `sideProfiles` state instead (bucket 3).
  //  3. The in-edit deck's side profiles (purple), minus the one being
  //     actively drawn (which feeds `bounds` / `onBoundsChange`).
  const existingDecksForViewer: ExistingDeck[] = [
    ...pendingDecks
      .filter((d) => d.bounds !== null && d.id !== editingDeckId)
      .map((d) => ({
        id: d.id,
        name: d.name,
        color: DECK_COLOR,
        bounds: d.bounds!,
      })),
    ...pendingDecks
      .filter((d) => d.id !== editingDeckId)
      .flatMap((d) =>
        d.sideProfiles
          .filter((sp) => sp.bounds !== null)
          .map((sp) => ({
            id: `side-profile:${sp.id}`,
            name: buildSideProfileName(sp.namePrefix, d.name) || t("sideProfile"),
            color: SIDE_PROFILE_COLOR,
            bounds: sp.bounds!,
          }))
      ),
    ...sideProfiles
      .filter(
        (sp) =>
          sp.bounds !== null &&
          !(drawTarget.kind === "sideProfile" && drawTarget.id === sp.id)
      )
      .map((sp) => ({
        id: `side-profile:${sp.id}`,
        name: buildSideProfileName(sp.namePrefix, name) || t("sideProfile"),
        color: SIDE_PROFILE_COLOR,
        bounds: sp.bounds!,
      })),
  ];

  // Handle clicking an overlay on the viewer. Side-profile ids carry a
  // prefix so we can distinguish them from deck ids; clicking one re-targets
  // the draw mode at that profile (within the deck being edited).
  const handleDeckClick = (clickedId: string) => {
    if (clickedId.startsWith("side-profile:")) {
      const spId = clickedId.slice("side-profile:".length);
      if (sideProfiles.some((sp) => sp.id === spId)) {
        setDrawTarget({ kind: "sideProfile", id: spId });
      }
      return;
    }
    const deck = pendingDecks.find((d) => d.id === clickedId);
    if (deck) {
      handleEditDeck(deck);
    }
  };

  const selectedOverlayId =
    drawTarget.kind === "sideProfile" ? `side-profile:${drawTarget.id}` : editingDeckId;
  const activeColor =
    drawTarget.kind === "sideProfile" ? SIDE_PROFILE_COLOR : DECK_COLOR;

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
                color={activeColor}
                bounds={activeBounds}
                onBoundsChange={handleBoundsChange}
                existingDecks={existingDecksForViewer}
                selectedDeckId={selectedOverlayId}
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

              {/* Side profiles — extra rectangles on the same GA, e.g.
                  port-side or starboard view strips. Each one has its own
                  name + rectangle; the active draw target switches between
                  the deck and the selected profile. */}
              <div className="space-y-2">
                <div className="flex items-center justify-between">
                  <div>
                    <p className="text-sm font-medium text-gray-700 dark:text-gray-300">
                      {t("sideProfiles")}
                    </p>
                    <p className="text-xs text-gray-500 dark:text-gray-400">
                      {t("sideProfilesHint")}
                    </p>
                  </div>
                  <Button
                    variant="ghost"
                    size="sm"
                    onClick={handleAddSideProfile}
                  >
                    <PlusIcon className="w-4 h-4" />
                    {t("addSideProfile")}
                  </Button>
                </div>

                {/* Draw-target toggle: the deck row is always present so the
                    user can switch back to drawing the primary rectangle
                    after adding a side profile. */}
                <ul className="space-y-1.5">
                  <li
                    onClick={handleSelectDeckTarget}
                    className={`flex items-center gap-2 p-2 rounded-md border cursor-pointer text-sm ${
                      drawTarget.kind === "deck"
                        ? "border-blue-500 bg-blue-50 dark:bg-blue-900/20"
                        : "border-gray-200 dark:border-gray-700"
                    }`}
                  >
                    <span
                      className="w-3 h-3 rounded-sm flex-shrink-0"
                      style={{ backgroundColor: DECK_COLOR }}
                      aria-hidden="true"
                    />
                    <span className="flex-1 text-gray-700 dark:text-gray-300 truncate">
                      {name.trim() || t("primaryDeckRectangle")}
                    </span>
                    {bounds && (
                      <span className="text-xs text-gray-500 dark:text-gray-400">
                        ✓
                      </span>
                    )}
                  </li>

                  {sideProfiles.map((sp) => {
                    const isActive =
                      drawTarget.kind === "sideProfile" && drawTarget.id === sp.id;
                    // Suffix shown as muted adornment so the user sees the
                    // composed name as they type the prefix. Hidden when
                    // the deck has no name yet (nothing to append).
                    const deckSuffix = name.trim()
                      ? `${SIDE_PROFILE_NAME_SEPARATOR}${name.trim()}`
                      : "";
                    return (
                      <li
                        key={sp.id}
                        className={`flex items-center gap-2 p-2 rounded-md border ${
                          isActive
                            ? "border-purple-500 bg-purple-50 dark:bg-purple-900/20"
                            : "border-gray-200 dark:border-gray-700"
                        }`}
                      >
                        <span
                          className="w-3 h-3 rounded-sm flex-shrink-0"
                          style={{ backgroundColor: SIDE_PROFILE_COLOR }}
                          aria-hidden="true"
                        />
                        <div className="flex-1 min-w-0 flex items-center gap-1 px-2 py-1 text-sm border border-gray-300 dark:border-gray-600 rounded bg-white dark:bg-gray-800 focus-within:ring-2 focus-within:ring-blue-500 focus-within:border-transparent">
                          <input
                            type="text"
                            value={sp.namePrefix}
                            onChange={(e) =>
                              handleSideProfilePrefixChange(sp.id, e.target.value)
                            }
                            onFocus={() => handleSelectSideProfile(sp.id)}
                            placeholder={t("sideProfileNamePlaceholder")}
                            maxLength={255}
                            className="flex-1 min-w-0 bg-transparent border-0 outline-none text-gray-900 dark:text-white p-0"
                          />
                          {deckSuffix && (
                            <span
                              className="text-gray-400 dark:text-gray-500 whitespace-nowrap select-none"
                              aria-hidden="true"
                            >
                              {deckSuffix}
                            </span>
                          )}
                        </div>
                        {!isActive && (
                          <button
                            type="button"
                            onClick={() => handleSelectSideProfile(sp.id)}
                            className="px-2 py-1 text-xs text-purple-700 dark:text-purple-300 hover:underline"
                          >
                            {sp.bounds ? t("editDrawing") : t("draw")}
                          </button>
                        )}
                        {sp.bounds && (
                          <span
                            className="text-xs text-gray-500 dark:text-gray-400"
                            title={t("rectangleDrawn")}
                          >
                            ✓
                          </span>
                        )}
                        <button
                          type="button"
                          onClick={() => handleRemoveSideProfile(sp.id)}
                          className="p-1 text-gray-400 hover:text-red-500"
                          aria-label={tCommon("remove")}
                        >
                          <TrashIcon className="w-4 h-4" />
                        </button>
                      </li>
                    );
                  })}
                </ul>
              </div>
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
                        {deck.sideProfiles.length > 0 && (
                          <p className="text-xs text-purple-600 dark:text-purple-300 mt-0.5">
                            {t("sideProfileCount", {
                              count: deck.sideProfiles.length,
                            })}
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
