"use client";

import { useState, useEffect } from "react";
import { useTranslations } from "next-intl";
import { useParams } from "next/navigation";
import { Link } from "@/i18n/navigation";
import {
  ArrowLeftIcon,
  PlusIcon,
  Square3Stack3DIcon,
  MapPinIcon,
  PencilIcon,
  CheckIcon,
  XMarkIcon,
} from "@heroicons/react/24/outline";
import Button from "@/app/components/ui/Button";
import Alert from "@/app/components/ui/Alert";
import FormInput from "@/app/components/ui/FormInput";
import CreateStagesModal from "@/app/components/modals/CreateStagesModal";
import ProgressCircle from "@/app/components/ui/ProgressCircle";
import { useArea, useStages, useProject, useStageSignoffs, useProjectSigners } from "@/lib/api";
import { usePermission } from "@/lib/hooks/usePermission";
import { PERMISSIONS } from "@/lib/constants/permissions";
import { useCurrentUser } from "@/lib/api/hooks";
import type { Stage } from "@/lib/api/types";
import SignatureModal from "@/app/components/modals/SignatureModal";
import RejectSignoffModal from "@/app/components/modals/RejectSignoffModal";
import { useToast } from "@/app/context/ToastContext";
import PunchlistList from "@/app/components/punchlist/PunchlistList";
import RemarksList from "@/app/components/stage-remarks/RemarksList";
import { useStageRemarks } from "@/lib/api/stage-remarks";
import { usePunchlistItems } from "@/lib/api/punchlist-items";

export default function AreaDetailPage() {
  const t = useTranslations("areaDetail");
  const tStages = useTranslations("stages");
  const params = useParams();
  const projectId = params.id as string;
  const areaId = params.areaId as string;

  // Get query params for pre-selecting stage
  const searchParams = typeof window !== 'undefined' ? new URLSearchParams(window.location.search) : null;
  const stageIdFromQuery = searchParams?.get('stage');

  const { data: project } = useProject(projectId);
  const { data: area, loading: areaLoading, error: areaError } = useArea(projectId, areaId);
  const { data: stages, loading: stagesLoading, error: stagesError, refetch: refetchStages, updateStage, updateStageStatus } = useStages(projectId, areaId);
  const { hasPermission } = usePermission();
  const [isCreateModalOpen, setIsCreateModalOpen] = useState(false);
  const [selectedStageId, setSelectedStageId] = useState<string | null>(null);
  const [isEditing, setIsEditing] = useState(false);
  const [editName, setEditName] = useState("");
  const [editRequiresReleaseForm, setEditRequiresReleaseForm] = useState(false);

  const canCreateStages = hasPermission(PERMISSIONS.CREATE_STAGES);
  const canEditStages = hasPermission(PERMISSIONS.EDIT_STAGES);

  const loading = areaLoading || stagesLoading;
  const error = areaError || stagesError;

  // Calculate progress
  const completedStages = stages?.filter(s => s.status.name === "completed").length || 0;
  const totalStages = stages?.length || 0;
  const progress = totalStages > 0 ? Math.round((completedStages / totalStages) * 100) : 0;

  // Auto-select stage from query param or first stage when stages load
  useEffect(() => {
    if (stages && stages.length > 0 && !selectedStageId) {
      // If stage ID is in query params, try to select it
      if (stageIdFromQuery) {
        const stageExists = stages.find(s => s.identifier === stageIdFromQuery);
        if (stageExists) {
          setSelectedStageId(stageIdFromQuery);
          return;
        }
      }
      // Otherwise select first stage
      setSelectedStageId(stages[0].identifier);
    }
  }, [stages, selectedStageId, stageIdFromQuery]);

  // Get selected stage
  const selectedStage = stages?.find(s => s.identifier === selectedStageId);

  return (
    <div className="space-y-8">
      {/* Header */}
      <div className="flex items-center justify-between">
        <div className="flex items-center gap-4">
          <Link
            href={`/dashboard/projects/${projectId}`}
            className="p-2 hover:bg-gray-100 dark:hover:bg-gray-800 rounded-lg transition-colors"
          >
            <ArrowLeftIcon className="w-5 h-5 text-gray-600 dark:text-gray-400" />
          </Link>
          <div>
            {project && (
              <p className="text-sm text-gray-500 dark:text-gray-400 mb-1">
                {project.name}
              </p>
            )}
            <h1 className="text-2xl font-bold text-gray-900 dark:text-white">
              {area?.name || t("loading")}
            </h1>
            {area?.description && (
              <p className="text-gray-600 dark:text-gray-400 mt-1">
                {area.description}
              </p>
            )}
          </div>
        </div>
        {canCreateStages && !loading && stages?.length === 0 && (
          <Button
            variant="primary"
            onClick={() => setIsCreateModalOpen(true)}
          >
            <PlusIcon className="w-4 h-4" />
            {tStages("bulkCreate")}
          </Button>
        )}
      </div>

      {/* Area Info Card */}
      {area && (
        <div className="bg-white dark:bg-gray-800 rounded-xl shadow-lg border border-gray-100 dark:border-gray-700 p-8">
          <div className="flex items-center gap-8">
            <div className="p-3 bg-blue-100 dark:bg-blue-900/30 rounded-lg">
              <MapPinIcon className="w-8 h-8 text-blue-600 dark:text-blue-400" />
            </div>
            <div className="flex-1 grid grid-cols-1 md:grid-cols-3 gap-6 items-center">
              <div>
                <p className="text-sm text-gray-500 dark:text-gray-400 mb-1">{t("deck")}</p>
                <p className="text-lg font-semibold text-gray-900 dark:text-white">
                  {area.containedInPlace?.name || "-"}
                </p>
              </div>
              <div>
                <p className="text-sm text-gray-500 dark:text-gray-400 mb-1">{t("totalStages")}</p>
                <p className="text-lg font-semibold text-gray-900 dark:text-white">
                  {area.stageCount}
                </p>
              </div>
              <div>
                <p className="text-sm text-gray-500 dark:text-gray-400 mb-1">{t("progress")}</p>
                <div className="flex items-center gap-3">
                  <ProgressCircle percentage={progress} size={64} strokeWidth={6} />
                  <div>
                    <p className="text-lg font-semibold text-gray-900 dark:text-white">
                      {completedStages}/{totalStages}
                    </p>
                    <p className="text-xs text-gray-500 dark:text-gray-400">
                      {t("completed")}
                    </p>
                  </div>
                </div>
              </div>
            </div>
          </div>
        </div>
      )}

      {/* Error State */}
      {error && (
        <Alert
          type="error"
          message={error.message || t("loadError")}
        />
      )}

      {/* Loading State */}
      {loading && (
        <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6">
          {Array.from({ length: 3 }).map((_, i) => (
            <div
              key={i}
              className="bg-white dark:bg-gray-800 rounded-xl shadow-lg border border-gray-100 dark:border-gray-700 p-6 animate-pulse"
            >
              <div className="h-6 bg-gray-200 dark:bg-gray-700 rounded w-3/4 mb-3" />
              <div className="h-4 bg-gray-200 dark:bg-gray-700 rounded w-full mb-2" />
              <div className="h-4 bg-gray-200 dark:bg-gray-700 rounded w-2/3" />
            </div>
          ))}
        </div>
      )}

      {/* Stages Master-Detail Layout */}
      {!loading && !error && stages && (
        <>
          {stages.length === 0 ? (
            <div className="text-center py-12 bg-white dark:bg-gray-800 rounded-xl shadow-lg">
              <Square3Stack3DIcon className="w-16 h-16 mx-auto text-gray-400 dark:text-gray-600 mb-4" />
              <p className="text-gray-500 dark:text-gray-400">
                {t("noStages")}
              </p>
              {canCreateStages && (
                <Button
                  variant="primary"
                  onClick={() => setIsCreateModalOpen(true)}
                  className="mt-4"
                >
                  <PlusIcon className="w-4 h-4" />
                  {t("createFirstStage")}
                </Button>
              )}
            </div>
          ) : (
            <div className="grid grid-cols-1 lg:grid-cols-3 gap-8">
              {/* Left: Stages List */}
              <div className="lg:col-span-1">
                <div className="bg-white dark:bg-gray-800 rounded-xl shadow-lg border border-gray-100 dark:border-gray-700 overflow-hidden">
                  <div className="p-6 border-b border-gray-200 dark:border-gray-700">
                    <h2 className="text-lg font-semibold text-gray-900 dark:text-white">
                      {t("stages")} ({stages.length})
                    </h2>
                  </div>
                  <div className="divide-y divide-gray-200 dark:divide-gray-700">
                    {stages.map((stage) => (
                      <StageListItem
                        key={stage.identifier}
                        stage={stage}
                        isSelected={selectedStageId === stage.identifier}
                        onClick={() => setSelectedStageId(stage.identifier)}
                      />
                    ))}
                  </div>
                </div>
              </div>

              {/* Right: Stage Detail Panel */}
              <div className="lg:col-span-2">
                {selectedStage ? (
                  <StageDetailPanel
                    stage={selectedStage}
                    projectId={projectId}
                    canEdit={canEditStages}
                    onUpdate={async (data) => {
                      await updateStage(selectedStage.identifier, data);
                      refetchStages();
                    }}
                    onUpdateStatus={async (status) => {
                      await updateStageStatus(selectedStage.identifier, { status });
                      await refetchStages();
                    }}
                    onRefetch={refetchStages}
                  />
                ) : (
                  <div className="bg-white dark:bg-gray-800 rounded-xl shadow-lg border border-gray-100 dark:border-gray-700 p-12 text-center">
                    <p className="text-gray-500 dark:text-gray-400">
                      {t("selectStage")}
                    </p>
                  </div>
                )}
              </div>
            </div>
          )}
        </>
      )}

      {/* Create Stages Modal */}
      <CreateStagesModal
        isOpen={isCreateModalOpen}
        onClose={() => setIsCreateModalOpen(false)}
        projectId={projectId}
        areaId={areaId}
        onSuccess={() => {
          refetchStages();
        }}
      />
    </div>
  );
}

// Stage List Item Component
function StageListItem({
  stage,
  isSelected,
  onClick
}: {
  stage: Stage;
  isSelected: boolean;
  onClick: () => void;
}) {
  const t = useTranslations("areaDetail");

  const statusColors = {
    not_started: "bg-gray-100 dark:bg-gray-800 text-gray-700 dark:text-gray-300",
    in_progress: "bg-amber-100 dark:bg-amber-900/30 text-amber-700 dark:text-amber-400",
    pending_signoff: "bg-amber-100 dark:bg-amber-900/30 text-amber-700 dark:text-amber-400",
    completed: "bg-green-100 dark:bg-green-900/30 text-green-700 dark:text-green-400",
    rejected: "bg-red-100 dark:bg-red-900/30 text-red-700 dark:text-red-400",
  };

  return (
    <button
      onClick={onClick}
      className={`w-full text-left p-5 transition-colors ${
        isSelected
          ? "bg-blue-50 dark:bg-blue-900/20 border-l-4 border-blue-600"
          : "hover:bg-gray-50 dark:hover:bg-gray-700/50 border-l-4 border-transparent"
      }`}
    >
      <div className="flex items-start justify-between gap-3">
        <div className="flex-1 min-w-0">
          <h3 className={`text-sm font-semibold truncate ${
            isSelected ? "text-blue-900 dark:text-blue-100" : "text-gray-900 dark:text-white"
          }`}>
            {stage.name}
          </h3>
          <div className="flex items-center gap-2 mt-1">
            <span className={`inline-block px-2 py-0.5 rounded text-xs font-medium ${
              statusColors[stage.status.name as keyof typeof statusColors]
            }`}>
              {t(`status.${stage.status.name}`)}
            </span>
            {stage.requiresReleaseForm && (
              <span className="text-xs text-blue-600 dark:text-blue-400">
                📋
              </span>
            )}
          </div>
        </div>
      </div>
    </button>
  );
}

// Stage Detail Panel Component
function StageDetailPanel({
  stage,
  projectId,
  canEdit,
  onUpdate,
  onUpdateStatus,
  onRefetch,
}: {
  stage: Stage;
  projectId: string;
  canEdit: boolean;
  onUpdate: (data: { name?: string; requires_release_form?: boolean }) => Promise<void>;
  onUpdateStatus: (status: "in_progress") => Promise<void>;
  onRefetch: () => Promise<void>;
}) {
  const t = useTranslations("areaDetail");
  const tSignoffs = useTranslations("signoffs");
  const { showToast } = useToast();
  const { data: currentUser } = useCurrentUser();
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

  const statusColors = {
    not_started: "bg-gray-100 dark:bg-gray-800 text-gray-700 dark:text-gray-300",
    in_progress: "bg-amber-100 dark:bg-amber-900/30 text-amber-700 dark:text-amber-400",
    pending_signoff: "bg-amber-100 dark:bg-amber-900/30 text-amber-700 dark:text-amber-400",
    completed: "bg-green-100 dark:bg-green-900/30 text-green-700 dark:text-green-400",
    rejected: "bg-red-100 dark:bg-red-900/30 text-red-700 dark:text-red-400",
  };

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
