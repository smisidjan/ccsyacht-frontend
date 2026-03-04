"use client";

import { useState } from "react";
import { useTranslations } from "next-intl";
import { Link } from "@/i18n/navigation";
import { useAuth } from "@/app/context/AuthContext";
import { useTenant } from "@/app/context/TenantContext";
import { authApi } from "@/lib/api/client";
import { translateApiError } from "@/lib/utils/errors";
import type { TenantInfo } from "@/lib/api/types";
import AuthPageContainer from "@/app/components/ui/AuthPageContainer";
import FormInput from "@/app/components/ui/FormInput";
import PasswordInput from "@/app/components/ui/PasswordInput";
import Button from "@/app/components/ui/Button";
import Alert from "@/app/components/ui/Alert";

const ERROR_MAP: Record<string, string> = {
  "The provided credentials are incorrect.": "errors.invalidCredentials",
  "User not found.": "errors.userNotFound",
  "Too many attempts. Please try again later.": "errors.tooManyAttempts",
};

type LoginStep = "email" | "tenant" | "password";

export default function LoginPage() {
  const t = useTranslations("auth");
  const { login } = useAuth();
  const { updateTenant } = useTenant();
  const [step, setStep] = useState<LoginStep>("email");
  const [email, setEmail] = useState("");
  const [password, setPassword] = useState("");
  const [tenants, setTenants] = useState<TenantInfo[]>([]);
  const [selectedTenant, setSelectedTenant] = useState<TenantInfo | null>(null);
  const [error, setError] = useState("");
  const [loading, setLoading] = useState(false);

  const handleEmailSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setError("");
    setLoading(true);

    try {
      const response = await authApi.lookup(email);
      const tenantList = response.result || [];

      if (tenantList.length === 0) {
        setError(t("errors.userNotFound"));
        setLoading(false);
        return;
      }

      setTenants(tenantList);

      if (tenantList.length === 1) {
        setSelectedTenant(tenantList[0]);
        updateTenant(tenantList[0].identifier, tenantList[0].name, tenantList[0].url);
        setStep("password");
      } else {
        setStep("tenant");
      }
    } catch (err) {
      setError(translateApiError(err, t, ERROR_MAP));
    } finally {
      setLoading(false);
    }
  };

  const handleTenantSelect = (tenant: TenantInfo) => {
    setSelectedTenant(tenant);
    updateTenant(tenant.identifier, tenant.name, tenant.url);
    setStep("password");
  };

  const handlePasswordSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setError("");
    setLoading(true);

    try {
      if (!selectedTenant) {
        setError(t("errors.noTenantSelected") || "No tenant selected");
        setLoading(false);
        return;
      }

      const response = await authApi.login(selectedTenant.url, { email, password });
      login(response.token);
    } catch (err) {
      setError(translateApiError(err, t, ERROR_MAP));
    } finally {
      setLoading(false);
    }
  };

  const handleBack = () => {
    if (step === "password") {
      if (tenants.length > 1) {
        setStep("tenant");
      } else {
        setStep("email");
        setTenants([]);
        setSelectedTenant(null);
      }
    } else if (step === "tenant") {
      setStep("email");
      setTenants([]);
      setSelectedTenant(null);
    }
    setError("");
    setPassword("");
  };

  return (
    <AuthPageContainer>
      <h1 className="text-2xl font-bold text-center mb-8">
        {t("loginTitle")}
      </h1>

      {error && <Alert type="error" message={error} className="mb-6" />}

      {step === "email" && (
        <form onSubmit={handleEmailSubmit} className="space-y-6">
          <FormInput
            id="email"
            type="email"
            label={t("email")}
            value={email}
            onChange={(e) => setEmail(e.target.value)}
            placeholder={t("emailPlaceholder")}
            required
            autoFocus
          />

          <Button type="submit" fullWidth loading={loading}>
            {loading ? t("loading") : t("continue")}
          </Button>
        </form>
      )}

      {step === "tenant" && (
        <div className="space-y-6">
          <div>
            <p className="text-sm text-gray-600 dark:text-gray-400 mb-4">
              {t("selectOrganisation")}
            </p>
            <div className="space-y-2">
              {tenants.map((tenant) => (
                <button
                  key={tenant.identifier}
                  onClick={() => handleTenantSelect(tenant)}
                  className="w-full p-4 text-left rounded-lg border border-gray-200 dark:border-gray-700 hover:border-blue-500 dark:hover:border-blue-500 hover:bg-blue-50 dark:hover:bg-blue-900/20 transition-all"
                >
                  <span className="font-medium text-gray-900 dark:text-white">
                    {tenant.name}
                  </span>
                </button>
              ))}
            </div>
          </div>

          <Button type="button" variant="ghost" fullWidth onClick={handleBack}>
            {t("back")}
          </Button>
        </div>
      )}

      {step === "password" && (
        <form onSubmit={handlePasswordSubmit} className="space-y-6">
          <div className="p-3 bg-gray-50 dark:bg-gray-800 rounded-lg">
            <p className="text-sm text-gray-600 dark:text-gray-400">
              {email}
            </p>
            {selectedTenant && (
              <p className="text-xs text-gray-500 dark:text-gray-500 mt-1">
                {selectedTenant.name}
              </p>
            )}
          </div>

          <div>
            <label htmlFor="password" className="block text-sm font-medium mb-2">
              {t("password")}
            </label>
            <PasswordInput
              id="password"
              value={password}
              onChange={(e) => setPassword(e.target.value)}
              required
              autoFocus
              placeholder={t("passwordPlaceholder")}
            />
            <div className="mt-2 text-right">
              <Link
                href="/forgot-password"
                className="text-sm text-blue-600 hover:text-blue-700 dark:text-blue-400 dark:hover:text-blue-300"
              >
                {t("forgotPassword")}
              </Link>
            </div>
          </div>

          <Button type="submit" fullWidth loading={loading}>
            {loading ? t("loggingIn") : t("loginButton")}
          </Button>

          <Button type="button" variant="ghost" fullWidth onClick={handleBack}>
            {t("back")}
          </Button>
        </form>
      )}
    </AuthPageContainer>
  );
}
