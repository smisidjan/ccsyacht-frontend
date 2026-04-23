"use client";

import { useState } from "react";
import { useTranslations } from "next-intl";
import {
  CalendarDaysIcon,
  ClockIcon,
  ComputerDesktopIcon,
  UserIcon,
  CheckIcon,
  XMarkIcon,
  PlusIcon,
  PaperAirplaneIcon,
  ExclamationTriangleIcon,
} from "@heroicons/react/24/outline";
import Button from "@/app/components/ui/Button";
import Alert from "@/app/components/ui/Alert";
import { DateCard, AttendeeAvatar, getAvatarStatus } from "../shared";
import { formatDateDisplay, formatTimeDisplay, getTodayDateString } from "../../utils";
import type { ResponsesPhaseProps, LocalTimeSlot } from "./types";

export default function ResponsesPhase({
  task,
  schedulingStatus,
  currentUserResponses,
  isRespondingToDate,
  onRespondToTimeSlot,
  isCurrentUserAttendee,
  hasDeclinedAllSlots,
  showProposeAlternative,
  setShowProposeAlternative,
  proposedAlternatives,
  setProposedAlternatives,
  newProposedDateInput,
  setNewProposedDateInput,
  newProposedTimeInputs,
  setNewProposedTimeInputs,
  expandedProposedDates,
  setExpandedProposedDates,
  isSubmittingProposal,
  onSubmitProposedAlternatives,
  onAddProposedAlternativeDate,
  onAddTimeToProposedDate,
  onRemoveTimeFromProposedDate,
  onRemoveProposedAlternativeDate,
  canManageKickoff,
}: ResponsesPhaseProps) {
  const t = useTranslations("projectDetail.setupTasks.kickoffScheduling");

  // Track which date cards are expanded (with manual overrides)
  const [responseDateExpansionOverrides, setResponseDateExpansionOverrides] = useState<Map<string, boolean>>(new Map());

  // Track which slots have been "accepted" (expanded to show attendance options)
  const [acceptedSlots, setAcceptedSlots] = useState<Set<string>>(new Set());

  // Track pending attendance selection for accepted slots
  const [pendingResponses, setPendingResponses] = useState<Record<string, { online: boolean; live: boolean }>>({});

  if (!schedulingStatus) {
    return <Alert type="info" message={t("responses.loading")} />;
  }

  // Calculate slots needing current user's response
  const slotsNeedingResponse = isCurrentUserAttendee
    ? schedulingStatus.proposedDates.flatMap((pd) =>
        pd.timeSlots.filter((slot) => currentUserResponses[slot.id] === null)
      ).length
    : 0;

  // Check if a date should be expanded by default
  const isDateExpandedByDefault = (proposedDate: typeof schedulingStatus.proposedDates[0]) => {
    const allSlotsFullyResponded = proposedDate.timeSlots.every(
      (slot) => slot.responses.length === slot.totalAttendees
    );
    return !allSlotsFullyResponded;
  };

  // Toggle expansion for a date card
  const toggleResponseDateExpansion = (
    dateId: string,
    proposedDate: typeof schedulingStatus.proposedDates[0]
  ) => {
    setResponseDateExpansionOverrides((prev) => {
      const next = new Map(prev);
      const currentState = next.has(dateId)
        ? next.get(dateId)
        : isDateExpandedByDefault(proposedDate);
      next.set(dateId, !currentState);
      return next;
    });
  };

  // Check if a date is expanded
  const isDateExpanded = (
    dateId: string,
    proposedDate: typeof schedulingStatus.proposedDates[0]
  ) => {
    if (responseDateExpansionOverrides.has(dateId)) {
      return responseDateExpansionOverrides.get(dateId)!;
    }
    return isDateExpandedByDefault(proposedDate);
  };

  // Toggle proposed date expansion
  const toggleProposedDateExpansion = (date: string) => {
    setExpandedProposedDates((prev) => {
      const next = new Set(prev);
      if (next.has(date)) {
        next.delete(date);
      } else {
        next.add(date);
      }
      return next;
    });
  };

  // Handle time input changes for proposed alternatives
  const handleTimeInputChange = (
    date: string,
    field: "start" | "end",
    value: string
  ) => {
    setNewProposedTimeInputs((prev) => ({
      ...prev,
      [date]: { ...prev[date], [field]: value },
    }));
  };

  // Handle Accept button - show attendance options
  const handleAccept = (slotId: string) => {
    setAcceptedSlots((prev) => new Set([...prev, slotId]));
    // Initialize with both options unchecked
    setPendingResponses((prev) => ({
      ...prev,
      [slotId]: { online: false, live: false },
    }));
  };

  // Handle Decline button - submit immediately with both false
  const handleDecline = async (slotId: string) => {
    await onRespondToTimeSlot(slotId, false, false);
  };

  // Handle attendance selection - "Online" or "Online + In Person"
  // If in-person is selected, online is automatically included
  const handleSelectAttendance = (slotId: string, includeInPerson: boolean) => {
    setPendingResponses((prev) => ({
      ...prev,
      [slotId]: {
        online: true, // Always online when accepting
        live: includeInPerson,
      },
    }));
  };

  // Submit response for a time slot
  const handleSubmitResponse = async (slotId: string) => {
    const response = pendingResponses[slotId];
    if (!response) return;

    await onRespondToTimeSlot(slotId, response.online, response.live);

    // Clear states after successful submission
    setAcceptedSlots((prev) => {
      const next = new Set(prev);
      next.delete(slotId);
      return next;
    });
    setPendingResponses((prev) => {
      const next = { ...prev };
      delete next[slotId];
      return next;
    });
  };

  // Cancel accept - go back to accept/decline buttons
  const handleCancelAccept = (slotId: string) => {
    setAcceptedSlots((prev) => {
      const next = new Set(prev);
      next.delete(slotId);
      return next;
    });
    setPendingResponses((prev) => {
      const next = { ...prev };
      delete next[slotId];
      return next;
    });
  };

  // Check if there are valid proposed alternatives
  const hasValidProposedAlternatives = proposedAlternatives.some(
    (d) => d.timeSlots.length > 0
  );

  return (
    <div className="space-y-4">
      {/* Compact header with action needed indicator */}
      <div className="flex items-center justify-between">
        <div>
          <h3 className="text-lg font-semibold text-gray-900 dark:text-white">
            {t("responses.title")}
          </h3>
          <p className="text-sm text-gray-500 dark:text-gray-400">
            {schedulingStatus.respondedCount}/{schedulingStatus.totalAttendees}{" "}
            {t("responses.haveResponded")}
          </p>
        </div>
        {slotsNeedingResponse > 0 && (
          <span className="px-3 py-1.5 bg-amber-100 dark:bg-amber-900/30 text-amber-700 dark:text-amber-400 text-sm font-medium rounded-full">
            {slotsNeedingResponse} {t("responses.needsYourResponse")}
          </span>
        )}
      </div>

      {/* Legend */}
      <div className="flex items-center gap-4 text-xs text-gray-500 dark:text-gray-400 bg-gray-50 dark:bg-gray-800/50 rounded-lg px-3 py-2">
        <div className="flex items-center gap-1.5">
          <ComputerDesktopIcon className="w-4 h-4 text-blue-500" />
          <span>{t("responses.online")}</span>
        </div>
        <div className="flex items-center gap-1.5">
          <UserIcon className="w-4 h-4 text-purple-500" />
          <span>{t("responses.inPerson")}</span>
        </div>
      </div>

      {/* Date cards with time slots */}
      <div className="space-y-3">
        {schedulingStatus.proposedDates.map((proposedDate, dateIdx) => {
          const hasNewSlotsInDate = proposedDate.timeSlots.some(
            (slot) => slot.responses.length === 0
          );
          const userNeedsToRespondToDate =
            isCurrentUserAttendee &&
            proposedDate.timeSlots.some(
              (slot) => currentUserResponses[slot.id] === null
            );
          const dateId = proposedDate.id || `date-${dateIdx}`;
          const isExpanded = isDateExpanded(dateId, proposedDate);

          // Calculate summary stats for collapsed view
          const totalSlots = proposedDate.timeSlots.length;
          const slotsWithAllAvailable = proposedDate.timeSlots.filter(
            (s) => s.allCanAttend
          ).length;

          return (
            <div
              key={dateId}
              className={`border rounded-xl overflow-hidden ${
                hasNewSlotsInDate
                  ? "border-blue-300 dark:border-blue-700 bg-blue-50/50 dark:bg-blue-900/10"
                  : "border-gray-200 dark:border-gray-700"
              }`}
            >
              {/* Date Header - Clickable */}
              <div
                onClick={() => toggleResponseDateExpansion(dateId, proposedDate)}
                className={`flex items-center justify-between px-4 py-3 cursor-pointer hover:bg-opacity-80 transition-colors ${
                  hasNewSlotsInDate
                    ? "bg-blue-100/50 dark:bg-blue-900/20"
                    : "bg-gray-50 dark:bg-gray-800/50"
                }`}
              >
                <div className="flex items-center gap-3">
                  <CalendarDaysIcon
                    className={`w-5 h-5 ${
                      hasNewSlotsInDate
                        ? "text-blue-600 dark:text-blue-400"
                        : "text-gray-400"
                    }`}
                  />
                  <div>
                    <span className="font-medium text-gray-900 dark:text-white">
                      {formatDateDisplay(proposedDate.proposedDate)}
                    </span>
                    {/* Collapsed summary */}
                    {!isExpanded && (
                      <p className="text-xs text-gray-500 dark:text-gray-400">
                        {totalSlots} {t("responses.timeSlots")}
                        {slotsWithAllAvailable > 0 && (
                          <span className="text-green-600 dark:text-green-400 ml-2">
                            {slotsWithAllAvailable}{" "}
                            {t("confirmation.allCanAttend").toLowerCase()}
                          </span>
                        )}
                      </p>
                    )}
                  </div>
                </div>
                <div className="flex items-center gap-2">
                  {hasNewSlotsInDate && (
                    <span className="px-2 py-0.5 bg-blue-600 text-white text-xs font-medium rounded">
                      {t("responses.new")}
                    </span>
                  )}
                  {userNeedsToRespondToDate && (
                    <span className="px-2 py-0.5 bg-amber-500 text-white text-xs font-medium rounded">
                      {t("responses.actionNeeded")}
                    </span>
                  )}
                  {/* Chevron */}
                  <div
                    className={`transform transition-transform ${
                      isExpanded ? "rotate-180" : ""
                    }`}
                  >
                    <svg
                      className="w-5 h-5 text-gray-400"
                      fill="none"
                      viewBox="0 0 24 24"
                      stroke="currentColor"
                    >
                      <path
                        strokeLinecap="round"
                        strokeLinejoin="round"
                        strokeWidth={2}
                        d="M19 9l-7 7-7-7"
                      />
                    </svg>
                  </div>
                </div>
              </div>

              {/* Time Slots - Compact rows (collapsible) */}
              {isExpanded && (
                <div className="divide-y divide-gray-100 dark:divide-gray-800">
                  {proposedDate.timeSlots.map((slot, slotIdx) => {
                    const userResponse = currentUserResponses[slot.id];
                    const isSlotAccepted = acceptedSlots.has(slot.id);
                    const pendingResponse = pendingResponses[slot.id];
                    const pendingAttendees =
                      task?.assignees?.filter(
                        (assignee) =>
                          !slot.responses.some(
                            (r) => r.userId === assignee.identifier
                          )
                      ) || [];

                    const hasPendingSelection = pendingResponse && (pendingResponse.online || pendingResponse.live);

                    return (
                      <div
                        key={slot.id || `slot-${dateIdx}-${slotIdx}`}
                        className={`px-4 py-3 ${
                          slot.allCanAttend ? "bg-green-50 dark:bg-green-900/10" : ""
                        }`}
                      >
                        <div className="flex items-center gap-4">
                          {/* Time */}
                          <div className="flex items-center gap-2 min-w-[120px]">
                            <ClockIcon className="w-4 h-4 text-gray-400 flex-shrink-0" />
                            <span className="text-sm font-medium text-gray-900 dark:text-white">
                              {formatTimeDisplay(slot.startTime)} -{" "}
                              {formatTimeDisplay(slot.endTime)}
                            </span>
                          </div>

                          {/* Avatar grid with online/live status */}
                          <div className="flex items-center gap-0.5 flex-1">
                            {/* Responded users */}
                            {slot.responses.map((response) => (
                              <AttendeeAvatar
                                key={response.userId}
                                name={response.userName}
                                status={getAvatarStatus(response.canAttendOnline, response.canAttendLive)}
                              />
                            ))}
                            {/* Pending users */}
                            {pendingAttendees.map((attendee) => (
                              <AttendeeAvatar
                                key={attendee.identifier}
                                name={attendee.name}
                                status="pending"
                              />
                            ))}
                          </div>

                          {/* Availability counts - calculate from responses if API doesn't provide */}
                          {(() => {
                            const onlineCount = slot.onlineCount ?? slot.responses.filter(r => r.canAttendOnline).length;
                            const liveCount = slot.liveCount ?? slot.responses.filter(r => r.canAttendLive).length;
                            return (
                              <div className="flex items-center gap-2 text-xs">
                                {onlineCount > 0 && (
                                  <span className="flex items-center gap-1 px-1.5 py-0.5 bg-blue-100 dark:bg-blue-900/30 text-blue-700 dark:text-blue-400 rounded">
                                    <ComputerDesktopIcon className="w-3 h-3" />
                                    {onlineCount}
                                  </span>
                                )}
                                {liveCount > 0 && (
                                  <span className="flex items-center gap-1 px-1.5 py-0.5 bg-purple-100 dark:bg-purple-900/30 text-purple-700 dark:text-purple-400 rounded">
                                    <UserIcon className="w-3 h-3" />
                                    {liveCount}
                                  </span>
                                )}
                                <span
                                  className={`px-2 py-0.5 rounded font-medium ${
                                    slot.allCanAttend
                                      ? "bg-green-100 dark:bg-green-900/30 text-green-700 dark:text-green-400"
                                      : "bg-gray-100 dark:bg-gray-800 text-gray-600 dark:text-gray-400"
                                  }`}
                                >
                                  {slot.availableCount}/{slot.totalAttendees}
                                </span>
                              </div>
                            );
                          })()}
                        </div>

                        {/* User response section - Step 1: Accept/Decline buttons */}
                        {isCurrentUserAttendee && userResponse === null && !isSlotAccepted && (
                          <div className="mt-3 pt-3 border-t border-gray-100 dark:border-gray-700">
                            <div className="flex items-center justify-end gap-2">
                              <button
                                onClick={() => handleDecline(slot.id)}
                                disabled={isRespondingToDate}
                                className="flex items-center gap-1.5 px-3 py-1.5 rounded-lg bg-red-100 hover:bg-red-200 dark:bg-red-900/30 dark:hover:bg-red-900/50 text-red-700 dark:text-red-400 text-sm font-medium transition-colors disabled:opacity-50"
                              >
                                <XMarkIcon className="w-4 h-4" />
                                {t("responses.decline")}
                              </button>
                              <button
                                onClick={() => handleAccept(slot.id)}
                                disabled={isRespondingToDate}
                                className="flex items-center gap-1.5 px-3 py-1.5 rounded-lg bg-green-100 hover:bg-green-200 dark:bg-green-900/30 dark:hover:bg-green-900/50 text-green-700 dark:text-green-400 text-sm font-medium transition-colors disabled:opacity-50"
                              >
                                <CheckIcon className="w-4 h-4" />
                                {t("responses.accept")}
                              </button>
                            </div>
                          </div>
                        )}

                        {/* User response section - Step 2: Attendance type selection */}
                        {isCurrentUserAttendee && userResponse === null && isSlotAccepted && (
                          <div className="mt-3 pt-3 border-t border-gray-100 dark:border-gray-700">
                            <p className="text-xs text-gray-500 dark:text-gray-400 mb-2">
                              {t("responses.howWillYouAttend")}
                            </p>
                            <div className="flex items-center justify-between flex-wrap gap-3">
                              <div className="flex items-center gap-2">
                                {/* Online only button */}
                                <button
                                  onClick={() => handleSelectAttendance(slot.id, false)}
                                  disabled={isRespondingToDate}
                                  className={`flex items-center gap-2 px-4 py-2 rounded-lg border-2 transition-all ${
                                    pendingResponse?.online && !pendingResponse?.live
                                      ? "border-blue-500 bg-blue-50 dark:bg-blue-900/30 text-blue-700 dark:text-blue-400"
                                      : "border-gray-200 dark:border-gray-600 hover:border-blue-300 dark:hover:border-blue-700 text-gray-700 dark:text-gray-300"
                                  }`}
                                >
                                  <ComputerDesktopIcon className="w-4 h-4" />
                                  <span className="text-sm font-medium">{t("responses.online")}</span>
                                </button>

                                {/* In Person button (includes online) */}
                                <button
                                  onClick={() => handleSelectAttendance(slot.id, true)}
                                  disabled={isRespondingToDate}
                                  className={`flex items-center gap-2 px-4 py-2 rounded-lg border-2 transition-all ${
                                    pendingResponse?.online && pendingResponse?.live
                                      ? "border-purple-500 bg-purple-50 dark:bg-purple-900/30 text-purple-700 dark:text-purple-400"
                                      : "border-gray-200 dark:border-gray-600 hover:border-purple-300 dark:hover:border-purple-700 text-gray-700 dark:text-gray-300"
                                  }`}
                                >
                                  <UserIcon className="w-4 h-4" />
                                  <span className="text-sm font-medium">{t("responses.inPerson")}</span>
                                </button>
                              </div>

                              <div className="flex items-center gap-2">
                                <button
                                  onClick={() => handleCancelAccept(slot.id)}
                                  disabled={isRespondingToDate}
                                  className="px-3 py-1.5 text-sm text-gray-600 dark:text-gray-400 hover:text-gray-800 dark:hover:text-gray-200"
                                >
                                  {t("responses.back")}
                                </button>
                                <Button
                                  size="sm"
                                  onClick={() => handleSubmitResponse(slot.id)}
                                  disabled={!hasPendingSelection || isRespondingToDate}
                                  loading={isRespondingToDate}
                                >
                                  {t("responses.confirm")}
                                </Button>
                              </div>
                            </div>
                          </div>
                        )}

                        {/* Already responded indicator */}
                        {isCurrentUserAttendee && userResponse !== null && (
                          <div className="mt-2 flex items-center gap-2 text-xs">
                            <span className="text-gray-500 dark:text-gray-400">
                              {t("responses.yourResponse")}:
                            </span>
                            {userResponse.online && (
                              <span className="flex items-center gap-1 px-2 py-0.5 bg-blue-100 dark:bg-blue-900/30 text-blue-700 dark:text-blue-400 rounded-full">
                                <ComputerDesktopIcon className="w-3 h-3" />
                                {t("responses.online")}
                              </span>
                            )}
                            {userResponse.live && (
                              <span className="flex items-center gap-1 px-2 py-0.5 bg-purple-100 dark:bg-purple-900/30 text-purple-700 dark:text-purple-400 rounded-full">
                                <UserIcon className="w-3 h-3" />
                                {t("responses.inPerson")}
                              </span>
                            )}
                            {!userResponse.online && !userResponse.live && (
                              <span className="px-2 py-0.5 bg-red-100 dark:bg-red-900/30 text-red-700 dark:text-red-400 rounded-full">
                                {t("responses.unavailable")}
                              </span>
                            )}
                          </div>
                        )}
                      </div>
                    );
                  })}
                </div>
              )}
            </div>
          );
        })}
      </div>

      {/* Status messages */}
      {schedulingStatus.allResponded &&
        schedulingStatus.timeSlotsWhereAllCanAttend.length > 0 && (
          <Alert
            type="success"
            message={t("responses.allRespondedWithDates", {
              count: schedulingStatus.timeSlotsWhereAllCanAttend.length,
            })}
          />
        )}
      {canManageKickoff &&
        schedulingStatus.allResponded &&
        schedulingStatus.timeSlotsWhereAllCanAttend.length === 0 && (
          <Alert type="warning" message={t("responses.noCommonDate")} />
        )}

      {/* Propose Alternative Section */}
      {isCurrentUserAttendee && hasDeclinedAllSlots && (
        <div className="mt-6 border-t border-gray-200 dark:border-gray-700 pt-6">
          {!showProposeAlternative ? (
            <div className="bg-amber-50 dark:bg-amber-900/20 border border-amber-200 dark:border-amber-800 rounded-xl p-4">
              <div className="flex items-start gap-3">
                <div className="w-10 h-10 bg-amber-100 dark:bg-amber-900/30 rounded-full flex items-center justify-center flex-shrink-0">
                  <ExclamationTriangleIcon className="w-5 h-5 text-amber-600 dark:text-amber-400" />
                </div>
                <div className="flex-1">
                  <h4 className="text-sm font-semibold text-amber-800 dark:text-amber-300">
                    {t("proposeAlternative.title")}
                  </h4>
                  <p className="text-sm text-amber-700 dark:text-amber-400 mt-1">
                    {t("proposeAlternative.description")}
                  </p>
                  <Button
                    variant="secondary"
                    size="sm"
                    onClick={() => setShowProposeAlternative(true)}
                    className="mt-3"
                  >
                    <PlusIcon className="w-4 h-4" />
                    {t("proposeAlternative.addButton")}
                  </Button>
                </div>
              </div>
            </div>
          ) : (
            <div className="space-y-4">
              <div className="flex items-center justify-between">
                <h4 className="text-sm font-semibold text-gray-900 dark:text-white">
                  {t("proposeAlternative.formTitle")}
                </h4>
                <button
                  onClick={() => {
                    setShowProposeAlternative(false);
                    setProposedAlternatives([]);
                  }}
                  className="p-1 text-gray-400 hover:text-gray-600 dark:hover:text-gray-300"
                >
                  <XMarkIcon className="w-5 h-5" />
                </button>
              </div>

              {/* Proposed alternative date cards */}
              {proposedAlternatives.length > 0 && (
                <div className="space-y-3">
                  {proposedAlternatives.map((dateWithTimes) => (
                    <DateCard
                      key={dateWithTimes.date}
                      date={dateWithTimes.date}
                      timeSlots={dateWithTimes.timeSlots}
                      isExpanded={expandedProposedDates.has(dateWithTimes.date)}
                      onToggleExpand={() =>
                        toggleProposedDateExpansion(dateWithTimes.date)
                      }
                      onRemove={() =>
                        onRemoveProposedAlternativeDate(dateWithTimes.date)
                      }
                      onRemoveTimeSlot={(slot: LocalTimeSlot) =>
                        onRemoveTimeFromProposedDate(dateWithTimes.date, slot)
                      }
                      onAddTimeSlot={(start: string, end: string) => {
                        onAddTimeToProposedDate(dateWithTimes.date, start, end);
                        setNewProposedTimeInputs((prev) => ({
                          ...prev,
                          [dateWithTimes.date]: { start: "", end: "" },
                        }));
                      }}
                      newTimeStart={
                        newProposedTimeInputs[dateWithTimes.date]?.start || ""
                      }
                      newTimeEnd={
                        newProposedTimeInputs[dateWithTimes.date]?.end || ""
                      }
                      onNewTimeStartChange={(value) =>
                        handleTimeInputChange(dateWithTimes.date, "start", value)
                      }
                      onNewTimeEndChange={(value) =>
                        handleTimeInputChange(dateWithTimes.date, "end", value)
                      }
                      variant="purple"
                    />
                  ))}
                </div>
              )}

              {/* Add New Date */}
              <div className="flex gap-2">
                <input
                  type="date"
                  value={newProposedDateInput}
                  onChange={(e) => setNewProposedDateInput(e.target.value)}
                  min={getTodayDateString()}
                  className="flex-1 px-3 py-2 border border-gray-300 dark:border-gray-600 rounded-lg bg-white dark:bg-gray-800 text-gray-900 dark:text-white focus:ring-2 focus:ring-purple-500 focus:border-transparent text-sm"
                />
                <Button
                  variant="secondary"
                  size="sm"
                  onClick={onAddProposedAlternativeDate}
                  disabled={!newProposedDateInput}
                >
                  <PlusIcon className="w-4 h-4" />
                  {t("proposeAlternative.addDate")}
                </Button>
              </div>

              {/* Submit Button */}
              {hasValidProposedAlternatives && (
                <Button
                  variant="primary"
                  onClick={onSubmitProposedAlternatives}
                  loading={isSubmittingProposal}
                  disabled={isSubmittingProposal}
                  className="w-full"
                >
                  <PaperAirplaneIcon className="w-4 h-4" />
                  {t("proposeAlternative.submit")}
                </Button>
              )}

              {/* Help text */}
              <p className="text-xs text-gray-500 dark:text-gray-400 text-center">
                {t("proposeAlternative.helpText")}
              </p>
            </div>
          )}
        </div>
      )}
    </div>
  );
}
