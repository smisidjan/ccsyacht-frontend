"use client";

import { useMemo, useState } from "react";
import { useTranslations } from "next-intl";
import {
  ChartBarIcon,
  CheckCircleIcon,
  ClockIcon,
  CubeIcon,
  DocumentChartBarIcon,
  ExclamationTriangleIcon,
  RectangleStackIcon,
  Squares2X2Icon,
} from "@heroicons/react/24/outline";
import LoadingSkeleton from "@/app/components/ui/LoadingSkeleton";
import Alert from "@/app/components/ui/Alert";
import DonutChart from "@/app/components/ui/DonutChart";
import { useAreas } from "@/lib/api/areas";
import { useDecks } from "@/lib/api/decks";
import { useDocumentTypes } from "@/lib/api/document-types";
import { useProjectPunchlistItems } from "@/lib/api/punchlist-items";
import { useMinimumLoadingTime } from "@/lib/hooks/useMinimumLoadingTime";

interface ReportingTabProps {
  projectId: string;
}

interface AreaRow {
  identifier: string;
  name: string;
  stageCount: number;
  completed: number;
  progress: number;
}

type DeckStatus = "not_started" | "in_progress" | "completed" | "empty";

interface DeckGroup {
  identifier: string;
  name: string;
  stageCount: number;
  completed: number;
  progress: number;
  status: DeckStatus;
  areas: AreaRow[];
}

const UNGROUPED_KEY = "__ungrouped__";

export default function ReportingTab({ projectId }: ReportingTabProps) {
  const t = useTranslations("projectDetail.reporting");

  const {
    data: areas,
    loading: rawAreasLoading,
    error: areasError,
  } = useAreas(projectId);
  const {
    data: decks,
    loading: rawDecksLoading,
    error: decksError,
  } = useDecks(projectId);
  const {
    data: documentTypes,
    loading: rawDocsLoading,
    error: docsError,
  } = useDocumentTypes(projectId, { includeAssignees: false });

  // Punchlist totals come from five parallel `per_page: 1` queries —
  // we only need `pagination.total` per axis, not the items
  // themselves. Same pattern OpenPunchlistBadge uses on the area
  // detail view, so the request shapes stay cacheable.
  const openPunchlist = useProjectPunchlistItems(projectId, {
    status: "open",
    per_page: 1,
  });
  const inProgressPunchlist = useProjectPunchlistItems(projectId, {
    status: "in_progress",
    per_page: 1,
  });
  const donePunchlist = useProjectPunchlistItems(projectId, {
    status: "done",
    per_page: 1,
  });
  const cancelledPunchlist = useProjectPunchlistItems(projectId, {
    status: "cancelled",
    per_page: 1,
  });
  const overduePunchlist = useProjectPunchlistItems(projectId, {
    overdue: true,
    per_page: 1,
  });

  const loading = useMinimumLoadingTime(
    rawAreasLoading ||
      rawDecksLoading ||
      rawDocsLoading ||
      (openPunchlist.loading && openPunchlist.pagination === null) ||
      (inProgressPunchlist.loading && inProgressPunchlist.pagination === null) ||
      (donePunchlist.loading && donePunchlist.pagination === null) ||
      (cancelledPunchlist.loading && cancelledPunchlist.pagination === null) ||
      (overduePunchlist.loading && overduePunchlist.pagination === null)
  );
  const error =
    areasError ||
    decksError ||
    docsError ||
    openPunchlist.error ||
    inProgressPunchlist.error ||
    donePunchlist.error ||
    cancelledPunchlist.error ||
    overduePunchlist.error;

  const punchlist = {
    open: openPunchlist.pagination?.total ?? 0,
    inProgress: inProgressPunchlist.pagination?.total ?? 0,
    done: donePunchlist.pagination?.total ?? 0,
    cancelled: cancelledPunchlist.pagination?.total ?? 0,
    overdue: overduePunchlist.pagination?.total ?? 0,
  };
  const punchlistTotal =
    punchlist.open + punchlist.inProgress + punchlist.done + punchlist.cancelled;

  const report = useMemo(() => {
    const areasArr = areas ?? [];
    const decksArr = decks ?? [];
    const typesArr = documentTypes ?? [];

    const totalStages = areasArr.reduce((sum, a) => sum + (a.stageCount ?? 0), 0);
    const completedStages = areasArr.reduce(
      (sum, a) => sum + (a.completedStageCount ?? 0),
      0
    );
    const inProgressStages = areasArr.reduce(
      (sum, a) => sum + (a.inProgressStageCount ?? 0),
      0
    );
    // Whatever isn't done or in flight is treated as not-yet-started;
    // covers `not_started`, `pending_signoff`, and `rejected` until
    // the backend ships a finer breakdown.
    const notStartedStages = Math.max(
      0,
      totalStages - completedStages - inProgressStages
    );

    const totalAreas = areasArr.length;
    const completedAreas = areasArr.filter(
      (a) => (a.stageCount ?? 0) > 0 && a.completedStageCount === a.stageCount
    ).length;

    const stagesPerDeck = new Map<string, { total: number; completed: number }>();
    for (const area of areasArr) {
      const deckId = area.containedInPlace?.identifier ?? UNGROUPED_KEY;
      const bucket = stagesPerDeck.get(deckId) ?? { total: 0, completed: 0 };
      bucket.total += area.stageCount ?? 0;
      bucket.completed += area.completedStageCount ?? 0;
      stagesPerDeck.set(deckId, bucket);
    }
    const totalDecks = decksArr.length;
    const completedDecks = decksArr.filter((deck) => {
      const bucket = stagesPerDeck.get(deck.identifier);
      return bucket && bucket.total > 0 && bucket.completed === bucket.total;
    }).length;

    const totalDocuments = typesArr.reduce(
      (sum, t) => sum + (t.documentCount ?? 0),
      0
    );

    const overallProgress = totalStages > 0
      ? Math.round((completedStages / totalStages) * 100)
      : 0;

    return {
      overallProgress,
      totalStages,
      completedStages,
      inProgressStages,
      notStartedStages,
      totalAreas,
      completedAreas,
      totalDecks,
      completedDecks,
      totalDocuments,
    };
  }, [areas, decks, documentTypes]);

  const deckGroups = useMemo<DeckGroup[]>(() => {
    if (!decks && !areas) return [];

    const areaRowsByDeck = new Map<string, AreaRow[]>();
    for (const area of areas ?? []) {
      const deckId = area.containedInPlace?.identifier ?? UNGROUPED_KEY;
      const row: AreaRow = {
        identifier: area.identifier,
        name: area.name,
        stageCount: area.stageCount ?? 0,
        completed: area.completedStageCount ?? 0,
        progress:
          (area.stageCount ?? 0) > 0
            ? Math.round(((area.completedStageCount ?? 0) / area.stageCount) * 100)
            : 0,
      };
      const list = areaRowsByDeck.get(deckId) ?? [];
      list.push(row);
      areaRowsByDeck.set(deckId, list);
    }

    const rawAreas = areas ?? [];
    for (const [deckId, rows] of areaRowsByDeck) {
      rows.sort((a, b) => {
        const aPos = rawAreas.find((x) => x.identifier === a.identifier)?.position ?? 0;
        const bPos = rawAreas.find((x) => x.identifier === b.identifier)?.position ?? 0;
        return aPos - bPos;
      });
      areaRowsByDeck.set(deckId, rows);
    }

    const buildGroup = (
      identifier: string,
      name: string,
      areasInDeck: AreaRow[]
    ): DeckGroup => {
      const stageCount = areasInDeck.reduce((s, a) => s + a.stageCount, 0);
      const completed = areasInDeck.reduce((s, a) => s + a.completed, 0);
      const progress = stageCount > 0 ? Math.round((completed / stageCount) * 100) : 0;
      let status: DeckStatus = "empty";
      if (stageCount > 0) {
        if (completed === 0) status = "not_started";
        else if (completed === stageCount) status = "completed";
        else status = "in_progress";
      }
      return { identifier, name, stageCount, completed, progress, status, areas: areasInDeck };
    };

    const groups: DeckGroup[] = [...(decks ?? [])]
      .sort((a, b) => (a.position ?? 0) - (b.position ?? 0))
      .map((deck) =>
        buildGroup(
          deck.identifier,
          deck.name,
          areaRowsByDeck.get(deck.identifier) ?? []
        )
      );

    const ungroupedAreas = areaRowsByDeck.get(UNGROUPED_KEY);
    if (ungroupedAreas && ungroupedAreas.length > 0) {
      groups.push(buildGroup(UNGROUPED_KEY, t("ungroupedDeck"), ungroupedAreas));
    }

    return groups;
  }, [decks, areas, t]);

  // Top document types by upload count — surfaces what's actively
  // being collected on the project. Empty types are filtered out so
  // a fresh project doesn't render a wall of zero-bars.
  const topDocumentTypes = useMemo(() => {
    if (!documentTypes) return [];
    return [...documentTypes]
      .filter((d) => (d.documentCount ?? 0) > 0)
      .sort((a, b) => (b.documentCount ?? 0) - (a.documentCount ?? 0))
      .slice(0, 6);
  }, [documentTypes]);

  if (loading) {
    return (
      <div className="space-y-4">
        <LoadingSkeleton type="list" rows={6} />
      </div>
    );
  }

  if (error) {
    return <Alert type="error" message={error.message || t("loadError")} />;
  }

  return <ReportingView
    t={t}
    report={report}
    deckGroups={deckGroups}
    topDocumentTypes={topDocumentTypes}
    punchlist={punchlist}
    punchlistTotal={punchlistTotal}
  />;
}

interface PunchlistTotals {
  open: number;
  inProgress: number;
  done: number;
  cancelled: number;
  overdue: number;
}

interface ReportingViewProps {
  t: ReturnType<typeof useTranslations>;
  report: {
    overallProgress: number;
    totalStages: number;
    completedStages: number;
    inProgressStages: number;
    notStartedStages: number;
    totalAreas: number;
    completedAreas: number;
    totalDecks: number;
    completedDecks: number;
    totalDocuments: number;
  };
  deckGroups: DeckGroup[];
  topDocumentTypes: { identifier: string; name: string; documentCount: number }[];
  punchlist: PunchlistTotals;
  punchlistTotal: number;
}

function ReportingView({
  t,
  report,
  deckGroups,
  topDocumentTypes,
  punchlist,
  punchlistTotal,
}: ReportingViewProps) {
  const [showEmptyDecks, setShowEmptyDecks] = useState(false);
  const emptyDecks = useMemo(
    () => deckGroups.filter((d) => d.status === "empty"),
    [deckGroups]
  );
  const activeDecks = useMemo(
    () => deckGroups.filter((d) => d.status !== "empty"),
    [deckGroups]
  );
  const visibleDecks = showEmptyDecks ? deckGroups : activeDecks;

  const isEmpty = deckGroups.length === 0;
  const stageSegments = [
    { value: report.completedStages, colorClass: "text-emerald-500" },
    { value: report.inProgressStages, colorClass: "text-blue-500" },
    { value: report.notStartedStages, colorClass: "text-gray-300 dark:text-gray-600" },
  ];

  return (
    <div className="space-y-6">
      {/* Header */}
      <div>
        <h2 className="text-xl font-semibold text-gray-900 dark:text-white">
          {t("title")}
        </h2>
        <p className="text-sm text-gray-600 dark:text-gray-400 mt-1">
          {t("subtitle")}
        </p>
      </div>

      {/* KPIs */}
      <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-4">
        <KpiCard
          label={t("overallProgress")}
          value={`${report.overallProgress}%`}
          caption={t("overallProgressCaption")}
          icon={ChartBarIcon}
          tint="indigo"
        />
        <KpiCard
          label={t("decksCompleted")}
          value={`${report.completedDecks}/${report.totalDecks}`}
          caption={t("decksCaption")}
          icon={CubeIcon}
          tint="violet"
        />
        <KpiCard
          label={t("areasCompleted")}
          value={`${report.completedAreas}/${report.totalAreas}`}
          caption={t("areasCaption")}
          icon={Squares2X2Icon}
          tint="blue"
        />
        <KpiCard
          label={t("tasksCompleted")}
          value={`${report.completedStages}/${report.totalStages}`}
          caption={t("stagesCaption")}
          icon={RectangleStackIcon}
          tint="emerald"
        />
      </div>

      {/* Stage status + Punchlist overview — paired donuts so the
          dashboard reads as "where the project is" (stages) next to
          "what still needs attention" (punchlist). */}
      <div className="grid grid-cols-1 lg:grid-cols-2 gap-4 items-start">
        <SectionCard
          title={t("statusOverview")}
          subtitle={t("statusOverviewSubtitle")}
        >
          {report.totalStages === 0 ? (
            <EmptyBlock message={t("noStagesYet")} icon={RectangleStackIcon} />
          ) : (
            <div className="flex flex-col sm:flex-row items-center sm:items-stretch gap-6">
              <DonutChart
                segments={stageSegments}
                size={180}
                strokeWidth={20}
                centerSlot={
                  <>
                    <span className="text-3xl font-bold text-gray-900 dark:text-white leading-none">
                      {report.totalStages}
                    </span>
                    <span className="text-xs text-gray-500 dark:text-gray-400 mt-1">
                      {t("totalStages")}
                    </span>
                  </>
                }
              />
              <div className="flex-1 flex flex-col justify-center gap-3 min-w-0">
                <LegendRow
                  colorClass="bg-emerald-500"
                  label={t("stageStatus.completed")}
                  value={report.completedStages}
                  icon={CheckCircleIcon}
                />
                <LegendRow
                  colorClass="bg-blue-500"
                  label={t("stageStatus.inProgress")}
                  value={report.inProgressStages}
                  icon={ClockIcon}
                />
                <LegendRow
                  colorClass="bg-gray-300 dark:bg-gray-600"
                  label={t("stageStatus.notStarted")}
                  value={report.notStartedStages}
                />
              </div>
            </div>
          )}
        </SectionCard>

        <SectionCard
          title={t("punchlistOverview")}
          subtitle={t("punchlistOverviewSubtitle")}
        >
          {punchlistTotal === 0 ? (
            <EmptyBlock
              message={t("noPunchlistYet")}
              icon={ExclamationTriangleIcon}
            />
          ) : (
            <div className="flex flex-col sm:flex-row items-center sm:items-stretch gap-6">
              <DonutChart
                segments={[
                  { value: punchlist.open, colorClass: "text-amber-500" },
                  { value: punchlist.inProgress, colorClass: "text-blue-500" },
                  { value: punchlist.done, colorClass: "text-emerald-500" },
                  { value: punchlist.cancelled, colorClass: "text-gray-300 dark:text-gray-600" },
                ]}
                size={180}
                strokeWidth={20}
                centerSlot={
                  <>
                    <span className="text-3xl font-bold text-gray-900 dark:text-white leading-none">
                      {punchlistTotal}
                    </span>
                    <span className="text-xs text-gray-500 dark:text-gray-400 mt-1">
                      {t("totalPunchlist")}
                    </span>
                  </>
                }
              />
              <div className="flex-1 flex flex-col justify-center gap-3 min-w-0">
                <LegendRow
                  colorClass="bg-amber-500"
                  label={t("punchlistStatus.open")}
                  value={punchlist.open}
                />
                <LegendRow
                  colorClass="bg-blue-500"
                  label={t("punchlistStatus.inProgress")}
                  value={punchlist.inProgress}
                  icon={ClockIcon}
                />
                <LegendRow
                  colorClass="bg-emerald-500"
                  label={t("punchlistStatus.done")}
                  value={punchlist.done}
                  icon={CheckCircleIcon}
                />
                <LegendRow
                  colorClass="bg-gray-300 dark:bg-gray-600"
                  label={t("punchlistStatus.cancelled")}
                  value={punchlist.cancelled}
                />
                {punchlist.overdue > 0 && (
                  <div className="mt-1 inline-flex items-center gap-2 px-2.5 py-1 rounded-full bg-red-50 dark:bg-red-900/30 text-red-700 dark:text-red-300 text-xs font-medium self-start">
                    <ExclamationTriangleIcon className="w-3.5 h-3.5" />
                    {t("punchlistOverdue", { count: punchlist.overdue })}
                  </div>
                )}
              </div>
            </div>
          )}
        </SectionCard>
      </div>

      {/* Decks progress (wider, two-thirds) + Top document types
          (one-third) on the same row. `items-start` keeps each card
          at its own content height instead of stretching to match
          the taller one. */}
      <div className="grid grid-cols-1 lg:grid-cols-3 gap-4 items-start">
        <SectionCard
          title={t("decksProgress")}
          subtitle={t("decksProgressSubtitle")}
          meta={t("deckProgressCount", { count: deckGroups.length })}
          className="lg:col-span-2"
        >
          {isEmpty ? (
            <EmptyBlock message={t("noAreas")} icon={ChartBarIcon} />
          ) : visibleDecks.length === 0 ? (
            <EmptyBlock message={t("noActiveDecks")} icon={ChartBarIcon} />
          ) : (
            <ul className="divide-y divide-gray-100 dark:divide-gray-700 -my-3">
              {visibleDecks.map((deck) => (
                <li key={deck.identifier} className="py-3">
                  <DeckRow deck={deck} t={t} />
                </li>
              ))}
            </ul>
          )}
          {emptyDecks.length > 0 && (
            <div
              className={`pt-4 mt-4 border-t border-gray-100 dark:border-gray-700 ${
                visibleDecks.length === 0 ? "border-t-0 mt-0 pt-0" : ""
              }`}
            >
              <button
                type="button"
                onClick={() => setShowEmptyDecks((prev) => !prev)}
                className="text-sm font-medium text-blue-600 hover:text-blue-700 dark:text-blue-400 dark:hover:text-blue-300 transition-colors"
              >
                {showEmptyDecks
                  ? t("hideEmptyDecks")
                  : t("showEmptyDecks", { count: emptyDecks.length })}
              </button>
            </div>
          )}
        </SectionCard>

        <SectionCard
          title={t("documentTypesTitle")}
          subtitle={t("documentTypesSubtitle")}
        >
          {topDocumentTypes.length === 0 ? (
            <EmptyBlock
              message={t("noDocumentsYet")}
              icon={DocumentChartBarIcon}
            />
          ) : (
            <div className="space-y-2.5">
              {topDocumentTypes.map((type) => {
                const max = topDocumentTypes[0]?.documentCount ?? 1;
                const pct = ((type.documentCount ?? 0) / max) * 100;
                return (
                  <div key={type.identifier}>
                    <div className="flex items-baseline justify-between gap-2 mb-1">
                      <span className="text-sm text-gray-700 dark:text-gray-300 leading-snug">
                        {type.name}
                      </span>
                      <span className="text-sm font-semibold text-gray-900 dark:text-white tabular-nums flex-shrink-0">
                        {type.documentCount}
                      </span>
                    </div>
                    <div className="h-2 bg-gray-100 dark:bg-gray-700 rounded-full overflow-hidden">
                      <div
                        className="h-2 bg-amber-500 rounded-full transition-[width]"
                        style={{ width: `${pct}%` }}
                      />
                    </div>
                  </div>
                );
              })}
            </div>
          )}
        </SectionCard>
      </div>
    </div>
  );
}

// ---------- subcomponents ----------

type Tint = "indigo" | "violet" | "blue" | "emerald" | "amber";

const TINT_CLASS: Record<Tint, string> = {
  indigo: "bg-indigo-50 text-indigo-600 dark:bg-indigo-900/30 dark:text-indigo-400",
  violet: "bg-violet-50 text-violet-600 dark:bg-violet-900/30 dark:text-violet-400",
  blue: "bg-blue-50 text-blue-600 dark:bg-blue-900/30 dark:text-blue-400",
  emerald: "bg-emerald-50 text-emerald-600 dark:bg-emerald-900/30 dark:text-emerald-400",
  amber: "bg-amber-50 text-amber-600 dark:bg-amber-900/30 dark:text-amber-400",
};

interface KpiCardProps {
  label: string;
  value: string;
  caption: string;
  icon: React.ComponentType<React.SVGProps<SVGSVGElement>>;
  tint: Tint;
}

function KpiCard({ label, value, caption, icon: Icon, tint }: KpiCardProps) {
  return (
    <div className="bg-white dark:bg-gray-800 rounded-xl border border-gray-200 dark:border-gray-700 shadow-sm hover:shadow-md transition-shadow p-5">
      <div className="flex items-start gap-4">
        <div
          className={`w-12 h-12 rounded-xl flex items-center justify-center flex-shrink-0 ${TINT_CLASS[tint]}`}
        >
          <Icon className="w-6 h-6" />
        </div>
        <div className="min-w-0">
          <p className="text-2xl font-bold text-gray-900 dark:text-white leading-tight truncate">
            {value}
          </p>
          <p className="text-sm font-medium text-gray-700 dark:text-gray-300 mt-1">
            {label}
          </p>
          <p className="text-xs text-gray-500 dark:text-gray-400 mt-0.5">
            {caption}
          </p>
        </div>
      </div>
    </div>
  );
}

interface SectionCardProps {
  title: string;
  subtitle?: string;
  meta?: string;
  children: React.ReactNode;
  className?: string;
}

function SectionCard({ title, subtitle, meta, children, className = "" }: SectionCardProps) {
  return (
    <div
      className={`bg-white dark:bg-gray-800 rounded-xl border border-gray-200 dark:border-gray-700 shadow-sm p-6 ${className}`}
    >
      <div className="flex items-start justify-between gap-3 mb-5">
        <div>
          <h3 className="text-base font-semibold text-gray-900 dark:text-white">
            {title}
          </h3>
          {subtitle && (
            <p className="text-sm text-gray-500 dark:text-gray-400 mt-0.5">
              {subtitle}
            </p>
          )}
        </div>
        {meta && (
          <span className="text-xs text-gray-500 dark:text-gray-400 whitespace-nowrap pt-1">
            {meta}
          </span>
        )}
      </div>
      {children}
    </div>
  );
}

interface LegendRowProps {
  colorClass: string;
  label: string;
  value: number;
  icon?: React.ComponentType<React.SVGProps<SVGSVGElement>>;
}

function LegendRow({ colorClass, label, value, icon: Icon }: LegendRowProps) {
  return (
    <div className="flex items-center justify-between gap-3">
      <div className="flex items-center gap-2 min-w-0">
        <span className={`w-2.5 h-2.5 rounded-full flex-shrink-0 ${colorClass}`} />
        {Icon && (
          <Icon className="w-4 h-4 text-gray-400 dark:text-gray-500 flex-shrink-0" />
        )}
        <span className="text-sm text-gray-700 dark:text-gray-300 truncate">
          {label}
        </span>
      </div>
      <span className="text-sm font-semibold text-gray-900 dark:text-white tabular-nums">
        {value}
      </span>
    </div>
  );
}

interface EmptyBlockProps {
  message: string;
  icon: React.ComponentType<React.SVGProps<SVGSVGElement>>;
}

function EmptyBlock({ message, icon: Icon }: EmptyBlockProps) {
  return (
    <div className="flex flex-col items-center justify-center py-10 text-center">
      <Icon className="w-10 h-10 text-gray-300 dark:text-gray-600 mb-2" />
      <p className="text-sm text-gray-600 dark:text-gray-400">{message}</p>
    </div>
  );
}

interface DeckRowProps {
  deck: DeckGroup;
  t: (key: string, values?: Record<string, string | number>) => string;
}

function DeckRow({ deck, t }: DeckRowProps) {
  const areaCount = deck.areas.length;
  const meta =
    areaCount === 0
      ? t("noAreasInDeck")
      : deck.stageCount === 0
        ? t("noStagesInDeck", { count: areaCount })
        : t("deckMeta", {
            areaCount,
            completed: deck.completed,
            total: deck.stageCount,
          });

  return (
    <div className="grid grid-cols-[minmax(0,1fr)_minmax(0,1.5fr)_auto] items-center gap-4">
      <div className="flex items-center gap-2 min-w-0">
        <h4 className="text-sm font-semibold text-gray-900 dark:text-white truncate">
          {deck.name}
        </h4>
        <DeckStatusBadge status={deck.status} t={t} />
      </div>
      <div className="flex items-center gap-3 min-w-0">
        <div className="flex-1 h-2 bg-gray-100 dark:bg-gray-700 rounded-full overflow-hidden">
          <div
            className="h-2 bg-indigo-500 rounded-full transition-[width]"
            style={{ width: `${deck.progress}%` }}
          />
        </div>
        <span className="text-xs text-gray-500 dark:text-gray-400 whitespace-nowrap flex-shrink-0">
          {meta}
        </span>
      </div>
      <span className="text-sm font-semibold text-gray-900 dark:text-white w-12 text-right tabular-nums">
        {deck.stageCount > 0 ? `${deck.progress}%` : "—"}
      </span>
    </div>
  );
}

const STATUS_BADGE_CLASS: Record<DeckStatus, string> = {
  completed: "bg-emerald-50 text-emerald-700 dark:bg-emerald-900/30 dark:text-emerald-300",
  in_progress: "bg-blue-50 text-blue-700 dark:bg-blue-900/30 dark:text-blue-300",
  not_started: "bg-gray-100 text-gray-600 dark:bg-gray-700 dark:text-gray-300",
  empty: "bg-amber-50 text-amber-700 dark:bg-amber-900/30 dark:text-amber-300",
};

function DeckStatusBadge({
  status,
  t,
}: {
  status: DeckStatus;
  t: (key: string) => string;
}) {
  return (
    <span
      className={`inline-flex items-center px-2 py-0.5 rounded-full text-xs font-medium ${STATUS_BADGE_CLASS[status]}`}
    >
      {t(`deckStatus.${status}`)}
    </span>
  );
}

