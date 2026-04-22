"use client";

import { useTranslations } from "next-intl";
import {
  CheckCircleIcon,
  CheckIcon,
  PlusIcon,
  PaperAirplaneIcon,
} from "@heroicons/react/24/outline";
import Button from "@/app/components/ui/Button";
import Alert from "@/app/components/ui/Alert";
import { DateCard } from "../shared";
import { formatDateDisplay, formatTimeDisplay, getTodayDateString } from "../../utils";
import type { ConfirmationPhaseProps, LocalTimeSlot } from "./types";

export default function ConfirmationPhase({
  task,
  schedulingStatus,
  selectedFinalDateId,
  setSelectedFinalDateId,
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
  const slotsToShow =
    availableSlotIds.length > 0
      ? allTimeSlots.filter((s) => availableSlotIds.includes(s.slotId))
      : allTimeSlots;

  // Auto-select if there's only one slot where everyone can attend
  const shouldAutoSelect =
    slotsToShow.length === 1 && availableSlotIds.length === 1;
  const autoSelectedSlotId = shouldAutoSelect ? slotsToShow[0].slotId : null;
  const effectiveSelectedId = autoSelectedSlotId || selectedFinalDateId;

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
                  <span className="text-sm text-gray-900 dark:text-white">
                    {assignee.name}
                  </span>
                  <span
                    className={`text-xs px-2 py-1 rounded ${
                      isAvailable
                        ? "bg-green-100 dark:bg-green-900/30 text-green-700 dark:text-green-400"
                        : "bg-red-100 dark:bg-red-900/30 text-red-700 dark:text-red-400"
                    }`}
                  >
                    {isAvailable
                      ? t("confirmation.attending")
                      : t("confirmation.absent")}
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
            {slotsToShow.map((slot, idx) => (
              <label
                key={slot.slotId || `confirm-slot-${idx}`}
                className={`flex items-center gap-3 p-4 rounded-lg border-2 transition-all ${
                  shouldAutoSelect
                    ? "border-blue-600 bg-blue-50 dark:bg-blue-900/20"
                    : effectiveSelectedId === slot.slotId
                    ? "border-blue-600 bg-blue-50 dark:bg-blue-900/20 cursor-pointer"
                    : "border-gray-200 dark:border-gray-700 hover:border-gray-300 dark:hover:border-gray-600 cursor-pointer"
                }`}
              >
                <input
                  type="radio"
                  name="finalTimeSlot"
                  checked={effectiveSelectedId === slot.slotId}
                  onChange={() =>
                    !shouldAutoSelect && setSelectedFinalDateId(slot.slotId)
                  }
                  disabled={shouldAutoSelect}
                  className={`w-4 h-4 text-blue-600 border-gray-300 focus:ring-blue-500 ${
                    shouldAutoSelect ? "cursor-not-allowed" : ""
                  }`}
                />
                <div className="flex-1">
                  <div className="flex items-center gap-2">
                    <span className="font-medium text-gray-900 dark:text-white">
                      {formatDateDisplay(slot.date)}
                    </span>
                    <span className="text-gray-500 dark:text-gray-400">
                      {formatTimeDisplay(slot.startTime)} -{" "}
                      {formatTimeDisplay(slot.endTime)}
                    </span>
                    {slot.allCanAttend && (
                      <span className="text-xs px-2 py-0.5 bg-green-100 dark:bg-green-900/30 text-green-700 dark:text-green-400 rounded">
                        {t("confirmation.allCanAttend")}
                      </span>
                    )}
                  </div>
                  <p className="text-sm text-gray-500 dark:text-gray-400">
                    {slot.availableCount}/{slot.totalAttendees}{" "}
                    {t("confirmation.available")}
                  </p>
                </div>
              </label>
            ))}
          </div>

          {/* Confirm button */}
          {canManageKickoff && (
            <Button
              variant="success"
              onClick={() => onSelectFinalDate(effectiveSelectedId || undefined)}
              loading={isSelectingDate}
              disabled={!effectiveSelectedId || isSelectingDate}
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
