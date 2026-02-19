"use client";

import {
  CogIcon,
  PlayIcon,
  LockClosedIcon,
  CheckCircleIcon,
} from "@heroicons/react/24/outline";

export type FilterOption = "all" | "setup" | "active" | "locked" | "completed";

interface FilterTab {
  key: FilterOption;
  label: string;
  icon?: typeof CogIcon;
}

interface FilterTabsProps {
  activeFilter: FilterOption;
  onChange: (filter: FilterOption) => void;
  tabs: FilterTab[];
}

export default function FilterTabs({
  activeFilter,
  onChange,
  tabs,
}: FilterTabsProps) {
  return (
    <div className="flex items-center gap-2 flex-wrap">
      {tabs.map((tab) => {
        const isActive = activeFilter === tab.key;
        const Icon = tab.icon;

        return (
          <button
            key={tab.key}
            onClick={() => onChange(tab.key)}
            className={`inline-flex items-center gap-2 px-4 py-2 rounded-lg text-sm font-medium transition-all ${
              isActive
                ? "bg-blue-600 text-white shadow-md"
                : "bg-white dark:bg-gray-800 text-gray-700 dark:text-gray-300 border border-gray-200 dark:border-gray-700 hover:bg-gray-50 dark:hover:bg-gray-700"
            }`}
          >
            {Icon && <Icon className="w-4 h-4" />}
            {tab.label}
          </button>
        );
      })}
    </div>
  );
}

export const defaultFilterTabs: FilterTab[] = [
  { key: "all", label: "All" },
  { key: "setup", label: "Setup", icon: CogIcon },
  { key: "active", label: "Active", icon: PlayIcon },
  { key: "locked", label: "Locked", icon: LockClosedIcon },
  { key: "completed", label: "Completed", icon: CheckCircleIcon },
];
