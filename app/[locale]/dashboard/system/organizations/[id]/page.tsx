"use client";

import { useState, useEffect } from "react";
import { useTranslations } from "next-intl";
import { useParams, useRouter } from "next/navigation";
import { Link } from "@/i18n/navigation";
import {
  ArrowLeftIcon,
  UsersIcon,
  UserGroupIcon,
  ClockIcon,
  Cog6ToothIcon,
} from "@heroicons/react/24/outline";
import { systemApi } from "@/lib/api/client";
import StatsCard from "@/app/components/ui/StatsCard";
import Button from "@/app/components/ui/Button";
import Spinner from "@/app/components/ui/Spinner";
import Alert from "@/app/components/ui/Alert";
import TabNavState from "@/app/components/ui/TabNavState";
import type { StateTab } from "@/app/components/ui/TabNavState";
import TenantUsersTable from "@/app/components/system-tabs/TenantUsersTable";
import TenantInvitationsTable from "@/app/components/system-tabs/TenantInvitationsTable";
import TenantRolesTable from "@/app/components/system-tabs/TenantRolesTable";
import TenantSettingsModal from "@/app/components/modals/TenantSettingsModal";

type TabType = "users" | "invitations" | "roles";

export default function TenantDetailPage() {
  const t = useTranslations("systemSettings.tenantDetail");
  const params = useParams();
  const router = useRouter();
  const tenantId = params.id as string;

  const [activeTab, setActiveTab] = useState<TabType>("users");
  const [stats, setStats] = useState<{
    totalUsers: number;
    activeUsers: number;
    inactiveUsers: number;
    employees: number;
    guests: number;
    pendingInvitations: number;
    acceptedInvitations: number;
  } | null>(null);
  const [tenantName, setTenantName] = useState<string>("");
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [maxProjects, setMaxProjects] = useState<number | null>(null);
  const [maxUsers, setMaxUsers] = useState<number | null>(null);
  const [isCcsYacht, setIsCcsYacht] = useState(false);
  const [isSettingsOpen, setIsSettingsOpen] = useState(false);

  // Build tabs array
  const tabs: StateTab[] = [
    { key: "users", label: t("usersTab") },
    { key: "invitations", label: t("invitationsTab") },
    { key: "roles", label: t("rolesTab") },
  ];

  useEffect(() => {
    async function fetchData() {
      try {
        setLoading(true);
        // Fetch tenant stats
        const statsResponse = await systemApi.getTenantStats(tenantId);
        setStats(statsResponse.data);

        // Get tenant name from the tenants list
        const tenantsResponse = await systemApi.getTenants();
        const tenant = tenantsResponse.data?.find(
          (t) => t.identifier === tenantId
        );
        if (tenant) {
          setTenantName(tenant.name);
          setIsCcsYacht(tenant.name.toLowerCase() === "ccs yacht");

          // Extract subscription limits from Schema.org structure
          const tenantData = tenant as any;
          if (tenantData.makesOffer?.eligibleQuantity) {
            const eligibleQuantity = tenantData.makesOffer.eligibleQuantity;
            const projectsItem = eligibleQuantity.find((item: any) => item.name === "projects");
            const usersItem = eligibleQuantity.find((item: any) => item.name === "users");
            setMaxProjects(projectsItem?.maxValue ?? null);
            setMaxUsers(usersItem?.maxValue ?? null);
          }
        }
      } catch (err) {
        const errorMessage =
          err instanceof Error ? err.message : "Failed to load tenant data";
        setError(errorMessage);
      } finally {
        setLoading(false);
      }
    }

    if (tenantId) {
      fetchData();
    }
  }, [tenantId]);

  if (loading) {
    return (
      <div className="flex items-center justify-center min-h-[400px]">
        <Spinner />
      </div>
    );
  }

  if (error) {
    return (
      <div className="space-y-6">
        <Alert type="error" title="Error" message={error} />
        <Button variant="secondary" onClick={() => router.push("/dashboard/system")}>
          {t("backToOverview")}
        </Button>
      </div>
    );
  }

  return (
    <div className="space-y-6">
      {/* Header */}
      <div className="flex items-center justify-between pb-6">
        <div className="flex items-center gap-4">
          <Link href="/dashboard/system">
            <Button variant="ghost" size="sm">
              <ArrowLeftIcon className="w-4 h-4 mr-2" />
              {t("backToOverview")}
            </Button>
          </Link>
          <h1 className="text-2xl font-bold text-gray-900 dark:text-white">
            {tenantName}
          </h1>
        </div>
        {!isCcsYacht && (
          <Button
            variant="ghost"
            size="sm"
            onClick={() => setIsSettingsOpen(true)}
            title={t("settings")}
          >
            <Cog6ToothIcon className="w-5 h-5" />
          </Button>
        )}
      </div>

      {/* Stats Cards */}
      {stats && (
        <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-6">
          <StatsCard
            title={t("totalUsers")}
            value={stats.totalUsers}
            icon={<UsersIcon className="w-5 h-5" />}
            variant="primary"
          />
          <StatsCard
            title={t("employees")}
            value={stats.employees}
            icon={<UserGroupIcon className="w-5 h-5" />}
            variant="default"
          />
          <StatsCard
            title={t("guests")}
            value={stats.guests}
            icon={<UsersIcon className="w-5 h-5" />}
            variant="default"
          />
          <StatsCard
            title={t("pending")}
            value={stats.pendingInvitations}
            icon={<ClockIcon className="w-5 h-5" />}
            variant="warning"
          />
        </div>
      )}

      {/* Tabs */}
      <div className="mb-6">
        <TabNavState
          tabs={tabs}
          activeTab={activeTab}
          onChange={(key) => setActiveTab(key as TabType)}
        />
      </div>

      {/* Tab Content */}
      <div>
        {activeTab === "users" && <TenantUsersTable tenantId={tenantId} />}
        {activeTab === "invitations" && (
          <TenantInvitationsTable tenantId={tenantId} />
        )}
        {activeTab === "roles" && <TenantRolesTable tenantId={tenantId} />}
      </div>

      {/* Settings Modal */}
      <TenantSettingsModal
        isOpen={isSettingsOpen}
        onClose={() => setIsSettingsOpen(false)}
        tenantName={tenantName}
        maxProjects={maxProjects}
        maxUsers={maxUsers}
      />
    </div>
  );
}
