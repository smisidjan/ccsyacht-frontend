"use client";

import { useCallback, useEffect, useMemo, useState } from "react";
import { useTranslations } from "next-intl";
import dynamic from "next/dynamic";
import Modal from "@/app/components/ui/Modal";
import DeleteConfirmModal from "@/app/components/modals/DeleteConfirmModal";
import Button from "@/app/components/ui/Button";
import FormInput from "@/app/components/ui/FormInput";
import { decksApi } from "@/lib/api/decks";
import { useToast } from "@/app/context/ToastContext";
import { PencilIcon, PlusIcon, TrashIcon } from "@heroicons/react/24/outline";
import type { Deck, AreaPolygonPoint, DeckSideProfilePolygonInput } from "@/lib/api/types";
import { usePlacementPolygons } from "@/lib/hooks/usePlacementPolygons";
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

const MIN_VERTICES = 3;

interface CreateDeckModalProps {
  isOpen: boolean;
  onClose: () => void;
  projectId: string;
  /** Called once on modal close *if* the user made any changes. Lets
   *  the parent refetch its own deck data so anything visible behind
   *  the modal (the GA viewer, reporting tab, etc.) stays in sync.
   *  We deliberately don't call this per-action — the resulting
   *  parent re-render cascades back through `existingDecks` and
   *  somehow tears down our Modal mid-flow. Batching at close-time
   *  side-steps it. */
  onSuccess?: () => void;
  gaImageUrl?: string;
  gaImageWidth?: number;
  gaImageHeight?: number;
  /** Seed the working list when the modal opens. The seed runs only
   *  once per open, so refetch-driven prop changes can't restart the
   *  cascade that was closing the modal. */
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

  // Working copy of the deck list. Seeded once per modal open from
  // `existingDecks` (see the load effect below) and then mutated
  // optimistically by the action handlers. The parent only sees the
  // changes when the modal closes, via the `hasChanges` flag.
  const [pendingDecks, setPendingDecks] = useState<PendingDeck[]>([]);
  /** Tracks whether the user actually persisted anything this
   *  session so `handleClose` knows whether to call `onSuccess` and
   *  refetch the parent. Reset to `false` on each open. */
  const [hasChanges, setHasChanges] = useState(false);

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

  /** Mobile-only view switcher — three panes share the screen on
   *  desktop (GA, add/edit form, saved-decks list) so we expose them
   *  as tabs below `lg` where there isn't room. Default to the GA
   *  viewer; the pencil-edit flow also jumps here so the user lands
   *  on the freshly-framed polygon. */
  const [activeMobileTab, setActiveMobileTab] = useState<
    "ga" | "form" | "list"
  >("ga");

  /** Id of the deck that was just added/updated. Used to flash a
   *  ring + brand background on its list row so the user sees where
   *  their click landed — even when the form tab is keeping the
   *  saved-list out of view. Cleared after a short delay. */
  const [recentlyChangedDeckId, setRecentlyChangedDeckId] = useState<
    string | null
  >(null);

  /** Deck pending an explicit user confirmation before delete. The
   *  trash icon opens DeleteConfirmModal with this value populated;
   *  confirming there fires the DELETE API call. */
  const [deckPendingDelete, setDeckPendingDelete] = useState<PendingDeck | null>(
    null
  );

  // Auto-clear the highlight a couple of seconds after it's set —
  // long enough to catch the user's eye without sticking around once
  // they've moved on.
  useEffect(() => {
    if (!recentlyChangedDeckId) return;
    const handle = setTimeout(
      () => setRecentlyChangedDeckId(null),
      2500
    );
    return () => clearTimeout(handle);
  }, [recentlyChangedDeckId]);

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

  // Seed the working list once per open from the parent snapshot,
  // and pin the active draw target so clicks land on the polygons
  // hook immediately. Critically, this depends *only* on `isOpen` —
  // a later refetch-driven change to `existingDecks` must not
  // re-seed mid-flight (that's what was re-triggering the modal-
  // close cascade).
  useEffect(() => {
    if (!isOpen) return;
    setPendingDecks((existingDecks ?? []).map(apiDeckToPendingDeck));
    setHasChanges(false);
    polygons.setActive(PRIMARY_KEY);
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [isOpen]);

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

  // Persist on every Add/Update Deck click. Pulls the polygon
  // snapshot for each draw target straight from the polygons hook,
  // builds the API payload inline, and lets `refetchDecksInModal`
  // refresh the list view.
  const handleAddDeck = async () => {
    const trimmedName = name.trim();
    if (!trimmedName || isSubmitting) return;

    const primarySnap = polygons.all[PRIMARY_KEY] ?? {
      polygon: [],
      isClosed: false,
    };
    const deckPolygonPayload =
      primarySnap.polygon.length >= MIN_VERTICES
        ? { name: trimmedName, points: primarySnap.polygon }
        : null;

    const sideProfilePolygonsPayload: DeckSideProfilePolygonInput[] =
      sideProfilesMeta
        .map((meta) => ({
          meta,
          snap: polygons.all[meta.id] ?? { polygon: [], isClosed: false },
        }))
        .filter(
          ({ meta, snap }) =>
            snap.polygon.length >= MIN_VERTICES &&
            meta.namePrefix.trim() !== ""
        )
        .map(({ meta, snap }) => ({
          ...(meta.identifier ? { identifier: meta.identifier } : {}),
          name: buildSideProfileName(meta.namePrefix, trimmedName),
          points: snap.polygon,
        }));

    setIsSubmitting(true);
    setError(null);
    try {
      let highlightId: string;
      if (editingDeckId) {
        const updated = await decksApi.update(projectId, editingDeckId, {
          name: trimmedName,
          description: description.trim() || undefined,
          ...(deckPolygonPayload ? { deck_polygon: deckPolygonPayload } : {}),
          side_profile_polygons: sideProfilePolygonsPayload,
        });
        const refreshed = apiDeckToPendingDeck(updated);
        setPendingDecks((prev) =>
          prev.map((d) => (d.id === editingDeckId ? refreshed : d))
        );
        highlightId = editingDeckId;
        showToast("success", t("deckUpdatedLocal", { name: trimmedName }));
      } else {
        const created = await decksApi.create(projectId, {
          name: trimmedName,
          description: description.trim() || undefined,
          ...(deckPolygonPayload ? { deck_polygon: deckPolygonPayload } : {}),
          ...(sideProfilePolygonsPayload.length > 0
            ? { side_profile_polygons: sideProfilePolygonsPayload }
            : {}),
        });
        setPendingDecks((prev) => [...prev, apiDeckToPendingDeck(created)]);
        highlightId = created.identifier;
        showToast("success", t("deckAddedLocal", { name: trimmedName }));
      }

      setHasChanges(true);
      setRecentlyChangedDeckId(highlightId);
      resetForm();
    } catch (err) {
      setError(
        err instanceof Error
          ? err.message
          : editingDeckId
            ? t("updateError")
            : t("createError")
      );
    } finally {
      setIsSubmitting(false);
    }
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

  // Trash icon just opens the confirmation modal. The actual API
  // call lives in `confirmRemoveDeck` and only fires after the user
  // says yes — keeps a misclick from silently nuking work.
  const handleRemoveDeck = (deck: PendingDeck) => {
    setDeckPendingDelete(deck);
  };

  const confirmRemoveDeck = async () => {
    if (!deckPendingDelete) return;
    const deck = deckPendingDelete;
    if (deck.isExisting) {
      await decksApi.delete(projectId, deck.id);
    }
    setPendingDecks((prev) => prev.filter((d) => d.id !== deck.id));
    if (editingDeckId === deck.id) resetForm();
    setDeckPendingDelete(null);
    setHasChanges(true);
  };

  const handleCancelEdit = () => resetForm();

  const handleClose = () => {
    resetForm();
    if (hasChanges) {
      onSuccess?.();
    }
    onClose();
  };

  const handleClearAll = async () => {
    // With per-deck auto-save there's nothing to "clear" locally
    // beyond the API state. The button now deletes every deck on
    // the project — gated by a quick confirm to keep stray clicks
    // from nuking everything.
    if (pendingDecks.length === 0) return;
    if (
      typeof window !== "undefined" &&
      !window.confirm(t("clearAllConfirm"))
    ) {
      return;
    }
    setIsSubmitting(true);
    setError(null);
    try {
      for (const deck of pendingDecks) {
        if (deck.isExisting) {
          await decksApi.delete(projectId, deck.id);
        }
      }
      setPendingDecks([]);
      setHasChanges(true);
      resetForm();
    } catch (err) {
      setError(err instanceof Error ? err.message : t("deleteError"));
    } finally {
      setIsSubmitting(false);
    }
  };

  // ============ Drawer wiring ============

  const activeId = polygons.activeId ?? PRIMARY_KEY;
  const isPrimaryActive = activeId === PRIMARY_KEY;
  const activeColor = isPrimaryActive ? DECK_COLOR : SIDE_PROFILE_COLOR;
  // Surfaced next to the canvas so it's always obvious which shape a
  // click will draw into — the only way to change it is the pencil/row
  // clicks in the right-hand list, never a click on the canvas itself.
  // Side profiles also carry the parent deck's name (same "X - Deck"
  // format used everywhere else for them) so it's clear which deck the
  // profile you're drawing belongs to, not just its own prefix.
  const deckDisplayName = name.trim() || t("primaryDeckRectangle");
  const activeTargetLabel = isPrimaryActive
    ? deckDisplayName
    : buildSideProfileName(
        sideProfilesMeta.find((sp) => sp.id === activeId)?.namePrefix.trim() ||
          t("sideProfile"),
        deckDisplayName
      );

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
    // the actively-drawn one. Not clickable, same reasoning as the
    // other-decks overlays above: while drawing a fresh side profile
    // (an empty, not-yet-started polygon) a click can easily land
    // inside the deck rectangle's bounds, e.g. because the two shapes
    // visually overlap — clicking-to-switch there would silently
    // swap the active target back to the deck and swallow the point
    // the user meant to place. Switching target is exclusively done
    // via the pencil/row clicks in the right-hand list.
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
      });
    }
    return out;
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
    <>
    <Modal
      isOpen={isOpen}
      onClose={handleClose}
      title={editMode ? t("manageDecks") : t("defineDecks")}
      size="2xl"
      error={error}
      // The draft (form input, polygon mid-draw, side-profile edits)
      // only persists when the user dismisses via an explicit Close
      // or Save Changes — a stray backdrop click or Escape press
      // would silently lose work the moment it landed.
      disableBackdropClick
      disableEscClose
      actions={[
        // With per-deck auto-save the old batched "Save Changes" step
        // is gone — Done just dismisses the modal.
        {
          label: t("done"),
          onClick: handleClose,
          variant: "primary",
        },
      ]}
    >
      <div className="flex flex-col gap-4">
        {/* Mobile-only tab switcher. The desktop layout fits all
            three panels side by side; below `lg` we expose them as
            tabs so the GA viewer can actually breathe and the form
            + list each get their own focused screen. */}
        {showGAPreview && (
          <div className="lg:hidden flex p-1 bg-gray-100 dark:bg-gray-800 rounded-lg gap-1">
            {(
              [
                { id: "ga", label: t("mobileTabGA") },
                {
                  id: "form",
                  label: editingDeckId
                    ? t("mobileTabEditDeck")
                    : t("mobileTabAddDeck"),
                },
                {
                  id: "list",
                  label: t("mobileTabDeckList", {
                    count: pendingDecks.length,
                  }),
                },
              ] as const
            ).map((tab) => (
              <button
                key={tab.id}
                type="button"
                onClick={() => setActiveMobileTab(tab.id)}
                className={`flex-1 py-2 text-xs sm:text-sm font-medium rounded-md transition-colors ${
                  activeMobileTab === tab.id
                    ? "bg-white dark:bg-gray-700 text-gray-900 dark:text-white shadow-sm"
                    : "text-gray-600 dark:text-gray-400"
                }`}
              >
                {tab.label}
              </button>
            ))}
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
            {/* Sticky so it stays in view once the (potentially tall,
                portrait) GA drawing pushes the canvas below the fold and
                the modal body scrolls — same reasoning as PolygonDrawer's
                own sticky toolbar further down. Solid background (not a
                translucent tint) so scrolled-past content doesn't show
                through while it's pinned. */}
            <div
              className={`sticky top-0 z-[1000] flex items-center gap-2 mb-3 px-3 py-2 rounded-md border ${
                isPrimaryActive
                  ? "border-blue-500 bg-blue-50 dark:bg-blue-950"
                  : "border-purple-500 bg-purple-50 dark:bg-purple-950"
              }`}
            >
              <span
                className="w-2.5 h-2.5 rounded-sm flex-shrink-0"
                style={{ backgroundColor: activeColor }}
                aria-hidden="true"
              />
              <span
                className="text-sm font-medium truncate"
                style={{ color: activeColor }}
              >
                {t("nowDrawing", { target: activeTargetLabel })}
              </span>
            </div>
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

        {/* Right column wrapper — capped narrow on desktop so the GA
            column gets most of the horizontal space; full-width on
            mobile. Visible when either the form or list tab is
            active (or when there's no GA preview at all). The inner
            sections below switch between form and list on mobile. */}
        <div
          className={`${
            activeMobileTab !== "ga" || !showGAPreview ? "block" : "hidden"
          } lg:block ${
            showGAPreview
              ? "lg:w-80 lg:flex-shrink-0 flex flex-col"
              : "flex-1"
          }`}
        >
          {/* Right-column tab switcher — visible on laptops + desktops
              where the GA panel takes the left half, so the narrower
              right column can stay focused on either the form or the
              list at a time. Phones already have the 3-button tab bar
              above the whole layout. */}
          {showGAPreview && (
            <div className="hidden lg:flex p-1 bg-gray-100 dark:bg-gray-800 rounded-lg gap-1 mb-4">
              <button
                type="button"
                onClick={() => setActiveMobileTab("form")}
                className={`flex-1 py-1.5 text-sm font-medium rounded-md transition-colors ${
                  activeMobileTab !== "list"
                    ? "bg-white dark:bg-gray-700 text-gray-900 dark:text-white shadow-sm"
                    : "text-gray-600 dark:text-gray-400"
                }`}
              >
                {editingDeckId
                  ? t("mobileTabEditDeck")
                  : t("mobileTabAddDeck")}
              </button>
              <button
                type="button"
                onClick={() => setActiveMobileTab("list")}
                className={`flex-1 py-1.5 text-sm font-medium rounded-md transition-colors ${
                  activeMobileTab === "list"
                    ? "bg-white dark:bg-gray-700 text-gray-900 dark:text-white shadow-sm"
                    : "text-gray-600 dark:text-gray-400"
                }`}
              >
                {t("mobileTabDeckList", { count: pendingDecks.length })}
              </button>
            </div>
          )}

          <div
            className={`${
              activeMobileTab === "form" || !showGAPreview ? "block" : "hidden"
            } ${
              activeMobileTab === "list" && showGAPreview
                ? "lg:hidden"
                : "lg:block"
            } mb-4`}
          >
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
                type="button"
                onClick={handleAddDeck}
                disabled={!name.trim()}
                variant="secondary"
              >
                {editingDeckId ? t("updateDeck") : t("addDeck")}
              </Button>
              {editingDeckId && (
                <Button
                  type="button"
                  onClick={handleCancelEdit}
                  variant="ghost"
                >
                  {tCommon("cancel")}
                </Button>
              )}
            </div>
          </div>

          {/* Divider only when form + list stack inside one column,
              i.e. the no-GA fallback. With the GA preview the right
              column tabs between form and list, so the rule would
              just sit between two hidden siblings. */}
          {!showGAPreview && (
            <hr className="border-gray-200 dark:border-gray-700 my-4" />
          )}

          <div
            className={`${
              activeMobileTab === "list" || !showGAPreview ? "block" : "hidden"
            } ${
              activeMobileTab !== "list" && showGAPreview
                ? "lg:hidden"
                : "lg:block"
            } flex-1 overflow-auto`}
          >
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
                  const isJustChanged = recentlyChangedDeckId === deck.id;
                  return (
                  <li
                    key={deck.id}
                    className={`flex items-center justify-between p-3 rounded-lg border transition-colors ${
                      isJustChanged
                        ? "border-emerald-500 bg-emerald-50 dark:bg-emerald-900/20 ring-2 ring-emerald-300 dark:ring-emerald-700"
                        : editingDeckId === deck.id
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
                        onClick={() => handleRemoveDeck(deck)}
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

    {/* Delete confirmation — fires the actual DELETE API call only
        after the user explicitly confirms. The `areaCount > 0` guard
        on the trash button already blocks the backend-rejected
        case, but the confirm step also surfaces the deck name so a
        misclick can be reversed. */}
    {deckPendingDelete && (
      <DeleteConfirmModal
        isOpen={!!deckPendingDelete}
        onClose={() => setDeckPendingDelete(null)}
        onConfirm={confirmRemoveDeck}
        title={t("deleteDeckTitle")}
        message={t("deleteDeckMessage", { name: deckPendingDelete.name })}
        successMessage={t("deleteDeckSuccess", {
          name: deckPendingDelete.name,
        })}
        errorMessage={t("deleteDeckError")}
        confirmLabel={tCommon("delete")}
      />
    )}
    </>
  );
}
