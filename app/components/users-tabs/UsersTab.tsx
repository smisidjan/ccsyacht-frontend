"use client";

import { useState } from "react";
import { useTranslations } from "next-intl";
import { PencilIcon, ShieldCheckIcon } from "@heroicons/react/24/outline";
import type { User, UserRole } from "@/lib/api/types";
import { getRoleBadgeColor } from "@/lib/utils/badges";
import { usePermission } from "@/lib/hooks/usePermission";
import { PERMISSIONS } from "@/lib/constants/permissions";
import Table from "@/app/components/ui/Table";
import LoadingSkeleton from "@/app/components/ui/LoadingSkeleton";

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
  const { hasAnyPermission } = usePermission();

  const canManageUsers = hasAnyPermission([
    PERMISSIONS.EDIT_USERS,
    PERMISSIONS.DELETE_USERS,
  ]);

  if (loading) {
    return <LoadingSkeleton type="table" rows={3} />;
  }

  // Filter users based on selected filter
  const filteredUsers = users.filter((user) => {
    if (filter === "all") return true;
    if (filter === "employee") return user.employmentType !== "guest";
    if (filter === "guest") return user.employmentType === "guest";
    return true;
  });

  // Calculate counts for filter buttons
  const employeeCount = users.filter((u) => u.employmentType !== "guest").length;
  const guestCount = users.filter((u) => u.employmentType === "guest").length;

  // Get empty message based on filter
  const getEmptyMessage = () => {
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

        return (
          <div className="flex items-center gap-3">
            <div className={`w-10 h-10 rounded-full flex items-center justify-center flex-shrink-0 ${avatarBgColor}`}>
              <span className={`font-medium ${avatarTextColor}`}>
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
            cell: (user: User) => (
              <span className="text-sm text-gray-600 dark:text-gray-400 whitespace-nowrap">
                {user.memberOf?.name || "-"}
              </span>
            ),
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
        <span className={`inline-flex items-center px-2.5 py-0.5 rounded-full text-xs font-medium whitespace-nowrap ${
          user.active
            ? "bg-green-100 text-green-700 dark:bg-green-900/30 dark:text-green-400"
            : "bg-red-100 text-red-700 dark:bg-red-900/30 dark:text-red-400"
        }`}>
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
                  className="p-2 text-gray-400 hover:text-blue-600 dark:hover:text-blue-400 transition-colors"
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
    <div className="space-y-6">
      {/* Filter Buttons */}
      <div className="flex gap-2">
        <button
          onClick={() => setFilter("all")}
          className={`px-4 py-2 rounded-lg text-sm font-medium transition-all ${
            filter === "all"
              ? "bg-blue-600 text-white shadow-md"
              : "bg-white dark:bg-gray-800 text-gray-700 dark:text-gray-300 hover:bg-gray-50 dark:hover:bg-gray-700 border border-gray-300 dark:border-gray-600"
          }`}
        >
          {t("allUsers")} ({users.length})
        </button>
        <button
          onClick={() => setFilter("employee")}
          className={`px-4 py-2 rounded-lg text-sm font-medium transition-all ${
            filter === "employee"
              ? "bg-blue-600 text-white shadow-md"
              : "bg-white dark:bg-gray-800 text-gray-700 dark:text-gray-300 hover:bg-gray-50 dark:hover:bg-gray-700 border border-gray-300 dark:border-gray-600"
          }`}
        >
          {t("employees")} ({employeeCount})
        </button>
        <button
          onClick={() => setFilter("guest")}
          className={`px-4 py-2 rounded-lg text-sm font-medium transition-all ${
            filter === "guest"
              ? "bg-purple-600 text-white shadow-md"
              : "bg-white dark:bg-gray-800 text-gray-700 dark:text-gray-300 hover:bg-gray-50 dark:hover:bg-gray-700 border border-gray-300 dark:border-gray-600"
          }`}
        >
          {t("guests")} ({guestCount})
        </button>
      </div>

      {/* Single Table */}
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
