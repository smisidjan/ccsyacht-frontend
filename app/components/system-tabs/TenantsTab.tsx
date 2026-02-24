"use client";

import { useState, useEffect, useCallback } from "react";
import { useTranslations } from "next-intl";
import {
  PlusIcon,
  BuildingOfficeIcon,
} from "@heroicons/react/24/outline";
import { systemApi, getSystemToken } from "@/lib/api/client";
import type { Tenant, ApiError } from "@/lib/api/types";
import CreateTenantModal from "@/app/components/modals/CreateTenantModal";
import Button from "@/app/components/ui/Button";
import Alert from "@/app/components/ui/Alert";
import LoadingSkeleton from "@/app/components/ui/LoadingSkeleton";
import Table from "@/app/components/ui/Table";

export default function TenantsTab() {
  const t = useTranslations("systemSettings.organisations");
  const [tenants, setTenants] = useState<Tenant[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [isCreateModalOpen, setIsCreateModalOpen] = useState(false);

  const fetchTenants = useCallback(async () => {
    setLoading(true);
    setError(null);

    const token = getSystemToken();
    if (!token) {
      setError("No authentication token found. Please login again.");
      setLoading(false);
      return;
    }

    try {
      const response = await systemApi.getTenants();
      setTenants(response.data || []);
    } catch (err) {
      const apiError = err as ApiError;
      const errorMessage =
        apiError?.message || "Failed to fetch organisations";
      console.error("Failed to fetch organisations:", errorMessage);
      setError(errorMessage);
      setTenants([]);
    } finally {
      setLoading(false);
    }
  }, []);

  useEffect(() => {
    fetchTenants();
  }, [fetchTenants]);

  const handleCreateTenant = async (name: string, adminEmail: string) => {
    try {
      await systemApi.createTenant({
        name,
        admin_email: adminEmail,
      });
      setIsCreateModalOpen(false);
      fetchTenants();
    } catch (err) {
      const apiError = err as ApiError;
      console.error("Failed to create organisation:", apiError?.message);
      throw new Error(apiError?.message || "Failed to create organisation");
    }
  };

  if (loading) {
    return <LoadingSkeleton type="table" rows={3} showButton />;
  }

  if (error) {
    return (
      <div className="space-y-6">
        <div className="flex items-center justify-between">
          <div>
            <h2 className="text-xl font-semibold text-gray-900 dark:text-white">
              {t("title")}
            </h2>
          </div>
        </div>
        <Alert
          type="error"
          title="Error loading organisations"
          message={error}
        />
        <Button variant="danger" onClick={fetchTenants}>
          Try Again
        </Button>
      </div>
    );
  }

  return (
    <div className="space-y-6">
      <div className="flex items-center justify-between">
        <div>
          <h2 className="text-xl font-semibold text-gray-900 dark:text-white">
            {t("title")}
          </h2>
          <p className="text-sm text-gray-600 dark:text-gray-400 mt-1">
            {t("subtitle", { count: tenants.length })}
          </p>
        </div>
        <Button onClick={() => setIsCreateModalOpen(true)}>
          <PlusIcon className="w-4 h-4" />
          {t("createOrganisation")}
        </Button>
      </div>

      <Table
        columns={[
          {
            key: "name",
            header: t("name"),
            cell: (tenant: Tenant) => (
              <div className="flex items-center gap-3">
                <div className="w-10 h-10 bg-blue-100 dark:bg-blue-900/30 rounded-full flex items-center justify-center flex-shrink-0">
                  <BuildingOfficeIcon className="w-5 h-5 text-blue-600 dark:text-blue-400" />
                </div>
                <span className="text-sm font-medium text-gray-900 dark:text-white whitespace-nowrap">
                  {tenant.name}
                </span>
              </div>
            ),
          },
          {
            key: "slug",
            header: t("slug"),
            cell: (tenant: Tenant) => (
              <span className="text-sm text-gray-600 dark:text-gray-400 whitespace-nowrap">
                {tenant.alternateName}
              </span>
            ),
          },
          {
            key: "createdAt",
            header: t("createdAt"),
            cell: (tenant: Tenant) => (
              <span className="text-sm text-gray-600 dark:text-gray-400 whitespace-nowrap">
                {tenant.dateCreated
                  ? new Date(tenant.dateCreated).toLocaleDateString()
                  : "-"}
              </span>
            ),
          },
        ]}
        data={tenants}
        keyExtractor={(tenant) => tenant.identifier}
        emptyMessage={t("noOrganisations")}
        minWidth="400px"
      />

      <CreateTenantModal
        isOpen={isCreateModalOpen}
        onClose={() => setIsCreateModalOpen(false)}
        onSubmit={handleCreateTenant}
      />
    </div>
  );
}
