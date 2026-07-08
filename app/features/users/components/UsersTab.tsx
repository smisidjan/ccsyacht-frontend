"use client";

import { useState } from "react";
import { useTranslations } from "next-intl";
import {
  PencilIcon,
  ShieldCheckIcon,
  UsersIcon,
  BriefcaseIcon,
  GlobeAltIcon,
} from "@heroicons/react/24/outline";
import type { User, UserRole } from "@/lib/api/types";
import { getRoleBadgeColor, getStatusBadgeColor } from "@/lib/utils/badges";
import { usePermission } from "@/lib/hooks/usePermission";
import { PERMISSIONS } from "@/lib/constants/permissions";
import Table from "@/app/components/ui/Table";
import LoadingSkeleton from "@/app/components/ui/LoadingSkeleton";
import SearchInput from "@/app/components/ui/SearchInput";

interface UsersTabProps {
  users: User[];
  loading?: boolean;
  currentUserRole?: UserRole;
  onEditUser?: (user: User) => void;
}

type UserFilter = "all" | "employee" | "guest";

export default function UsersTab({
  users,
  loading = false,
  currentUserRole = "user",
  onEditUser,
}: UsersTabProps) {
  const t = useTranslations("usersPage.users");
  const [filter, setFilter] = useState<UserFilter>("all");
  const [search, setSearch] = useState("");
  const { hasAnyPermission } = usePermission();

  const canManageUsers = hasAnyPermission([
    PERMISSIONS.EDIT_USERS,
    PERMISSIONS.DELETE_USERS,
  ]);

  if (loading) {
    return <LoadingSkeleton type="table" rows={3} />;
  }

  // Filter users based on selected filter, then by search query
  const query = search.trim().toLowerCase();
  const filteredUsers = users.filter((user) => {
    if (filter === "employee" && user.employmentType === "guest") return false;
    if (filter === "guest" && user.employmentType !== "guest") return false;
    if (query) {
      return (
        user.name.toLowerCase().includes(query) ||
        user.email.toLowerCase().includes(query)
      );
    }
    return true;
  });

  // Calculate counts for filter buttons
  const employeeCount = users.filter((u) => u.employmentType !== "guest").length;
  const guestCount = users.filter((u) => u.employmentType === "guest").length;

  const filterOptions: { key: UserFilter; label: string; count: number; icon: typeof UsersIcon }[] = [
    { key: "all", label: t("allUsers"), count: users.length, icon: UsersIcon },
    { key: "employee", label: t("employees"), count: employeeCount, icon: BriefcaseIcon },
    { key: "guest", label: t("guests"), count: guestCount, icon: GlobeAltIcon },
  ];

  // Card header reflects the active filter
  const headerTitle =
    filter === "employee" ? t("employeesTitle") : filter === "guest" ? t("guestsTitle") : t("title");
  const headerSubtitle =
    filter === "employee"
      ? t("employeesSubtitle", { count: employeeCount })
      : filter === "guest"
      ? t("guestsSubtitle", { count: guestCount })
      : t("subtitle", { count: users.length });

  // Get empty message based on filter / search
  const getEmptyMessage = () => {
    if (query) return t("noSearchResults", { query: search.trim() });
    switch (filter) {
      case "employee":
        return t("noEmployees");
      case "guest":
        return t("noGuests");
      default:
        return t("noUsers");
    }
  };

  // Single columns definition with conditional organization column
  const columns = [
    {
      key: "user",
      header: t("user"),
      cell: (user: User) => {
        const isGuest = user.employmentType === "guest";
        const avatarBgColor = user.active
          ? isGuest
            ? "bg-purple-100 dark:bg-purple-900/30"
            : "bg-blue-100 dark:bg-blue-900/30"
          : "bg-gray-200 dark:bg-gray-700";
        const avatarTextColor = user.active
          ? isGuest
            ? "text-purple-600 dark:text-purple-400"
            : "text-blue-600 dark:text-blue-400"
          : "text-gray-400";
        const avatarRingColor = user.active
          ? isGuest
            ? "ring-purple-200 dark:ring-purple-800/40"
            : "ring-blue-200 dark:ring-blue-800/40"
          : "ring-gray-200 dark:ring-gray-700";

        return (
          <div className="flex items-center gap-3">
            <div
              className={`w-10 h-10 rounded-full flex items-center justify-center flex-shrink-0 ring-2 ${avatarBgColor} ${avatarRingColor}`}
            >
              <span className={`text-sm font-semibold ${avatarTextColor}`}>
                {user.name.charAt(0).toUpperCase()}
              </span>
            </div>
            <span className="text-sm font-medium text-gray-900 dark:text-white whitespace-nowrap">
              {user.name}
            </span>
          </div>
        );
      },
    },
    {
      key: "email",
      header: t("email"),
      cell: (user: User) => (
        <span className="text-sm text-gray-600 dark:text-gray-400 whitespace-nowrap">
          {user.email}
        </span>
      ),
    },
    // Organization column - only show if filter is "guest" or "all"
    ...(filter === "guest" || filter === "all"
      ? [
          {
            key: "organization",
            header: t("organization"),
            cell: (user: User) => {
              // For guests, show home organization; for employees, show tenant organization
              const organizationName = user.employmentType === "guest"
                ? user.homeOrganization?.name
                : user.memberOf?.name;

              return (
                <span className="text-sm text-gray-600 dark:text-gray-400 whitespace-nowrap">
                  {organizationName || "-"}
                </span>
              );
            },
          },
        ]
      : []),
    {
      key: "roles",
      header: t("roles"),
      cell: (user: User) => (
        <div className="flex flex-wrap gap-1">
          {user.roles.map((role) => (
            <span
              key={role}
              className={`inline-flex items-center gap-1.5 px-2.5 py-0.5 rounded-full text-xs font-medium whitespace-nowrap ${getRoleBadgeColor(role)}`}
            >
              {role === "admin" && <ShieldCheckIcon className="w-3 h-3" />}
              {role.split(' ').map(word => word.charAt(0).toUpperCase() + word.slice(1)).join(' ')}
            </span>
          ))}
        </div>
      ),
    },
    {
      key: "status",
      header: t("status"),
      cell: (user: User) => (
        <span className={`inline-flex items-center gap-1.5 px-2.5 py-0.5 rounded-full text-xs font-medium whitespace-nowrap ${getStatusBadgeColor(user.active ? "active" : "inactive")}`}>
          <span className={`w-1.5 h-1.5 rounded-full ${user.active ? "bg-green-500" : "bg-red-500"}`} />
          {user.active ? t("active") : t("inactive")}
        </span>
      ),
    },
    {
      key: "createdAt",
      header: t("createdAt"),
      cell: (user: User) => (
        <span className="text-sm text-gray-600 dark:text-gray-400 whitespace-nowrap">
          {user.dateCreated ? new Date(user.dateCreated).toLocaleDateString() : "-"}
        </span>
      ),
    },
    ...(canManageUsers
      ? [
          {
            key: "actions",
            header: t("actions"),
            headerClassName: "text-right",
            className: "text-right",
            cell: (user: User) => (
              <div className="flex items-center justify-end">
                <button
                  onClick={() => onEditUser?.(user)}
                  className="p-2 text-gray-400 hover:text-blue-600 dark:hover:text-blue-400 hover:bg-blue-50 dark:hover:bg-blue-900/20 rounded-lg transition-colors"
                  title={t("edit")}
                >
                  <PencilIcon className="w-5 h-5" />
                </button>
              </div>
            ),
          },
        ]
      : []),
  ];

  return (
    <div className="bg-white dark:bg-gray-800 rounded-xl shadow-lg dark:shadow-gray-900/30 border border-gray-100 dark:border-gray-700 overflow-hidden">
      {/* Header */}
      <div className="p-4 border-b border-gray-200 dark:border-gray-700">
        <h2 className="text-xl font-semibold text-gray-900 dark:text-white">
          {headerTitle}
        </h2>
        <p className="text-sm text-gray-600 dark:text-gray-400 mt-1">
          {headerSubtitle}
        </p>
      </div>

      {/* Toolbar: filters + search */}
      <div className="flex flex-col gap-4 p-4 border-b border-gray-200 dark:border-gray-700 sm:flex-row sm:items-center sm:justify-between">
        <div className="flex flex-wrap gap-2">
          {filterOptions.map(({ key, label, count, icon: Icon }) => {
            const isActive = filter === key;
            return (
              <button
                key={key}
                onClick={() => setFilter(key)}
                className={`inline-flex items-center gap-2 px-3.5 py-2 rounded-lg text-sm font-medium border transition-all ${
                  isActive
                    ? "bg-blue-600 border-blue-600 text-white shadow-sm"
                    : "bg-white dark:bg-gray-800 border-gray-200 dark:border-gray-600 text-gray-600 dark:text-gray-300 hover:border-gray-300 dark:hover:border-gray-500 hover:bg-gray-50 dark:hover:bg-gray-700/50"
                }`}
              >
                <Icon className="w-4 h-4" />
                {label}
                <span
                  className={`inline-flex items-center justify-center min-w-[1.25rem] h-5 px-1 rounded-full text-xs font-semibold ${
                    isActive
                      ? "bg-white/20 text-white"
                      : "bg-gray-100 dark:bg-gray-700 text-gray-500 dark:text-gray-400"
                  }`}
                >
                  {count}
                </span>
              </button>
            );
          })}
        </div>

        <div className="w-full sm:w-72">
          <SearchInput value={search} onChange={setSearch} placeholder={t("searchPlaceholder")} />
        </div>
      </div>

      {/* Table */}
      <Table
        columns={columns}
        data={filteredUsers}
        keyExtractor={(user) => user.id}
        rowClassName={(user) => (!user.active ? "opacity-60" : "")}
        emptyMessage={getEmptyMessage()}
        minWidth="700px"
      />
    </div>
  );
}
