"use client";

import { useTranslations } from "next-intl";
import { PlusIcon, UserCircleIcon } from "@heroicons/react/24/outline";

interface LogEntry {
  id: string;
  title: string;
  description: string;
  author: string;
  createdAt: string;
  area: string;
}

interface LogbookTabProps {
  entries?: LogEntry[];
}

// Mock logbook entries - replace with props from API
const defaultEntries: LogEntry[] = [
  {
    id: "1",
    title: "Hull inspection completed",
    description: "Completed full inspection of the hull structure. All welds passed quality control.",
    author: "John Smith",
    createdAt: "2024-01-20 14:30",
    area: "Hull & Structure",
  },
  {
    id: "2",
    title: "Engine installation started",
    description: "Began installation of main propulsion engines. Expected completion in 3 days.",
    author: "Mike Johnson",
    createdAt: "2024-01-19 09:15",
    area: "Engine Room",
  },
  {
    id: "3",
    title: "Material delivery received",
    description: "Received shipment of interior finishing materials including wood panels and upholstery.",
    author: "Sarah Davis",
    createdAt: "2024-01-18 11:00",
    area: "Interior",
  },
  {
    id: "4",
    title: "Project kickoff meeting",
    description: "Initial project kickoff meeting with all stakeholders. Timeline and milestones confirmed.",
    author: "Project Manager",
    createdAt: "2024-01-15 10:00",
    area: "General",
  },
];

export default function LogbookTab({ entries = defaultEntries }: LogbookTabProps) {
  const t = useTranslations("projectDetail.logbook");

  return (
    <div className="space-y-6">
      {/* Header */}
      <div className="flex items-center justify-between">
        <div>
          <h2 className="text-xl font-semibold text-gray-900 dark:text-white">
            {t("title")}
          </h2>
          <p className="text-sm text-gray-600 dark:text-gray-400 mt-1">
            {t("subtitle", { count: entries.length })}
          </p>
        </div>
        <button className="inline-flex items-center gap-2 px-4 py-2 bg-blue-600 text-white text-sm font-medium rounded-lg hover:bg-blue-700 transition-all shadow-md hover:shadow-lg">
          <PlusIcon className="w-4 h-4" />
          {t("addEntry")}
        </button>
      </div>

      {/* Log Entries Timeline */}
      <div className="space-y-4">
        {entries.map((entry) => (
          <div
            key={entry.id}
            className="bg-white dark:bg-gray-800 rounded-xl shadow-lg dark:shadow-gray-900/30 border border-gray-100 dark:border-gray-700 p-6"
          >
            <div className="flex items-start gap-4">
              <div className="flex-shrink-0">
                <UserCircleIcon className="w-10 h-10 text-gray-400" />
              </div>
              <div className="flex-1 min-w-0">
                <div className="flex items-center justify-between mb-2">
                  <h3 className="text-base font-semibold text-gray-900 dark:text-white">
                    {entry.title}
                  </h3>
                  <span className="inline-flex items-center px-2.5 py-0.5 rounded-full text-xs font-medium bg-blue-100 text-blue-700 dark:bg-blue-900/30 dark:text-blue-400">
                    {entry.area}
                  </span>
                </div>
                <p className="text-sm text-gray-600 dark:text-gray-400 mb-3">
                  {entry.description}
                </p>
                <div className="flex items-center gap-2 text-xs text-gray-500 dark:text-gray-500">
                  <span className="font-medium">{entry.author}</span>
                  <span>•</span>
                  <span>{entry.createdAt}</span>
                </div>
              </div>
            </div>
          </div>
        ))}
      </div>

      {entries.length === 0 && (
        <div className="text-center py-12 text-gray-500 dark:text-gray-400 bg-white dark:bg-gray-800 rounded-xl shadow-lg">
          {t("noEntries")}
        </div>
      )}
    </div>
  );
}
