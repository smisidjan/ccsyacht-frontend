"use client";

import { useTranslations } from "next-intl";
import {
  CalendarDaysIcon,
  PlusIcon,
  PaperAirplaneIcon,
} from "@heroicons/react/24/outline";
import Button from "@/app/components/ui/Button";
import Alert from "@/app/components/ui/Alert";
import { DateCard, TimeSlotChip } from "../shared";
import { formatDateDisplay, getTodayDateString } from "../../utils";
import type { DatesPhaseProps, LocalTimeSlot } from "./types";

export default function DatesPhase({
  task,
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
  onRemoveProposedDate,
  onSendInvitations,
  canManageKickoff,
  hasValidDateTimes,
}: DatesPhaseProps) {
  const t = useTranslations("projectDetail.setupTasks.kickoffScheduling");

  const existingDates = task?.proposedDates || [];
  const totalTimeSlots =
    localDatesWithTimes.reduce((acc, d) => acc + d.timeSlots.length, 0) +
    existingDates.length;

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

  // Handle adding time slot to a date
  const handleAddTimeToDate = (date: string) => {
    const timeInput = newTimeInputs[date];
    if (timeInput?.start && timeInput?.end) {
      onAddTimeSlotToDate(date, timeInput.start, timeInput.end);
      setNewTimeInputs((prev) => ({ ...prev, [date]: { start: "", end: "" } }));
    }
  };

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

      {/* Existing server dates (saved) */}
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
                        onClick={() => onRemoveProposedDate(proposedDate.id)}
                        className="p-1.5 text-gray-400 hover:text-red-600 dark:hover:text-red-400 hover:bg-red-50 dark:hover:bg-red-900/20 rounded-lg transition-all"
                      >
                        <svg className="w-4 h-4" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                          <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M6 18L18 6M6 6l12 12" />
                        </svg>
                      </button>
                    )}
                  </div>
                </div>
                {/* Time Slots */}
                {proposedDate.timeSlots.length > 0 && (
                  <div className="p-4">
                    <div className="flex flex-wrap gap-2">
                      {proposedDate.timeSlots.map((slot, slotIdx) => (
                        <TimeSlotChip
                          key={slot.id || `existing-slot-${slotIdx}`}
                          startTime={slot.startTime}
                          endTime={slot.endTime}
                          variant="green"
                        />
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
            {localDatesWithTimes.map((dateWithTimes) => (
              <DateCard
                key={dateWithTimes.date}
                date={dateWithTimes.date}
                timeSlots={dateWithTimes.timeSlots}
                isExpanded={expandedDates.has(dateWithTimes.date)}
                onToggleExpand={() => toggleDateExpansion(dateWithTimes.date)}
                onRemove={canManageKickoff ? () => onRemoveLocalDate(dateWithTimes.date) : undefined}
                onRemoveTimeSlot={canManageKickoff ? (slot: LocalTimeSlot) => onRemoveLocalTimeSlot(dateWithTimes.date, slot) : undefined}
                onAddTimeSlot={canManageKickoff ? (start: string, end: string) => handleAddTimeToDate(dateWithTimes.date) : undefined}
                newTimeStart={newTimeInputs[dateWithTimes.date]?.start || ""}
                newTimeEnd={newTimeInputs[dateWithTimes.date]?.end || ""}
                onNewTimeStartChange={(value) => handleTimeInputChange(dateWithTimes.date, "start", value)}
                onNewTimeEndChange={(value) => handleTimeInputChange(dateWithTimes.date, "end", value)}
                readonly={!canManageKickoff}
              />
            ))}
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
              min={getTodayDateString()}
              className="flex-1 px-3 py-2.5 border border-gray-300 dark:border-gray-600 rounded-lg bg-white dark:bg-gray-800 text-gray-900 dark:text-white focus:ring-2 focus:ring-blue-500 focus:border-transparent"
            />
            <Button variant="secondary" onClick={onAddDate} disabled={!newDateInput}>
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
      {canManageKickoff &&
        (hasValidDateTimes || existingDates.length > 0) &&
        task?.assignees &&
        task.assignees.length > 0 && (
          <div className="pt-4 border-t border-gray-200 dark:border-gray-700">
            <Button
              variant="primary"
              onClick={onSendInvitations}
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
}
