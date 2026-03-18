"use client";

import { useState, useEffect, useCallback } from "react";
import { useTranslations } from "next-intl";
import { UserPlusIcon } from "@heroicons/react/24/outline";
import { systemApi } from "@/lib/api/system";
import type { Tenant, UserRole } from "@/lib/api/types";
import FormInput from "@/app/components/ui/FormInput";
import FormSelect from "@/app/components/ui/FormSelect";
import PasswordInput from "@/app/components/ui/PasswordInput";
import Button from "@/app/components/ui/Button";
import Alert from "@/app/components/ui/Alert";

const ROLES: UserRole[] = [
  "admin",
  "main user",
  "invitation manager",
  "user",
  "yard",
  "surveyor",
  "painter",
  "owner representative",
];

export default function TenantUsersTab() {
  const t = useTranslations("systemSettings.tenantUsers");
  const tRoles = useTranslations("usersPage.users.roleNames");
  const [tenants, setTenants] = useState<Tenant[]>([]);
  const [loading, setLoading] = useState(true);
  const [submitting, setSubmitting] = useState(false);
  const [error, setError] = useState("");
  const [success, setSuccess] = useState("");

  // Form state
  const [selectedTenantId, setSelectedTenantId] = useState("");
  const [name, setName] = useState("");
  const [email, setEmail] = useState("");
  const [password, setPassword] = useState("");
  const [role, setRole] = useState<UserRole>("user");

  const fetchTenants = useCallback(async () => {
    setLoading(true);
    try {
      const response = await systemApi.getTenants();
      setTenants(response.data || []);
    } catch (error) {
      console.error("Failed to fetch tenants:", error);
      setTenants([]);
    } finally {
      setLoading(false);
    }
  }, []);

  useEffect(() => {
    fetchTenants();
  }, [fetchTenants]);

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setError("");
    setSuccess("");
    setSubmitting(true);

    try {
      await systemApi.createTenantUser({
        tenantId: selectedTenantId,
        name,
        email,
        password,
        role,
      });
      setSuccess(t("success"));
      // Reset form
      setName("");
      setEmail("");
      setPassword("");
      setRole("user");
    } catch (err) {
      setError(err instanceof Error ? err.message : t("error"));
    } finally {
      setSubmitting(false);
    }
  };

  const tenantOptions = [
    { value: "", label: t("selectTenantPlaceholder") },
    ...tenants.map((tenant) => ({
      value: tenant.identifier,
      label: tenant.name,
    })),
  ];

  const roleOptions = ROLES.map((r) => ({
    value: r,
    label: tRoles(r),
  }));

  if (loading) {
    return (
      <div className="space-y-6">
        <div className="animate-pulse">
          <div className="h-8 bg-gray-200 dark:bg-gray-700 rounded w-48 mb-2"></div>
          <div className="h-4 bg-gray-200 dark:bg-gray-700 rounded w-64"></div>
        </div>
        <div className="bg-white dark:bg-gray-800 rounded-xl shadow-lg border border-gray-100 dark:border-gray-700 p-6">
          <div className="space-y-4">
            {[1, 2, 3, 4].map((i) => (
              <div key={i} className="animate-pulse">
                <div className="h-4 bg-gray-200 dark:bg-gray-700 rounded w-24 mb-2"></div>
                <div className="h-10 bg-gray-200 dark:bg-gray-700 rounded"></div>
              </div>
            ))}
          </div>
        </div>
      </div>
    );
  }

  return (
    <div className="space-y-6">
      {/* Header */}
      <div>
        <h2 className="text-xl font-semibold text-gray-900 dark:text-white">
          {t("title")}
        </h2>
        <p className="text-sm text-gray-600 dark:text-gray-400 mt-1">
          {t("subtitle")}
        </p>
      </div>

      {/* Form */}
      <div className="bg-white dark:bg-gray-800 rounded-xl shadow-lg dark:shadow-gray-900/30 border border-gray-100 dark:border-gray-700 p-6">
        <form onSubmit={handleSubmit} className="space-y-6">
          {error && <Alert type="error" message={error} />}
          {success && <Alert type="success" message={success} />}

          <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
            <FormSelect
              id="tenant"
              label={t("selectTenant")}
              value={selectedTenantId}
              onChange={(e) => setSelectedTenantId(e.target.value)}
              options={tenantOptions}
              required
            />

            <FormSelect
              id="role"
              label={t("role")}
              value={role}
              onChange={(e) => setRole(e.target.value as UserRole)}
              options={roleOptions}
              required
            />

            <FormInput
              id="name"
              type="text"
              label={t("name")}
              value={name}
              onChange={(e) => setName(e.target.value)}
              placeholder={t("namePlaceholder")}
              required
            />

            <FormInput
              id="email"
              type="email"
              label={t("email")}
              value={email}
              onChange={(e) => setEmail(e.target.value)}
              placeholder={t("emailPlaceholder")}
              required
            />

            <div className="md:col-span-2">
              <label
                htmlFor="password"
                className="block text-sm font-medium text-gray-700 dark:text-gray-300 mb-2"
              >
                {t("password")}
              </label>
              <PasswordInput
                id="password"
                value={password}
                onChange={(e) => setPassword(e.target.value)}
                placeholder={t("passwordPlaceholder")}
                required
              />
            </div>
          </div>

          <div className="flex justify-end">
            <Button
              type="submit"
              disabled={!selectedTenantId}
              loading={submitting}
            >
              <UserPlusIcon className="w-5 h-5" />
              {submitting ? t("adding") : t("addUser")}
            </Button>
          </div>
        </form>
      </div>
    </div>
  );
}
