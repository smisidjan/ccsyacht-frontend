"use client";

import { useMemo, useState, useEffect } from "react";
import { useTranslations } from "next-intl";
import {
  PlusIcon,
  XMarkIcon,
  ChevronDownIcon,
  CheckIcon,
} from "@heroicons/react/24/outline";
import Button from "@/app/components/ui/Button";
import Modal from "@/app/components/ui/Modal";
import DeleteConfirmModal from "@/app/components/modals/DeleteConfirmModal";
import { SignatureModal, RejectSignoffModal, RemarksList, ReleaseFormsList } from "@/app/features/stages";
import { PunchlistList } from "@/app/features/punchlist";
import {
  useStageSignoffs,
  useProjectSigners,
  useStageCustomSigners,
  useStageReleaseForms,
} from "@/lib/api";
import { useStageRemarks } from "@/lib/api/stage-remarks";
import { usePunchlistItems } from "@/lib/api/punchlist-items";
import { useProjectMembersFromContext } from "@/app/context/ProjectContext";
import { useCurrentUserContext } from "@/app/context/CurrentUserContext";
import { useToast } from "@/app/context/ToastContext";
import { usePermission } from "@/lib/hooks/usePermission";
import { PERMISSIONS } from "@/lib/constants/permissions";
import { handleError } from "@/lib/utils/errors";
import type { Stage } from "@/lib/api/types";

interface StageDetailPanelProps {
  stage: Stage;
  projectId: string;
  /** Area the stage lives under — forwarded to PunchlistList so the
   *  create-pin modal can lock the area and constrain the marker. */
  areaId: string;
  canEdit: boolean;
  onRefetch: () => Promise<void>;
  /** Bubble up to the area page so the open-punchlist badge can
   *  refetch its count when the user mutates the list inside this
   *  panel. */
  onPunchlistChange?: () => void;
}

const statusColors = {
  not_started: "bg-gray-100 dark:bg-gray-800 text-gray-700 dark:text-gray-300",
  in_progress: "bg-amber-100 dark:bg-amber-900/30 text-amber-700 dark:text-amber-400",
  pending_signoff: "bg-amber-100 dark:bg-amber-900/30 text-amber-700 dark:text-amber-400",
  completed: "bg-green-100 dark:bg-green-900/30 text-green-700 dark:text-green-400",
  rejected: "bg-red-100 dark:bg-red-900/30 text-red-700 dark:text-red-400",
};

export default function StageDetailPanel({
  stage,
  projectId,
  areaId,
  canEdit,
  onRefetch,
  onPunchlistChange,
}: StageDetailPanelProps) {
  const t = useTranslations("areaDetail");
  const tSignoffs = useTranslations("signoffs");
  const { showToast } = useToast();
  const { currentUser } = useCurrentUserContext();
  const { data: signoffs, loading: signoffsLoading, sign, reject, submitForSignoff, refetch: refetchSignoffs } = useStageSignoffs(projectId, stage.identifier);
  const { data: projectSigners, loading: signersLoading } = useProjectSigners(projectId);
  // Mirror the release-forms list at the panel level so the submit /
  // resubmit buttons can gate on count without waiting for the user
  // to open the Release Forms tab. The list component does its own
  // fetch for rendering; refetching here on its `onChange` keeps both
  // in sync after create / delete.
  const { data: releaseForms, refetch: refetchReleaseForms } =
    useStageReleaseForms(projectId, stage.identifier);
  const releaseFormCount = releaseForms?.length ?? 0;
  const hasReleaseForm = releaseFormCount > 0;
  const {
    data: customSigners,
    loading: customSignersLoading,
    addSigner: addCustomSigner,
    removeSigner: removeCustomSigner,
  } = useStageCustomSigners(projectId, stage.identifier);
  const { data: projectMembers } = useProjectMembersFromContext();
  const { hasPermission } = usePermission();
  // Locked once the stage is completed — signer history becomes
  // read-only there. Pre-completion the user can still add or remove
  // custom signers if they have the right.
  const canManageCustomSigners =
    hasPermission(PERMISSIONS.EDIT_STAGES) &&
    stage.status.name !== "completed";

  // Combine default + custom signers into one rendering list, deduped
  // by user. A user who happens to be both a project signer and a
  // custom signer collapses to a single row presented as a project
  // signer (the backend dedupes on submit too).
  const combinedSigners = useMemo(() => {
    if (!projectSigners) return [];
    const projectUserIds = new Set(
      projectSigners.map((s) => s.member.identifier)
    );
    const projectRows = projectSigners.map((s) => ({
      kind: "project" as const,
      member: s.member,
      customSignerId: undefined as string | undefined,
      addedBy: null as null | { name: string },
      addedAt: null as string | null,
    }));
    const customRows = (customSigners ?? [])
      .filter((c) => !projectUserIds.has(c.user.identifier))
      .map((c) => ({
        kind: "custom" as const,
        member: c.user,
        customSignerId: c.identifier,
        addedBy: c.addedBy,
        addedAt: c.addedAt,
      }));
    return [...projectRows, ...customRows];
  }, [projectSigners, customSigners]);

  // Members that can still be added — exclude anyone already covered
  // by either signer list so the picker only offers fresh choices.
  const availableMembers = useMemo(() => {
    if (!projectMembers) return [];
    const taken = new Set<string>([
      ...(projectSigners ?? []).map((s) => s.member.identifier),
      ...(customSigners ?? []).map((c) => c.user.identifier),
    ]);
    return projectMembers.filter((m) => !taken.has(m.member.identifier));
  }, [projectMembers, projectSigners, customSigners]);

  const [isAddSignerModalOpen, setIsAddSignerModalOpen] = useState(false);
  const [addingMemberId, setAddingMemberId] = useState<string | null>(null);
  const [signerToRemove, setSignerToRemove] = useState<{
    id: string;
    name: string;
  } | null>(null);
  const [isSignoffsExpanded, setIsSignoffsExpanded] = useState(false);

  // Roll up the signoff list into a single chip-friendly summary. The
  // chip is the user's at-a-glance view; the full list lives behind
  // the toggle. Priority is rejected > pending > all-signed > default
  // so the most actionable state always wins the colour.
  const signoffSummary = useMemo(() => {
    const total = combinedSigners.length;
    let pending = 0;
    let signed = 0;
    let rejected = 0;
    for (const signer of combinedSigners) {
      const so = signoffs?.find(
        (s) => s.recipient.identifier === signer.member.identifier
      );
      if (so?.status === "pending") pending += 1;
      else if (so?.status === "signed") signed += 1;
      else if (so?.status === "rejected") rejected += 1;
    }
    let tone: "rejected" | "pending" | "signed" | "neutral" = "neutral";
    if (rejected > 0) tone = "rejected";
    else if (pending > 0) tone = "pending";
    else if (signed > 0 && signed === total) tone = "signed";
    return { total, pending, signed, rejected, tone };
  }, [combinedSigners, signoffs]);

  const handleAddCustomSigner = async (userId: string) => {
    setAddingMemberId(userId);
    try {
      await addCustomSigner({ user_id: userId });
      showToast("success", tSignoffs("addCustomSignerSuccess"));
      setIsAddSignerModalOpen(false);
    } catch (err) {
      handleError(err, {
        showToast,
        fallbackMessage: tSignoffs("addCustomSignerError"),
      });
    } finally {
      setAddingMemberId(null);
    }
  };

  // Called from the DeleteConfirmModal's onConfirm — toasts/errors
  // are owned by the modal itself, so we just do the work and let it
  // bubble.
  const handleRemoveCustomSigner = async (signerId: string) => {
    await removeCustomSigner(signerId);
    // Backend cascade-deletes any pending signoff for this user on
    // this stage (signed historie blijft staan). Refresh so the row
    // disappears alongside the signer config.
    await refetchSignoffs();
  };

  // Fetch remarks and punchlist counts to determine which tabs to show when completed
  const { data: remarks } = useStageRemarks(projectId, stage.identifier, { include_replies: true });
  const { data: punchlistItems } = usePunchlistItems(projectId, stage.identifier, { per_page: 1 });

  const [showSignModal, setShowSignModal] = useState(false);
  const [showRejectModal, setShowRejectModal] = useState(false);
  const [selectedSignoffId, setSelectedSignoffId] = useState<string | null>(null);
  const [isSubmitting, setIsSubmitting] = useState(false);
  const [activeTab, setActiveTab] = useState<"releaseForms" | "remarks" | "punchlist">("punchlist");

  // Determine which tabs to show
  const isCompleted = stage.status.name === "completed";
  const hasRemarks = remarks && remarks.length > 0;
  const hasPunchlist = punchlistItems && punchlistItems.length > 0;

  // When completed, only show tabs with content. The Release Forms
  // tab keeps showing post-completion when entries exist so the user
  // can still review the uploaded forms.
  const showReleaseFormsTab = !isCompleted || hasReleaseForm;
  const showRemarksTab = !isCompleted || hasRemarks;
  const showPunchlistTab = !isCompleted || hasPunchlist;

  // Get available tabs in order of preference
  const availableTabs: Array<"releaseForms" | "remarks" | "punchlist"> = [];
  if (showPunchlistTab) availableTabs.push("punchlist");
  if (showRemarksTab) availableTabs.push("remarks");
  if (showReleaseFormsTab) availableTabs.push("releaseForms");

  // Auto-select first available tab if current tab is hidden
  useEffect(() => {
    if (availableTabs.length > 0 && !availableTabs.includes(activeTab)) {
      setActiveTab(availableTabs[0]);
    }
  }, [availableTabs.join(","), activeTab]); // Use join for dependency array

  const handleSubmitForSignoff = async () => {
    setIsSubmitting(true);
    try {
      await submitForSignoff();
      showToast("success", tSignoffs("submitSuccess"));
    } catch (error) {
      const errorMessage = error && typeof error === 'object' && 'message' in error
        ? (error as { message: string }).message
        : tSignoffs("submitError");
      showToast("error", errorMessage);
    } finally {
      setIsSubmitting(false);
    }
  };

  return (
    <div className="bg-white dark:bg-gray-800 rounded-xl shadow-lg border border-gray-100 dark:border-gray-700">
      {/* Header */}
      <div className="p-4 sm:p-6 md:p-8 border-b border-gray-200 dark:border-gray-700">
        <div className="flex items-start justify-between gap-6">
          <div className="flex-1">
            <div className="flex items-center justify-between gap-3 mb-2">
              <div className="flex items-center gap-3 min-w-0">
                {stage.color && (
                  <span
                    className="inline-block w-5 h-5 rounded-sm flex-shrink-0 border border-gray-200 dark:border-gray-600"
                    style={{ backgroundColor: stage.color }}
                    aria-hidden="true"
                  />
                )}
                <h2 className="text-2xl font-bold text-gray-900 dark:text-white truncate">
                  {stage.name}
                </h2>
              </div>
              <SignoffSummaryChip
                summary={signoffSummary}
                expanded={isSignoffsExpanded}
                onToggle={() => setIsSignoffsExpanded((v) => !v)}
                t={tSignoffs}
                loading={
                  signoffsLoading || signersLoading || customSignersLoading
                }
              />
            </div>
            <div className="flex items-center gap-3 flex-wrap">
              <span className={`inline-block px-3 py-1 rounded text-sm font-medium ${
                statusColors[stage.status.name as keyof typeof statusColors]
              }`}>
                {t(`status.${stage.status.name}`)}
              </span>

              {/* Status Flow Hints */}
              {canEdit && stage.status.name === "not_started" && (
                <p className="text-sm text-blue-700 dark:text-blue-400 bg-blue-100 dark:bg-blue-900/30 px-3 py-1 rounded">
                  {t("autoStartsAfterPrevious")}
                </p>
              )}

              {canEdit && stage.status.name === "in_progress" && (
                <Button
                  variant="primary"
                  size="sm"
                  onClick={handleSubmitForSignoff}
                  disabled={isSubmitting || !hasReleaseForm}
                  title={
                    !hasReleaseForm
                      ? t("releaseFormsRequiredForSignoff")
                      : undefined
                  }
                >
                  {tSignoffs("submitForSignoff")}
                </Button>
              )}

              {canEdit && stage.status.name === "rejected" && !signoffsLoading && (
                <>
                  {/* Only show Resubmit if there are no pending signoffs */}
                  {(!signoffs || signoffs.length === 0 || !signoffs.some(s => s.status === "pending")) ? (
                    <Button
                      variant="primary"
                      size="sm"
                      onClick={handleSubmitForSignoff}
                      disabled={isSubmitting || !hasReleaseForm}
                      title={
                        !hasReleaseForm
                          ? t("releaseFormsRequiredForSignoff")
                          : undefined
                      }
                    >
                      {tSignoffs("resubmit")}
                    </Button>
                  ) : (
                    <p className="text-sm text-amber-700 dark:text-amber-400 bg-amber-100 dark:bg-amber-900/30 px-3 py-1 rounded">
                      {tSignoffs("waitingForSignoffs")}
                    </p>
                  )}
                </>
              )}
              {/* Inline hint near the submit buttons when the user
                  has no release form yet — the button itself is
                  disabled with a tooltip but the secondary hint
                  surfaces the requirement more visibly. */}
              {canEdit &&
                (stage.status.name === "in_progress" ||
                  stage.status.name === "rejected") &&
                !hasReleaseForm && (
                  <p className="text-xs text-amber-700 dark:text-amber-400">
                    {t("releaseFormsRequiredForSignoff")}
                  </p>
                )}
            </div>
          </div>
        </div>
      </div>

      {/* Content */}
      <div className="p-4 sm:p-6 md:p-8 space-y-6 md:space-y-8">
        {/* Signoffs Section — collapsed by default to keep the panel
            scannable. The header chip mirrors the state and toggles
            this block open. */}
        {isSignoffsExpanded && (
        <div>
          <div className="flex items-center justify-between mb-6">
            <h3 className="text-lg font-semibold text-gray-900 dark:text-white">
              {t("signoffs")}
            </h3>
            {canManageCustomSigners && (
              <button
                type="button"
                onClick={() => setIsAddSignerModalOpen(true)}
                className="inline-flex items-center gap-1.5 px-2.5 py-1.5 text-xs font-medium text-gray-700 dark:text-gray-300 bg-white dark:bg-gray-800 border border-gray-300 dark:border-gray-600 rounded-md hover:bg-gray-50 dark:hover:bg-gray-700 hover:border-gray-400 dark:hover:border-gray-500 transition-colors"
              >
                <PlusIcon className="w-3.5 h-3.5" />
                {tSignoffs("addCustomSigner")}
              </button>
            )}
          </div>
          {(signoffsLoading || signersLoading || customSignersLoading) ? (
                <p className="text-sm text-gray-500 dark:text-gray-400">
                  {tSignoffs("loading")}...
                </p>
              ) : combinedSigners.length === 0 ? (
                <p className="text-sm text-gray-500 dark:text-gray-400">
                  {tSignoffs("noSigners")}
                </p>
              ) : (
                <ul className="divide-y divide-gray-200 dark:divide-gray-700 border-y border-gray-200 dark:border-gray-700">
                  {combinedSigners.map((signer) => {
                    const signoff = signoffs?.find(
                      (s) => s.recipient.identifier === signer.member.identifier
                    );
                    const isCurrentUser =
                      currentUser?.identifier === signer.member.identifier;
                    const canSign =
                      isCurrentUser && signoff?.status === "pending";
                    const canReject =
                      isCurrentUser && signoff?.status === "pending";
                    const isCustom = signer.kind === "custom";

                    // Subtle row label that lives directly under the
                    // name — combines kind ("Custom" / "Default") with
                    // the "added by …" provenance for custom rows.
                    const subtitleParts: string[] = [
                      isCustom
                        ? tSignoffs("customSignerLabel")
                        : tSignoffs("defaultSignerLabel"),
                    ];
                    if (isCustom && signer.addedBy) {
                      subtitleParts.push(
                        signer.addedAt
                          ? tSignoffs("addedByOn", {
                              name: signer.addedBy.name,
                              date: new Date(
                                signer.addedAt
                              ).toLocaleDateString(),
                            })
                          : tSignoffs("addedByCustomSigner", {
                              name: signer.addedBy.name,
                            })
                      );
                    }
                    const subtitle = subtitleParts.join(" · ");

                    return (
                      <li
                        key={`${signer.kind}-${signer.member.identifier}`}
                        className="py-3 flex items-start gap-3"
                      >
                        <SignerAvatar name={signer.member.name} />
                        <div className="flex-1 min-w-0">
                          <div className="flex items-center justify-between gap-4">
                            <div className="min-w-0">
                              <p className="text-sm font-medium text-gray-900 dark:text-white truncate">
                                {signer.member.name}
                              </p>
                              <p className="text-xs text-gray-500 dark:text-gray-400 truncate">
                                {subtitle}
                              </p>
                            </div>
                            <div className="flex items-center gap-3 flex-shrink-0">
                              <SignoffStatusIndicator
                                status={signoff?.status}
                                t={tSignoffs}
                              />
                              {(canSign || canReject) && signoff && (
                                <div className="flex items-center gap-1.5">
                                  <button
                                    type="button"
                                    onClick={() => {
                                      setSelectedSignoffId(signoff.identifier);
                                      setShowSignModal(true);
                                    }}
                                    className="inline-flex items-center gap-1 px-2.5 py-1.5 text-xs font-medium text-green-700 dark:text-green-300 bg-white dark:bg-gray-800 border border-green-300 dark:border-green-700/60 rounded-md hover:bg-green-50 dark:hover:bg-green-900/30 hover:border-green-400 dark:hover:border-green-600 transition-colors"
                                  >
                                    <CheckIcon
                                      className="w-3.5 h-3.5"
                                      aria-hidden="true"
                                    />
                                    {tSignoffs("sign")}
                                  </button>
                                  <button
                                    type="button"
                                    onClick={() => {
                                      setSelectedSignoffId(signoff.identifier);
                                      setShowRejectModal(true);
                                    }}
                                    className="inline-flex items-center gap-1 px-2.5 py-1.5 text-xs font-medium text-red-700 dark:text-red-300 bg-white dark:bg-gray-800 border border-red-300 dark:border-red-700/60 rounded-md hover:bg-red-50 dark:hover:bg-red-900/30 hover:border-red-400 dark:hover:border-red-600 transition-colors"
                                  >
                                    <XMarkIcon
                                      className="w-3.5 h-3.5"
                                      aria-hidden="true"
                                    />
                                    {tSignoffs("reject")}
                                  </button>
                                </div>
                              )}
                              {isCustom &&
                                signer.customSignerId &&
                                canManageCustomSigners && (
                                  <button
                                    type="button"
                                    onClick={() =>
                                      setSignerToRemove({
                                        id: signer.customSignerId!,
                                        name: signer.member.name,
                                      })
                                    }
                                    className="p-1 text-gray-400 hover:text-red-600 dark:hover:text-red-400 transition-colors"
                                    aria-label={tSignoffs(
                                      "removeCustomSigner"
                                    )}
                                    title={tSignoffs("removeCustomSigner")}
                                  >
                                    <XMarkIcon className="w-4 h-4" />
                                  </button>
                                )}
                            </div>
                          </div>

                          {/* Inline detail block — only the recorded
                              decision/notes for this signoff. Keeps
                              the row compact by default; the detail
                              only renders when there's actually
                              something to show. */}
                          {(signoff?.status === "signed" ||
                            signoff?.status === "rejected") &&
                            signoff.agent &&
                            signoff.signedAt && (
                              <p
                                className={`text-xs mt-1.5 ${
                                  signoff.status === "signed"
                                    ? "text-green-700 dark:text-green-400"
                                    : "text-red-700 dark:text-red-400"
                                }`}
                              >
                                {tSignoffs(
                                  signoff.status === "signed"
                                    ? "signedBy"
                                    : "rejectedBy",
                                  {
                                    name: signoff.agent.name,
                                    date: new Date(
                                      signoff.signedAt
                                    ).toLocaleDateString(),
                                    time: new Date(
                                      signoff.signedAt
                                    ).toLocaleTimeString([], {
                                      hour: "2-digit",
                                      minute: "2-digit",
                                    }),
                                  }
                                )}
                              </p>
                            )}

                          {signoff?.notes && (
                            <p className="text-xs text-gray-600 dark:text-gray-400 mt-1 italic">
                              &ldquo;{signoff.notes}&rdquo;
                            </p>
                          )}

                          {signoff?.rejectionHistory &&
                            signoff.rejectionHistory.length > 0 && (
                              <div className="mt-2 pt-2 border-t border-gray-100 dark:border-gray-700/60">
                                <p className="text-[11px] font-semibold uppercase tracking-wide text-gray-500 dark:text-gray-400 mb-1">
                                  {tSignoffs("rejectionHistory")}
                                </p>
                                <div className="space-y-1.5">
                                  {signoff.rejectionHistory.map(
                                    (rejection, index) => (
                                      <div
                                        key={index}
                                        className="text-xs text-gray-600 dark:text-gray-400"
                                      >
                                        <p className="text-red-600 dark:text-red-400">
                                          {tSignoffs("rejectedBy", {
                                            name: rejection.rejected_by_name,
                                            date: new Date(
                                              rejection.rejected_at
                                            ).toLocaleDateString(),
                                            time: new Date(
                                              rejection.rejected_at
                                            ).toLocaleTimeString([], {
                                              hour: "2-digit",
                                              minute: "2-digit",
                                            }),
                                          })}
                                        </p>
                                        {rejection.notes && (
                                          <p className="italic mt-0.5">
                                            &ldquo;{rejection.notes}&rdquo;
                                          </p>
                                        )}
                                      </div>
                                    )
                                  )}
                                </div>
                              </div>
                            )}
                        </div>
                      </li>
                    );
                  })}
                </ul>
              )}
        </div>
        )}

        {/* Tabs Section */}
        {availableTabs.length > 0 && (
          <div className="pt-8 border-t border-gray-200 dark:border-gray-700">
            {/* Tab Headers - only show if multiple tabs available */}
            {availableTabs.length > 1 && (
            <div className="flex border-b border-gray-200 dark:border-gray-700 mb-8 gap-2">
            {showPunchlistTab && (
              <button
                onClick={() => setActiveTab("punchlist")}
                className={`px-5 py-3 text-sm font-medium border-b-2 transition-colors ${
                  activeTab === "punchlist"
                    ? "border-blue-600 text-blue-600 dark:text-blue-400"
                    : "border-transparent text-gray-500 dark:text-gray-400 hover:text-gray-700 dark:hover:text-gray-300"
                }`}
              >
                {t("punchlist")}
              </button>
            )}
            {showRemarksTab && (
              <button
                onClick={() => setActiveTab("remarks")}
                className={`px-5 py-3 text-sm font-medium border-b-2 transition-colors ${
                  activeTab === "remarks"
                    ? "border-blue-600 text-blue-600 dark:text-blue-400"
                    : "border-transparent text-gray-500 dark:text-gray-400 hover:text-gray-700 dark:hover:text-gray-300"
                }`}
              >
                {t("remarks")}
              </button>
            )}
            {showReleaseFormsTab && (
              <button
                onClick={() => setActiveTab("releaseForms")}
                className={`px-5 py-3 text-sm font-medium border-b-2 transition-colors ${
                  activeTab === "releaseForms"
                    ? "border-blue-600 text-blue-600 dark:text-blue-400"
                    : "border-transparent text-gray-500 dark:text-gray-400 hover:text-gray-700 dark:hover:text-gray-300"
                }`}
              >
                {t("releaseForms")}
              </button>
            )}
          </div>
          )}

          {/* Tab Content */}
          <div className="py-6">
            {activeTab === "releaseForms" && (
              <ReleaseFormsList
                projectId={projectId}
                stage={stage}
                onChange={refetchReleaseForms}
              />
            )}

            {activeTab === "remarks" && (
              <RemarksList
                projectId={projectId}
                stageId={stage.identifier}
                stageStatus={stage.status.name}
              />
            )}

            {activeTab === "punchlist" && (
              <PunchlistList
                projectId={projectId}
                areaId={areaId}
                stage={stage}
                onPunchlistChange={onPunchlistChange}
              />
            )}
          </div>
          </div>
        )}

        {/* Modals - Outside tabs so they're always available */}
        {selectedSignoffId && (
          <SignatureModal
            isOpen={showSignModal}
            onClose={() => {
              setShowSignModal(false);
              setSelectedSignoffId(null);
            }}
            onSubmit={async (signatureData, notes) => {
              await sign(selectedSignoffId, { signature_data: signatureData, notes });
              await onRefetch(); // Refresh stage data to update status
              setShowSignModal(false);
              setSelectedSignoffId(null);
            }}
            title={tSignoffs("signStage")}
          />
        )}

        {selectedSignoffId && (
          <RejectSignoffModal
            isOpen={showRejectModal}
            onClose={() => {
              setShowRejectModal(false);
              setSelectedSignoffId(null);
            }}
            onSubmit={async (notes) => {
              await reject(selectedSignoffId, { notes });
              await onRefetch(); // Refresh stage data to update status
              setShowRejectModal(false);
              setSelectedSignoffId(null);
            }}
          />
        )}

        {/* Remove confirmation — the X on a custom signer row sets
            `signerToRemove`, which mounts this modal. Confirm calls
            the API and refreshes both lists. */}
        <DeleteConfirmModal
          isOpen={!!signerToRemove}
          onClose={() => setSignerToRemove(null)}
          onConfirm={async () => {
            if (!signerToRemove) return;
            await handleRemoveCustomSigner(signerToRemove.id);
            setSignerToRemove(null);
          }}
          title={tSignoffs("removeCustomSignerTitle")}
          message={tSignoffs("removeCustomSignerMessage", {
            name: signerToRemove?.name ?? "",
          })}
          successMessage={tSignoffs("removeCustomSignerSuccess")}
          confirmLabel={tSignoffs("removeCustomSigner")}
        />

        {/* Custom signer picker — lists every project member that
            isn't already a signer (default or custom). Click a row to
            add them; the modal closes on success. */}
        <Modal
          isOpen={isAddSignerModalOpen}
          onClose={() => setIsAddSignerModalOpen(false)}
          title={tSignoffs("addCustomSignerTitle")}
          size="md"
        >
          <div className="space-y-3">
            <p className="text-sm text-gray-600 dark:text-gray-400">
              {tSignoffs("addCustomSignerHint")}
            </p>
            {availableMembers.length === 0 ? (
              <p className="text-sm text-gray-500 dark:text-gray-400">
                {tSignoffs("noMembersAvailable")}
              </p>
            ) : (
              <ul className="max-h-72 overflow-y-auto border border-gray-200 dark:border-gray-700 rounded-lg divide-y divide-gray-200 dark:divide-gray-700">
                {availableMembers.map((m) => {
                  const userId = m.member.identifier;
                  const isAdding = addingMemberId === userId;
                  return (
                    <li
                      key={m.identifier}
                      className="flex items-center justify-between px-4 py-3 hover:bg-gray-50 dark:hover:bg-gray-800/60"
                    >
                      <div className="min-w-0 flex-1">
                        <p className="text-sm font-medium text-gray-900 dark:text-white truncate">
                          {m.member.name}
                        </p>
                        <p className="text-xs text-gray-500 dark:text-gray-400 truncate">
                          {m.roleName}
                        </p>
                      </div>
                      <Button
                        variant="primary"
                        size="sm"
                        onClick={() => handleAddCustomSigner(userId)}
                        disabled={!!addingMemberId}
                        loading={isAdding}
                      >
                        {tSignoffs("addCustomSigner")}
                      </Button>
                    </li>
                  );
                })}
              </ul>
            )}
          </div>
        </Modal>
      </div>
    </div>
  );
}

/** Initials-only avatar — neutral colored circle keyed off the
 *  signer's name so two signers don't end up looking identical. */
function SignerAvatar({ name }: { name: string }) {
  const initials = name
    .split(/\s+/)
    .filter(Boolean)
    .slice(0, 2)
    .map((part) => part[0]?.toUpperCase() ?? "")
    .join("");
  // Tiny string hash → one of a fixed palette. Stable per name, so a
  // single user keeps the same colour across the panel.
  const palette = [
    "bg-blue-100 text-blue-700 dark:bg-blue-900/40 dark:text-blue-300",
    "bg-emerald-100 text-emerald-700 dark:bg-emerald-900/40 dark:text-emerald-300",
    "bg-amber-100 text-amber-700 dark:bg-amber-900/40 dark:text-amber-300",
    "bg-violet-100 text-violet-700 dark:bg-violet-900/40 dark:text-violet-300",
    "bg-rose-100 text-rose-700 dark:bg-rose-900/40 dark:text-rose-300",
    "bg-sky-100 text-sky-700 dark:bg-sky-900/40 dark:text-sky-300",
  ];
  let hash = 0;
  for (let i = 0; i < name.length; i++) hash = (hash * 31 + name.charCodeAt(i)) | 0;
  const tone = palette[Math.abs(hash) % palette.length];
  return (
    <div
      className={`w-9 h-9 rounded-full flex items-center justify-center text-xs font-semibold flex-shrink-0 ${tone}`}
      aria-hidden="true"
    >
      {initials || "?"}
    </div>
  );
}

/** Dot + label status for a row. Mirrors the four signoff states and
 *  the "not submitted yet" default — same colour vocabulary as the
 *  header summary chip so the user reads them together. */
function SignoffStatusIndicator({
  status,
  t,
}: {
  status: "pending" | "signed" | "rejected" | undefined;
  t: (key: string) => string;
}) {
  const map = {
    signed: {
      dot: "bg-green-500",
      label: "text-green-700 dark:text-green-400",
      key: "signoffStatus.signed",
    },
    rejected: {
      dot: "bg-red-500",
      label: "text-red-700 dark:text-red-400",
      key: "signoffStatus.rejected",
    },
    pending: {
      dot: "bg-amber-500",
      label: "text-amber-700 dark:text-amber-400",
      key: "signoffStatus.pending",
    },
    undefined: {
      dot: "bg-gray-300 dark:bg-gray-600",
      label: "text-gray-500 dark:text-gray-400",
      key: "notSubmitted",
    },
  } as const;
  const entry = map[status ?? "undefined"];
  return (
    <span className="inline-flex items-center gap-1.5 text-xs font-medium">
      <span
        className={`w-2 h-2 rounded-full ${entry.dot}`}
        aria-hidden="true"
      />
      <span className={entry.label}>{t(entry.key)}</span>
    </span>
  );
}

interface SignoffSummary {
  total: number;
  pending: number;
  signed: number;
  rejected: number;
  tone: "rejected" | "pending" | "signed" | "neutral";
}

interface SignoffSummaryChipProps {
  summary: SignoffSummary;
  expanded: boolean;
  onToggle: () => void;
  /** Translator scoped to the `signoffs` namespace — chip strings sit
   *  under that bucket alongside the rest of the signoff copy. */
  t: (key: string, values?: Record<string, number | string>) => string;
  loading: boolean;
}

/** Header-level summary of the sign-off list. Click to expand the
 *  full list below. Colour signals the most-actionable state so the
 *  user notices a pending request even when collapsed. */
function SignoffSummaryChip({
  summary,
  expanded,
  onToggle,
  t,
  loading,
}: SignoffSummaryChipProps) {
  if (loading) {
    return (
      <div className="h-8 w-32 rounded-full bg-gray-100 dark:bg-gray-800 animate-pulse flex-shrink-0" />
    );
  }

  const { total, pending, signed, rejected, tone } = summary;

  const toneClasses: Record<SignoffSummary["tone"], string> = {
    rejected:
      "bg-red-100 dark:bg-red-900/30 text-red-700 dark:text-red-300 border-red-200 dark:border-red-800 hover:bg-red-200 dark:hover:bg-red-900/40",
    pending:
      "bg-amber-100 dark:bg-amber-900/30 text-amber-700 dark:text-amber-300 border-amber-200 dark:border-amber-800 hover:bg-amber-200 dark:hover:bg-amber-900/40",
    signed:
      "bg-green-100 dark:bg-green-900/30 text-green-700 dark:text-green-300 border-green-200 dark:border-green-800 hover:bg-green-200 dark:hover:bg-green-900/40",
    neutral:
      "bg-gray-100 dark:bg-gray-800 text-gray-700 dark:text-gray-300 border-gray-200 dark:border-gray-700 hover:bg-gray-200 dark:hover:bg-gray-700",
  };

  let label: string;
  if (total === 0) {
    label = t("summaryNoSigners");
  } else if (rejected > 0) {
    label = t("summaryRejected", { count: rejected });
  } else if (pending > 0) {
    label = t("summaryAwaiting", { count: pending });
  } else if (signed === total) {
    label = t("summaryAllSigned", { count: total });
  } else {
    label = t("summarySigners", { count: total });
  }

  return (
    <button
      type="button"
      onClick={onToggle}
      className={`inline-flex items-center gap-2 px-3 py-1.5 rounded-full border text-xs font-medium transition-colors flex-shrink-0 ${toneClasses[tone]}`}
      aria-expanded={expanded}
    >
      <span>{label}</span>
      <ChevronDownIcon
        className={`w-3.5 h-3.5 transition-transform ${
          expanded ? "rotate-180" : ""
        }`}
        aria-hidden="true"
      />
    </button>
  );
}
