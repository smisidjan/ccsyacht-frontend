"use client";

import { useState, useEffect } from "react";
import { useTranslations } from "next-intl";
import { Link } from "@/i18n/navigation";
import { LockClosedIcon } from "@heroicons/react/24/outline";
import {
  systemApi,
  setSystemToken,
  getSystemToken,
  clearSystemToken,
} from "@/lib/api/client";
import TenantsTab from "@/app/components/system-tabs/TenantsTab";
import { useMinimumLoadingTime } from "@/lib/hooks/useMinimumLoadingTime";
import Spinner from "@/app/components/ui/Spinner";
import FormInput from "@/app/components/ui/FormInput";
import PasswordInput from "@/app/components/ui/PasswordInput";
import Button from "@/app/components/ui/Button";
import Alert from "@/app/components/ui/Alert";

export default function SystemSettingsPage() {
  const t = useTranslations("systemSettings");
  const [isAuthenticated, setIsAuthenticated] = useState(false);
  const [email, setEmail] = useState("");
  const [password, setPassword] = useState("");
  const [error, setError] = useState("");
  const [loading, setLoading] = useState(false);
  const [rawCheckingAuth, setRawCheckingAuth] = useState(true);

  const checkingAuth = useMinimumLoadingTime(rawCheckingAuth);

  useEffect(() => {
    const token = getSystemToken();
    if (token) {
      setIsAuthenticated(true);
    }
    setRawCheckingAuth(false);
  }, []);

  const handleLogin = async (e: React.FormEvent) => {
    e.preventDefault();
    setError("");
    setLoading(true);

    try {
      const response = await systemApi.login({ email, password });
      setSystemToken(response.token);
      setIsAuthenticated(true);
      setEmail("");
      setPassword("");
    } catch (err) {
      const errorMessage =
        err instanceof Error ? err.message : t("login.error");
      setError(errorMessage);
    } finally {
      setLoading(false);
    }
  };

  const handleLogout = () => {
    clearSystemToken();
    setIsAuthenticated(false);
  };

  if (checkingAuth) {
    return (
      <div className="flex items-center justify-center min-h-[400px]">
        <Spinner />
      </div>
    );
  }

  if (!isAuthenticated) {
    return (
      <div>
        <div className="mb-6">
          <h1 className="text-3xl font-bold text-gray-900 dark:text-white">
            {t("title")}
          </h1>
          <p className="text-gray-600 dark:text-gray-400 mt-1">
            {t("subtitle")}
          </p>
        </div>

        <div className="max-w-md mx-auto">
          <div className="bg-white dark:bg-gray-800 rounded-xl shadow-lg border border-gray-100 dark:border-gray-700 p-6">
            <div className="flex items-center justify-center mb-6">
              <div className="w-12 h-12 bg-blue-100 dark:bg-blue-900/30 rounded-full flex items-center justify-center">
                <LockClosedIcon className="w-6 h-6 text-blue-600 dark:text-blue-400" />
              </div>
            </div>

            <h2 className="text-xl font-semibold text-center text-gray-900 dark:text-white mb-2">
              {t("login.title")}
            </h2>
            <p className="text-sm text-gray-600 dark:text-gray-400 text-center mb-6">
              {t("login.subtitle")}
            </p>

            {error && <Alert type="error" message={error} className="mb-4" />}

            <form onSubmit={handleLogin} className="space-y-4">
              <FormInput
                id="system-email"
                type="email"
                label={t("login.email")}
                value={email}
                onChange={(e) => setEmail(e.target.value)}
                placeholder={t("login.emailPlaceholder")}
                required
                autoFocus
              />

              <div>
                <label
                  htmlFor="system-password"
                  className="block text-sm font-medium text-gray-700 dark:text-gray-300 mb-2"
                >
                  {t("login.password")}
                </label>
                <PasswordInput
                  id="system-password"
                  value={password}
                  onChange={(e) => setPassword(e.target.value)}
                  placeholder={t("login.passwordPlaceholder")}
                  required
                />
              </div>

              <div className="text-sm text-right">
                <Link
                  href="/dashboard/system/forgot-password"
                  className="text-blue-600 hover:text-blue-700 dark:text-blue-400 dark:hover:text-blue-300 font-medium"
                >
                  {t("login.forgotPassword")}
                </Link>
              </div>

              <Button type="submit" fullWidth loading={loading}>
                {loading ? t("login.loggingIn") : t("login.loginButton")}
              </Button>
            </form>
          </div>
        </div>
      </div>
    );
  }

  return (
    <div>
      <div className="mb-6 flex items-center justify-between">
        <div>
          <h1 className="text-3xl font-bold text-gray-900 dark:text-white">
            {t("title")}
          </h1>
          <p className="text-gray-600 dark:text-gray-400 mt-1">
            {t("subtitle")}
          </p>
        </div>
        <Button variant="secondary" onClick={handleLogout}>
          {t("login.logout")}
        </Button>
      </div>

      <TenantsTab />
    </div>
  );
}
