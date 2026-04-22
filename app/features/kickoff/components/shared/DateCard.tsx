"use client";

import { CalendarDaysIcon, XMarkIcon } from "@heroicons/react/24/outline";
import { useTranslations } from "next-intl";
import { formatDateDisplay } from "../../utils";
import TimeSlotChip from "./TimeSlotChip";
import TimeSlotInput from "./TimeSlotInput";
import type { LocalTimeSlot } from "../KickoffSchedulingModal/types";

interface DateCardProps {
  date: string;
  timeSlots: LocalTimeSlot[];
  isExpanded: boolean;
  onToggleExpand: () => void;
  onRemove?: () => void;
  onRemoveTimeSlot?: (slot: LocalTimeSlot) => void;
  onAddTimeSlot?: (startTime: string, endTime: string) => void;
  variant?: "default" | "saved" | "purple";
  showTimesRequired?: boolean;
  readonly?: boolean;
  newTimeStart?: string;
  newTimeEnd?: string;
  onNewTimeStartChange?: (time: string) => void;
  onNewTimeEndChange?: (time: string) => void;
}

const variantStyles = {
  default: {
    container: "border-gray-200 dark:border-gray-700 bg-white dark:bg-gray-800 shadow-sm",
    header: "bg-gray-50 dark:bg-gray-800/50 hover:bg-gray-100 dark:hover:bg-gray-700/50",
    icon: "bg-blue-100 dark:bg-blue-900/30",
    iconColor: "text-blue-600 dark:text-blue-400",
    chipVariant: "blue" as const,
  },
  saved: {
    container: "border-green-200 dark:border-green-800 bg-green-50 dark:bg-green-900/10",
    header: "bg-green-100/50 dark:bg-green-900/20",
    icon: "bg-green-200 dark:bg-green-800/50",
    iconColor: "text-green-700 dark:text-green-400",
    chipVariant: "green" as const,
  },
  purple: {
    container: "border-purple-200 dark:border-purple-800 bg-purple-50/50 dark:bg-purple-900/10",
    header: "bg-purple-100/50 dark:bg-purple-900/20 hover:bg-purple-100 dark:hover:bg-purple-900/30",
    icon: "bg-purple-200 dark:bg-purple-800/50",
    iconColor: "text-purple-700 dark:text-purple-400",
    chipVariant: "purple" as const,
  },
};

export default function DateCard({
  date,
  timeSlots,
  isExpanded,
  onToggleExpand,
  onRemove,
  onRemoveTimeSlot,
  onAddTimeSlot,
  variant = "default",
  showTimesRequired = true,
  readonly = false,
  newTimeStart = "",
  newTimeEnd = "",
  onNewTimeStartChange,
  onNewTimeEndChange,
}: DateCardProps) {
  const t = useTranslations("projectDetail.setupTasks.kickoffScheduling");
  const styles = variantStyles[variant];
  const showAddTimes = !readonly && onAddTimeSlot && onNewTimeStartChange && onNewTimeEndChange;

  const handleAddTimeSlot = () => {
    if (newTimeStart && newTimeEnd && onAddTimeSlot) {
      onAddTimeSlot(newTimeStart, newTimeEnd);
    }
  };

  return (
    <div className={`border rounded-xl overflow-hidden ${styles.container}`}>
      {/* Date Header */}
      <div
        className={`flex items-center justify-between p-4 cursor-pointer transition-colors ${styles.header}`}
        onClick={onToggleExpand}
      >
        <div className="flex items-center gap-3">
          <div className={`w-10 h-10 rounded-lg flex items-center justify-center ${styles.icon}`}>
            <CalendarDaysIcon className={`w-5 h-5 ${styles.iconColor}`} />
          </div>
          <div>
            <p className="text-sm font-semibold text-gray-900 dark:text-white">
              {formatDateDisplay(date)}
            </p>
            <p className="text-xs text-gray-500 dark:text-gray-400">
              {timeSlots.length === 0
                ? t("dates.noTimesYet")
                : t("dates.timeSlotCount", { count: timeSlots.length })}
            </p>
          </div>
        </div>
        <div className="flex items-center gap-2">
          {variant === "saved" && (
            <span className="text-xs px-2 py-1 bg-green-200 dark:bg-green-800/50 text-green-700 dark:text-green-400 rounded-full">
              {t("dates.saved")}
            </span>
          )}
          {showTimesRequired && timeSlots.length === 0 && variant !== "saved" && (
            <span className="text-xs px-2 py-1 bg-amber-100 dark:bg-amber-900/30 text-amber-700 dark:text-amber-400 rounded-full">
              {t("dates.addTimesRequired")}
            </span>
          )}
          {onRemove && !readonly && (
            <button
              onClick={(e) => {
                e.stopPropagation();
                onRemove();
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
          {timeSlots.length > 0 && (
            <div className="flex flex-wrap gap-2">
              {timeSlots.map((slot, idx) => (
                <TimeSlotChip
                  key={`${slot.startTime}-${slot.endTime}-${idx}`}
                  startTime={slot.startTime}
                  endTime={slot.endTime}
                  variant={styles.chipVariant}
                  onRemove={!readonly && onRemoveTimeSlot ? () => onRemoveTimeSlot(slot) : undefined}
                />
              ))}
            </div>
          )}

          {/* Add Time Slot Input */}
          {showAddTimes && (
            <TimeSlotInput
              startTime={newTimeStart}
              endTime={newTimeEnd}
              onStartTimeChange={onNewTimeStartChange}
              onEndTimeChange={onNewTimeEndChange}
              onAdd={handleAddTimeSlot}
              variant={variant === "purple" ? "purple" : "default"}
            />
          )}
        </div>
      )}
    </div>
  );
}
