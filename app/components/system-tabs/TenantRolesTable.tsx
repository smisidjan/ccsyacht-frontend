"use client";

import { useState, useEffect } from "react";
import { useTranslations } from "next-intl";
import {
  PencilIcon,
  TrashIcon,
  PlusIcon,
} from "@heroicons/react/24/outline";
import { useTenantRoles } from "@/lib/api";
import { systemApi } from "@/lib/api/system";
import { useToast } from "@/app/context/ToastContext";
import type { TenantRole, CreateTenantRoleRequest, UpdateTenantRoleRequest } from "@/lib/api/types";
import { formatRoleName } from "@/lib/utils/roleFormatter";
import SearchInput from "@/app/components/ui/SearchInput";
import Button from "@/app/components/ui/Button";
import Table from "@/app/components/ui/Table";
import LoadingSkeleton from "@/app/components/ui/LoadingSkeleton";
import Alert from "@/app/components/ui/Alert";
import CreateRoleModal from "@/app/components/modals/CreateRoleModal";
import EditRoleModal from "@/app/components/modals/EditRoleModal";
import DeleteRoleModal from "@/app/components/modals/DeleteRoleModal";

interface TenantRolesTableProps {
  tenantId: string;
  isCcsYacht?: boolean;
}

export default function TenantRolesTable({ tenantId, isCcsYacht = false }: TenantRolesTableProps) {
  const t = useTranslations("systemSettings.tenantDetail.roles");
  const { showToast } = useToast();

  const { data: roles, loading, error: apiError, refetch } = useTenantRoles(tenantId);
  const [roleTypes, setRoleTypes] = useState<string[]>([]);
  const [filteredRoles, setFilteredRoles] = useState<TenantRole[]>([]);
  const [searchQuery, setSearchQuery] = useState("");
  const [filter, setFilter] = useState<string>("all");

  // Modal state
  const [isCreateModalOpen, setIsCreateModalOpen] = useState(false);
  const [isEditModalOpen, setIsEditModalOpen] = useState(false);
  const [isDeleteModalOpen, setIsDeleteModalOpen] = useState(false);
  const [selectedRole, setSelectedRole] = useState<TenantRole | null>(null);

  // Fetch role types
  useEffect(() => {
    const fetchRoleTypes = async () => {
      try {
        const response = await systemApi.getTenantRoleTypes(tenantId);
        setRoleTypes(response.itemListElement || []);
      } catch (err) {
        console.error("Failed to fetch role types:", err);
        setRoleTypes([]);
      }
    };

    if (tenantId) {
      fetchRoleTypes();
    }
  }, [tenantId]);

  // Apply filters whenever roles, search query, or filter type changes
  useEffect(() => {
    if (!roles) {
      setFilteredRoles([]);
      return;
    }

    let filtered = roles;

    // Apply type filter
    if (filter !== "all") {
      filtered = filtered.filter((role) => role.additionalType === filter);
    }

    // Apply search filter
    if (searchQuery.trim()) {
      const query = searchQuery.toLowerCase();
      filtered = filtered.filter((role) =>
        role.name.toLowerCase().includes(query)
      );
    }

    setFilteredRoles(filtered);
  }, [roles, searchQuery, filter]);

  // Modal handlers
  const handleCreate = () => {
    setIsCreateModalOpen(true);
  };

  const handleCreateSubmit = async (data: CreateTenantRoleRequest) => {
    await systemApi.createTenantRole(tenantId, data);
    refetch();
  };

  const handleEdit = (role: TenantRole) => {
    setSelectedRole(role);
    setIsEditModalOpen(true);
  };

  const handleEditSubmit = async (roleId: string, data: UpdateTenantRoleRequest) => {
    await systemApi.updateTenantRole(tenantId, roleId, data);
    refetch();
  };

  const handleDeleteClick = (role: TenantRole) => {
    setSelectedRole(role);
    setIsDeleteModalOpen(true);
  };

  const handleDeleteConfirm = async (roleId: string) => {
    await systemApi.deleteTenantRole(tenantId, roleId);
    refetch();
  };

  if (loading) {
    return <LoadingSkeleton type="table" rows={5} />;
  }

  if (apiError) {
    return (
      <Alert
        type="error"
        title={t("errorTitle")}
        message={apiError.message || t("errorMessage")}
      />
    );
  }

  // Calculate counts for each type
  const getTypeCount = (type: string) => {
    if (type === "all") return roles?.length || 0;
    return roles?.filter((r) => r.additionalType === type).length || 0;
  };

  return (
    <div className="space-y-4">
      {/* Header with Create Button */}
      <div className="flex flex-col sm:flex-row justify-between items-start sm:items-center gap-4">
        <div>
          <h3 className="text-lg font-semibold text-gray-900 dark:text-white">
            {t("title")}
          </h3>
          <p className="text-sm text-gray-600 dark:text-gray-400 mt-1">
            {t("subtitle")}
          </p>
        </div>
        <Button onClick={handleCreate}>
          <PlusIcon className="w-5 h-5" />
          {t("createRole")}
        </Button>
      </div>

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
            onChange={(e) => setFilter(e.target.value)}
            className="w-full px-4 py-2 border border-gray-300 dark:border-gray-700 rounded-lg bg-white dark:bg-gray-800 text-gray-900 dark:text-white focus:outline-none focus:ring-2 focus:ring-blue-500"
          >
            <option value="all">
              {t("filterAll")} ({getTypeCount("all")})
            </option>
            {roleTypes.map((type) => (
              <option key={type} value={type}>
                {formatRoleName(type)} ({getTypeCount(type)})
              </option>
            ))}
          </select>
        </div>
      </div>

      {/* Roles Table */}
      <Table
        columns={[
          {
            key: "name",
            header: t("nameColumn"),
            cell: (role: TenantRole) => (
              <span className="text-sm font-medium text-gray-900 dark:text-white">
                {formatRoleName(role.name)}
              </span>
            ),
          },
          {
            key: "type",
            header: t("typeColumn"),
            cell: (role: TenantRole) => (
              <span
                className={`inline-flex items-center px-2.5 py-0.5 rounded-full text-xs font-medium ${
                  role.additionalType === "guest"
                    ? "bg-purple-100 dark:bg-purple-900/30 text-purple-800 dark:text-purple-300"
                    : "bg-blue-100 dark:bg-blue-900/30 text-blue-800 dark:text-blue-300"
                }`}
              >
                {formatRoleName(role.additionalType)}
              </span>
            ),
          },
          {
            key: "permissions",
            header: t("permissionsColumn"),
            cell: (role: TenantRole) => (
              <span className="text-sm text-gray-600 dark:text-gray-400">
                {role.permissions.length} {t("permissionsCount", { count: role.permissions.length })}
              </span>
            ),
          },
          {
            key: "users",
            header: t("usersColumn"),
            cell: (role: TenantRole) => (
              <span className="text-sm text-gray-600 dark:text-gray-400">
                {role.usersCount || 0} {t("usersCount", { count: role.usersCount || 0 })}
              </span>
            ),
          },
          {
            key: "actions",
            header: t("actionsColumn"),
            headerClassName: "text-right",
            className: "text-right",
            cell: (role: TenantRole) => (
              <div className="flex items-center justify-end gap-2">
                <Button
                  variant="ghost"
                  size="sm"
                  onClick={() => handleEdit(role)}
                  title={t("editRole")}
                >
                  <PencilIcon className="w-4 h-4" />
                </Button>
                <Button
                  variant="ghost"
                  size="sm"
                  onClick={() => handleDeleteClick(role)}
                  title={t("deleteRole")}
                  className="text-red-600 dark:text-red-400 hover:text-red-700 dark:hover:text-red-300"
                >
                  <TrashIcon className="w-4 h-4" />
                </Button>
              </div>
            ),
          },
        ]}
        data={filteredRoles}
        keyExtractor={(role) => role.id}
        emptyMessage={
          searchQuery || filter !== "all"
            ? t("noSearchResults")
            : t("noRoles")
        }
      />

      {/* Modals */}
      <CreateRoleModal
        isOpen={isCreateModalOpen}
        tenantId={tenantId}
        onClose={() => setIsCreateModalOpen(false)}
        onSubmit={handleCreateSubmit}
        isCcsYacht={isCcsYacht}
      />

      <EditRoleModal
        isOpen={isEditModalOpen}
        tenantId={tenantId}
        role={selectedRole}
        onClose={() => {
          setIsEditModalOpen(false);
          setSelectedRole(null);
        }}
        onSubmit={handleEditSubmit}
        isCcsYacht={isCcsYacht}
      />

      <DeleteRoleModal
        isOpen={isDeleteModalOpen}
        role={selectedRole}
        onClose={() => {
          setIsDeleteModalOpen(false);
          setSelectedRole(null);
        }}
        onConfirm={handleDeleteConfirm}
      />
    </div>
  );
}
