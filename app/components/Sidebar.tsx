"use client";

import { useTranslations } from "next-intl";
import { Link, usePathname } from "@/i18n/navigation";
import { useAuth } from "@/app/context/AuthContext";
import { useTenant } from "@/app/context/TenantContext";
import {
  FolderIcon,
  UsersIcon,
  BuildingOffice2Icon,
  UserIcon,
  Cog8ToothIcon,
  ArrowLeftStartOnRectangleIcon,
} from "@heroicons/react/24/outline";

const baseNavItems = [
  { href: "/dashboard/projects", key: "projects", icon: FolderIcon },
  { href: "/dashboard/users", key: "users", icon: UsersIcon },
  { href: "/dashboard/shipyards", key: "shipyards", icon: BuildingOffice2Icon },
  { href: "/dashboard/profile", key: "profile", icon: UserIcon },
];

export default function Sidebar() {
  const t = useTranslations("dashboard");
  const pathname = usePathname();
  const { logout } = useAuth();
  const { isCcsYachtTenant } = useTenant();

  const navItems = [
    ...baseNavItems,
    ...(isCcsYachtTenant
      ? [{ href: "/dashboard/system", key: "system", icon: Cog8ToothIcon }]
      : []),
  ];

  return (
    <aside className="w-64 min-h-[calc(100vh-4rem)] bg-white dark:bg-gray-900 shadow-lg dark:shadow-gray-800/30">
      <nav className="flex flex-col h-full p-4">
        <ul className="flex-1 space-y-2">
          {navItems.map((item) => {
            const isActive = pathname.startsWith(item.href);
            const Icon = item.icon;
            return (
              <li key={item.key}>
                <Link
                  href={item.href}
                  className={`flex items-center gap-3 px-4 py-2 rounded-lg transition-all ${
                    isActive
                      ? "bg-blue-600 text-white shadow-md"
                      : "text-gray-700 dark:text-gray-300 hover:bg-gray-100 dark:hover:bg-gray-800"
                  }`}
                >
                  <Icon className="w-5 h-5" />
                  {t(item.key)}
                </Link>
              </li>
            );
          })}
        </ul>
        <button
          onClick={logout}
          className="flex items-center gap-3 w-full px-4 py-2 text-left text-gray-700 dark:text-gray-300 hover:bg-gray-200 dark:hover:bg-gray-800 rounded-lg transition-colors"
        >
          <ArrowLeftStartOnRectangleIcon className="w-5 h-5" />
          {t("logout")}
        </button>
      </nav>
    </aside>
  );
}
