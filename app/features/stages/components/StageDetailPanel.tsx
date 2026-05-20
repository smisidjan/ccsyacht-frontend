"use client";

import { useMemo, useState, useEffect } from "react";
import { useTranslations } from "next-intl";
import { PlusIcon, XMarkIcon } from "@heroicons/react/24/outline";
import Button from "@/app/components/ui/Button";
import Modal from "@/app/components/ui/Modal";
import DeleteConfirmModal from "@/app/components/modals/DeleteConfirmModal";
import { SignatureModal, RejectSignoffModal, RemarksList } from "@/app/features/stages";
import { PunchlistList } from "@/app/features/punchlist";
import {
  useStageSignoffs,
  useProjectSigners,
  useStageCustomSigners,
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

  // When completed, only show tabs with content. Otherwise show all tabs.
  // Release Forms tab is always hidden when completed since it only shows "coming soon" placeholder
  const showReleaseFormsTab = !isCompleted;
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
            <div className="flex items-center gap-3 mb-2">
              {stage.color && (
                <span
                  className="inline-block w-5 h-5 rounded-sm flex-shrink-0 border border-gray-200 dark:border-gray-600"
                  style={{ backgroundColor: stage.color }}
                  aria-hidden="true"
                />
              )}
              <h2 className="text-2xl font-bold text-gray-900 dark:text-white">
                {stage.name}
              </h2>
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
                  disabled={isSubmitting}
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
                      disabled={isSubmitting}
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
            </div>
          </div>
        </div>
      </div>

      {/* Content */}
      <div className="p-4 sm:p-6 md:p-8 space-y-6 md:space-y-8">
        {/* Signoffs Section */}
        <div>
          <div className="flex items-center justify-between mb-6">
            <h3 className="text-lg font-semibold text-gray-900 dark:text-white">
              {t("signoffs")}
            </h3>
            {canManageCustomSigners && (
              <Button
                variant="secondary"
                size="sm"
                onClick={() => setIsAddSignerModalOpen(true)}
              >
                <PlusIcon className="w-4 h-4" />
                {tSignoffs("addCustomSigner")}
              </Button>
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
                <div className="space-y-4">
                  {combinedSigners.map((signer) => {
                    // Find corresponding signoff for this signer
                    const signoff = signoffs?.find(s => s.recipient.identifier === signer.member.identifier);
                    const isCurrentUser = currentUser?.identifier === signer.member.identifier;
                    const canSign = isCurrentUser && signoff?.status === "pending";
                    const canReject = isCurrentUser && signoff?.status === "pending";
                    const isCustom = signer.kind === "custom";

                    return (
                      <div
                        key={`${signer.kind}-${signer.member.identifier}`}
                        className="flex items-start justify-between p-5 bg-gray-50 dark:bg-gray-700/50 rounded-lg"
                      >
                        <div className="flex-1">
                          <div className="flex items-center gap-3 mb-2 flex-wrap">
                            <p className="font-medium text-gray-900 dark:text-white">
                              {signer.member.name}
                            </p>
                            {isCustom ? (
                              <span className="inline-block px-2 py-0.5 rounded text-xs font-medium bg-blue-100 dark:bg-blue-900/30 text-blue-700 dark:text-blue-400">
                                {tSignoffs("customSignerLabel")}
                              </span>
                            ) : (
                              <span className="inline-block px-2 py-0.5 rounded text-xs font-medium bg-gray-200 dark:bg-gray-700 text-gray-700 dark:text-gray-300">
                                {tSignoffs("defaultSignerLabel")}
                              </span>
                            )}
                            <span
                              className={`inline-block px-2 py-0.5 rounded text-xs font-medium ${
                                signoff?.status === "signed"
                                  ? "bg-green-100 dark:bg-green-900/30 text-green-700 dark:text-green-400"
                                  : signoff?.status === "rejected"
                                  ? "bg-red-100 dark:bg-red-900/30 text-red-700 dark:text-red-400"
                                  : signoff?.status === "pending"
                                  ? "bg-amber-100 dark:bg-amber-900/30 text-amber-700 dark:text-amber-400"
                                  : "bg-gray-100 dark:bg-gray-800 text-gray-700 dark:text-gray-300"
                              }`}
                            >
                              {signoff
                                ? tSignoffs(`signoffStatus.${signoff.status}`)
                                : tSignoffs("notSubmitted")}
                            </span>
                          </div>
                          {isCustom && signer.addedBy && (
                            <p className="text-xs text-gray-500 dark:text-gray-400 mb-2">
                              {signer.addedAt
                                ? tSignoffs("addedByOn", {
                                    name: signer.addedBy.name,
                                    date: new Date(
                                      signer.addedAt
                                    ).toLocaleDateString(),
                                  })
                                : tSignoffs("addedByCustomSigner", {
                                    name: signer.addedBy.name,
                                  })}
                            </p>
                          )}

                          {/* Show who signed/rejected and when */}
                          {signoff?.status === "signed" && signoff.agent && signoff.signedAt && (
                            <p className="text-xs text-green-700 dark:text-green-400 mt-1">
                              {tSignoffs("signedBy", {
                                name: signoff.agent.name,
                                date: new Date(signoff.signedAt).toLocaleDateString(),
                                time: new Date(signoff.signedAt).toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' })
                              })}
                            </p>
                          )}

                          {signoff?.status === "rejected" && signoff.agent && signoff.signedAt && (
                            <p className="text-xs text-red-700 dark:text-red-400 mt-1">
                              {tSignoffs("rejectedBy", {
                                name: signoff.agent.name,
                                date: new Date(signoff.signedAt).toLocaleDateString(),
                                time: new Date(signoff.signedAt).toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' })
                              })}
                            </p>
                          )}

                          {signoff?.notes && (
                            <p className="text-sm text-gray-600 dark:text-gray-400 mt-2 italic">
                              "{signoff.notes}"
                            </p>
                          )}

                          {/* Show rejection history */}
                          {signoff?.rejectionHistory && signoff.rejectionHistory.length > 0 && (
                            <div className="mt-3 pt-3 border-t border-gray-200 dark:border-gray-600">
                              <p className="text-xs font-semibold text-gray-700 dark:text-gray-300 mb-2">
                                {tSignoffs("rejectionHistory")}:
                              </p>
                              <div className="space-y-2">
                                {signoff.rejectionHistory.map((rejection, index) => (
                                  <div key={index} className="text-xs text-gray-600 dark:text-gray-400">
                                    <p className="font-medium text-red-600 dark:text-red-400">
                                      {tSignoffs("rejectedBy", {
                                        name: rejection.rejected_by_name,
                                        date: new Date(rejection.rejected_at).toLocaleDateString(),
                                        time: new Date(rejection.rejected_at).toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' })
                                      })}
                                    </p>
                                    {rejection.notes && (
                                      <p className="italic mt-1">"{rejection.notes}"</p>
                                    )}
                                  </div>
                                ))}
                              </div>
                            </div>
                          )}
                        </div>

                        <div className="flex items-start gap-2 ml-4">
                          {(canSign || canReject) && signoff && (
                            <>
                              <Button
                                variant="success"
                                size="sm"
                                onClick={() => {
                                  setSelectedSignoffId(signoff.identifier);
                                  setShowSignModal(true);
                                }}
                              >
                                {tSignoffs("sign")}
                              </Button>
                              <Button
                                variant="danger"
                                size="sm"
                                onClick={() => {
                                  setSelectedSignoffId(signoff.identifier);
                                  setShowRejectModal(true);
                                }}
                              >
                                {tSignoffs("reject")}
                              </Button>
                            </>
                          )}
                          {/* Custom signers can be unassigned at any
                              time by anyone with edit_stages. Their
                              pending signoff (if any) goes away when
                              the row is removed. */}
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
                                className="p-1.5 text-gray-400 hover:text-red-600 dark:hover:text-red-400 transition-colors"
                                aria-label={tSignoffs("removeCustomSigner")}
                                title={tSignoffs("removeCustomSigner")}
                              >
                                <XMarkIcon className="w-4 h-4" />
                              </button>
                            )}
                        </div>
                      </div>
                    );
                  })}
                </div>
              )}
        </div>

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
              <div>
                <p className="text-sm text-gray-500 dark:text-gray-400">
                  {t("releaseFormsComingSoon")}
                </p>
              </div>
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
