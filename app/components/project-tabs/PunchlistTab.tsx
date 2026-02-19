"use client";

import { useTranslations } from "next-intl";
import { PlusIcon, ExclamationTriangleIcon, CheckCircleIcon } from "@heroicons/react/24/outline";

interface PunchlistItem {
  id: string;
  title: string;
  area: string;
  priority: "high" | "medium" | "low";
  status: "open" | "resolved";
  createdAt: string;
  assignedTo: string;
}

interface PunchlistTabProps {
  items?: PunchlistItem[];
}

// Mock punchlist data - replace with props from API
const defaultItems: PunchlistItem[] = [
  {
    id: "1",
    title: "Paint touch-up required on starboard hull",
    area: "Hull & Structure",
    priority: "high",
    status: "open",
    createdAt: "2024-01-20",
    assignedTo: "John Smith",
  },
  {
    id: "2",
    title: "Missing ventilation cover in engine room",
    area: "Engine Room",
    priority: "medium",
    status: "open",
    createdAt: "2024-01-19",
    assignedTo: "Mike Johnson",
  },
  {
    id: "3",
    title: "Electrical outlet misaligned in master cabin",
    area: "Interior",
    priority: "low",
    status: "resolved",
    createdAt: "2024-01-15",
    assignedTo: "Sarah Davis",
  },
];

export default function PunchlistTab({ items = defaultItems }: PunchlistTabProps) {
  const t = useTranslations("projectDetail.punchlist");

  const openCount = items.filter((item) => item.status === "open").length;
  const resolvedCount = items.filter((item) => item.status === "resolved").length;

  const getPriorityColor = (priority: string) => {
    switch (priority) {
      case "high":
        return "bg-red-100 text-red-700 dark:bg-red-900/30 dark:text-red-400";
      case "medium":
        return "bg-amber-100 text-amber-700 dark:bg-amber-900/30 dark:text-amber-400";
      case "low":
        return "bg-blue-100 text-blue-700 dark:bg-blue-900/30 dark:text-blue-400";
      default:
        return "bg-gray-100 text-gray-700 dark:bg-gray-700 dark:text-gray-400";
    }
  };

  return (
    <div className="space-y-6">
      {/* Header */}
      <div className="flex items-center justify-between">
        <div>
          <h2 className="text-xl font-semibold text-gray-900 dark:text-white">
            {t("title")}
          </h2>
          <p className="text-sm text-gray-600 dark:text-gray-400 mt-1">
            {t("subtitle", { open: openCount, resolved: resolvedCount })}
          </p>
        </div>
        <button className="inline-flex items-center gap-2 px-4 py-2 bg-blue-600 text-white text-sm font-medium rounded-lg hover:bg-blue-700 transition-all shadow-md hover:shadow-lg">
          <PlusIcon className="w-4 h-4" />
          {t("addItem")}
        </button>
      </div>

      {/* Stats */}
      <div className="grid grid-cols-2 gap-4">
        <div className="bg-white dark:bg-gray-800 rounded-xl shadow-lg dark:shadow-gray-900/30 border border-gray-100 dark:border-gray-700 p-4">
          <div className="flex items-center gap-3">
            <ExclamationTriangleIcon className="w-8 h-8 text-amber-500" />
            <div>
              <p className="text-2xl font-bold text-gray-900 dark:text-white">{openCount}</p>
              <p className="text-sm text-gray-600 dark:text-gray-400">{t("openItems")}</p>
            </div>
          </div>
        </div>
        <div className="bg-white dark:bg-gray-800 rounded-xl shadow-lg dark:shadow-gray-900/30 border border-gray-100 dark:border-gray-700 p-4">
          <div className="flex items-center gap-3">
            <CheckCircleIcon className="w-8 h-8 text-green-500" />
            <div>
              <p className="text-2xl font-bold text-gray-900 dark:text-white">{resolvedCount}</p>
              <p className="text-sm text-gray-600 dark:text-gray-400">{t("resolvedItems")}</p>
            </div>
          </div>
        </div>
      </div>

      {/* Punchlist Items */}
      <div className="bg-white dark:bg-gray-800 rounded-xl shadow-lg dark:shadow-gray-900/30 border border-gray-100 dark:border-gray-700 overflow-hidden">
        <div className="divide-y divide-gray-100 dark:divide-gray-700">
          {items.map((item) => (
            <div key={item.id} className="p-4 hover:bg-gray-50 dark:hover:bg-gray-900/30">
              <div className="flex items-start justify-between">
                <div className="flex-1">
                  <div className="flex items-center gap-3 mb-2">
                    <h3 className="text-sm font-medium text-gray-900 dark:text-white">
                      {item.title}
                    </h3>
                    <span className={`inline-flex items-center px-2 py-0.5 rounded text-xs font-medium ${getPriorityColor(item.priority)}`}>
                      {t(`priority.${item.priority}`)}
                    </span>
                  </div>
                  <div className="flex items-center gap-4 text-sm text-gray-600 dark:text-gray-400">
                    <span>{item.area}</span>
                    <span>•</span>
                    <span>{t("assignedTo")}: {item.assignedTo}</span>
                    <span>•</span>
                    <span>{item.createdAt}</span>
                  </div>
                </div>
                <span
                  className={`inline-flex items-center px-2.5 py-0.5 rounded-full text-xs font-medium ${
                    item.status === "open"
                      ? "bg-amber-100 text-amber-700 dark:bg-amber-900/30 dark:text-amber-400"
                      : "bg-green-100 text-green-700 dark:bg-green-900/30 dark:text-green-400"
                  }`}
                >
                  {t(`status.${item.status}`)}
                </span>
              </div>
            </div>
          ))}
        </div>
      </div>
    </div>
  );
}
