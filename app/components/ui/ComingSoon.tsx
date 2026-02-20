"use client";

import { useTranslations } from "next-intl";
import { WrenchScrewdriverIcon } from "@heroicons/react/24/outline";

interface ComingSoonProps {
  titleKey?: string;
  descriptionKey?: string;
  icon?: React.ComponentType<{ className?: string }>;
}

export default function ComingSoon({
  titleKey = "title",
  descriptionKey = "description",
  icon: Icon = WrenchScrewdriverIcon,
}: ComingSoonProps) {
  const t = useTranslations("comingSoon");

  return (
    <div className="flex flex-col items-center justify-center min-h-[400px] text-center px-4">
      <div className="w-20 h-20 bg-blue-100 dark:bg-blue-900/30 rounded-full flex items-center justify-center mb-6">
        <Icon className="w-10 h-10 text-blue-600 dark:text-blue-400" />
      </div>
      <h2 className="text-2xl font-bold text-gray-900 dark:text-white mb-3">
        {t(titleKey)}
      </h2>
      <p className="text-gray-500 dark:text-gray-400 max-w-md">
        {t(descriptionKey)}
      </p>
    </div>
  );
}
