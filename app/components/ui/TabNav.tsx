"use client";

import { Link, usePathname } from "@/i18n/navigation";

export interface Tab {
  key: string;
  label: string;
  href: string;
  icon?: React.ComponentType<{ className?: string }>;
}

interface TabNavProps {
  tabs: Tab[];
  baseUrl: string;
}

export default function TabNav({ tabs, baseUrl }: TabNavProps) {
  const pathname = usePathname();

  return (
    <div className="bg-white dark:bg-gray-800 rounded-xl shadow-md dark:shadow-gray-900/30 px-4">
      <nav className="flex items-center gap-1 overflow-x-auto">
        {tabs.map((tab) => {
          const fullHref = `${baseUrl}${tab.href}`;
          const isActive = pathname === fullHref || (tab.href === "" && pathname === baseUrl);
          const Icon = tab.icon;

          return (
            <Link
              key={tab.key}
              href={fullHref}
              className={`inline-flex items-center gap-2 px-4 py-3 text-sm font-medium whitespace-nowrap border-b-2 transition-colors ${
                isActive
                  ? "text-blue-600 dark:text-blue-400 border-blue-600 dark:border-blue-400"
                  : "text-gray-600 dark:text-gray-400 border-transparent hover:text-gray-900 dark:hover:text-white hover:border-gray-300"
              }`}
            >
              {Icon && <Icon className="w-4 h-4" />}
              {tab.label}
            </Link>
          );
        })}
      </nav>
    </div>
  );
}
