"use client";

import { useTranslations } from "next-intl";
import { Link, usePathname } from "@/i18n/navigation";
import { useAuth } from "@/app/context/AuthContext";
import { useTenant } from "@/app/context/TenantContext";
import { useSidebarResize } from "@/lib/hooks/useSidebarResize";
import {
  FolderIcon,
  UsersIcon,
  BuildingOffice2Icon,
  UserIcon,
  Cog8ToothIcon,
  ArrowLeftStartOnRectangleIcon,
  ChevronLeftIcon,
  ChevronRightIcon,
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

  const {
    isCollapsed,
    currentWidth,
    isResizing,
    toggleCollapse,
    handleMouseDown,
  } = useSidebarResize();

  const navItems = [
    ...baseNavItems,
    ...(isCcsYachtTenant
      ? [{ href: "/dashboard/system", key: "system", icon: Cog8ToothIcon }]
      : []),
  ];

  return (
    <aside
      className={`hidden md:flex flex-col h-full bg-white dark:bg-gray-900 shadow-lg dark:shadow-gray-800/30 relative ${
        isResizing ? "" : "transition-[width] duration-200 ease-in-out"
      }`}
      style={{ width: currentWidth }}
    >
      {/* Toggle Button */}
      <button
        onClick={toggleCollapse}
        className="absolute -right-3 top-6 z-10 w-6 h-6 bg-white dark:bg-gray-800 border border-gray-200 dark:border-gray-700 rounded-full shadow-md flex items-center justify-center hover:bg-gray-50 dark:hover:bg-gray-700 transition-colors"
        title={isCollapsed ? t("expandSidebar") : t("collapseSidebar")}
      >
        {isCollapsed ? (
          <ChevronRightIcon className="w-3 h-3 text-gray-600 dark:text-gray-400" />
        ) : (
          <ChevronLeftIcon className="w-3 h-3 text-gray-600 dark:text-gray-400" />
        )}
      </button>

      {/* Navigation */}
      <nav className="flex flex-col h-full p-3">
        <ul className="flex-1 space-y-1">
          {navItems.map((item) => {
            const isActive = pathname.startsWith(item.href);
            const Icon = item.icon;
            return (
              <li key={item.key}>
                <Link
                  href={item.href}
                  className={`flex items-center gap-3 px-3 py-2.5 rounded-lg transition-all ${
                    isActive
                      ? "bg-blue-600 text-white shadow-md"
                      : "text-gray-700 dark:text-gray-300 hover:bg-gray-100 dark:hover:bg-gray-800"
                  } ${isCollapsed ? "justify-center" : ""}`}
                  title={isCollapsed ? t(item.key) : undefined}
                >
                  <Icon className="w-5 h-5 flex-shrink-0" />
                  {!isCollapsed && (
                    <span className="truncate whitespace-nowrap overflow-hidden">
                      {t(item.key)}
                    </span>
                  )}
                </Link>
              </li>
            );
          })}
        </ul>

        {/* Logout Button */}
        <button
          onClick={logout}
          className={`flex items-center gap-3 w-full px-3 py-2.5 text-left text-gray-700 dark:text-gray-300 hover:bg-gray-200 dark:hover:bg-gray-800 rounded-lg transition-colors ${
            isCollapsed ? "justify-center" : ""
          }`}
          title={isCollapsed ? t("logout") : undefined}
        >
          <ArrowLeftStartOnRectangleIcon className="w-5 h-5 flex-shrink-0" />
          {!isCollapsed && (
            <span className="truncate whitespace-nowrap overflow-hidden">
              {t("logout")}
            </span>
          )}
        </button>
      </nav>

      {/* Resize Handle */}
      <div
        onMouseDown={handleMouseDown}
        className="absolute right-0 top-0 bottom-0 w-1 cursor-col-resize hover:bg-blue-500 active:bg-blue-600 transition-colors"
      >
        {/* Larger hitbox for easier dragging */}
        <div className="absolute right-0 top-0 bottom-0 w-3 -translate-x-1" />
      </div>
    </aside>
  );
}

