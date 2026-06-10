"use client";

import { useCallback, useEffect, useMemo, useState } from "react";
import { useTranslations } from "next-intl";
import dynamic from "next/dynamic";
import Modal from "@/app/components/ui/Modal";
import Button from "@/app/components/ui/Button";
import FormInput from "@/app/components/ui/FormInput";
import { decksApi } from "@/lib/api/decks";
import { useToast } from "@/app/context/ToastContext";
import { PencilIcon, PlusIcon, TrashIcon } from "@heroicons/react/24/outline";
import type { Deck, AreaPolygonPoint, DeckSideProfilePolygonInput } from "@/lib/api/types";
import { usePlacementPolygons } from "@/lib/hooks/usePlacementPolygons";
import { handleError } from "@/lib/utils/errors";
import { polygonBbox } from "@/lib/utils/geometry";
import { FitBounds } from "@/lib/utils/gaLeaflet";
import type { LatLngBoundsExpression } from "leaflet";

// Leaflet uses `window` at module-top, so the drawer + its polygon
// overlays can only render client-side. Pulling them in dynamically
// keeps the modal SSR-safe (the modal itself ships with the rest of
// the page bundle).
const PolygonDrawer = dynamic(
  () => import("@/app/features/ga/components/shared/PolygonDrawer"),
  { ssr: false }
);
const DeckOverlayLayer = dynamic(() => import("./DeckOverlayLayer"), {
  ssr: false,
});

interface PendingSideProfile {
  /** Local UUID — also used as the placement key in the polygons hook
   *  and the React key for list rendering. */
  id: string;
  /** Server identifier when this profile already exists; absent means
   *  "create on save". The bulk-replace endpoint uses this to reconcile. */
  identifier?: string;
  /** User-editable prefix of the profile name. The full name persisted on
   *  the backend is `${namePrefix} - ${deckName}`, so the prefix
   *  typically encodes the side (e.g. "SB", "PS"). */
  namePrefix: string;
  polygon: AreaPolygonPoint[];
  isClosed: boolean;
}

const SIDE_PROFILE_NAME_SEPARATOR = " - ";

function buildSideProfileName(prefix: string, deckName: string): string {
  const trimmedPrefix = prefix.trim();
  const trimmedDeck = deckName.trim();
  if (!trimmedDeck) return trimmedPrefix;
  return `${trimmedPrefix}${SIDE_PROFILE_NAME_SEPARATOR}${trimmedDeck}`;
}

function extractSideProfilePrefix(fullName: string, deckName: string): string {
  if (!deckName) return fullName;
  const suffix = `${SIDE_PROFILE_NAME_SEPARATOR}${deckName}`;
  return fullName.endsWith(suffix) ? fullName.slice(0, -suffix.length) : fullName;
}

interface PendingDeck {
  id: string;
  name: string;
  description: string;
  polygon: AreaPolygonPoint[];
  isClosed: boolean;
  sideProfiles: PendingSideProfile[];
  isExisting?: boolean;
  /** Number of areas currently attached to this deck (server snapshot
   *  at load time). Used to gate the delete button so the user can't
   *  queue up a deletion the backend will reject — the API returns
   *  "Cannot delete deck X: it still has areas." */
  areaCount?: number;
}

/** Active draw target for the polygons hook. The deck's primary polygon
 *  lives under a fixed key so it can never collide with a side-profile
 *  UUID. Side profiles use their own `id`. */
const PRIMARY_KEY = "primary";

const DECK_COLOR = "#3B82F6";
const SIDE_PROFILE_COLOR = "#A855F7";

const STORAGE_KEY_PREFIX = "ccs_deck_modal_";
const STORAGE_KEY_PREFIX_EDIT = "ccs_deck_modal_edit_";
/** Bump when the cached shape changes — older caches get dropped on
 *  load. v2 = polygon-based (was bbox in v1, never versioned). */
const STORAGE_VERSION = "v2";

const MIN_VERTICES = 3;

interface CreateDeckModalProps {
  isOpen: boolean;
  onClose: () => void;
  projectId: string;
  onSuccess?: () => void;
  gaImageUrl?: string;
  gaImageWidth?: number;
  gaImageHeight?: number;
  existingDecks?: Deck[];
  editMode?: boolean;
}

function apiDeckToPendingDeck(deck: Deck): PendingDeck {
  const polygon = deck.deckPolygon?.points ?? [];
  // Guard against backends mid-migration: the field may be absent or
  // null, and each side profile may also be missing points.
  const sideProfiles: PendingSideProfile[] = (deck.sideProfilePolygons ?? []).map(
    (sp) => ({
      id: sp.identifier,
      identifier: sp.identifier,
      namePrefix: extractSideProfilePrefix(sp.name, deck.name),
      polygon: sp.points ?? [],
      isClosed: (sp.points ?? []).length >= MIN_VERTICES,
    })
  );
  return {
    id: deck.identifier,
    name: deck.name,
    description: deck.description || "",
    polygon,
    isClosed: polygon.length >= MIN_VERTICES,
    sideProfiles,
    isExisting: true,
    areaCount: deck.areaCount ?? 0,
  };
}

/** Backfill optional fields on a deck record from localStorage. */
function normalizePendingDeck(deck: Partial<PendingDeck> & { id?: string }): PendingDeck {
  const deckName = deck.name ?? "";
  const sideProfiles: PendingSideProfile[] = Array.isArray(deck.sideProfiles)
    ? deck.sideProfiles.map((spRaw) => {
        const sp = spRaw as Partial<PendingSideProfile>;
        return {
          id: sp.id ?? crypto.randomUUID(),
          identifier: sp.identifier,
          namePrefix: sp.namePrefix ?? "",
          polygon: Array.isArray(sp.polygon) ? sp.polygon : [],
          isClosed: !!sp.isClosed,
        };
      })
    : [];
  return {
    id: deck.id ?? crypto.randomUUID(),
    name: deckName,
    description: deck.description ?? "",
    polygon: Array.isArray(deck.polygon) ? deck.polygon : [],
    isClosed: !!deck.isClosed,
    sideProfiles,
    isExisting: deck.isExisting,
    areaCount: deck.areaCount,
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

  // Separate keys per mode so a half-finished "create new decks" draft
  // can't clobber an in-progress edit of existing decks.
  const storageKey = `${
    editMode ? STORAGE_KEY_PREFIX_EDIT : STORAGE_KEY_PREFIX
  }${projectId}`;

  const [pendingDecks, setPendingDecks] = useState<PendingDeck[]>([]);
  const [editingDeckId, setEditingDeckId] = useState<string | null>(null);

  // Metadata for the currently-editing deck. Polygons themselves live in
  // the polygons hook (multi-polygon state with per-target undo/redo).
  const [name, setName] = useState("");
  const [description, setDescription] = useState("");
  /** Side profiles for the currently-editing deck — sans polygon data
   *  (which is in `polygons.all[sp.id]`). */
  const [sideProfilesMeta, setSideProfilesMeta] = useState<
    Pick<PendingSideProfile, "id" | "identifier" | "namePrefix">[]
  >([]);

  const polygons = usePlacementPolygons();

  const [isSubmitting, setIsSubmitting] = useState(false);
  const [error, setError] = useState<string | null>(null);

  /** Mobile-only view switcher. The desktop layout shows both panels
   *  side by side; below `lg` we'd otherwise jam them into a single
   *  row that squeezes the GA viewer to nothing, so we expose
   *  explicit tabs instead. Default to the GA viewer so users land on
   *  the drawing surface — entering edit mode also jumps here. */
  const [activeMobileTab, setActiveMobileTab] = useState<"ga" | "decks">("ga");

  /** When the user picks a deck to edit, we want the GA viewer to
   *  zoom + pan to that deck's polygon. `bounds` carries the focus
   *  rect; `version` increments on every focus request so re-picking
   *  the same deck (same bounds object) still re-fits. `null` means
   *  "use the default full-image fit". */
  const [focusFit, setFocusFit] = useState<{
    bounds: LatLngBoundsExpression;
    version: number;
  } | null>(null);

  const showGAPreview = !!(gaImageUrl && gaImageWidth && gaImageHeight);

  // Load data on mount — both modes prefer a same-version cached
  // draft (so a refresh mid-edit doesn't lose work) and fall back to
  // the live API state. Also pin the active draw target to the
  // primary deck polygon so the user can start drawing immediately;
  // without this, clicks land but `polygons.set` is a no-op
  // (`activeId === null`) and nothing shows.
  useEffect(() => {
    if (!isOpen) return;
    polygons.setActive(PRIMARY_KEY);

    let restoredFromCache = false;
    try {
      const saved = localStorage.getItem(storageKey);
      if (saved) {
        const data = JSON.parse(saved);
        if (data.version !== STORAGE_VERSION) {
          localStorage.removeItem(storageKey);
        } else if (Array.isArray(data.pendingDecks)) {
          setPendingDecks(data.pendingDecks.map(normalizePendingDeck));
          restoredFromCache = true;
        }
      }
    } catch (e) {
      handleError(e, {
        severity: "console",
        context: "Loading deck data from localStorage",
      });
    }

    // Edit mode: seed from the API only when there's no draft yet.
    // A cached draft always wins so refresh-during-edit is non-lossy.
    if (!restoredFromCache && editMode && existingDecks) {
      setPendingDecks(existingDecks.map(apiDeckToPendingDeck));
    }
  }, [isOpen, storageKey, editMode, existingDecks]);

  // Persist drafts in both modes. Edit mode used to skip this, which
  // is exactly why a hard refresh wiped the user's in-progress
  // changes. We still bail when the list is empty so cleaning out
  // every deck doesn't leave a stale empty cache around.
  useEffect(() => {
    if (!isOpen || pendingDecks.length === 0) return;
    try {
      localStorage.setItem(
        storageKey,
        JSON.stringify({ version: STORAGE_VERSION, pendingDecks })
      );
    } catch (e) {
      handleError(e, {
        severity: "console",
        context: "Saving deck data to localStorage",
      });
    }
  }, [pendingDecks, isOpen, storageKey]);

  // Reset the form back to "add new deck" mode.
  const resetForm = useCallback(() => {
    setName("");
    setDescription("");
    setSideProfilesMeta([]);
    polygons.resetAll();
    polygons.setActive(PRIMARY_KEY);
    setEditingDeckId(null);
    setError(null);
    // Drop the deck-specific focus so the viewer falls back to its
    // default fit-to-full-image framing on the next render.
    setFocusFit(null);
  }, [polygons]);

  // Snapshot the working copy back into a PendingDeck. Used by the
  // "Add" / "Update" CTA — pulls every per-target polygon from the hook
  // and matches them against `sideProfilesMeta` for the metadata.
  const buildPendingDeckFromForm = useCallback((): Omit<PendingDeck, "id"> => {
    const primary = polygons.all[PRIMARY_KEY] ?? { polygon: [], isClosed: false };
    const sideProfiles: PendingSideProfile[] = sideProfilesMeta.map((meta) => {
      const snap = polygons.all[meta.id] ?? { polygon: [], isClosed: false };
      return {
        ...meta,
        polygon: snap.polygon,
        isClosed: snap.isClosed,
      };
    });
    return {
      name: name.trim(),
      description: description.trim(),
      polygon: primary.polygon,
      isClosed: primary.isClosed,
      sideProfiles,
    };
  }, [polygons.all, sideProfilesMeta, name, description]);

  const handleAddDeck = () => {
    if (!name.trim()) return;
    const draft = buildPendingDeckFromForm();
    if (editingDeckId) {
      setPendingDecks((prev) =>
        prev.map((d) =>
          d.id === editingDeckId ? { ...d, ...draft } : d
        )
      );
    } else {
      setPendingDecks((prev) => [
        ...prev,
        { ...draft, id: crypto.randomUUID() },
      ]);
    }
    resetForm();
  };

  // Switch the form into "edit" mode for an existing pending deck. Seeds
  // every polygon (primary + each side profile) into the polygons hook
  // and points the active target at the primary one.
  /** Build a Leaflet bounds expression around a normalized 0..1
   *  polygon, in the same image-pixel coordinate space as the
   *  PolygonDrawer's CRS.Simple map. Returns `null` for polygons too
   *  small to frame or when the GA image dimensions are unknown. */
  const polygonToLeafletBounds = useCallback(
    (polygon: AreaPolygonPoint[]): LatLngBoundsExpression | null => {
      if (
        polygon.length < MIN_VERTICES ||
        !gaImageWidth ||
        !gaImageHeight
      ) {
        return null;
      }
      const bbox = polygonBbox(polygon);
      if (!bbox) return null;
      return [
        [bbox.bbox_y * gaImageHeight, bbox.bbox_x * gaImageWidth],
        [
          (bbox.bbox_y + bbox.bbox_height) * gaImageHeight,
          (bbox.bbox_x + bbox.bbox_width) * gaImageWidth,
        ],
      ];
    },
    [gaImageWidth, gaImageHeight]
  );

  const handleEditDeck = useCallback(
    (deck: PendingDeck) => {
      setEditingDeckId(deck.id);
      setName(deck.name);
      setDescription(deck.description);
      setSideProfilesMeta(
        deck.sideProfiles.map((sp) => ({
          id: sp.id,
          identifier: sp.identifier,
          namePrefix: sp.namePrefix,
        }))
      );
      polygons.resetAll();
      polygons.seed(PRIMARY_KEY, deck.polygon, deck.isClosed);
      for (const sp of deck.sideProfiles) {
        polygons.seed(sp.id, sp.polygon, sp.isClosed);
      }
      polygons.setActive(PRIMARY_KEY);
      // Jump to the GA viewer on mobile so the user immediately sees
      // (and can tweak) the polygon they just chose to edit.
      setActiveMobileTab("ga");
      // Re-frame the viewer on the deck the user picked. `version` is
      // bumped so re-clicking the same pencil still re-fits if the
      // user has since panned away.
      const bounds = polygonToLeafletBounds(deck.polygon);
      if (bounds) {
        setFocusFit((prev) => ({
          bounds,
          version: (prev?.version ?? 0) + 1,
        }));
      }
    },
    [polygons, polygonToLeafletBounds]
  );

  const handleAddSideProfile = () => {
    const id = crypto.randomUUID();
    setSideProfilesMeta((prev) => [...prev, { id, namePrefix: "" }]);
    polygons.setActive(id);
  };

  const handleSideProfilePrefixChange = (id: string, value: string) => {
    setSideProfilesMeta((prev) =>
      prev.map((sp) => (sp.id === id ? { ...sp, namePrefix: value } : sp))
    );
  };

  const handleRemoveSideProfile = (id: string) => {
    setSideProfilesMeta((prev) => prev.filter((sp) => sp.id !== id));
    if (polygons.activeId === id) {
      polygons.setActive(PRIMARY_KEY);
    }
  };

  const handleSelectSideProfile = (id: string) => polygons.setActive(id);
  const handleSelectDeckTarget = () => polygons.setActive(PRIMARY_KEY);

  const handleRemoveDeck = (deckId: string) => {
    setPendingDecks((prev) => prev.filter((d) => d.id !== deckId));
    if (editingDeckId === deckId) resetForm();
  };

  const handleCancelEdit = () => resetForm();

  const handleSaveAll = async () => {
    if (pendingDecks.length === 0 && !editMode) return;
    setIsSubmitting(true);
    setError(null);
    try {
      // Delete decks the user removed in edit mode before the
      // create/update pass — applied as a single transaction from the
      // user's point of view. When the backend rejects a deletion
      // (typically "still has areas"), the deck is restored to the
      // local list so the user doesn't lose track of which deck
      // failed. Without this, refresh + cache would silently drop the
      // failed-to-delete deck from view.
      if (editMode && existingDecks) {
        const keptIds = new Set(
          pendingDecks.filter((d) => d.isExisting).map((d) => d.id)
        );
        const toDelete = existingDecks.filter(
          (d) => !keptIds.has(d.identifier)
        );
        for (const d of toDelete) {
          try {
            await decksApi.delete(projectId, d.identifier);
          } catch (deleteErr) {
            const restored = apiDeckToPendingDeck(d);
            setPendingDecks((prev) =>
              prev.some((p) => p.id === restored.id) ? prev : [...prev, restored]
            );
            throw deleteErr;
          }
        }
      }

      for (const deck of pendingDecks) {
        // Only send `deck_polygon` when the user actually drew one (and
        // closed it). Omitting keeps the existing one on update.
        const deckPolygonPayload =
          deck.polygon.length >= MIN_VERTICES
            ? { name: deck.name, points: deck.polygon }
            : null;

        const sideProfilePolygonsPayload: DeckSideProfilePolygonInput[] = deck.sideProfiles
          .filter(
            (sp) =>
              sp.polygon.length >= MIN_VERTICES && sp.namePrefix.trim() !== ""
          )
          .map((sp) => ({
            ...(sp.identifier ? { identifier: sp.identifier } : {}),
            name: buildSideProfileName(sp.namePrefix, deck.name),
            points: sp.polygon,
          }));

        if (deck.isExisting) {
          await decksApi.update(projectId, deck.id, {
            name: deck.name,
            description: deck.description || undefined,
            ...(deckPolygonPayload ? { deck_polygon: deckPolygonPayload } : {}),
            side_profile_polygons: sideProfilePolygonsPayload,
          });
        } else {
          await decksApi.create(projectId, {
            name: deck.name,
            description: deck.description || undefined,
            ...(deckPolygonPayload ? { deck_polygon: deckPolygonPayload } : {}),
            ...(sideProfilePolygonsPayload.length > 0
              ? { side_profile_polygons: sideProfilePolygonsPayload }
              : {}),
          });
        }
      }

      // Saved successfully — drop the draft cache in both modes so
      // reopening shows the freshly-persisted state from the API.
      localStorage.removeItem(storageKey);

      showToast(
        "success",
        editMode
          ? t("decksUpdatedSuccess")
          : t("decksCreatedSuccess", { count: pendingDecks.length })
      );
      setPendingDecks([]);
      resetForm();
      onSuccess?.();
      onClose();
    } catch (err) {
      setError(
        err instanceof Error
          ? err.message
          : editMode
          ? t("updateError")
          : t("createError")
      );
    } finally {
      setIsSubmitting(false);
    }
  };

  const handleClose = () => {
    resetForm();
    onClose();
  };

  const handleClearAll = () => {
    if (editMode) return;
    setPendingDecks([]);
    resetForm();
    localStorage.removeItem(storageKey);
  };

  // ============ Drawer wiring ============

  const activeId = polygons.activeId ?? PRIMARY_KEY;
  const isPrimaryActive = activeId === PRIMARY_KEY;
  const activeColor = isPrimaryActive ? DECK_COLOR : SIDE_PROFILE_COLOR;

  /** Polygons rendered as static overlays in the drawer — every per-
   *  target snapshot that isn't the active one, plus the polygons of
   *  every other pending deck. Shape mirrors `DeckOverlay` so the
   *  rendering child consumes it directly. */
  type Overlay = {
    key: string;
    points: AreaPolygonPoint[];
    color: string;
    dashed: boolean;
    onClick?: () => void;
  };

  const overlays = useMemo<Overlay[]>(() => {
    if (!showGAPreview) return [];
    const out: Overlay[] = [];

    // Other pending decks (not currently being edited) — dashed so
    // they read as "committed but in another deck's context".
    // Intentionally not clickable: a single click used to silently
    // swap edit context, which destroyed in-progress work the moment
    // the user grazed the wrong shape. Switching decks now requires
    // an explicit pencil click in the right-hand list.
    for (const d of pendingDecks) {
      if (d.id === editingDeckId) continue;
      if (d.polygon.length >= MIN_VERTICES) {
        out.push({
          key: `deck:${d.id}`,
          points: d.polygon,
          color: DECK_COLOR,
          dashed: true,
        });
      }
      for (const sp of d.sideProfiles) {
        if (sp.polygon.length < MIN_VERTICES) continue;
        out.push({
          key: `deck:${d.id}:sp:${sp.id}`,
          points: sp.polygon,
          color: SIDE_PROFILE_COLOR,
          dashed: true,
        });
      }
    }

    // Currently-editing deck's non-active polygons — solid so they
    // dominate over the dashed neighbours but stay out of the way of
    // the actively-drawn one. Clicking switches the active target.
    const primarySnap = polygons.all[PRIMARY_KEY];
    if (
      !isPrimaryActive &&
      primarySnap &&
      primarySnap.polygon.length >= MIN_VERTICES
    ) {
      out.push({
        key: "active-deck:primary",
        points: primarySnap.polygon,
        color: DECK_COLOR,
        dashed: false,
        onClick: handleSelectDeckTarget,
      });
    }
    for (const meta of sideProfilesMeta) {
      if (meta.id === activeId) continue;
      const snap = polygons.all[meta.id];
      if (!snap || snap.polygon.length < MIN_VERTICES) continue;
      out.push({
        key: `active-sp:${meta.id}`,
        points: snap.polygon,
        color: SIDE_PROFILE_COLOR,
        dashed: false,
        onClick: () => handleSelectSideProfile(meta.id),
      });
    }
    return out;
    // handleSelect* / handleEditDeck change every render but the click
    // closures are only consumed by Leaflet event handlers, not re-
    // rendered React trees — fine to recreate.
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [
    pendingDecks,
    editingDeckId,
    polygons.all,
    sideProfilesMeta,
    activeId,
    isPrimaryActive,
    showGAPreview,
  ]);

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
          label: editMode
            ? t("saveChanges")
            : t("saveAllDecks", { count: pendingDecks.length }),
          onClick: handleSaveAll,
          variant: "primary",
          disabled: pendingDecks.length === 0 || isSubmitting,
          loading: isSubmitting,
        },
      ]}
    >
      <div className="flex flex-col gap-4">
        {/* Mobile-only tab switcher. The desktop layout fits both
            panels side by side; below `lg` we expose them as tabs so
            the GA viewer can actually breathe on a phone. */}
        {showGAPreview && (
          <div className="lg:hidden flex p-1 bg-gray-100 dark:bg-gray-800 rounded-lg">
            <button
              type="button"
              onClick={() => setActiveMobileTab("ga")}
              className={`flex-1 py-2 text-sm font-medium rounded-md transition-colors ${
                activeMobileTab === "ga"
                  ? "bg-white dark:bg-gray-700 text-gray-900 dark:text-white shadow-sm"
                  : "text-gray-600 dark:text-gray-400"
              }`}
            >
              {t("mobileTabGA")}
            </button>
            <button
              type="button"
              onClick={() => setActiveMobileTab("decks")}
              className={`flex-1 py-2 text-sm font-medium rounded-md transition-colors ${
                activeMobileTab === "decks"
                  ? "bg-white dark:bg-gray-700 text-gray-900 dark:text-white shadow-sm"
                  : "text-gray-600 dark:text-gray-400"
              }`}
            >
              {t("mobileTabDecks", { count: pendingDecks.length })}
            </button>
          </div>
        )}

      <div className="flex flex-col lg:flex-row gap-6">
        {/* Left: GA preview. Takes all the column space the form
            leaves over — width fills, height follows aspect-ratio.
            For tall (portrait) GAs the canvas becomes very tall and
            the modal body scrolls; the sticky toolbar keeps the
            undo/redo/rect controls in view. */}
        {showGAPreview && gaImageUrl && gaImageWidth && gaImageHeight && (
          <div
            className={`${
              activeMobileTab === "ga" ? "block" : "hidden"
            } lg:block flex-1 min-w-0`}
          >
            <p className="text-sm font-medium text-gray-700 dark:text-gray-300 mb-2">
              {t("deckLocation")}
            </p>
            <p className="text-xs text-gray-500 dark:text-gray-400 mb-3">
              {t("markDeckArea")}
            </p>
            {/* Match the GA tab's sizing pattern: fix the height,
                derive width from the image aspect, clamp horizontally
                to the column. For portrait GAs the calc width fits the
                column → flush against every edge, no grey bars. For
                landscape GAs the maxWidth clamps and the wrapper
                doesn't grow taller — Leaflet's FitBounds keeps the
                image flush sideways. */}
            <div
              style={{
                width: "100%",
                aspectRatio: `${gaImageWidth} / ${gaImageHeight}`,
              }}
            >
              <PolygonDrawer
                imageUrl={gaImageUrl}
                imageWidth={gaImageWidth}
                imageHeight={gaImageHeight}
                polygon={polygons.polygon}
                isClosed={polygons.isClosed}
                onChange={polygons.set}
                onUndo={polygons.undo}
                onRedo={polygons.redo}
                canUndo={polygons.canUndo}
                canRedo={polygons.canRedo}
                onReset={polygons.reset}
                strokeColor={activeColor}
                fillColor={activeColor}
                // Animated zoom-to-deck when the user picks one to
                // edit. `key` on FitBounds remounts it on every
                // version bump so re-picking the same deck still
                // re-fits if the user has panned away. Falls back to
                // the drawer's default full-image fit when there's
                // no active focus.
                fitter={
                  focusFit ? (
                    <FitBounds
                      key={focusFit.version}
                      bounds={focusFit.bounds}
                      padding={[40, 40]}
                      refitOnChange
                      animate
                    />
                  ) : undefined
                }
              >
                <DeckOverlayLayer
                  overlays={overlays}
                  imageWidth={gaImageWidth}
                  imageHeight={gaImageHeight}
                />
              </PolygonDrawer>
            </div>
          </div>
        )}

        {/* Right: form and list — capped narrow on desktop so the GA
            column gets most of the horizontal space; full-width on
            mobile (where the mobile-tab visibility class controls
            whether it renders at all). */}
        <div
          className={`${
            activeMobileTab === "decks" || !showGAPreview ? "block" : "hidden"
          } lg:block ${
            showGAPreview
              ? "lg:w-80 lg:flex-shrink-0 flex flex-col"
              : "flex-1"
          }`}
        >
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

              {/* Side profiles — extra polygons on the same GA, one
                  per port/starboard/side view. Each row carries the
                  name input + a switch-to-this CTA; the polygon for
                  the active row gets drawn in the canvas. */}
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

                <ul className="space-y-1.5">
                  <li
                    onClick={handleSelectDeckTarget}
                    className={`flex items-center gap-2 p-2 rounded-md border cursor-pointer text-sm ${
                      isPrimaryActive
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
                    {(polygons.all[PRIMARY_KEY]?.polygon.length ?? 0) >=
                      MIN_VERTICES && (
                      <span className="text-xs text-gray-500 dark:text-gray-400">
                        ✓
                      </span>
                    )}
                  </li>

                  {sideProfilesMeta.map((sp) => {
                    const isActive = activeId === sp.id;
                    const snap = polygons.all[sp.id];
                    const drawn =
                      (snap?.polygon.length ?? 0) >= MIN_VERTICES;
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
                            {drawn ? t("editDrawing") : t("draw")}
                          </button>
                        )}
                        {drawn && (
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

          <hr className="border-gray-200 dark:border-gray-700 my-4" />

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
                {pendingDecks.map((deck) => {
                  const hasAreas = (deck.areaCount ?? 0) > 0;
                  return (
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
                        {hasAreas && (
                          <p className="text-xs text-gray-500 dark:text-gray-400 mt-0.5">
                            {t("areaCount", { count: deck.areaCount ?? 0 })}
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
                        disabled={hasAreas}
                        className="p-1.5 text-gray-500 hover:text-red-600 dark:text-gray-400 dark:hover:text-red-400 transition-colors disabled:opacity-40 disabled:cursor-not-allowed disabled:hover:text-gray-500 dark:disabled:hover:text-gray-400"
                        title={
                          hasAreas
                            ? t("cannotDeleteHasAreas", {
                                count: deck.areaCount ?? 0,
                              })
                            : tCommon("remove")
                        }
                      >
                        <TrashIcon className="w-4 h-4" />
                      </button>
                    </div>
                  </li>
                  );
                })}
              </ul>
            )}
          </div>
        </div>
      </div>
      </div>
    </Modal>
  );
}
