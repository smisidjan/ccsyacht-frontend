"use client";

import { useTranslations } from "next-intl";
import { PencilIcon, ShieldCheckIcon } from "@heroicons/react/24/outline";
import type { User, UserRole } from "@/lib/api/types";
import { getRoleBadgeColor } from "@/lib/utils/badges";
import Table from "@/app/components/ui/Table";
import LoadingSkeleton from "@/app/components/ui/LoadingSkeleton";

interface UsersTabProps {
  users: User[];
  loading?: boolean;
  currentUserRole?: UserRole;
  onEditUser?: (user: User) => void;
}

export default function UsersTab({
  users,
  loading = false,
  currentUserRole = "user",
  onEditUser,
}: UsersTabProps) {
  const t = useTranslations("usersPage.users");

  const canManageUsers = currentUserRole === "admin" || currentUserRole === "main user";

  if (loading) {
    return <LoadingSkeleton type="table" rows={3} />;
  }

  const columns = [
    {
      key: "user",
      header: t("user"),
      cell: (user: User) => (
        <div className="flex items-center gap-3">
          <div className={`w-10 h-10 rounded-full flex items-center justify-center flex-shrink-0 ${user.active ? "bg-blue-100 dark:bg-blue-900/30" : "bg-gray-200 dark:bg-gray-700"}`}>
            <span className={`font-medium ${user.active ? "text-blue-600 dark:text-blue-400" : "text-gray-400"}`}>
              {user.name.charAt(0).toUpperCase()}
            </span>
          </div>
          <span className="text-sm font-medium text-gray-900 dark:text-white whitespace-nowrap">
            {user.name}
          </span>
        </div>
      ),
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
              {t(`roleNames.${role}`)}
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
      {/* Header */}
      <div className="flex items-center justify-between">
        <div>
          <h2 className="text-xl font-semibold text-gray-900 dark:text-white">
            {t("title")}
          </h2>
          <p className="text-sm text-gray-600 dark:text-gray-400 mt-1">
            {t("subtitle", { count: users.length })}
          </p>
        </div>
      </div>

      <Table
        columns={columns}
        data={users}
        keyExtractor={(user) => user.id}
        rowClassName={(user) => (!user.active ? "opacity-60" : "")}
        emptyMessage={t("noUsers")}
        minWidth="700px"
      />
    </div>
  );
}
