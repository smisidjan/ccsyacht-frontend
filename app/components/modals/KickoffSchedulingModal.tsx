"use client";

import { useState, useEffect, useMemo } from "react";
import { useTranslations } from "next-intl";
import {
  UserGroupIcon,
  CalendarDaysIcon,
  ClockIcon,
  CheckCircleIcon,
  PlusIcon,
  XMarkIcon,
  PaperAirplaneIcon,
  CheckIcon,
  ExclamationTriangleIcon,
} from "@heroicons/react/24/outline";
import Modal from "@/app/components/ui/Modal";
import Button from "@/app/components/ui/Button";
import Stepper, { Step } from "@/app/components/ui/Stepper";
import Alert from "@/app/components/ui/Alert";
import { setupTasksApi, useProjectMembers, useCurrentUser, useRoles } from "@/lib/api";
import type { SetupTask, ProposedDate, SchedulingStatus, ProjectMember, Role } from "@/lib/api/types";
import { useToast } from "@/app/context/ToastContext";
import { usePermission } from "@/lib/hooks/usePermission";
import { PERMISSIONS } from "@/lib/constants/permissions";

interface KickoffSchedulingModalProps {
  isOpen: boolean;
  onClose: () => void;
  projectId: string;
  taskId: string;
  onUpdate?: () => void;
}

type Phase = "attendees" | "dates" | "responses" | "confirmation";

// Local time slot with start and end time
interface LocalTimeSlot {
  startTime: string; // HH:MM
  endTime: string; // HH:MM
}

// Local state for dates with multiple time slots
interface LocalDateWithTimes {
  date: string; // YYYY-MM-DD
  timeSlots: LocalTimeSlot[];
}

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
  const { data: currentUser } = useCurrentUser();

  // Data state
  const [task, setTask] = useState<SetupTask | null>(null);
  const [schedulingStatus, setSchedulingStatus] = useState<SchedulingStatus | null>(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);

  // Form state
  const [selectedUserIds, setSelectedUserIds] = useState<string[]>([]);
  const [localDatesWithTimes, setLocalDatesWithTimes] = useState<LocalDateWithTimes[]>([]);
  const [newDateInput, setNewDateInput] = useState("");
  const [newTimeInputs, setNewTimeInputs] = useState<Record<string, { start: string; end: string }>>({}); // Per-date time inputs with start/end
  const [selectedFinalDateId, setSelectedFinalDateId] = useState<string | null>(null);
  const [manualPhase, setManualPhase] = useState<Phase | null>(null);
  const [expandedDates, setExpandedDates] = useState<Set<string>>(new Set());

  // Action state
  const [isAddingAssignees, setIsAddingAssignees] = useState(false);
  const [isAddingDates, setIsAddingDates] = useState(false);
  const [isSendingInvitations, setIsSendingInvitations] = useState(false);
  const [isSelectingDate, setIsSelectingDate] = useState(false);
  const [isRespondingToDate, setIsRespondingToDate] = useState(false);

  // Permissions
  const canManageKickoff = hasPermission(PERMISSIONS.MANAGE_KICKOFF_MEETING);

  // Fetch project members and roles
  const { data: projectMembers } = useProjectMembers(projectId);
  const { data: employeeRoles } = useRoles("employee");
  const { data: guestRoles } = useRoles("guest");

  // Create a map of role names to their type (employee/guest)
  const roleTypeMap = useMemo(() => {
    const map: Record<string, "employee" | "guest"> = {};
    employeeRoles?.forEach((role) => {
      map[role.name] = "employee";
    });
    guestRoles?.forEach((role) => {
      map[role.name] = "guest";
    });
    return map;
  }, [employeeRoles, guestRoles]);

  // Helper to get full member info for an assignee
  const getMemberInfo = (assigneeId: string): ProjectMember | undefined => {
    return projectMembers?.find((m) => m.member.identifier === assigneeId);
  };

  // Pre-select current user as attendee when modal opens
  useEffect(() => {
    if (currentUser && projectMembers && task) {
      // Check if current user is a project member and not already an attendee
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

  // Determine the natural phase based on task status (without manual override)
  const naturalPhase = useMemo((): Phase => {
    if (!task) return "attendees";

    switch (task.actionStatus) {
      case "pending":
        // If no attendees yet, show attendees phase
        if (!task.assignees || task.assignees.length === 0) {
          return "attendees";
        }
        // If no proposed dates yet, show dates phase
        if (!task.proposedDates || task.proposedDates.length === 0) {
          return "dates";
        }
        // Otherwise still in dates phase (ready to send invitations)
        return "dates";

      case "awaiting_responses":
        // Check if all responded
        if (schedulingStatus?.allResponded) {
          return "confirmation";
        }
        return "responses";

      case "scheduled":
      case "completed":
        return "confirmation";

      default:
        return "attendees";
    }
  }, [task, schedulingStatus]);

  // Current phase: use manual override if set (for back navigation), otherwise use natural phase
  // Only allow manual phase override when in pending status (before invitations are sent)
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
    setManualPhase(null); // Clear manual override to use natural phase
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
      if (showLoading) {
        setLoading(true);
      }
      setError(null);

      const [taskResponse, statusResponse] = await Promise.all([
        setupTasksApi.getById(projectId, taskId),
        setupTasksApi.getSchedulingStatus(projectId, taskId).catch(() => null),
      ]);

      setTask(taskResponse.data || taskResponse);
      if (statusResponse) {
        setSchedulingStatus(statusResponse);
      }
    } catch (err) {
      console.error("Error fetching data:", err);
      setError(err instanceof Error ? err.message : t("loadError"));
    } finally {
      if (showLoading) {
        setLoading(false);
      }
    }
  };

  const refreshData = () => fetchData(false);

  // Toggle user selection for attendees
  const toggleUserSelection = (userId: string) => {
    setSelectedUserIds((prev) =>
      prev.includes(userId) ? prev.filter((id) => id !== userId) : [...prev, userId]
    );
  };

  // Add attendees
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

  // Remove attendee
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

  // Add a new date (without times yet)
  const handleAddDate = () => {
    if (!newDateInput) return;

    // Check for duplicates
    const exists = localDatesWithTimes.some((d) => d.date === newDateInput);
    if (exists) {
      showToast("error", t("dates.duplicateDate"));
      return;
    }

    setLocalDatesWithTimes((prev) => [...prev, { date: newDateInput, timeSlots: [] }]);
    setExpandedDates((prev) => new Set([...prev, newDateInput])); // Auto-expand new date
    setNewDateInput("");
  };

  // Add a time slot to a specific date
  const handleAddTimeToDate = (date: string) => {
    const timeInput = newTimeInputs[date];
    if (!timeInput?.start || !timeInput?.end) return;

    // Validate end time is after start time
    if (timeInput.end <= timeInput.start) {
      showToast("error", t("dates.endBeforeStart"));
      return;
    }

    // Check for duplicate time slot before updating state
    const existingDate = localDatesWithTimes.find((d) => d.date === date);
    const isDuplicate = existingDate?.timeSlots.some(
      (slot) => slot.startTime === timeInput.start && slot.endTime === timeInput.end
    );
    if (isDuplicate) {
      showToast("error", t("dates.duplicateTime"));
      return;
    }

    setLocalDatesWithTimes((prev) =>
      prev.map((d) => {
        if (d.date === date) {
          const newSlot: LocalTimeSlot = { startTime: timeInput.start, endTime: timeInput.end };
          return {
            ...d,
            timeSlots: [...d.timeSlots, newSlot].sort((a, b) => a.startTime.localeCompare(b.startTime)),
          };
        }
        return d;
      })
    );
    setNewTimeInputs((prev) => ({ ...prev, [date]: { start: "", end: "" } }));
  };

  // Remove a time slot from a date
  const handleRemoveTimeFromDate = (date: string, slot: LocalTimeSlot) => {
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

  // Remove an entire local date
  const handleRemoveLocalDate = (date: string) => {
    setLocalDatesWithTimes((prev) => prev.filter((d) => d.date !== date));
    setExpandedDates((prev) => {
      const next = new Set(prev);
      next.delete(date);
      return next;
    });
  };

  // Toggle date expansion
  const toggleDateExpansion = (date: string) => {
    setExpandedDates((prev) => {
      const next = new Set(prev);
      if (next.has(date)) {
        next.delete(date);
      } else {
        next.add(date);
      }
      return next;
    });
  };

  // Remove proposed date (from server)
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

  // Check if there are any valid date+time combinations
  const hasValidDateTimes = localDatesWithTimes.some((d) => d.timeSlots.length > 0);

  // Save proposed dates with time slots and send invitations
  const handleSendInvitations = async () => {
    try {
      setIsSendingInvitations(true);
      setError(null);

      // Add each date with its time slots using the new API structure
      for (const dateWithTimes of localDatesWithTimes) {
        if (dateWithTimes.timeSlots.length > 0) {
          // Use the user-specified start and end times
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

      // Then send invitations
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

  // Respond to a time slot
  const handleRespondToTimeSlot = async (slotId: string, isAvailable: boolean) => {
    try {
      setIsRespondingToDate(true);
      setError(null);

      await setupTasksApi.respondToTimeSlot(projectId, taskId, slotId, { is_available: isAvailable });

      showToast("success", t("responseRecorded"));
      await refreshData();
    } catch (err) {
      setError(err instanceof Error ? err.message : t("responseError"));
    } finally {
      setIsRespondingToDate(false);
    }
  };

  // Select final time slot
  const handleSelectTimeSlot = async () => {
    if (!selectedFinalDateId) return; // This now holds the time slot ID

    try {
      setIsSelectingDate(true);
      setError(null);

      await setupTasksApi.selectTimeSlot(projectId, taskId, selectedFinalDateId);

      showToast("success", t("dateConfirmed"));
      onUpdate?.();
      await refreshData();
    } catch (err) {
      setError(err instanceof Error ? err.message : t("confirmError"));
    } finally {
      setIsSelectingDate(false);
    }
  };

  // Check if current user is an attendee
  const isCurrentUserAttendee = useMemo(() => {
    if (!task || !currentUser) return false;
    return task.assignees?.some((a) => a.identifier === currentUser.identifier);
  }, [task, currentUser]);

  // Check if current user has responded to all time slots
  const currentUserResponses = useMemo(() => {
    if (!schedulingStatus || !currentUser) return {};
    const responses: Record<string, boolean | null> = {};

    schedulingStatus.proposedDates.forEach((date) => {
      date.timeSlots.forEach((slot) => {
        const userResponse = slot.responses.find(
          (r) => r.userId === currentUser.identifier
        );
        responses[slot.id] = userResponse?.isAvailable ?? null;
      });
    });

    return responses;
  }, [schedulingStatus, currentUser]);

  // Calculate which attendees have responded and which are pending
  const attendeeResponseStatus = useMemo(() => {
    if (!schedulingStatus || !task?.assignees) {
      return { responded: [], pending: [] };
    }

    // Collect all unique user IDs that have responded to any time slot
    const respondedUserIds = new Set<string>();
    schedulingStatus.proposedDates.forEach((date) => {
      date.timeSlots.forEach((slot) => {
        slot.responses.forEach((response) => {
          respondedUserIds.add(response.userId);
        });
      });
    });

    const responded: Array<{ id: string; name: string }> = [];
    const pending: Array<{ id: string; name: string }> = [];

    task.assignees.forEach((assignee) => {
      if (respondedUserIds.has(assignee.identifier)) {
        responded.push({ id: assignee.identifier, name: assignee.name });
      } else {
        pending.push({ id: assignee.identifier, name: assignee.name });
      }
    });

    return { responded, pending };
  }, [schedulingStatus, task?.assignees]);

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
        return renderAttendeesPhase();
      case "dates":
        return renderDatesPhase();
      case "responses":
        return renderResponsesPhase();
      case "confirmation":
        return renderConfirmationPhase();
      default:
        return null;
    }
  };

  // Phase 1: Attendees
  const renderAttendeesPhase = () => {
    const availableMembers = projectMembers?.filter(
      (member) => !task?.assignees?.some((a) => a.identifier === member.member.identifier)
    );

    return (
      <div className="space-y-6">
        <div>
          <h3 className="text-lg font-semibold text-gray-900 dark:text-white mb-2">
            {t("attendees.title")}
          </h3>
          <p className="text-sm text-gray-600 dark:text-gray-400">
            {t("attendees.description")}
          </p>
        </div>

        {/* Current attendees */}
        {task?.assignees && task.assignees.length > 0 && (
          <div className="space-y-2">
            <label className="block text-sm font-medium text-gray-700 dark:text-gray-300">
              {t("attendees.selected")} ({task.assignees.length})
            </label>
            <div className="space-y-2">
              {task.assignees.map((assignee) => {
                const memberInfo = getMemberInfo(assignee.identifier);
                const roleType = memberInfo ? roleTypeMap[memberInfo.roleName] : undefined;

                return (
                  <div
                    key={assignee.identifier}
                    className="flex items-center justify-between p-3 bg-gray-50 dark:bg-gray-800 rounded-lg"
                  >
                    <div className="flex items-center gap-3">
                      <div className="w-8 h-8 bg-blue-100 dark:bg-blue-900/30 rounded-full flex items-center justify-center">
                        <UserGroupIcon className="w-4 h-4 text-blue-600 dark:text-blue-400" />
                      </div>
                      <div className="flex flex-col">
                        <div className="flex items-center gap-2">
                          <span className="text-sm font-medium text-gray-900 dark:text-white">
                            {assignee.name}
                          </span>
                          {roleType && (
                            <span
                              className={`text-xs px-1.5 py-0.5 rounded ${
                                roleType === "guest"
                                  ? "bg-amber-100 dark:bg-amber-900/30 text-amber-700 dark:text-amber-400"
                                  : "bg-blue-100 dark:bg-blue-900/30 text-blue-700 dark:text-blue-400"
                              }`}
                            >
                              {roleType === "guest" ? t("attendees.guest") : t("attendees.employee")}
                            </span>
                          )}
                        </div>
                        {memberInfo && (
                          <div className="flex items-center gap-2 text-xs text-gray-500 dark:text-gray-400">
                            <span>{memberInfo.roleName}</span>
                            <span className="text-gray-300 dark:text-gray-600">|</span>
                            <span>{memberInfo.member.email}</span>
                          </div>
                        )}
                      </div>
                    </div>
                    {canManageKickoff && (
                      <button
                        onClick={() => handleRemoveAttendee(assignee.identifier)}
                        className="p-1 text-gray-400 hover:text-red-600 dark:hover:text-red-400 transition-colors"
                      >
                        <XMarkIcon className="w-4 h-4" />
                      </button>
                    )}
                  </div>
                );
              })}
            </div>
          </div>
        )}

        {/* Add attendees */}
        {canManageKickoff && availableMembers && availableMembers.length > 0 && (
          <div className="space-y-3">
            <label className="block text-sm font-medium text-gray-700 dark:text-gray-300">
              {t("attendees.addMore")}
            </label>
            <div className="max-h-64 overflow-y-auto border border-gray-200 dark:border-gray-700 rounded-lg">
              {availableMembers.map((member) => {
                const roleType = roleTypeMap[member.roleName];

                return (
                  <label
                    key={member.member.identifier}
                    className="flex items-center gap-3 p-3 hover:bg-gray-50 dark:hover:bg-gray-800 cursor-pointer border-b border-gray-100 dark:border-gray-700 last:border-b-0"
                  >
                    <input
                      type="checkbox"
                      checked={selectedUserIds.includes(member.member.identifier)}
                      onChange={() => toggleUserSelection(member.member.identifier)}
                      className="w-4 h-4 text-blue-600 border-gray-300 rounded focus:ring-blue-500 flex-shrink-0"
                    />
                    <div className="flex flex-col flex-1 min-w-0">
                      <div className="flex items-center gap-2">
                        <span className="text-sm font-medium text-gray-900 dark:text-white truncate">
                          {member.member.name}
                        </span>
                        {roleType && (
                          <span
                            className={`text-xs px-1.5 py-0.5 rounded flex-shrink-0 ${
                              roleType === "guest"
                                ? "bg-amber-100 dark:bg-amber-900/30 text-amber-700 dark:text-amber-400"
                                : "bg-blue-100 dark:bg-blue-900/30 text-blue-700 dark:text-blue-400"
                            }`}
                          >
                            {roleType === "guest" ? t("attendees.guest") : t("attendees.employee")}
                          </span>
                        )}
                      </div>
                      <div className="flex items-center gap-2 text-xs text-gray-500 dark:text-gray-400">
                        <span>{member.roleName}</span>
                        <span className="text-gray-300 dark:text-gray-600">|</span>
                        <span className="truncate">{member.member.email}</span>
                      </div>
                    </div>
                  </label>
                );
              })}
            </div>
            <Button
              variant="primary"
              onClick={handleAddAttendees}
              loading={isAddingAssignees}
              disabled={selectedUserIds.length === 0 || isAddingAssignees}
              className="w-full"
            >
              <PlusIcon className="w-4 h-4" />
              {t("attendees.add", { count: selectedUserIds.length })}
            </Button>
          </div>
        )}

        {/* No attendees yet */}
        {(!task?.assignees || task.assignees.length === 0) && (
          <Alert type="info" message={t("attendees.empty")} />
        )}

        {/* Continue button when attendees are added */}
        {task?.assignees && task.assignees.length > 0 && canManageKickoff && (
          <Button
            variant="primary"
            onClick={goForward}
            className="w-full"
          >
            {t("attendees.continue")}
          </Button>
        )}
      </div>
    );
  };

  // Phase 2: Date Options - Enterprise style with date cards and time chips
  const renderDatesPhase = () => {
    const existingDates = task?.proposedDates || [];
    const totalTimeSlots = localDatesWithTimes.reduce((acc, d) => acc + d.timeSlots.length, 0) + existingDates.length;

    return (
      <div className="space-y-6">
        {/* Header */}
        <div>
          <h3 className="text-lg font-semibold text-gray-900 dark:text-white mb-2">
            {t("dates.title")}
          </h3>
          <p className="text-sm text-gray-600 dark:text-gray-400">
            {t("dates.description")}
          </p>
        </div>

        {/* Existing server dates (read-only display) */}
        {existingDates.length > 0 && (
          <div className="space-y-3">
            <label className="block text-sm font-medium text-gray-700 dark:text-gray-300">
              {t("dates.existingDates")} ({existingDates.length})
            </label>
            <div className="space-y-3">
              {existingDates.map((proposedDate, idx) => (
                <div
                  key={proposedDate.id || `existing-date-${idx}`}
                  className="border border-green-200 dark:border-green-800 rounded-xl overflow-hidden bg-green-50 dark:bg-green-900/10"
                >
                  {/* Date Header */}
                  <div className="flex items-center justify-between p-4 bg-green-100/50 dark:bg-green-900/20 border-b border-green-200 dark:border-green-800">
                    <div className="flex items-center gap-3">
                      <div className="w-10 h-10 bg-green-200 dark:bg-green-800/50 rounded-lg flex items-center justify-center">
                        <CalendarDaysIcon className="w-5 h-5 text-green-700 dark:text-green-400" />
                      </div>
                      <div>
                        <p className="text-sm font-semibold text-gray-900 dark:text-white">
                          {formatDateDisplay(proposedDate.proposedDate)}
                        </p>
                        <p className="text-xs text-gray-500 dark:text-gray-400">
                          {proposedDate.timeSlots.length} {t("responses.timeSlots")}
                        </p>
                      </div>
                    </div>
                    <div className="flex items-center gap-2">
                      <span className="text-xs px-2 py-1 bg-green-200 dark:bg-green-800/50 text-green-700 dark:text-green-400 rounded-full">
                        {t("dates.saved")}
                      </span>
                      {canManageKickoff && (
                        <button
                          onClick={() => handleRemoveProposedDate(proposedDate.id)}
                          className="p-1.5 text-gray-400 hover:text-red-600 dark:hover:text-red-400 hover:bg-red-50 dark:hover:bg-red-900/20 rounded-lg transition-all"
                        >
                          <XMarkIcon className="w-4 h-4" />
                        </button>
                      )}
                    </div>
                  </div>
                  {/* Time Slots */}
                  {proposedDate.timeSlots.length > 0 && (
                    <div className="p-4">
                      <div className="flex flex-wrap gap-2">
                        {proposedDate.timeSlots.map((slot, slotIdx) => (
                          <div
                            key={slot.id || `existing-slot-${slotIdx}`}
                            className="inline-flex items-center gap-2 px-3 py-1.5 bg-green-100 dark:bg-green-900/30 border border-green-200 dark:border-green-700 rounded-full"
                          >
                            <ClockIcon className="w-4 h-4 text-green-600 dark:text-green-400" />
                            <span className="text-sm font-medium text-green-700 dark:text-green-300">
                              {formatTimeDisplay(slot.startTime)} - {formatTimeDisplay(slot.endTime)}
                            </span>
                          </div>
                        ))}
                      </div>
                    </div>
                  )}
                </div>
              ))}
            </div>
          </div>
        )}

        {/* Local date cards with time slots */}
        {localDatesWithTimes.length > 0 && (
          <div className="space-y-3">
            <label className="block text-sm font-medium text-gray-700 dark:text-gray-300">
              {t("dates.newDates")} ({localDatesWithTimes.length})
            </label>
            <div className="space-y-3">
              {localDatesWithTimes.map((dateWithTimes) => {
                const isExpanded = expandedDates.has(dateWithTimes.date);

                return (
                  <div
                    key={dateWithTimes.date}
                    className="border border-gray-200 dark:border-gray-700 rounded-xl overflow-hidden bg-white dark:bg-gray-800 shadow-sm"
                  >
                    {/* Date Header */}
                    <div
                      className="flex items-center justify-between p-4 bg-gray-50 dark:bg-gray-800/50 cursor-pointer hover:bg-gray-100 dark:hover:bg-gray-700/50 transition-colors"
                      onClick={() => toggleDateExpansion(dateWithTimes.date)}
                    >
                      <div className="flex items-center gap-3">
                        <div className="w-10 h-10 bg-blue-100 dark:bg-blue-900/30 rounded-lg flex items-center justify-center">
                          <CalendarDaysIcon className="w-5 h-5 text-blue-600 dark:text-blue-400" />
                        </div>
                        <div>
                          <p className="text-sm font-semibold text-gray-900 dark:text-white">
                            {formatDateDisplay(dateWithTimes.date)}
                          </p>
                          <p className="text-xs text-gray-500 dark:text-gray-400">
                            {dateWithTimes.timeSlots.length === 0
                              ? t("dates.noTimesYet")
                              : t("dates.timeSlotCount", { count: dateWithTimes.timeSlots.length })
                            }
                          </p>
                        </div>
                      </div>
                      <div className="flex items-center gap-2">
                        {dateWithTimes.timeSlots.length === 0 && (
                          <span className="text-xs px-2 py-1 bg-amber-100 dark:bg-amber-900/30 text-amber-700 dark:text-amber-400 rounded-full">
                            {t("dates.addTimesRequired")}
                          </span>
                        )}
                        {canManageKickoff && (
                          <button
                            onClick={(e) => {
                              e.stopPropagation();
                              handleRemoveLocalDate(dateWithTimes.date);
                            }}
                            className="p-1.5 text-gray-400 hover:text-red-600 dark:hover:text-red-400 hover:bg-red-50 dark:hover:bg-red-900/20 rounded-lg transition-all"
                          >
                            <XMarkIcon className="w-4 h-4" />
                          </button>
                        )}
                        <div className={`transform transition-transform ${isExpanded ? "rotate-180" : ""}`}>
                          <svg className="w-5 h-5 text-gray-400" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                            <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M19 9l-7 7-7-7" />
                          </svg>
                        </div>
                      </div>
                    </div>

                    {/* Expanded Content - Time Slots */}
                    {isExpanded && (
                      <div className="p-4 border-t border-gray-200 dark:border-gray-700 space-y-4">
                        {/* Time Chips */}
                        {dateWithTimes.timeSlots.length > 0 && (
                          <div className="flex flex-wrap gap-2">
                            {dateWithTimes.timeSlots.map((slot, idx) => (
                              <div
                                key={`${slot.startTime}-${slot.endTime}-${idx}`}
                                className="inline-flex items-center gap-2 px-3 py-1.5 bg-blue-50 dark:bg-blue-900/20 border border-blue-200 dark:border-blue-800 rounded-full group"
                              >
                                <ClockIcon className="w-4 h-4 text-blue-600 dark:text-blue-400" />
                                <span className="text-sm font-medium text-blue-700 dark:text-blue-300">
                                  {formatTimeDisplay(slot.startTime)} - {formatTimeDisplay(slot.endTime)}
                                </span>
                                {canManageKickoff && (
                                  <button
                                    onClick={() => handleRemoveTimeFromDate(dateWithTimes.date, slot)}
                                    className="p-0.5 text-blue-400 hover:text-red-600 dark:hover:text-red-400 transition-colors"
                                  >
                                    <XMarkIcon className="w-3.5 h-3.5" />
                                  </button>
                                )}
                              </div>
                            ))}
                          </div>
                        )}

                        {/* Add Time Slot Input - Start and End Time */}
                        {canManageKickoff && (
                          <div className="flex flex-col sm:flex-row gap-2">
                            <div className="flex items-center gap-2 flex-1">
                              <span className="text-xs text-gray-500 dark:text-gray-400 min-w-[40px]">{t("dates.from")}</span>
                              <input
                                type="time"
                                value={newTimeInputs[dateWithTimes.date]?.start || ""}
                                onChange={(e) => setNewTimeInputs((prev) => ({
                                  ...prev,
                                  [dateWithTimes.date]: { ...prev[dateWithTimes.date], start: e.target.value }
                                }))}
                                className="flex-1 px-3 py-2 border border-gray-300 dark:border-gray-600 rounded-lg bg-white dark:bg-gray-900 text-gray-900 dark:text-white focus:ring-2 focus:ring-blue-500 focus:border-transparent text-sm"
                              />
                            </div>
                            <div className="flex items-center gap-2 flex-1">
                              <span className="text-xs text-gray-500 dark:text-gray-400 min-w-[40px]">{t("dates.to")}</span>
                              <input
                                type="time"
                                value={newTimeInputs[dateWithTimes.date]?.end || ""}
                                onChange={(e) => setNewTimeInputs((prev) => ({
                                  ...prev,
                                  [dateWithTimes.date]: { ...prev[dateWithTimes.date], end: e.target.value }
                                }))}
                                className="flex-1 px-3 py-2 border border-gray-300 dark:border-gray-600 rounded-lg bg-white dark:bg-gray-900 text-gray-900 dark:text-white focus:ring-2 focus:ring-blue-500 focus:border-transparent text-sm"
                              />
                            </div>
                            <Button
                              variant="secondary"
                              size="sm"
                              onClick={() => handleAddTimeToDate(dateWithTimes.date)}
                              disabled={!newTimeInputs[dateWithTimes.date]?.start || !newTimeInputs[dateWithTimes.date]?.end}
                            >
                              <PlusIcon className="w-4 h-4" />
                              {t("dates.addTime")}
                            </Button>
                          </div>
                        )}
                      </div>
                    )}
                  </div>
                );
              })}
            </div>
          </div>
        )}

        {/* Add New Date */}
        {canManageKickoff && (
          <div className="space-y-3">
            <label className="block text-sm font-medium text-gray-700 dark:text-gray-300">
              {t("dates.addNewDate")}
            </label>
            <div className="flex gap-2">
              <input
                type="date"
                value={newDateInput}
                onChange={(e) => setNewDateInput(e.target.value)}
                min={new Date().toISOString().split("T")[0]}
                className="flex-1 px-3 py-2.5 border border-gray-300 dark:border-gray-600 rounded-lg bg-white dark:bg-gray-800 text-gray-900 dark:text-white focus:ring-2 focus:ring-blue-500 focus:border-transparent"
              />
              <Button
                variant="secondary"
                onClick={handleAddDate}
                disabled={!newDateInput}
              >
                <PlusIcon className="w-4 h-4" />
                {t("dates.addDate")}
              </Button>
            </div>
          </div>
        )}

        {/* Empty State */}
        {localDatesWithTimes.length === 0 && existingDates.length === 0 && (
          <div className="text-center py-8 border-2 border-dashed border-gray-200 dark:border-gray-700 rounded-xl">
            <CalendarDaysIcon className="w-12 h-12 text-gray-300 dark:text-gray-600 mx-auto mb-3" />
            <p className="text-sm text-gray-500 dark:text-gray-400">
              {t("dates.emptyState")}
            </p>
          </div>
        )}

        {/* Send Invitations Button */}
        {canManageKickoff && (hasValidDateTimes || existingDates.length > 0) && task?.assignees && task.assignees.length > 0 && (
          <div className="pt-4 border-t border-gray-200 dark:border-gray-700">
            <Button
              variant="primary"
              onClick={handleSendInvitations}
              loading={isSendingInvitations}
              disabled={isSendingInvitations || (!hasValidDateTimes && existingDates.length === 0)}
              className="w-full"
            >
              <PaperAirplaneIcon className="w-4 h-4" />
              {t("dates.sendInvitations")}
              {totalTimeSlots > 0 && (
                <span className="ml-2 px-2 py-0.5 bg-white/20 rounded-full text-xs">
                  {totalTimeSlots} {t("dates.options")}
                </span>
              )}
            </Button>
          </div>
        )}

        {/* Warning if no attendees */}
        {(!task?.assignees || task.assignees.length === 0) && (
          <Alert type="warning" message={t("dates.noAttendees")} />
        )}
      </div>
    );
  };

  // Format date for display
  const formatDateDisplay = (dateStr: string) => {
    const date = new Date(dateStr);
    return date.toLocaleDateString(undefined, {
      weekday: "short",
      year: "numeric",
      month: "short",
      day: "numeric"
    });
  };

  // Format time for display
  const formatTimeDisplay = (timeStr: string) => {
    const [hours, minutes] = timeStr.split(":");
    const date = new Date();
    date.setHours(parseInt(hours), parseInt(minutes));
    return date.toLocaleTimeString(undefined, {
      hour: "2-digit",
      minute: "2-digit"
    });
  };

  // Phase 3: Responses
  const renderResponsesPhase = () => {
    if (!schedulingStatus) {
      return <Alert type="info" message={t("responses.loading")} />;
    }

    const { responded, pending } = attendeeResponseStatus;

    return (
      <div className="space-y-6">
        <div>
          <h3 className="text-lg font-semibold text-gray-900 dark:text-white mb-2">
            {t("responses.title")}
          </h3>
          <p className="text-sm text-gray-600 dark:text-gray-400">
            {t("responses.description", {
              responded: schedulingStatus.respondedCount,
              total: schedulingStatus.totalAttendees,
            })}
          </p>
        </div>

        {/* Attendee Status Summary Bar */}
        <div className="flex flex-col sm:flex-row gap-4 p-4 bg-gray-50 dark:bg-gray-800/50 rounded-xl border border-gray-200 dark:border-gray-700">
          {/* Responded */}
          <div className="flex-1">
            <div className="flex items-center gap-2 mb-2">
              <CheckCircleIcon className="w-4 h-4 text-green-600 dark:text-green-400" />
              <span className="text-xs font-medium text-gray-600 dark:text-gray-400 uppercase tracking-wide">
                {t("responses.responded")} ({responded.length})
              </span>
            </div>
            <div className="flex items-center gap-1 flex-wrap">
              {responded.length > 0 ? (
                responded.map((attendee) => (
                  <div key={attendee.id} className="group relative">
                    <div className="w-8 h-8 rounded-full flex items-center justify-center text-xs font-medium bg-green-100 dark:bg-green-900/30 text-green-700 dark:text-green-400 ring-2 ring-green-500">
                      {attendee.name.split(" ").map(n => n[0]).join("").slice(0, 2).toUpperCase()}
                    </div>
                    <div className="absolute top-full left-1/2 -translate-x-1/2 mt-1 px-2 py-1 bg-gray-900 dark:bg-gray-700 text-white text-xs rounded whitespace-nowrap opacity-0 group-hover:opacity-100 transition-opacity pointer-events-none z-50 shadow-lg">
                      {attendee.name}
                    </div>
                  </div>
                ))
              ) : (
                <span className="text-xs text-gray-400 dark:text-gray-500 italic">
                  {t("responses.noResponses")}
                </span>
              )}
            </div>
          </div>

          {/* Divider */}
          <div className="hidden sm:block w-px bg-gray-200 dark:bg-gray-700" />
          <div className="sm:hidden h-px bg-gray-200 dark:bg-gray-700" />

          {/* Pending */}
          <div className="flex-1">
            <div className="flex items-center gap-2 mb-2">
              <ClockIcon className="w-4 h-4 text-amber-600 dark:text-amber-400" />
              <span className="text-xs font-medium text-gray-600 dark:text-gray-400 uppercase tracking-wide">
                {t("responses.awaiting")} ({pending.length})
              </span>
            </div>
            <div className="flex items-center gap-1 flex-wrap">
              {pending.length > 0 ? (
                pending.map((attendee) => (
                  <div key={attendee.id} className="group relative">
                    <div className="w-8 h-8 rounded-full flex items-center justify-center text-xs font-medium bg-gray-100 dark:bg-gray-700 text-gray-400 dark:text-gray-500 ring-2 ring-dashed ring-gray-300 dark:ring-gray-600">
                      {attendee.name.split(" ").map(n => n[0]).join("").slice(0, 2).toUpperCase()}
                    </div>
                    <div className="absolute top-full left-1/2 -translate-x-1/2 mt-1 px-2 py-1 bg-gray-900 dark:bg-gray-700 text-white text-xs rounded whitespace-nowrap opacity-0 group-hover:opacity-100 transition-opacity pointer-events-none z-50 shadow-lg">
                      {attendee.name} <span className="text-amber-400">({t("responses.pendingLabel")})</span>
                    </div>
                  </div>
                ))
              ) : (
                <span className="text-xs text-green-600 dark:text-green-400 font-medium">
                  {t("responses.allResponded")}
                </span>
              )}
            </div>
          </div>
        </div>

        {/* Response cards per date with time slots */}
        <div className="space-y-4">
          {schedulingStatus.proposedDates.map((proposedDate, dateIdx) => (
            <div
              key={proposedDate.id || `date-${dateIdx}`}
              className="border border-gray-200 dark:border-gray-700 rounded-xl"
            >
              {/* Date Header */}
              <div className="flex items-center gap-3 p-4 bg-gray-50 dark:bg-gray-800/50 border-b border-gray-200 dark:border-gray-700">
                <div className="w-10 h-10 bg-blue-100 dark:bg-blue-900/30 rounded-lg flex items-center justify-center">
                  <CalendarDaysIcon className="w-5 h-5 text-blue-600 dark:text-blue-400" />
                </div>
                <div>
                  <p className="text-sm font-semibold text-gray-900 dark:text-white">
                    {formatDateDisplay(proposedDate.proposedDate)}
                  </p>
                  <p className="text-xs text-gray-500 dark:text-gray-400">
                    {proposedDate.timeSlots.length} {t("responses.timeSlots")}
                  </p>
                </div>
              </div>

              {/* Time Slots Table */}
              <div className="overflow-visible">
                <table className="w-full text-sm">
                  <thead>
                    <tr className="border-b border-gray-100 dark:border-gray-800 bg-gray-25 dark:bg-gray-850">
                      <th className="text-left py-2 px-4 font-medium text-gray-600 dark:text-gray-400 text-xs uppercase tracking-wide">
                        {t("responses.time")}
                      </th>
                      <th className="text-center py-2 px-4 font-medium text-gray-600 dark:text-gray-400 text-xs uppercase tracking-wide">
                        {t("responses.available")}
                      </th>
                      {isCurrentUserAttendee && (
                        <th className="text-center py-2 px-4 font-medium text-gray-600 dark:text-gray-400 text-xs uppercase tracking-wide">
                          {t("responses.yourResponse")}
                        </th>
                      )}
                    </tr>
                  </thead>
                  <tbody>
                    {proposedDate.timeSlots.map((slot, slotIdx) => {
                      const userResponse = currentUserResponses[slot.id];

                      return (
                        <tr
                          key={slot.id || `slot-${dateIdx}-${slotIdx}`}
                          className={`border-b border-gray-100 dark:border-gray-800 last:border-b-0 ${
                            slot.allCanAttend ? "bg-green-50 dark:bg-green-900/10" : ""
                          }`}
                        >
                          <td className="py-3 px-4">
                            <div className="flex flex-col gap-2">
                              <div className="flex items-center gap-2">
                                <ClockIcon className="w-4 h-4 text-gray-400" />
                                <span className="text-gray-900 dark:text-white font-medium">
                                  {formatTimeDisplay(slot.startTime)} - {formatTimeDisplay(slot.endTime)}
                                </span>
                                {slot.allCanAttend && (
                                  <CheckCircleIcon className="w-4 h-4 text-green-600 dark:text-green-400" />
                                )}
                              </div>
                              {/* All attendee avatars - showing responded and pending */}
                              <div className="flex items-center gap-1 flex-wrap">
                                {/* Responded attendees */}
                                {slot.responses.map((response) => (
                                  <div
                                    key={response.userId}
                                    className="group relative"
                                  >
                                    <div
                                      className={`w-7 h-7 rounded-full flex items-center justify-center text-xs font-medium ring-2 ${
                                        response.isAvailable
                                          ? "bg-green-100 dark:bg-green-900/30 text-green-700 dark:text-green-400 ring-green-500"
                                          : "bg-red-100 dark:bg-red-900/30 text-red-700 dark:text-red-400 ring-red-500"
                                      }`}
                                    >
                                      {response.userName.split(" ").map(n => n[0]).join("").slice(0, 2).toUpperCase()}
                                    </div>
                                    {/* Tooltip */}
                                    <div className="absolute top-full left-1/2 -translate-x-1/2 mt-1 px-2 py-1 bg-gray-900 dark:bg-gray-700 text-white text-xs rounded whitespace-nowrap opacity-0 group-hover:opacity-100 transition-opacity pointer-events-none z-50 shadow-lg">
                                      {response.userName}
                                      <span className={response.isAvailable ? " text-green-400" : " text-red-400"}>
                                        {response.isAvailable ? " ✓" : " ✗"}
                                      </span>
                                    </div>
                                  </div>
                                ))}
                                {/* Pending attendees (those who haven't responded to this slot) */}
                                {task?.assignees?.filter(
                                  (assignee) => !slot.responses.some((r) => r.userId === assignee.identifier)
                                ).map((attendee) => (
                                  <div
                                    key={attendee.identifier}
                                    className="group relative"
                                  >
                                    <div className="w-7 h-7 rounded-full flex items-center justify-center text-xs font-medium bg-gray-100 dark:bg-gray-700 text-gray-400 dark:text-gray-500 ring-2 ring-dashed ring-gray-300 dark:ring-gray-600">
                                      {attendee.name.split(" ").map(n => n[0]).join("").slice(0, 2).toUpperCase()}
                                    </div>
                                    {/* Tooltip */}
                                    <div className="absolute top-full left-1/2 -translate-x-1/2 mt-1 px-2 py-1 bg-gray-900 dark:bg-gray-700 text-white text-xs rounded whitespace-nowrap opacity-0 group-hover:opacity-100 transition-opacity pointer-events-none z-50 shadow-lg">
                                      {attendee.name}
                                      <span className="text-amber-400"> ?</span>
                                    </div>
                                  </div>
                                ))}
                              </div>
                            </div>
                          </td>
                          <td className="py-3 px-4 text-center">
                            <span
                              className={`px-2 py-1 rounded text-xs font-medium ${
                                slot.allCanAttend
                                  ? "bg-green-100 dark:bg-green-900/30 text-green-700 dark:text-green-400"
                                  : "bg-gray-100 dark:bg-gray-800 text-gray-700 dark:text-gray-300"
                              }`}
                            >
                              {slot.availableCount}/{slot.totalAttendees}
                            </span>
                          </td>
                          {isCurrentUserAttendee && (
                            <td className="py-3 px-4 text-center min-w-[140px]">
                              <div className="flex items-center justify-center h-8">
                                {userResponse === null ? (
                                  <div className="flex items-center justify-center gap-2">
                                    <Button
                                      variant="success"
                                      size="sm"
                                      onClick={() => handleRespondToTimeSlot(slot.id, true)}
                                      disabled={isRespondingToDate}
                                    >
                                      <CheckIcon className="w-3 h-3" />
                                    </Button>
                                    <Button
                                      variant="danger"
                                      size="sm"
                                      onClick={() => handleRespondToTimeSlot(slot.id, false)}
                                      disabled={isRespondingToDate}
                                    >
                                      <XMarkIcon className="w-3 h-3" />
                                    </Button>
                                  </div>
                                ) : (
                                  <span
                                    className={`inline-flex items-center gap-1 px-2 py-1 rounded text-xs font-medium ${
                                      userResponse
                                        ? "bg-green-100 dark:bg-green-900/30 text-green-700 dark:text-green-400"
                                        : "bg-red-100 dark:bg-red-900/30 text-red-700 dark:text-red-400"
                                    }`}
                                  >
                                    {userResponse ? (
                                      <>
                                        <CheckIcon className="w-3 h-3" /> {t("responses.canAttend")}
                                      </>
                                    ) : (
                                      <>
                                        <XMarkIcon className="w-3 h-3" /> {t("responses.cannotAttend")}
                                      </>
                                    )}
                                  </span>
                                )}
                              </div>
                            </td>
                          )}
                        </tr>
                      );
                    })}
                  </tbody>
                </table>
              </div>
            </div>
          ))}
        </div>

        {/* All responded message */}
        {schedulingStatus.allResponded && schedulingStatus.timeSlotsWhereAllCanAttend.length > 0 && (
          <Alert type="success" message={t("responses.allRespondedWithDates", { count: schedulingStatus.timeSlotsWhereAllCanAttend.length })} />
        )}

        {/* No common date warning */}
        {schedulingStatus.allResponded && schedulingStatus.timeSlotsWhereAllCanAttend.length === 0 && (
          <Alert type="warning" message={t("responses.noCommonDate")} />
        )}
      </div>
    );
  };

  // Phase 4: Confirmation
  const renderConfirmationPhase = () => {
    if (!schedulingStatus) {
      return <Alert type="info" message={t("confirmation.loading")} />;
    }

    const isScheduled = task?.actionStatus === "scheduled" || task?.actionStatus === "completed";
    const selectedTimeSlot = schedulingStatus.selectedTimeSlot;
    const availableSlotIds = schedulingStatus.timeSlotsWhereAllCanAttend;

    // Collect all time slots for selection, marking which ones all can attend
    const allTimeSlots: Array<{
      slotId: string;
      date: string;
      startTime: string;
      endTime: string;
      allCanAttend: boolean;
      availableCount: number;
      totalAttendees: number;
      responses: typeof schedulingStatus.proposedDates[0]["timeSlots"][0]["responses"];
    }> = [];

    schedulingStatus.proposedDates.forEach((pd) => {
      pd.timeSlots.forEach((slot) => {
        allTimeSlots.push({
          slotId: slot.id,
          date: pd.proposedDate,
          startTime: slot.startTime,
          endTime: slot.endTime,
          allCanAttend: slot.allCanAttend,
          availableCount: slot.availableCount,
          totalAttendees: slot.totalAttendees,
          responses: slot.responses,
        });
      });
    });

    // Filter to only slots where all can attend, or show all if none match
    const slotsToShow = availableSlotIds.length > 0
      ? allTimeSlots.filter((s) => availableSlotIds.includes(s.slotId))
      : allTimeSlots;

    // If already scheduled, show confirmation
    if (isScheduled && selectedTimeSlot) {
      return (
        <div className="space-y-6">
          <div className="text-center py-8">
            <CheckCircleIcon className="w-16 h-16 text-green-600 dark:text-green-400 mx-auto mb-4" />
            <h3 className="text-lg font-semibold text-gray-900 dark:text-white mb-2">
              {t("confirmation.scheduled")}
            </h3>
            <p className="text-xl font-bold text-blue-600 dark:text-blue-400">
              {formatDateDisplay(selectedTimeSlot.date)}
            </p>
            <p className="text-lg text-gray-600 dark:text-gray-400 mt-1">
              {formatTimeDisplay(selectedTimeSlot.startTime)} - {formatTimeDisplay(selectedTimeSlot.endTime)}
            </p>
          </div>

          {/* Attendees list */}
          <div className="space-y-2">
            <label className="block text-sm font-medium text-gray-700 dark:text-gray-300">
              {t("confirmation.attendees")}
            </label>
            <div className="space-y-2">
              {task?.assignees?.map((assignee) => {
                const response = selectedTimeSlot.responses.find(
                  (r) => r.userId === assignee.identifier
                );
                const isAvailable = response?.isAvailable ?? true;

                return (
                  <div
                    key={assignee.identifier}
                    className={`flex items-center justify-between p-3 rounded-lg ${
                      isAvailable
                        ? "bg-green-50 dark:bg-green-900/10"
                        : "bg-red-50 dark:bg-red-900/10"
                    }`}
                  >
                    <span className="text-sm text-gray-900 dark:text-white">{assignee.name}</span>
                    <span
                      className={`text-xs px-2 py-1 rounded ${
                        isAvailable
                          ? "bg-green-100 dark:bg-green-900/30 text-green-700 dark:text-green-400"
                          : "bg-red-100 dark:bg-red-900/30 text-red-700 dark:text-red-400"
                      }`}
                    >
                      {isAvailable ? t("confirmation.attending") : t("confirmation.absent")}
                    </span>
                  </div>
                );
              })}
            </div>
          </div>
        </div>
      );
    }

    // Select final time slot
    return (
      <div className="space-y-6">
        <div>
          <h3 className="text-lg font-semibold text-gray-900 dark:text-white mb-2">
            {t("confirmation.selectTitle")}
          </h3>
          <p className="text-sm text-gray-600 dark:text-gray-400">
            {availableSlotIds.length > 0
              ? t("confirmation.selectDescription")
              : t("confirmation.selectAnyDescription")}
          </p>
        </div>

        {/* Time slot selection */}
        <div className="space-y-2">
          {slotsToShow.map((slot, idx) => (
            <label
              key={slot.slotId || `confirm-slot-${idx}`}
              className={`flex items-center gap-3 p-4 rounded-lg border-2 cursor-pointer transition-all ${
                selectedFinalDateId === slot.slotId
                  ? "border-blue-600 bg-blue-50 dark:bg-blue-900/20"
                  : "border-gray-200 dark:border-gray-700 hover:border-gray-300 dark:hover:border-gray-600"
              }`}
            >
              <input
                type="radio"
                name="finalTimeSlot"
                checked={selectedFinalDateId === slot.slotId}
                onChange={() => setSelectedFinalDateId(slot.slotId)}
                className="w-4 h-4 text-blue-600 border-gray-300 focus:ring-blue-500"
              />
              <div className="flex-1">
                <div className="flex items-center gap-2">
                  <span className="font-medium text-gray-900 dark:text-white">
                    {formatDateDisplay(slot.date)}
                  </span>
                  <span className="text-gray-500 dark:text-gray-400">
                    {formatTimeDisplay(slot.startTime)} - {formatTimeDisplay(slot.endTime)}
                  </span>
                  {slot.allCanAttend && (
                    <span className="text-xs px-2 py-0.5 bg-green-100 dark:bg-green-900/30 text-green-700 dark:text-green-400 rounded">
                      {t("confirmation.allCanAttend")}
                    </span>
                  )}
                </div>
                <p className="text-sm text-gray-500 dark:text-gray-400">
                  {slot.availableCount}/{slot.totalAttendees} {t("confirmation.available")}
                </p>
              </div>
            </label>
          ))}
        </div>

        {/* Confirm button */}
        {canManageKickoff && (
          <Button
            variant="success"
            onClick={handleSelectTimeSlot}
            loading={isSelectingDate}
            disabled={!selectedFinalDateId || isSelectingDate}
            className="w-full"
          >
            <CheckIcon className="w-4 h-4" />
            {t("confirmation.confirm")}
          </Button>
        )}

        {/* Warning if selecting time slot where not everyone can attend */}
        {selectedFinalDateId && availableSlotIds.length === 0 && (
          <Alert type="warning" message={t("confirmation.someAbsent")} />
        )}
      </div>
    );
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
            {/* Back button - only show in dates phase when pending for admins */}
            {!showAttendeeOnlyView && currentPhase === "dates" && task?.actionStatus === "pending" && canManageKickoff && (
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
                // Only allow navigation back when in pending status
                if (task?.actionStatus === "pending" && stepId === "attendees" && currentPhase === "dates") {
                  setManualPhase("attendees");
                }
              }}
            />
          </div>
        )}

        {/* Phase Content - attendees only see responses phase */}
        {showAttendeeOnlyView ? renderResponsesPhase() : renderPhaseContent()}
      </div>
    </Modal>
  );
}
