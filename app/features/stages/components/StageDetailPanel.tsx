"use client";

import { useState, useEffect } from "react";
import { useTranslations } from "next-intl";
import {
  PencilIcon,
  CheckIcon,
  XMarkIcon,
} from "@heroicons/react/24/outline";
import Button from "@/app/components/ui/Button";
import FormInput from "@/app/components/ui/FormInput";
import { SignatureModal, RejectSignoffModal, RemarksList } from "@/app/features/stages";
import { PunchlistList } from "@/app/features/punchlist";
import { useStageSignoffs, useProjectSigners } from "@/lib/api";
import { useStageRemarks } from "@/lib/api/stage-remarks";
import { usePunchlistItems } from "@/lib/api/punchlist-items";
import { useCurrentUserContext } from "@/app/context/CurrentUserContext";
import { useToast } from "@/app/context/ToastContext";
import type { Stage } from "@/lib/api/types";

interface StageDetailPanelProps {
  stage: Stage;
  projectId: string;
  canEdit: boolean;
  onUpdate: (data: { name?: string; requires_release_form?: boolean }) => Promise<void>;
  onUpdateStatus: (status: "in_progress") => Promise<void>;
  onRefetch: () => Promise<void>;
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
  canEdit,
  onUpdate,
  onUpdateStatus,
  onRefetch,
}: StageDetailPanelProps) {
  const t = useTranslations("areaDetail");
  const tSignoffs = useTranslations("signoffs");
  const { showToast } = useToast();
  const { currentUser } = useCurrentUserContext();
  const { data: signoffs, loading: signoffsLoading, sign, reject, submitForSignoff } = useStageSignoffs(projectId, stage.identifier);
  const { data: projectSigners, loading: signersLoading } = useProjectSigners(projectId);

  // Fetch remarks and punchlist counts to determine which tabs to show when completed
  const { data: remarks } = useStageRemarks(projectId, stage.identifier, { include_replies: true });
  const { data: punchlistItems } = usePunchlistItems(projectId, stage.identifier, { per_page: 1 });

  const [isEditing, setIsEditing] = useState(false);
  const [editName, setEditName] = useState(stage.name);
  const [editRequiresReleaseForm, setEditRequiresReleaseForm] = useState(stage.requiresReleaseForm);
  const [isSaving, setIsSaving] = useState(false);
  const [showSignModal, setShowSignModal] = useState(false);
  const [showRejectModal, setShowRejectModal] = useState(false);
  const [selectedSignoffId, setSelectedSignoffId] = useState<string | null>(null);
  const [isSubmitting, setIsSubmitting] = useState(false);
  const [activeTab, setActiveTab] = useState<"releaseForms" | "remarks" | "punchlist">("releaseForms");

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
  if (showReleaseFormsTab) availableTabs.push("releaseForms");
  if (showRemarksTab) availableTabs.push("remarks");
  if (showPunchlistTab) availableTabs.push("punchlist");

  // Auto-select first available tab if current tab is hidden
  useEffect(() => {
    if (availableTabs.length > 0 && !availableTabs.includes(activeTab)) {
      setActiveTab(availableTabs[0]);
    }
  }, [availableTabs.join(","), activeTab]); // Use join for dependency array

  const handleSave = async () => {
    setIsSaving(true);
    try {
      await onUpdate({
        name: editName,
        requires_release_form: editRequiresReleaseForm,
      });
      setIsEditing(false);
    } catch (error) {
      console.error("Failed to update stage:", error);
    } finally {
      setIsSaving(false);
    }
  };

  const handleCancel = () => {
    setEditName(stage.name);
    setEditRequiresReleaseForm(stage.requiresReleaseForm);
    setIsEditing(false);
  };

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
      <div className="p-8 border-b border-gray-200 dark:border-gray-700">
        <div className="flex items-start justify-between gap-6">
          <div className="flex-1">
            {isEditing ? (
              <FormInput
                id="stage-name"
                label={t("name")}
                value={editName}
                onChange={(e) => setEditName(e.target.value)}
                required
              />
            ) : (
              <div>
                <h2 className="text-2xl font-bold text-gray-900 dark:text-white mb-2">
                  {stage.name}
                </h2>
                <div className="flex items-center gap-3 flex-wrap">
                  <span className={`inline-block px-3 py-1 rounded text-sm font-medium ${
                    statusColors[stage.status.name as keyof typeof statusColors]
                  }`}>
                    {t(`status.${stage.status.name}`)}
                  </span>

                  {/* Status Flow Buttons */}
                  {canEdit && stage.status.name === "not_started" && (
                    <>
                      {stage.position === 0 ? (
                        <Button
                          variant="success"
                          size="sm"
                          onClick={async () => {
                            setIsSubmitting(true);
                            try {
                              await onUpdateStatus("in_progress");
                              showToast("success", t("stageStarted"));
                            } catch (error) {
                              console.error("Failed to start stage:", error);
                              showToast("error", t("stageStartError"));
                            } finally {
                              setIsSubmitting(false);
                            }
                          }}
                          disabled={isSubmitting}
                        >
                          {t("startStage")}
                        </Button>
                      ) : (
                        <p className="text-sm text-blue-700 dark:text-blue-400 bg-blue-100 dark:bg-blue-900/30 px-3 py-1 rounded">
                          {t("autoStartsAfterPrevious")}
                        </p>
                      )}
                    </>
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
            )}
          </div>

          {canEdit && (
            <div className="flex gap-2">
              {isEditing ? (
                <>
                  <button
                    onClick={handleCancel}
                    disabled={isSaving}
                    className="p-2 text-gray-600 hover:text-gray-800 dark:text-gray-400 dark:hover:text-gray-200 disabled:opacity-50"
                  >
                    <XMarkIcon className="w-5 h-5" />
                  </button>
                  <button
                    onClick={handleSave}
                    disabled={isSaving || !editName.trim()}
                    className="p-2 text-blue-600 hover:text-blue-700 dark:text-blue-400 dark:hover:text-blue-300 disabled:opacity-50"
                  >
                    <CheckIcon className="w-5 h-5" />
                  </button>
                </>
              ) : (
                <button
                  onClick={() => setIsEditing(true)}
                  className="p-2 text-gray-600 hover:text-gray-800 dark:text-gray-400 dark:hover:text-gray-200"
                >
                  <PencilIcon className="w-5 h-5" />
                </button>
              )}
            </div>
          )}
        </div>
      </div>

      {/* Content */}
      <div className="p-8 space-y-8">
        {/* Basic Info */}
        <div className="grid grid-cols-2 gap-6">
          <div>
            <p className="text-sm text-gray-500 dark:text-gray-400 mb-1">
              {t("position")}
            </p>
            <p className="text-lg font-semibold text-gray-900 dark:text-white">
              {stage.position}
            </p>
          </div>

          <div>
            <p className="text-sm text-gray-500 dark:text-gray-400 mb-1">
              {t("requiresReleaseForm")}
            </p>
            {isEditing ? (
              <label className="flex items-center gap-2">
                <input
                  type="checkbox"
                  checked={editRequiresReleaseForm}
                  onChange={(e) => setEditRequiresReleaseForm(e.target.checked)}
                  className="w-4 h-4 text-blue-600 bg-gray-100 border-gray-300 rounded focus:ring-blue-500"
                />
                <span className="text-sm text-gray-700 dark:text-gray-300">
                  {t("required")}
                </span>
              </label>
            ) : (
              <p className="text-lg font-semibold text-gray-900 dark:text-white">
                {stage.requiresReleaseForm ? t("yes") : t("no")}
              </p>
            )}
          </div>
        </div>

        {/* Signoffs Section */}
        <div className="pt-8 border-t border-gray-200 dark:border-gray-700">
          <h3 className="text-lg font-semibold text-gray-900 dark:text-white mb-6">
            {t("signoffs")}
          </h3>
          {(signoffsLoading || signersLoading) ? (
                <p className="text-sm text-gray-500 dark:text-gray-400">
                  {tSignoffs("loading")}...
                </p>
              ) : !projectSigners || projectSigners.length === 0 ? (
                <p className="text-sm text-gray-500 dark:text-gray-400">
                  {tSignoffs("noSigners")}
                </p>
              ) : (
                <div className="space-y-4">
                  {projectSigners.map((signer) => {
                    // Find corresponding signoff for this signer
                    const signoff = signoffs?.find(s => s.recipient.identifier === signer.member.identifier);
                    const isCurrentUser = currentUser?.identifier === signer.member.identifier;
                    const canSign = isCurrentUser && signoff?.status === "pending";
                    const canReject = isCurrentUser && signoff?.status === "pending";

                    return (
                      <div
                        key={signer.member.identifier}
                        className="flex items-start justify-between p-5 bg-gray-50 dark:bg-gray-700/50 rounded-lg"
                      >
                        <div className="flex-1">
                          <div className="flex items-center gap-3 mb-2">
                            <p className="font-medium text-gray-900 dark:text-white">
                              {signer.member.name}
                            </p>
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

                        {(canSign || canReject) && signoff && (
                          <div className="flex gap-2 ml-4">
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
                          </div>
                        )}
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
                stageId={stage.identifier}
                stageStatus={stage.status.name}
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
      </div>
    </div>
  );
}
