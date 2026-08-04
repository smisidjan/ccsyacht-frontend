"use client";

import { useTranslations } from "next-intl";
import { Link } from "@/i18n/navigation";
import {
  RectangleGroupIcon,
  MapPinIcon,
  ChevronRightIcon,
} from "@heroicons/react/24/outline";
import ProgressCircle from "@/app/components/ui/ProgressCircle";
import type { Area, Deck } from "@/lib/api/types";

interface DeckCardProps {
  deck: Deck;
  /** Areas belonging to this deck — caller filters `containedInPlace`
   *  (and applies any active search/filter) before passing them in, so
   *  this component stays a plain renderer. */
  areas: Area[];
  projectId: string;
}

/** Deck-first counterpart to `AreaCard` for the overview tab's "Deck
 *  view" — one card per deck, listing the areas defined on it so the
 *  user can see the deck/area hierarchy at a glance instead of a flat
 *  area grid. */
export default function DeckCard({ deck, areas, projectId }: DeckCardProps) {
  const t = useTranslations("projectDetail");

  const sideProfiles = deck.sideProfilePolygons ?? [];

  // Which of this deck's side profiles a given area is *also* drawn
  // on, beyond the primary top-down view — an area's `polygons[]`
  // entries are keyed by `parentPolygonId`, matching either the deck's
  // primary polygon or one of its side profiles. Top-view-only areas
  // (the common case) return an empty list and get no tag.
  const sideProfilesForArea = (area: Area) => {
    if (sideProfiles.length === 0 || !area.polygons) return [];
    return sideProfiles.filter((sp) =>
      area.polygons!.some((p) => p.parentPolygonId === sp.identifier)
    );
  };

  // Deck-level progress — stage counts summed across every area on
  // this deck, same completed/total ratio `AreaCard` shows per area,
  // just rolled up one level.
  const totalStages = areas.reduce((sum, a) => sum + (a.stageCount ?? 0), 0);
  const completedStages = areas.reduce(
    (sum, a) => sum + (a.completedStageCount ?? 0),
    0
  );
  const deckProgress =
    totalStages > 0 ? Math.round((completedStages / totalStages) * 100) : 0;

  return (
    <div className="bg-white dark:bg-gray-800 rounded-xl shadow-lg dark:shadow-gray-900/30 border border-gray-100 dark:border-gray-700 p-6 flex flex-col transition-all hover:shadow-xl">
      <div className="flex items-start justify-between gap-3 mb-1">
        <div className="flex items-start gap-3 min-w-0">
          <RectangleGroupIcon className="w-6 h-6 text-blue-600 flex-shrink-0" />
          <div className="min-w-0">
            <h3
              className="text-lg font-semibold text-gray-900 dark:text-white truncate"
              title={deck.name}
            >
              {deck.name}
            </h3>
            {deck.description && (
              <p className="text-sm text-gray-600 dark:text-gray-400 mt-0.5 line-clamp-2">
                {deck.description}
              </p>
            )}
          </div>
        </div>
        {areas.length > 0 && (
          <ProgressCircle percentage={deckProgress} size={56} strokeWidth={4} />
        )}
      </div>
      {areas.length > 0 && (
        <p className="text-xs text-gray-500 dark:text-gray-400 pl-9 mb-3">
          {t("areasSection.deckStagesCompleted", {
            completed: completedStages,
            total: totalStages,
          })}
        </p>
      )}

      {/* Side profiles attached to this deck — shown as violet pills
          (same tone the GA tab uses for side profiles) right under the
          header so they're visible before scanning the area list. */}
      {sideProfiles.length > 0 && (
        <div className="flex items-center flex-wrap gap-1.5 mb-4 pl-9">
          {sideProfiles.map((sp) => (
            <span
              key={sp.identifier}
              className="inline-flex items-center px-2 py-0.5 rounded-full text-xs font-medium bg-violet-50 dark:bg-violet-900/20 text-violet-700 dark:text-violet-300 border border-violet-100 dark:border-violet-800"
            >
              {sp.name}
            </span>
          ))}
        </div>
      )}
      {sideProfiles.length === 0 && <div className="mb-4" />}

      <div className="flex-1">
        {areas.length === 0 ? (
          <p className="text-sm italic text-gray-400 dark:text-gray-500 py-3">
            {t("areasSection.noAreasOnDeck")}
          </p>
        ) : (
          <ul className="space-y-1">
            {areas.map((area) => {
              const total = area.stageCount ?? 0;
              const completed = area.completedStageCount ?? 0;
              const areaSideProfiles = sideProfilesForArea(area);
              return (
                <li key={area.identifier}>
                  <Link
                    href={`/dashboard/projects/${projectId}/areas/${area.identifier}`}
                    className="flex items-center justify-between gap-2 px-3 py-2 rounded-lg hover:bg-gray-50 dark:hover:bg-gray-700/60 transition-colors group"
                  >
                    <span className="flex items-center gap-2 min-w-0">
                      <MapPinIcon className="w-3.5 h-3.5 text-gray-400 flex-shrink-0" />
                      <span
                        className="text-sm text-gray-900 dark:text-white truncate"
                        title={area.name}
                      >
                        {area.name}
                      </span>
                      {/* Side-profile tags sit right next to the name and
                          compete for its space — hidden on hover along
                          with the trailing stage count/chevron so a
                          truncated name gets the whole row to expand into. */}
                      {areaSideProfiles.map((sp) => (
                        <span
                          key={sp.identifier}
                          className="flex-shrink-0 inline-flex items-center px-1.5 py-0.5 rounded text-[10px] font-medium bg-violet-50 dark:bg-violet-900/20 text-violet-700 dark:text-violet-300 group-hover:hidden"
                          title={t("areasSection.alsoOnSideProfile", { name: sp.name })}
                        >
                          {sp.name}
                        </span>
                      ))}
                    </span>
                    {/* Hidden on hover so the name span above (which
                        shrinks to fit the row) can expand into the
                        freed-up space instead of staying truncated. */}
                    <span className="flex items-center gap-1.5 flex-shrink-0 group-hover:hidden">
                      {total > 0 && (
                        <span className="text-xs text-gray-500 dark:text-gray-400">
                          {completed}/{total}
                        </span>
                      )}
                      <ChevronRightIcon className="w-3.5 h-3.5 text-gray-300 dark:text-gray-600 group-hover:text-gray-500 dark:group-hover:text-gray-400 transition-colors" />
                    </span>
                  </Link>
                </li>
              );
            })}
          </ul>
        )}
      </div>

      <div className="mt-4 pt-3 border-t border-gray-100 dark:border-gray-700 text-xs text-gray-500 dark:text-gray-400">
        {t("areasSection.areasOnDeckCount", { count: areas.length })}
      </div>
    </div>
  );
}
