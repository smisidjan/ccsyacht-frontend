"use client";

import { useEffect } from "react";
import { useTranslations } from "next-intl";
import {
  CheckCircleIcon,
  CheckIcon,
  PlusIcon,
  PaperAirplaneIcon,
  ComputerDesktopIcon,
  UserIcon,
} from "@heroicons/react/24/outline";
import Button from "@/app/components/ui/Button";
import Alert from "@/app/components/ui/Alert";
import { DateCard, AttendeeAvatar, getAvatarStatus } from "../shared";
import { formatDateDisplay, formatTimeDisplay, getTodayDateString } from "../../utils";
import type { ConfirmationPhaseProps, LocalTimeSlot } from "./types";

export default function ConfirmationPhase({
  task,
  schedulingStatus,
  selectedFinalDateId,
  setSelectedFinalDateId,
  selectedMeetingFormat,
  setSelectedMeetingFormat,
  meetingLink,
  setMeetingLink,
  isSelectingDate,
  onSelectFinalDate,
  canManageKickoff,
  confirmationMode,
  setConfirmationMode,
  localDatesWithTimes,
  newDateInput,
  setNewDateInput,
  newTimeInputs,
  setNewTimeInputs,
  expandedDates,
  setExpandedDates,
  isSendingInvitations,
  onAddDate,
  onAddTimeSlotToDate,
  onRemoveLocalTimeSlot,
  onRemoveLocalDate,
  onSendInvitations,
  hasValidDateTimes,
}: ConfirmationPhaseProps) {
  const t = useTranslations("projectDetail.setupTasks.kickoffScheduling");

  if (!schedulingStatus) {
    return <Alert type="info" message={t("confirmation.loading")} />;
  }

  const isScheduled =
    task?.actionStatus === "scheduled" || task?.actionStatus === "completed";
  const selectedTimeSlot = schedulingStatus.selectedTimeSlot;
  const availableSlotIds = schedulingStatus.timeSlotsWhereAllCanAttend;

  // Collect all time slots for selection
  const allTimeSlots: Array<{
    slotId: string;
    date: string;
    startTime: string;
    endTime: string;
    allCanAttend: boolean;
    availableCount: number;
    totalAttendees: number;
    onlineCount: number;
    liveCount: number;
    responses: typeof schedulingStatus.proposedDates[0]["timeSlots"][0]["responses"];
  }> = [];

  schedulingStatus.proposedDates.forEach((pd) => {
    pd.timeSlots.forEach((slot) => {
      // Calculate counts from responses if API doesn't provide them
      const calculatedOnlineCount = slot.responses.filter(r => r.canAttendOnline).length;
      const calculatedLiveCount = slot.responses.filter(r => r.canAttendLive).length;

      allTimeSlots.push({
        slotId: slot.id,
        date: pd.proposedDate,
        startTime: slot.startTime,
        endTime: slot.endTime,
        allCanAttend: slot.allCanAttend,
        availableCount: slot.availableCount,
        totalAttendees: slot.totalAttendees,
        onlineCount: slot.onlineCount || calculatedOnlineCount,
        liveCount: slot.liveCount || calculatedLiveCount,
        responses: slot.responses,
      });
    });
  });

  // Filter to only slots where all can attend, or show all if none match
  const filteredSlots =
    availableSlotIds.length > 0
      ? allTimeSlots.filter((s) => availableSlotIds.includes(s.slotId))
      : allTimeSlots;

  // Sort slots: 1) Everyone can attend in person, 2) Everyone can attend online, 3) Others
  const slotsToShow = [...filteredSlots].sort((a, b) => {
    const aAllInPerson = a.liveCount === a.totalAttendees;
    const bAllInPerson = b.liveCount === b.totalAttendees;
    const aAllOnline = a.onlineCount === a.totalAttendees;
    const bAllOnline = b.onlineCount === b.totalAttendees;

    // Priority 1: Everyone can attend in person
    if (aAllInPerson && !bAllInPerson) return -1;
    if (!aAllInPerson && bAllInPerson) return 1;

    // Priority 2: Everyone can attend online
    if (aAllOnline && !bAllOnline) return -1;
    if (!aAllOnline && bAllOnline) return 1;

    // Priority 3: More people available
    return b.availableCount - a.availableCount;
  });

  // Determine recommended slots with priority: in-person > online > availability count
  const recommendedSlotIds = (() => {
    // Priority 1: Slots where everyone can attend in person
    const allInPersonSlots = slotsToShow.filter(
      s => s.liveCount === s.totalAttendees && s.totalAttendees > 0
    );
    if (allInPersonSlots.length > 0) {
      return new Set(allInPersonSlots.map(s => s.slotId));
    }

    // Priority 2: Slots where everyone can attend online
    const allOnlineSlots = slotsToShow.filter(
      s => s.onlineCount === s.totalAttendees && s.totalAttendees > 0
    );
    if (allOnlineSlots.length > 0) {
      return new Set(allOnlineSlots.map(s => s.slotId));
    }

    // Priority 3: Slots with highest availability count
    const maxAvailableCount = slotsToShow.length > 0
      ? Math.max(...slotsToShow.map(s => s.availableCount))
      : 0;
    if (maxAvailableCount > 0) {
      return new Set(
        slotsToShow
          .filter(s => s.availableCount === maxAvailableCount)
          .map(s => s.slotId)
      );
    }

    return new Set<string>();
  })();

  // Auto-select if there's only one slot where everyone can attend
  const shouldAutoSelect =
    slotsToShow.length === 1 && availableSlotIds.length === 1;
  const autoSelectedSlotId = shouldAutoSelect ? slotsToShow[0].slotId : null;
  const effectiveSelectedId = autoSelectedSlotId || selectedFinalDateId;

  // Auto-preselect meeting format when auto-selecting slot (only one available)
  useEffect(() => {
    if (!shouldAutoSelect || !canManageKickoff || !autoSelectedSlotId) return;
    if (selectedMeetingFormat !== null) return; // Already selected

    const selectedSlot = slotsToShow[0];
    if (!selectedSlot) return;

    const canSelectOnline = selectedSlot.onlineCount === selectedSlot.totalAttendees;
    const canSelectInPerson = selectedSlot.liveCount === selectedSlot.totalAttendees;

    // Auto-select if exactly one option is available
    if (canSelectOnline && !canSelectInPerson) {
      setSelectedMeetingFormat("online");
    } else if (canSelectInPerson && !canSelectOnline) {
      setSelectedMeetingFormat("in_person");
    }
  }, [shouldAutoSelect, autoSelectedSlotId, slotsToShow, canManageKickoff, selectedMeetingFormat, setSelectedMeetingFormat]);

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

  // Handle time input changes
  const handleTimeInputChange = (
    date: string,
    field: "start" | "end",
    value: string
  ) => {
    setNewTimeInputs((prev) => ({
      ...prev,
      [date]: { ...prev[date], [field]: value },
    }));
  };

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
            {formatTimeDisplay(selectedTimeSlot.startTime)} -{" "}
            {formatTimeDisplay(selectedTimeSlot.endTime)}
          </p>
          {selectedTimeSlot.meetingFormat && (
            <div className="mt-3">
              {selectedTimeSlot.meetingFormat === "live" ? (
                <span className="inline-flex items-center gap-1.5 px-3 py-1.5 bg-purple-100 dark:bg-purple-900/30 text-purple-700 dark:text-purple-400 rounded-full text-sm font-medium">
                  <UserIcon className="w-4 h-4" />
                  {t("responses.inPerson")}
                </span>
              ) : (
                <span className="inline-flex items-center gap-1.5 px-3 py-1.5 bg-blue-100 dark:bg-blue-900/30 text-blue-700 dark:text-blue-400 rounded-full text-sm font-medium">
                  <ComputerDesktopIcon className="w-4 h-4" />
                  {t("responses.online")}
                </span>
              )}
            </div>
          )}
        </div>

        {/* Attendees list with online/live status */}
        <div className="space-y-2">
          <label className="block text-sm font-medium text-gray-700 dark:text-gray-300">
            {t("confirmation.attendees")}
          </label>
          <div className="space-y-2">
            {task?.assignees?.map((assignee) => {
              const response = selectedTimeSlot.responses.find(
                (r) => r.userId === assignee.identifier
              );
              const canAttendOnline = response?.canAttendOnline ?? false;
              const canAttendLive = response?.canAttendLive ?? false;
              const isAvailable = canAttendOnline || canAttendLive;

              return (
                <div
                  key={assignee.identifier}
                  className={`flex items-center justify-between p-3 rounded-lg ${
                    isAvailable
                      ? "bg-green-50 dark:bg-green-900/10"
                      : "bg-red-50 dark:bg-red-900/10"
                  }`}
                >
                  <span className="text-sm text-gray-900 dark:text-white">
                    {assignee.name}
                  </span>
                  <div className="flex items-center gap-2">
                    {canAttendOnline && canAttendLive && (
                      <span className="flex items-center gap-1 text-xs px-2 py-1 bg-purple-100 dark:bg-purple-900/30 text-purple-700 dark:text-purple-400 rounded">
                        <ComputerDesktopIcon className="w-3 h-3" />
                        <span>+</span>
                        <UserIcon className="w-3 h-3" />
                        {t("responses.onlineAndInPerson")}
                      </span>
                    )}
                    {canAttendOnline && !canAttendLive && (
                      <span className="flex items-center gap-1 text-xs px-2 py-1 bg-blue-100 dark:bg-blue-900/30 text-blue-700 dark:text-blue-400 rounded">
                        <ComputerDesktopIcon className="w-3 h-3" />
                        {t("responses.online")}
                      </span>
                    )}
                    {!isAvailable && (
                      <span className="text-xs px-2 py-1 bg-red-100 dark:bg-red-900/30 text-red-700 dark:text-red-400 rounded">
                        {t("confirmation.absent")}
                      </span>
                    )}
                  </div>
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

      {/* Mode toggle when no common date - only for admins */}
      {canManageKickoff && availableSlotIds.length === 0 && (
        <div className="flex rounded-lg border border-gray-200 dark:border-gray-700 p-1 bg-gray-50 dark:bg-gray-800">
          <button
            onClick={() => setConfirmationMode("select")}
            className={`flex-1 px-4 py-2 text-sm font-medium rounded-md transition-all ${
              confirmationMode === "select"
                ? "bg-white dark:bg-gray-700 text-gray-900 dark:text-white shadow-sm"
                : "text-gray-600 dark:text-gray-400 hover:text-gray-900 dark:hover:text-white"
            }`}
          >
            {t("confirmation.selectExisting")}
          </button>
          <button
            onClick={() => setConfirmationMode("propose")}
            className={`flex-1 px-4 py-2 text-sm font-medium rounded-md transition-all ${
              confirmationMode === "propose"
                ? "bg-white dark:bg-gray-700 text-gray-900 dark:text-white shadow-sm"
                : "text-gray-600 dark:text-gray-400 hover:text-gray-900 dark:hover:text-white"
            }`}
          >
            {t("confirmation.proposeNew")}
          </button>
        </div>
      )}

      {/* Select existing date mode */}
      {(confirmationMode === "select" || availableSlotIds.length > 0) && (
        <>
          {/* Time slot selection */}
          <div className="space-y-2">
            {slotsToShow.map((slot, idx) => {
              const isSelected = effectiveSelectedId === slot.slotId;

              return (
                <div
                  key={slot.slotId || `confirm-slot-${idx}`}
                  className={`rounded-lg border-2 transition-all ${
                    shouldAutoSelect || isSelected
                      ? "border-blue-600 bg-blue-50 dark:bg-blue-900/20"
                      : "border-gray-200 dark:border-gray-700 hover:border-gray-300 dark:hover:border-gray-600"
                  }`}
                >
                  {/* Slot header */}
                  <label
                    className="flex items-center gap-3 p-4 cursor-pointer"
                    onClick={() => {
                      if (!shouldAutoSelect) {
                        setSelectedFinalDateId(slot.slotId);
                        // Auto-preselect format if only one option is available
                        const canSelectOnline = slot.onlineCount === slot.totalAttendees;
                        const canSelectInPerson = slot.liveCount === slot.totalAttendees;
                        if (canSelectOnline && !canSelectInPerson) {
                          setSelectedMeetingFormat("online");
                        } else if (canSelectInPerson && !canSelectOnline) {
                          setSelectedMeetingFormat("in_person");
                        } else {
                          setSelectedMeetingFormat(null);
                        }
                      }
                    }}
                  >
                    <input
                      type="radio"
                      name="finalTimeSlot"
                      checked={isSelected}
                      onChange={() => {}}
                      disabled={shouldAutoSelect}
                      className={`w-4 h-4 text-blue-600 border-gray-300 focus:ring-blue-500 ${
                        shouldAutoSelect ? "cursor-not-allowed" : ""
                      }`}
                    />
                    <div className="flex-1">
                      <div className="flex items-center gap-2 flex-wrap">
                        <span className="font-medium text-gray-900 dark:text-white">
                          {formatDateDisplay(slot.date)}
                        </span>
                        <span className="text-gray-500 dark:text-gray-400">
                          {formatTimeDisplay(slot.startTime)} -{" "}
                          {formatTimeDisplay(slot.endTime)}
                        </span>
                        {recommendedSlotIds.has(slot.slotId) && (
                          <span className="text-xs px-2 py-0.5 bg-amber-100 dark:bg-amber-900/30 text-amber-700 dark:text-amber-400 rounded font-medium">
                            {t("confirmation.recommended")}
                          </span>
                        )}
                        {slot.allCanAttend && (
                          <span className="text-xs px-2 py-0.5 bg-green-100 dark:bg-green-900/30 text-green-700 dark:text-green-400 rounded">
                            {t("confirmation.allCanAttend")}
                          </span>
                        )}
                      </div>
                      <div className="flex items-center gap-2 mt-1 text-sm">
                        <span className="text-gray-500 dark:text-gray-400">
                          {slot.availableCount}/{slot.totalAttendees}{" "}
                          {t("confirmation.available")}
                        </span>
                        <span className="flex items-center gap-1 px-1.5 py-0.5 rounded bg-blue-100 dark:bg-blue-900/30 text-blue-700 dark:text-blue-400 text-xs">
                          <ComputerDesktopIcon className="w-3 h-3" />
                          {slot.onlineCount}
                        </span>
                        <span className="flex items-center gap-1 px-1.5 py-0.5 rounded bg-purple-100 dark:bg-purple-900/30 text-purple-700 dark:text-purple-400 text-xs">
                          <UserIcon className="w-3 h-3" />
                          {slot.liveCount}
                        </span>
                      </div>
                    </div>
                  </label>

                  {/* Expanded attendee details when selected */}
                  {isSelected && (
                    <div className="px-4 pb-4 pt-0 border-t border-blue-200 dark:border-blue-800 mt-0">
                      {/* Attendee avatars grouped by availability */}
                      <div className="flex items-center gap-2 flex-wrap mt-3">
                        {slot.responses.map((response) => (
                          <AttendeeAvatar
                            key={response.userId}
                            name={response.userName}
                            status={getAvatarStatus(response.canAttendOnline, response.canAttendLive)}
                          />
                        ))}
                      </div>

                      {/* Meeting format selection */}
                      {canManageKickoff && (
                        <div className="mt-4">
                          <p className="text-sm font-medium text-gray-700 dark:text-gray-300 mb-2">
                            {t("confirmation.selectFormat")}
                          </p>
                          <div className="flex gap-2">
                            <button
                              onClick={() => setSelectedMeetingFormat("online")}
                              disabled={slot.onlineCount !== slot.totalAttendees}
                              className={`flex-1 flex items-center justify-center gap-2 px-4 py-2.5 rounded-lg border-2 transition-all ${
                                selectedMeetingFormat === "online"
                                  ? "border-blue-600 bg-blue-50 dark:bg-blue-900/30 text-blue-700 dark:text-blue-400"
                                  : slot.onlineCount !== slot.totalAttendees
                                  ? "border-gray-200 dark:border-gray-700 text-gray-400 dark:text-gray-600 cursor-not-allowed"
                                  : "border-gray-200 dark:border-gray-700 hover:border-blue-300 dark:hover:border-blue-700 text-gray-700 dark:text-gray-300"
                              }`}
                            >
                              <ComputerDesktopIcon className="w-5 h-5" />
                              <div className="text-left">
                                <p className="font-medium">{t("responses.online")}</p>
                                <p className="text-xs opacity-75">
                                  {slot.onlineCount}/{slot.totalAttendees}
                                </p>
                              </div>
                            </button>
                            <button
                              onClick={() => setSelectedMeetingFormat("in_person")}
                              disabled={slot.liveCount !== slot.totalAttendees}
                              className={`flex-1 flex items-center justify-center gap-2 px-4 py-2.5 rounded-lg border-2 transition-all ${
                                selectedMeetingFormat === "in_person"
                                  ? "border-purple-600 bg-purple-50 dark:bg-purple-900/30 text-purple-700 dark:text-purple-400"
                                  : slot.liveCount !== slot.totalAttendees
                                  ? "border-gray-200 dark:border-gray-700 text-gray-400 dark:text-gray-600 cursor-not-allowed"
                                  : "border-gray-200 dark:border-gray-700 hover:border-purple-300 dark:hover:border-purple-700 text-gray-700 dark:text-gray-300"
                              }`}
                            >
                              <UserIcon className="w-5 h-5" />
                              <div className="text-left">
                                <p className="font-medium">{t("responses.inPerson")}</p>
                                <p className="text-xs opacity-75">
                                  {slot.liveCount}/{slot.totalAttendees}
                                </p>
                              </div>
                            </button>
                          </div>

                          {/* Meeting link input when online is selected */}
                          {selectedMeetingFormat === "online" && (
                            <div className="mt-4">
                              <label className="block text-sm font-medium text-gray-700 dark:text-gray-300 mb-2">
                                {t("confirmation.meetingLink")}
                                <span className="text-red-500 ml-1">*</span>
                              </label>
                              <input
                                type="url"
                                value={meetingLink}
                                onChange={(e) => setMeetingLink(e.target.value)}
                                placeholder={t("confirmation.meetingLinkPlaceholder")}
                                className="w-full px-3 py-2 border border-gray-300 dark:border-gray-600 rounded-lg bg-white dark:bg-gray-800 text-gray-900 dark:text-white placeholder-gray-400 focus:ring-2 focus:ring-blue-500 focus:border-blue-500"
                              />
                              <p className="mt-1 text-xs text-gray-500 dark:text-gray-400">
                                {t("confirmation.meetingLinkHelp")}
                              </p>
                            </div>
                          )}
                        </div>
                      )}
                    </div>
                  )}
                </div>
              );
            })}
          </div>

          {/* Confirm button */}
          {canManageKickoff && (
            <Button
              variant="success"
              onClick={() => onSelectFinalDate(effectiveSelectedId || undefined, selectedMeetingFormat, meetingLink)}
              loading={isSelectingDate}
              disabled={
                !effectiveSelectedId ||
                !selectedMeetingFormat ||
                isSelectingDate ||
                (selectedMeetingFormat === "online" && !meetingLink.trim())
              }
              className="w-full"
            >
              <CheckIcon className="w-4 h-4" />
              {t("confirmation.confirm")}
            </Button>
          )}

          {/* Warning if selecting time slot where not everyone can attend */}
          {effectiveSelectedId && availableSlotIds.length === 0 && (
            <Alert type="warning" message={t("confirmation.someAbsent")} />
          )}
        </>
      )}

      {/* Propose new dates mode */}
      {confirmationMode === "propose" &&
        availableSlotIds.length === 0 &&
        canManageKickoff && (
          <div className="space-y-4">
            {/* New date cards with time slots */}
            {localDatesWithTimes.length > 0 && (
              <div className="space-y-3">
                {localDatesWithTimes.map((dateWithTimes) => (
                  <DateCard
                    key={dateWithTimes.date}
                    date={dateWithTimes.date}
                    timeSlots={dateWithTimes.timeSlots}
                    isExpanded={expandedDates.has(dateWithTimes.date)}
                    onToggleExpand={() => toggleDateExpansion(dateWithTimes.date)}
                    onRemove={() => onRemoveLocalDate(dateWithTimes.date)}
                    onRemoveTimeSlot={(slot: LocalTimeSlot) =>
                      onRemoveLocalTimeSlot(dateWithTimes.date, slot)
                    }
                    onAddTimeSlot={(start: string, end: string) => {
                      onAddTimeSlotToDate(dateWithTimes.date, start, end);
                      setNewTimeInputs((prev) => ({
                        ...prev,
                        [dateWithTimes.date]: { start: "", end: "" },
                      }));
                    }}
                    newTimeStart={newTimeInputs[dateWithTimes.date]?.start || ""}
                    newTimeEnd={newTimeInputs[dateWithTimes.date]?.end || ""}
                    onNewTimeStartChange={(value) =>
                      handleTimeInputChange(dateWithTimes.date, "start", value)
                    }
                    onNewTimeEndChange={(value) =>
                      handleTimeInputChange(dateWithTimes.date, "end", value)
                    }
                  />
                ))}
              </div>
            )}

            {/* Add New Date */}
            <div className="flex gap-2">
              <input
                type="date"
                value={newDateInput}
                onChange={(e) => setNewDateInput(e.target.value)}
                min={getTodayDateString()}
                className="flex-1 px-3 py-2.5 border border-gray-300 dark:border-gray-600 rounded-lg bg-white dark:bg-gray-800 text-gray-900 dark:text-white focus:ring-2 focus:ring-blue-500 focus:border-transparent"
              />
              <Button
                variant="secondary"
                onClick={onAddDate}
                disabled={!newDateInput}
              >
                <PlusIcon className="w-4 h-4" />
                {t("dates.addDate")}
              </Button>
            </div>

            {/* Send new invitations button */}
            {hasValidDateTimes && (
              <Button
                variant="primary"
                onClick={onSendInvitations}
                loading={isSendingInvitations}
                disabled={isSendingInvitations}
                className="w-full"
              >
                <PaperAirplaneIcon className="w-4 h-4" />
                {t("confirmation.sendNewInvitations")}
              </Button>
            )}
          </div>
        )}
    </div>
  );
}
