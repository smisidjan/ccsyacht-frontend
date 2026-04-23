"use client";

import { useState, useEffect, useMemo } from "react";
import { useTranslations } from "next-intl";
import {
  UserGroupIcon,
  CalendarDaysIcon,
  ClockIcon,
  CheckCircleIcon,
} from "@heroicons/react/24/outline";
import Modal from "@/app/components/ui/Modal";
import Button from "@/app/components/ui/Button";
import Stepper, { Step } from "@/app/components/ui/Stepper";
import Alert from "@/app/components/ui/Alert";
import { setupTasksApi } from "@/lib/api";
import { useCurrentUserContext } from "@/app/context/CurrentUserContext";
import { useRolesContext } from "@/app/context/RolesContext";
import { useProjectMembersFromContext } from "@/app/context/ProjectContext";
import { useToast } from "@/app/context/ToastContext";
import { usePermission } from "@/lib/hooks/usePermission";
import { PERMISSIONS } from "@/lib/constants/permissions";
import { handleError } from "@/lib/utils/errors";
import { createISODateTime } from "../../utils";

// Phase Components
import AttendeesPhase from "./AttendeesPhase";
import DatesPhase from "./DatesPhase";
import ResponsesPhase from "./ResponsesPhase";
import ConfirmationPhase from "./ConfirmationPhase";

import type { SetupTask, SchedulingStatus, ProjectMember } from "@/lib/api/types";
import type {
  KickoffSchedulingModalProps,
  Phase,
  RoleType,
  LocalDateWithTimes,
  LocalTimeSlot,
  TimeInputState,
  TimeSlotUserResponse,
  MeetingFormat,
} from "./types";

export default function KickoffSchedulingModal({
  isOpen,
  onClose,
  projectId,
  taskId,
  onUpdate,
}: KickoffSchedulingModalProps) {
  const t = useTranslations("projectDetail.setupTasks.kickoffScheduling");
  const tCommon = useTranslations("common");
  const { showToast } = useToast();
  const { hasPermission } = usePermission();
  const { currentUser } = useCurrentUserContext();
  const { data: projectMembers } = useProjectMembersFromContext();

  // Data state
  const [task, setTask] = useState<SetupTask | null>(null);
  const [schedulingStatus, setSchedulingStatus] = useState<SchedulingStatus | null>(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);

  // Form state
  const [selectedUserIds, setSelectedUserIds] = useState<string[]>([]);
  const [localDatesWithTimes, setLocalDatesWithTimes] = useState<LocalDateWithTimes[]>([]);
  const [newDateInput, setNewDateInput] = useState("");
  const [newTimeInputs, setNewTimeInputs] = useState<Record<string, TimeInputState>>({});
  const [selectedFinalDateId, setSelectedFinalDateId] = useState<string | null>(null);
  const [manualPhase, setManualPhase] = useState<Phase | null>(null);
  const [expandedDates, setExpandedDates] = useState<Set<string>>(new Set());

  // Action state
  const [isAddingAssignees, setIsAddingAssignees] = useState(false);
  const [isSendingInvitations, setIsSendingInvitations] = useState(false);
  const [isSelectingDate, setIsSelectingDate] = useState(false);
  const [confirmationMode, setConfirmationMode] = useState<"select" | "propose">("select");
  const [isRespondingToDate, setIsRespondingToDate] = useState(false);
  const [selectedMeetingFormat, setSelectedMeetingFormat] = useState<MeetingFormat>(null);

  // Propose alternative dates state
  const [showProposeAlternative, setShowProposeAlternative] = useState(false);
  const [proposedAlternatives, setProposedAlternatives] = useState<LocalDateWithTimes[]>([]);
  const [newProposedDateInput, setNewProposedDateInput] = useState("");
  const [newProposedTimeInputs, setNewProposedTimeInputs] = useState<Record<string, TimeInputState>>({});
  const [expandedProposedDates, setExpandedProposedDates] = useState<Set<string>>(new Set());
  const [isSubmittingProposal, setIsSubmittingProposal] = useState(false);

  // Permissions
  const canManageKickoff = hasPermission(PERMISSIONS.MANAGE_KICKOFF_MEETING);

  // Get cached roles from context (project members come from context)
  const { employeeRoles, guestRoles } = useRolesContext();

  // Create a map of role names to their type
  const roleTypeMap = useMemo(() => {
    const map: Record<string, RoleType> = {};
    employeeRoles?.forEach((role) => {
      map[role.name] = "employee";
    });
    guestRoles?.forEach((role) => {
      map[role.name] = "guest";
    });
    return map;
  }, [employeeRoles, guestRoles]);

  // Helper to get full member info
  const getMemberInfo = (assigneeId: string): ProjectMember | undefined => {
    return projectMembers?.find((m) => m.member.identifier === assigneeId);
  };

  // Pre-select current user as attendee when modal opens
  useEffect(() => {
    if (currentUser && projectMembers && task) {
      const isProjectMember = projectMembers.some(
        (m) => m.member.identifier === currentUser.identifier
      );
      const isAlreadyAttendee = task.assignees?.some(
        (a) => a.identifier === currentUser.identifier
      );

      if (isProjectMember && !isAlreadyAttendee && !selectedUserIds.includes(currentUser.identifier)) {
        setSelectedUserIds((prev) => [...prev, currentUser.identifier]);
      }
    }
  }, [currentUser, projectMembers, task]);

  // Determine the natural phase based on task status
  const naturalPhase = useMemo((): Phase => {
    if (!task) return "attendees";

    switch (task.actionStatus) {
      case "pending":
        if (!task.assignees || task.assignees.length === 0) return "attendees";
        if (!task.proposedDates || task.proposedDates.length === 0) return "dates";
        return "dates";

      case "awaiting_responses":
        if (schedulingStatus?.allResponded) return "confirmation";
        return "responses";

      case "scheduled":
      case "completed":
        return "confirmation";

      default:
        return "attendees";
    }
  }, [task, schedulingStatus]);

  // Current phase with manual override
  const currentPhase = useMemo((): Phase => {
    if (manualPhase && task?.actionStatus === "pending") {
      return manualPhase;
    }
    return naturalPhase;
  }, [manualPhase, naturalPhase, task?.actionStatus]);

  // Navigation functions
  const goBack = () => {
    if (currentPhase === "dates") {
      setManualPhase("attendees");
    }
  };

  const goForward = () => {
    setManualPhase(null);
  };

  // Build stepper steps
  const steps = useMemo((): Step[] => {
    const hasAttendees = task?.assignees && task.assignees.length > 0;
    const hasProposedDates = task?.proposedDates && task.proposedDates.length > 0;
    const isAwaitingResponses = task?.actionStatus === "awaiting_responses";
    const isScheduled = task?.actionStatus === "scheduled" || task?.actionStatus === "completed";

    return [
      {
        id: "attendees",
        label: t("phases.attendees"),
        icon: <UserGroupIcon className="w-4 h-4" />,
        status: hasAttendees ? "completed" : currentPhase === "attendees" ? "current" : "pending",
        badge: hasAttendees ? `${task.assignees.length}` : undefined,
      },
      {
        id: "dates",
        label: t("phases.dateOptions"),
        icon: <CalendarDaysIcon className="w-4 h-4" />,
        status: isAwaitingResponses || isScheduled
          ? "completed"
          : hasProposedDates && currentPhase === "dates"
            ? "current"
            : hasAttendees && !hasProposedDates
              ? "current"
              : "pending",
        badge: hasProposedDates ? `${task.proposedDates?.length}` : undefined,
      },
      {
        id: "responses",
        label: t("phases.responses"),
        icon: <ClockIcon className="w-4 h-4" />,
        status: isScheduled
          ? "completed"
          : isAwaitingResponses
            ? schedulingStatus?.allResponded
              ? "completed"
              : "waiting"
            : "pending",
        badge: isAwaitingResponses
          ? `${schedulingStatus?.respondedCount || 0}/${schedulingStatus?.totalAttendees || 0}`
          : undefined,
      },
      {
        id: "confirmation",
        label: t("phases.confirmation"),
        icon: <CheckCircleIcon className="w-4 h-4" />,
        status: isScheduled ? "completed" : currentPhase === "confirmation" ? "current" : "pending",
      },
    ];
  }, [task, schedulingStatus, currentPhase, t]);

  // Fetch data
  useEffect(() => {
    if (isOpen && taskId) {
      fetchData();
    }
  }, [isOpen, taskId]);

  const fetchData = async (showLoading = true) => {
    try {
      if (showLoading) setLoading(true);
      setError(null);

      const [taskResponse, statusResponse] = await Promise.all([
        setupTasksApi.getById(projectId, taskId),
        setupTasksApi.getSchedulingStatus(projectId, taskId).catch(() => null),
      ]);

      setTask(taskResponse.data || taskResponse);
      if (statusResponse) setSchedulingStatus(statusResponse);
    } catch (err) {
      const errorMessage = handleError(err, {
        severity: "console",
        context: "Error fetching data",
        fallbackMessage: t("loadError"),
      });
      setError(errorMessage);
    } finally {
      if (showLoading) setLoading(false);
    }
  };

  const refreshData = () => fetchData(false);

  // Check if there are any valid date+time combinations
  const hasValidDateTimes = localDatesWithTimes.some((d) => d.timeSlots.length > 0);

  // Check if current user is an attendee
  const isCurrentUserAttendee = useMemo(() => {
    if (!task || !currentUser) return false;
    return task.assignees?.some((a) => a.identifier === currentUser.identifier);
  }, [task, currentUser]);

  // Current user responses
  const currentUserResponses = useMemo(() => {
    if (!schedulingStatus || !currentUser) return {};
    const responses: Record<string, TimeSlotUserResponse | null> = {};

    schedulingStatus.proposedDates.forEach((date) => {
      date.timeSlots.forEach((slot) => {
        const userResponse = slot.responses.find(
          (r) => r.userId === currentUser.identifier
        );
        if (userResponse) {
          responses[slot.id] = {
            online: userResponse.canAttendOnline,
            live: userResponse.canAttendLive,
          };
        } else {
          responses[slot.id] = null;
        }
      });
    });

    return responses;
  }, [schedulingStatus, currentUser]);

  // Check if current user has declined all slots (neither online nor live for any slot)
  const hasDeclinedAllSlots = useMemo(() => {
    if (!schedulingStatus || !currentUser || !isCurrentUserAttendee) return false;

    const allSlotIds: string[] = [];
    schedulingStatus.proposedDates.forEach((date) => {
      date.timeSlots.forEach((slot) => {
        allSlotIds.push(slot.id);
      });
    });

    if (allSlotIds.length === 0) return false;

    const allResponded = allSlotIds.every((slotId) => currentUserResponses[slotId] !== null);
    const allDeclined = allSlotIds.every((slotId) => {
      const response = currentUserResponses[slotId];
      return response !== null && !response.online && !response.live;
    });

    return allResponded && allDeclined;
  }, [schedulingStatus, currentUser, isCurrentUserAttendee, currentUserResponses]);

  // === Handlers ===

  const handleAddAttendees = async () => {
    if (selectedUserIds.length === 0) return;

    try {
      setIsAddingAssignees(true);
      setError(null);

      await Promise.all(
        selectedUserIds.map((userId) =>
          setupTasksApi.addAssignee(projectId, taskId, { user_id: userId })
        )
      );

      showToast("success", t("attendeesAdded", { count: selectedUserIds.length }));
      setSelectedUserIds([]);
      onUpdate?.();
      await refreshData();
    } catch (err) {
      setError(err instanceof Error ? err.message : t("addError"));
    } finally {
      setIsAddingAssignees(false);
    }
  };

  const handleRemoveAttendee = async (userId: string) => {
    try {
      setError(null);
      await setupTasksApi.removeAssignee(projectId, taskId, userId);
      showToast("success", t("attendeeRemoved"));
      onUpdate?.();
      await refreshData();
    } catch (err) {
      setError(err instanceof Error ? err.message : t("removeError"));
    }
  };

  const handleAddDate = () => {
    if (!newDateInput) return;

    const exists = localDatesWithTimes.some((d) => d.date === newDateInput);
    if (exists) {
      showToast("error", t("dates.duplicateDate"));
      return;
    }

    setLocalDatesWithTimes((prev) => [...prev, { date: newDateInput, timeSlots: [] }]);
    setExpandedDates((prev) => new Set([...prev, newDateInput]));
    setNewDateInput("");
  };

  const handleAddTimeSlotToDate = (date: string, startTime: string, endTime: string) => {
    if (endTime <= startTime) {
      showToast("error", t("dates.endBeforeStart"));
      return;
    }

    const existingDate = localDatesWithTimes.find((d) => d.date === date);
    const isDuplicate = existingDate?.timeSlots.some(
      (slot) => slot.startTime === startTime && slot.endTime === endTime
    );
    if (isDuplicate) {
      showToast("error", t("dates.duplicateTime"));
      return;
    }

    setLocalDatesWithTimes((prev) =>
      prev.map((d) => {
        if (d.date === date) {
          const newSlot: LocalTimeSlot = { startTime, endTime };
          return {
            ...d,
            timeSlots: [...d.timeSlots, newSlot].sort((a, b) =>
              a.startTime.localeCompare(b.startTime)
            ),
          };
        }
        return d;
      })
    );
  };

  const handleRemoveLocalTimeSlot = (date: string, slot: LocalTimeSlot) => {
    setLocalDatesWithTimes((prev) =>
      prev.map((d) => {
        if (d.date === date) {
          return {
            ...d,
            timeSlots: d.timeSlots.filter(
              (s) => !(s.startTime === slot.startTime && s.endTime === slot.endTime)
            ),
          };
        }
        return d;
      })
    );
  };

  const handleRemoveLocalDate = (date: string) => {
    setLocalDatesWithTimes((prev) => prev.filter((d) => d.date !== date));
    setExpandedDates((prev) => {
      const next = new Set(prev);
      next.delete(date);
      return next;
    });
  };

  const handleRemoveProposedDate = async (dateId: string) => {
    try {
      setError(null);
      await setupTasksApi.removeProposedDate(projectId, taskId, dateId);
      showToast("success", t("dateRemoved"));
      await refreshData();
    } catch (err) {
      setError(err instanceof Error ? err.message : t("removeError"));
    }
  };

  const handleSendInvitations = async () => {
    try {
      setIsSendingInvitations(true);
      setError(null);

      // Add each date with its time slots
      for (const dateWithTimes of localDatesWithTimes) {
        if (dateWithTimes.timeSlots.length > 0) {
          const timeSlots = dateWithTimes.timeSlots.map((slot) => ({
            start_time: slot.startTime,
            end_time: slot.endTime,
          }));

          await setupTasksApi.addProposedDate(projectId, taskId, {
            date: dateWithTimes.date,
            time_slots: timeSlots,
          });
        }
      }

      setLocalDatesWithTimes([]);

      // Send invitations
      await setupTasksApi.sendInvitations(projectId, taskId);

      showToast("success", t("invitationsSent"));
      onUpdate?.();
      await refreshData();
    } catch (err) {
      setError(err instanceof Error ? err.message : t("sendError"));
    } finally {
      setIsSendingInvitations(false);
    }
  };

  const handleRespondToTimeSlot = async (slotId: string, canAttendOnline: boolean, canAttendLive: boolean) => {
    try {
      setIsRespondingToDate(true);
      setError(null);

      await setupTasksApi.respondToTimeSlot(projectId, taskId, slotId, {
        can_attend_online: canAttendOnline,
        can_attend_live: canAttendLive,
      });

      showToast("success", t("responseRecorded"));
      await refreshData();
    } catch (err) {
      setError(err instanceof Error ? err.message : t("responseError"));
    } finally {
      setIsRespondingToDate(false);
    }
  };

  const handleSelectFinalDate = async (slotIdOverride?: string, format?: MeetingFormat) => {
    const slotId = slotIdOverride || selectedFinalDateId;
    if (!slotId || !format) return;

    // Convert frontend format to API format
    const apiFormat: "online" | "live" = format === "in_person" ? "live" : "online";

    try {
      setIsSelectingDate(true);
      setError(null);

      await setupTasksApi.selectTimeSlot(projectId, taskId, slotId, apiFormat);

      showToast("success", t("dateConfirmed"));
      onUpdate?.();
      await refreshData();
    } catch (err) {
      setError(err instanceof Error ? err.message : t("confirmError"));
    } finally {
      setIsSelectingDate(false);
    }
  };

  // === Propose Alternative Handlers ===

  const handleAddProposedAlternativeDate = () => {
    if (!newProposedDateInput) return;

    const exists = proposedAlternatives.some((d) => d.date === newProposedDateInput);
    if (exists) {
      showToast("error", t("dates.duplicateDate"));
      return;
    }

    setProposedAlternatives((prev) => [...prev, { date: newProposedDateInput, timeSlots: [] }]);
    setExpandedProposedDates((prev) => new Set([...prev, newProposedDateInput]));
    setNewProposedDateInput("");
  };

  const handleAddTimeToProposedDate = (date: string, startTime: string, endTime: string) => {
    if (endTime <= startTime) {
      showToast("error", t("dates.endBeforeStart"));
      return;
    }

    const existingDate = proposedAlternatives.find((d) => d.date === date);
    const isDuplicate = existingDate?.timeSlots.some(
      (slot) => slot.startTime === startTime && slot.endTime === endTime
    );
    if (isDuplicate) {
      showToast("error", t("dates.duplicateTime"));
      return;
    }

    setProposedAlternatives((prev) =>
      prev.map((d) => {
        if (d.date === date) {
          const newSlot: LocalTimeSlot = { startTime, endTime };
          return {
            ...d,
            timeSlots: [...d.timeSlots, newSlot].sort((a, b) =>
              a.startTime.localeCompare(b.startTime)
            ),
          };
        }
        return d;
      })
    );
  };

  const handleRemoveTimeFromProposedDate = (date: string, slot: LocalTimeSlot) => {
    setProposedAlternatives((prev) =>
      prev.map((d) => {
        if (d.date === date) {
          return {
            ...d,
            timeSlots: d.timeSlots.filter(
              (s) => !(s.startTime === slot.startTime && s.endTime === slot.endTime)
            ),
          };
        }
        return d;
      })
    );
  };

  const handleRemoveProposedAlternativeDate = (date: string) => {
    setProposedAlternatives((prev) => prev.filter((d) => d.date !== date));
    setExpandedProposedDates((prev) => {
      const next = new Set(prev);
      next.delete(date);
      return next;
    });
  };

  const handleSubmitProposedAlternatives = async () => {
    const hasValid = proposedAlternatives.some((d) => d.timeSlots.length > 0);
    if (!hasValid) return;

    try {
      setIsSubmittingProposal(true);
      setError(null);

      // Convert to API format
      const suggestions: Array<{ start_datetime: string; end_datetime?: string }> = [];
      for (const dateWithTimes of proposedAlternatives) {
        for (const slot of dateWithTimes.timeSlots) {
          suggestions.push({
            start_datetime: createISODateTime(dateWithTimes.date, slot.startTime),
            end_datetime: slot.endTime
              ? createISODateTime(dateWithTimes.date, slot.endTime)
              : undefined,
          });
        }
      }

      await setupTasksApi.suggestTimeSlots(projectId, taskId, suggestions);

      showToast("success", t("proposeAlternative.submitted"));
      setProposedAlternatives([]);
      setShowProposeAlternative(false);
      await refreshData();
    } catch (err) {
      setError(err instanceof Error ? err.message : t("proposeAlternative.submitError"));
    } finally {
      setIsSubmittingProposal(false);
    }
  };

  // Render phase content
  const renderPhaseContent = () => {
    if (loading) {
      return (
        <div className="space-y-4 py-8">
          <div className="h-4 bg-gray-200 dark:bg-gray-700 rounded w-3/4 animate-pulse mx-auto" />
          <div className="h-4 bg-gray-200 dark:bg-gray-700 rounded w-full animate-pulse" />
          <div className="h-4 bg-gray-200 dark:bg-gray-700 rounded w-2/3 animate-pulse mx-auto" />
        </div>
      );
    }

    if (!task) {
      return <Alert type="error" message={t("loadError")} />;
    }

    switch (currentPhase) {
      case "attendees":
        return (
          <AttendeesPhase
            projectId={projectId}
            taskId={taskId}
            task={task}
            schedulingStatus={schedulingStatus}
            loading={loading}
            error={error}
            onRefresh={refreshData}
            projectMembers={projectMembers || null}
            roles={null}
            selectedUserIds={selectedUserIds}
            setSelectedUserIds={setSelectedUserIds}
            isAddingAssignees={isAddingAssignees}
            onAddAssignees={handleAddAttendees}
            onRemoveAssignee={handleRemoveAttendee}
            getMemberInfo={getMemberInfo}
            roleTypeMap={roleTypeMap}
            canManageKickoff={canManageKickoff}
            onNext={goForward}
          />
        );

      case "dates":
        return (
          <DatesPhase
            projectId={projectId}
            taskId={taskId}
            task={task}
            schedulingStatus={schedulingStatus}
            loading={loading}
            error={error}
            onRefresh={refreshData}
            localDatesWithTimes={localDatesWithTimes}
            setLocalDatesWithTimes={setLocalDatesWithTimes}
            newDateInput={newDateInput}
            setNewDateInput={setNewDateInput}
            newTimeInputs={newTimeInputs}
            setNewTimeInputs={setNewTimeInputs}
            expandedDates={expandedDates}
            setExpandedDates={setExpandedDates}
            isSendingInvitations={isSendingInvitations}
            onAddDate={handleAddDate}
            onAddTimeSlotToDate={handleAddTimeSlotToDate}
            onRemoveLocalTimeSlot={handleRemoveLocalTimeSlot}
            onRemoveLocalDate={handleRemoveLocalDate}
            onRemoveProposedDate={handleRemoveProposedDate}
            onSendInvitations={handleSendInvitations}
            canManageKickoff={canManageKickoff}
            hasValidDateTimes={hasValidDateTimes}
            onBack={goBack}
          />
        );

      case "responses":
        return (
          <ResponsesPhase
            projectId={projectId}
            taskId={taskId}
            task={task}
            schedulingStatus={schedulingStatus}
            loading={loading}
            error={error}
            onRefresh={refreshData}
            currentUser={currentUser || null}
            currentUserResponses={currentUserResponses}
            isRespondingToDate={isRespondingToDate}
            onRespondToTimeSlot={handleRespondToTimeSlot}
            isCurrentUserAttendee={isCurrentUserAttendee}
            hasDeclinedAllSlots={hasDeclinedAllSlots}
            showProposeAlternative={showProposeAlternative}
            setShowProposeAlternative={setShowProposeAlternative}
            proposedAlternatives={proposedAlternatives}
            setProposedAlternatives={setProposedAlternatives}
            newProposedDateInput={newProposedDateInput}
            setNewProposedDateInput={setNewProposedDateInput}
            newProposedTimeInputs={newProposedTimeInputs}
            setNewProposedTimeInputs={setNewProposedTimeInputs}
            expandedProposedDates={expandedProposedDates}
            setExpandedProposedDates={setExpandedProposedDates}
            isSubmittingProposal={isSubmittingProposal}
            onSubmitProposedAlternatives={handleSubmitProposedAlternatives}
            onAddProposedAlternativeDate={handleAddProposedAlternativeDate}
            onAddTimeToProposedDate={handleAddTimeToProposedDate}
            onRemoveTimeFromProposedDate={handleRemoveTimeFromProposedDate}
            onRemoveProposedAlternativeDate={handleRemoveProposedAlternativeDate}
            canManageKickoff={canManageKickoff}
          />
        );

      case "confirmation":
        return (
          <ConfirmationPhase
            projectId={projectId}
            taskId={taskId}
            task={task}
            schedulingStatus={schedulingStatus}
            loading={loading}
            error={error}
            onRefresh={refreshData}
            selectedFinalDateId={selectedFinalDateId}
            setSelectedFinalDateId={setSelectedFinalDateId}
            selectedMeetingFormat={selectedMeetingFormat}
            setSelectedMeetingFormat={setSelectedMeetingFormat}
            isSelectingDate={isSelectingDate}
            onSelectFinalDate={handleSelectFinalDate}
            canManageKickoff={canManageKickoff}
            confirmationMode={confirmationMode}
            setConfirmationMode={setConfirmationMode}
            localDatesWithTimes={localDatesWithTimes}
            setLocalDatesWithTimes={setLocalDatesWithTimes}
            newDateInput={newDateInput}
            setNewDateInput={setNewDateInput}
            newTimeInputs={newTimeInputs}
            setNewTimeInputs={setNewTimeInputs}
            expandedDates={expandedDates}
            setExpandedDates={setExpandedDates}
            isSendingInvitations={isSendingInvitations}
            onAddDate={handleAddDate}
            onAddTimeSlotToDate={handleAddTimeSlotToDate}
            onRemoveLocalTimeSlot={handleRemoveLocalTimeSlot}
            onRemoveLocalDate={handleRemoveLocalDate}
            onSendInvitations={handleSendInvitations}
            hasValidDateTimes={hasValidDateTimes}
          />
        );

      default:
        return null;
    }
  };

  // Determine if we should show simplified attendee view
  const showAttendeeOnlyView = !canManageKickoff && isCurrentUserAttendee;

  return (
    <Modal
      isOpen={isOpen}
      onClose={onClose}
      title={task?.name || t("title")}
      size={showAttendeeOnlyView ? "md" : "lg"}
      footer={
        <div className="flex justify-between">
          <div>
            {/* Back button */}
            {!showAttendeeOnlyView &&
              currentPhase === "dates" &&
              task?.actionStatus === "pending" &&
              canManageKickoff && (
                <Button variant="secondary" onClick={goBack}>
                  {t("dates.back")}
                </Button>
              )}
          </div>
          <Button variant="secondary" onClick={onClose}>
            {tCommon("close")}
          </Button>
        </div>
      }
      error={error}
    >
      <div className="space-y-6">
        {/* Stepper - only show for admins */}
        {!showAttendeeOnlyView && (
          <div className="pb-4 border-b border-gray-200 dark:border-gray-700">
            <Stepper
              steps={steps}
              currentStep={currentPhase}
              onStepClick={(stepId) => {
                if (
                  task?.actionStatus === "pending" &&
                  stepId === "attendees" &&
                  currentPhase === "dates"
                ) {
                  setManualPhase("attendees");
                }
              }}
            />
          </div>
        )}

        {/* Phase Content */}
        {showAttendeeOnlyView ? (
          <ResponsesPhase
            projectId={projectId}
            taskId={taskId}
            task={task}
            schedulingStatus={schedulingStatus}
            loading={loading}
            error={error}
            onRefresh={refreshData}
            currentUser={currentUser || null}
            currentUserResponses={currentUserResponses}
            isRespondingToDate={isRespondingToDate}
            onRespondToTimeSlot={handleRespondToTimeSlot}
            isCurrentUserAttendee={isCurrentUserAttendee}
            hasDeclinedAllSlots={hasDeclinedAllSlots}
            showProposeAlternative={showProposeAlternative}
            setShowProposeAlternative={setShowProposeAlternative}
            proposedAlternatives={proposedAlternatives}
            setProposedAlternatives={setProposedAlternatives}
            newProposedDateInput={newProposedDateInput}
            setNewProposedDateInput={setNewProposedDateInput}
            newProposedTimeInputs={newProposedTimeInputs}
            setNewProposedTimeInputs={setNewProposedTimeInputs}
            expandedProposedDates={expandedProposedDates}
            setExpandedProposedDates={setExpandedProposedDates}
            isSubmittingProposal={isSubmittingProposal}
            onSubmitProposedAlternatives={handleSubmitProposedAlternatives}
            onAddProposedAlternativeDate={handleAddProposedAlternativeDate}
            onAddTimeToProposedDate={handleAddTimeToProposedDate}
            onRemoveTimeFromProposedDate={handleRemoveTimeFromProposedDate}
            onRemoveProposedAlternativeDate={handleRemoveProposedAlternativeDate}
            canManageKickoff={canManageKickoff}
          />
        ) : (
          renderPhaseContent()
        )}
      </div>
    </Modal>
  );
}
