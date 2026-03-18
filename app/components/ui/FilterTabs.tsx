"use client";

import {
  CogIcon,
  PlayIcon,
  ArchiveBoxIcon,
  CheckCircleIcon,
} from "@heroicons/react/24/outline";

export type FilterOption = "all" | "setup" | "active" | "archived" | "completed";

interface FilterTab<T extends string = string> {
  key: T;
  label: string;
  icon?: typeof CogIcon;
}

interface FilterTabsProps<T extends string = string> {
  activeFilter: T;
  onChange: (filter: T) => void;
  tabs: FilterTab<T>[];
}

export default function FilterTabs<T extends string = string>({
  activeFilter,
  onChange,
  tabs,
}: FilterTabsProps<T>) {
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

export const defaultFilterTabs: FilterTab<FilterOption>[] = [
  { key: "all", label: "All" },
  { key: "setup", label: "Setup", icon: CogIcon },
  { key: "active", label: "Active", icon: PlayIcon },
  { key: "archived", label: "Archived", icon: ArchiveBoxIcon },
  { key: "completed", label: "Completed", icon: CheckCircleIcon },
];
