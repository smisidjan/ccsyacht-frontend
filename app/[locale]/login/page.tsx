"use client";

import { useState } from "react";
import { useTranslations } from "next-intl";
import { Link } from "@/i18n/navigation";
import { useAuth } from "@/app/context/AuthContext";
import { useTenant } from "@/app/context/TenantContext";
import { authApi } from "@/lib/api/client";
import type { TenantInfo } from "@/lib/api/types";
import PasswordInput from "@/app/components/ui/PasswordInput";

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

  const getTranslatedError = (errorMessage: string): string => {
    const translationKey = ERROR_MAP[errorMessage];
    if (translationKey) {
      return t(translationKey);
    }
    return errorMessage;
  };

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
        updateTenant(tenantList[0].id, tenantList[0].name);
        setStep("password");
      } else {
        setStep("tenant");
      }
    } catch (err) {
      const errorMessage = (err as { message?: string })?.message || t("error");
      setError(getTranslatedError(errorMessage));
    } finally {
      setLoading(false);
    }
  };

  const handleTenantSelect = (tenant: TenantInfo) => {
    setSelectedTenant(tenant);
    updateTenant(tenant.id, tenant.name);
    setStep("password");
  };

  const handlePasswordSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setError("");
    setLoading(true);

    try {
      const response = await authApi.login({ email, password });
      login(response.token);
    } catch (err) {
      const errorMessage = (err as { message?: string })?.message || t("error");
      setError(getTranslatedError(errorMessage));
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
    <div className="min-h-[calc(100vh-8rem)] flex items-center justify-center px-4">
      <div className="w-full max-w-md">
        <div className="bg-white dark:bg-gray-900 rounded-2xl shadow-2xl dark:shadow-gray-900/50 p-8 border border-gray-100 dark:border-gray-800">
          <h1 className="text-2xl font-bold text-center mb-8">
            {t("loginTitle")}
          </h1>

          {error && (
            <div className="mb-6 p-3 text-sm text-red-600 bg-red-50 dark:bg-red-900/20 dark:text-red-400 rounded-lg">
              {error}
            </div>
          )}

          {step === "email" && (
            <form onSubmit={handleEmailSubmit} className="space-y-6">
              <div>
                <label htmlFor="email" className="block text-sm font-medium mb-2">
                  {t("email")}
                </label>
                <input
                  id="email"
                  type="email"
                  value={email}
                  onChange={(e) => setEmail(e.target.value)}
                  required
                  autoFocus
                  className="w-full px-4 py-3 rounded-lg border border-gray-300 dark:border-gray-700 bg-white dark:bg-gray-800 focus:ring-2 focus:ring-blue-500 focus:border-transparent outline-none transition-all"
                  placeholder={t("emailPlaceholder")}
                />
              </div>

              <button
                type="submit"
                disabled={loading}
                className="w-full py-3 px-4 bg-blue-600 text-white font-medium rounded-lg hover:bg-blue-700 focus:ring-4 focus:ring-blue-500/50 disabled:opacity-50 disabled:cursor-not-allowed transition-all shadow-lg hover:shadow-xl"
              >
                {loading ? t("loading") : t("continue")}
              </button>
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
                      key={tenant.id}
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

              <button
                type="button"
                onClick={handleBack}
                className="w-full py-3 px-4 text-gray-600 dark:text-gray-400 font-medium rounded-lg hover:bg-gray-100 dark:hover:bg-gray-800 transition-all"
              >
                {t("back")}
              </button>
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
                <label
                  htmlFor="password"
                  className="block text-sm font-medium mb-2"
                >
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

              <button
                type="submit"
                disabled={loading}
                className="w-full py-3 px-4 bg-blue-600 text-white font-medium rounded-lg hover:bg-blue-700 focus:ring-4 focus:ring-blue-500/50 disabled:opacity-50 disabled:cursor-not-allowed transition-all shadow-lg hover:shadow-xl"
              >
                {loading ? t("loggingIn") : t("loginButton")}
              </button>

              <button
                type="button"
                onClick={handleBack}
                className="w-full py-3 px-4 text-gray-600 dark:text-gray-400 font-medium rounded-lg hover:bg-gray-100 dark:hover:bg-gray-800 transition-all"
              >
                {t("back")}
              </button>
            </form>
          )}
        </div>
      </div>
    </div>
  );
}

