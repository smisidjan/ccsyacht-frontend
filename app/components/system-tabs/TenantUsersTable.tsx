"use client";

import { useState, useEffect, useCallback } from "react";
import { useTranslations } from "next-intl";
import {
  EyeIcon,
  UserIcon as ImpersonateIcon,
} from "@heroicons/react/24/outline";
import { systemApi } from "@/lib/api/client";
import { useToast } from "@/app/context/ToastContext";
import type { ApiError } from "@/lib/api/types";
import SearchInput from "@/app/components/ui/SearchInput";
import Button from "@/app/components/ui/Button";
import Table from "@/app/components/ui/Table";
import LoadingSkeleton from "@/app/components/ui/LoadingSkeleton";
import Alert from "@/app/components/ui/Alert";

interface TenantUsersTableProps {
  tenantId: string;
}

type FilterType = "all" | "employee" | "guest";

// Type matching the actual API response from system tenant users endpoint
interface SystemTenantUser {
  "@type": "Person";
  identifier: string;
  name: string;
  email: string;
  emailVerified: boolean;
  active: boolean;
  dateCreated: string;
  dateModified: string;
  roles: string[];
  worksFor: {
    "@type": "EmployeeRole";
    roleName: string;
    employmentType: "employee" | "guest";
  };
  memberOf?: {
    "@type": "Organization";
    identifier: string;
    name: string;
  };
}

export default function TenantUsersTable({ tenantId }: TenantUsersTableProps) {
  const t = useTranslations("systemSettings.tenantDetail");
  const { showToast } = useToast();

  const [users, setUsers] = useState<SystemTenantUser[]>([]);
  const [filteredUsers, setFilteredUsers] = useState<SystemTenantUser[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [searchQuery, setSearchQuery] = useState("");
  const [filter, setFilter] = useState<FilterType>("all");
  const [impersonating, setImpersonating] = useState<string | null>(null);

  const fetchUsers = useCallback(async () => {
    try {
      setLoading(true);
      setError(null);

      const params = filter === "all" ? {} : { employment_type: filter };
      const response = await systemApi.getTenantUsers(tenantId, params);
      setUsers((response.itemListElement as unknown as SystemTenantUser[]) || []);
    } catch (err) {
      const apiError = err as ApiError;
      const errorMessage =
        apiError?.message || "Failed to fetch users";
      console.error("Failed to fetch users:", errorMessage);
      setError(errorMessage);
      setUsers([]);
    } finally {
      setLoading(false);
    }
  }, [tenantId, filter]);

  useEffect(() => {
    fetchUsers();
  }, [fetchUsers]);

  // Filter users by search query
  useEffect(() => {
    if (!searchQuery.trim()) {
      setFilteredUsers(users);
      return;
    }

    const query = searchQuery.toLowerCase();
    const filtered = users.filter(
      (user) =>
        user.name.toLowerCase().includes(query) ||
        user.email.toLowerCase().includes(query)
    );
    setFilteredUsers(filtered);
  }, [users, searchQuery]);

  const handleImpersonate = async (user: SystemTenantUser) => {
    try {
      setImpersonating(user.identifier);

      const response = await systemApi.impersonateUser(
        tenantId,
        user.identifier
      );

      // Open new tab with impersonation token
      const impersonationToken = response.result.token;
      localStorage.setItem("impersonation_token", impersonationToken);
      localStorage.setItem("impersonation_user", JSON.stringify(user));

      // Open tenant app in new tab
      window.open(`/dashboard`, "_blank");

      showToast("success", t("impersonationSuccess", { name: user.name }));
    } catch (err) {
      const apiError = err as ApiError;
      const errorMessage =
        apiError?.message || "Failed to impersonate user";
      showToast("error", errorMessage);
    } finally {
      setImpersonating(null);
    }
  };

  if (loading) {
    return <LoadingSkeleton type="table" rows={5} />;
  }

  if (error) {
    return <Alert type="error" title="Error" message={error} />;
  }

  return (
    <div className="space-y-4">
      {/* Search and Filter */}
      <div className="flex flex-col sm:flex-row gap-4">
        <div className="flex-1">
          <SearchInput
            value={searchQuery}
            onChange={setSearchQuery}
            placeholder={t("searchPlaceholder")}
          />
        </div>
        <div className="w-full sm:w-48">
          <select
            value={filter}
            onChange={(e) => setFilter(e.target.value as FilterType)}
            className="w-full px-4 py-2 border border-gray-300 dark:border-gray-700 rounded-lg bg-white dark:bg-gray-800 text-gray-900 dark:text-white focus:outline-none focus:ring-2 focus:ring-blue-500"
          >
            <option value="all">{t("filterAll")}</option>
            <option value="employee">{t("filterEmployees")}</option>
            <option value="guest">{t("filterGuests")}</option>
          </select>
        </div>
      </div>

      {/* Users Table */}
      <Table
        columns={[
          {
            key: "name",
            header: t("nameColumn"),
            cell: (user: SystemTenantUser) => (
              <span className="text-sm font-medium text-gray-900 dark:text-white">
                {user.name}
              </span>
            ),
          },
          {
            key: "email",
            header: t("emailColumn"),
            cell: (user: SystemTenantUser) => (
              <span className="text-sm text-gray-600 dark:text-gray-400">
                {user.email}
              </span>
            ),
          },
          {
            key: "role",
            header: t("roleColumn"),
            cell: (user: SystemTenantUser) => (
              <span className="text-sm text-gray-600 dark:text-gray-400">
                {user.worksFor?.roleName || user.roles?.[0] || "-"}
              </span>
            ),
          },
          {
            key: "type",
            header: t("typeColumn"),
            cell: (user: SystemTenantUser) => {
              const userType = user.worksFor?.employmentType;
              return (
                <span
                  className={`inline-flex items-center px-2.5 py-0.5 rounded-full text-xs font-medium ${
                    userType === "guest"
                      ? "bg-purple-100 dark:bg-purple-900/30 text-purple-800 dark:text-purple-300"
                      : "bg-blue-100 dark:bg-blue-900/30 text-blue-800 dark:text-blue-300"
                  }`}
                >
                  {userType === "guest" ? t("guest") : t("employee")}
                </span>
              );
            },
          },
          {
            key: "status",
            header: t("statusColumn"),
            cell: (user: SystemTenantUser) => (
              <span
                className={`inline-flex items-center px-2.5 py-0.5 rounded-full text-xs font-medium ${
                  user.active
                    ? "bg-green-100 dark:bg-green-900/30 text-green-800 dark:text-green-300"
                    : "bg-gray-100 dark:bg-gray-800 text-gray-800 dark:text-gray-300"
                }`}
              >
                {user.active ? "Active" : "Inactive"}
              </span>
            ),
          },
          {
            key: "actions",
            header: t("actionsColumn"),
            cell: (user: SystemTenantUser) => (
              <div className="flex items-center gap-2">
                <Button
                  variant="ghost"
                  size="sm"
                  onClick={() => {
                    // TODO: Open user detail modal
                    showToast("info", "User detail view coming soon");
                  }}
                  title={t("viewUser")}
                >
                  <EyeIcon className="w-4 h-4" />
                </Button>
                <Button
                  variant="ghost"
                  size="sm"
                  onClick={() => handleImpersonate(user)}
                  disabled={
                    !user.active ||
                    impersonating === user.identifier
                  }
                  loading={impersonating === user.identifier}
                  title={t("impersonateUser")}
                >
                  <ImpersonateIcon className="w-4 h-4" />
                </Button>
              </div>
            ),
          },
        ]}
        data={filteredUsers}
        keyExtractor={(user) => user.identifier}
        emptyMessage={
          searchQuery
            ? t("noSearchResults")
            : t("noUsers")
        }
      />
    </div>
  );
}
