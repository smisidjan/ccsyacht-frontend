"use client";

import { useTranslations } from "next-intl";
import { Link, usePathname } from "@/i18n/navigation";
import { useTenant } from "@/app/context/TenantContext";
import {
  FolderIcon,
  UsersIcon,
  BuildingOffice2Icon,
  UserIcon,
  Cog8ToothIcon,
} from "@heroicons/react/24/outline";
import {
  FolderIcon as FolderIconSolid,
  UsersIcon as UsersIconSolid,
  BuildingOffice2Icon as BuildingOffice2IconSolid,
  UserIcon as UserIconSolid,
  Cog8ToothIcon as Cog8ToothIconSolid,
} from "@heroicons/react/24/solid";

const baseNavItems = [
  {
    href: "/dashboard/projects",
    key: "projects",
    icon: FolderIcon,
    iconActive: FolderIconSolid,
  },
  {
    href: "/dashboard/users",
    key: "users",
    icon: UsersIcon,
    iconActive: UsersIconSolid,
  },
  {
    href: "/dashboard/shipyards",
    key: "shipyards",
    icon: BuildingOffice2Icon,
    iconActive: BuildingOffice2IconSolid,
  },
  {
    href: "/dashboard/profile",
    key: "profile",
    icon: UserIcon,
    iconActive: UserIconSolid,
  },
];

interface BottomNavProps {
  className?: string;
}

export default function BottomNav({ className = "" }: BottomNavProps) {
  const t = useTranslations("dashboard");
  const pathname = usePathname();

  const navItems = [
    ...baseNavItems,
    ...([
          {
            href: "/dashboard/system",
            key: "system",
            icon: Cog8ToothIcon,
            iconActive: Cog8ToothIconSolid,
          },
        ]),
  ];

  return (
    <nav
      className={`fixed bottom-0 left-0 right-0 z-40 bg-white dark:bg-gray-900 border-t border-gray-200 dark:border-gray-800 pb-safe ${className}`}
    >
      <div className="flex justify-around items-center h-16">
        {navItems.map((item) => {
          const isActive = pathname.startsWith(item.href);
          const Icon = isActive ? item.iconActive : item.icon;

          return (
            <Link
              key={item.key}
              href={item.href}
              className={`flex flex-col items-center justify-center flex-1 h-full py-2 transition-colors ${
                isActive
                  ? "text-blue-600 dark:text-blue-400"
                  : "text-gray-500 dark:text-gray-400"
              }`}
            >
              <Icon className="w-6 h-6" />
              <span className="text-xs mt-1 font-medium">{t(item.key)}</span>
            </Link>
          );
        })}
      </div>
    </nav>
  );
}
