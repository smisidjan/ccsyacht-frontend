"use client";

import { useTranslations } from "next-intl";
import {
  CogIcon,
  PlayIcon,
  LockClosedIcon,
  CheckCircleIcon,
} from "@heroicons/react/24/solid";

export type ProjectStatus = "setup" | "active" | "locked" | "completed";

interface StatusBadgeProps {
  status: ProjectStatus;
}

const statusConfig: Record<
  ProjectStatus,
  { icon: typeof CogIcon; bgColor: string; textColor: string }
> = {
  setup: {
    icon: CogIcon,
    bgColor: "bg-amber-100",
    textColor: "text-amber-700",
  },
  active: {
    icon: PlayIcon,
    bgColor: "bg-green-100",
    textColor: "text-green-700",
  },
  locked: {
    icon: LockClosedIcon,
    bgColor: "bg-gray-100",
    textColor: "text-gray-700",
  },
  completed: {
    icon: CheckCircleIcon,
    bgColor: "bg-blue-100",
    textColor: "text-blue-700",
  },
};

export default function StatusBadge({ status }: StatusBadgeProps) {
  const t = useTranslations("projects.filters");
  const config = statusConfig[status];
  const Icon = config.icon;

  return (
    <span
      className={`inline-flex items-center gap-1.5 px-3 py-1 rounded-full text-sm font-medium ${config.bgColor} ${config.textColor}`}
    >
      <Icon className="w-4 h-4" />
      {t(status)}
    </span>
  );
}
