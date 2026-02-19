"use client";

import { useState, useEffect } from "react";
import { useTranslations } from "next-intl";
import { LockClosedIcon } from "@heroicons/react/24/outline";
import {
  systemApi,
  setSystemToken,
  getSystemToken,
  clearSystemToken,
} from "@/lib/api/client";
import TenantsTab from "@/app/components/system-tabs/TenantsTab";

export default function SystemSettingsPage() {
  const t = useTranslations("systemSettings");
  const [isAuthenticated, setIsAuthenticated] = useState(false);
  const [email, setEmail] = useState("");
  const [password, setPassword] = useState("");
  const [error, setError] = useState("");
  const [loading, setLoading] = useState(false);
  const [checkingAuth, setCheckingAuth] = useState(true);

  useEffect(() => {
    const token = getSystemToken();
    if (token) {
      setIsAuthenticated(true);
    }
    setCheckingAuth(false);
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
        <div className="animate-spin rounded-full h-8 w-8 border-b-2 border-blue-600"></div>
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

            {error && (
              <div className="mb-4 p-3 text-sm text-red-600 bg-red-50 dark:bg-red-900/20 dark:text-red-400 rounded-lg">
                {error}
              </div>
            )}

            <form onSubmit={handleLogin} className="space-y-4">
              <div>
                <label
                  htmlFor="system-email"
                  className="block text-sm font-medium text-gray-700 dark:text-gray-300 mb-1"
                >
                  {t("login.email")}
                </label>
                <input
                  id="system-email"
                  type="email"
                  value={email}
                  onChange={(e) => setEmail(e.target.value)}
                  required
                  autoFocus
                  className="w-full px-4 py-2 rounded-lg border border-gray-300 dark:border-gray-600 bg-white dark:bg-gray-700 focus:ring-2 focus:ring-blue-500 focus:border-transparent outline-none transition-all"
                  placeholder={t("login.emailPlaceholder")}
                />
              </div>

              <div>
                <label
                  htmlFor="system-password"
                  className="block text-sm font-medium text-gray-700 dark:text-gray-300 mb-1"
                >
                  {t("login.password")}
                </label>
                <input
                  id="system-password"
                  type="password"
                  value={password}
                  onChange={(e) => setPassword(e.target.value)}
                  required
                  className="w-full px-4 py-2 rounded-lg border border-gray-300 dark:border-gray-600 bg-white dark:bg-gray-700 focus:ring-2 focus:ring-blue-500 focus:border-transparent outline-none transition-all"
                  placeholder={t("login.passwordPlaceholder")}
                />
              </div>

              <button
                type="submit"
                disabled={loading}
                className="w-full py-2 px-4 bg-blue-600 text-white font-medium rounded-lg hover:bg-blue-700 disabled:opacity-50 disabled:cursor-not-allowed transition-all"
              >
                {loading ? t("login.loggingIn") : t("login.loginButton")}
              </button>
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
        <button
          onClick={handleLogout}
          className="px-4 py-2 text-sm text-gray-600 dark:text-gray-400 hover:text-gray-900 dark:hover:text-white border border-gray-300 dark:border-gray-600 rounded-lg hover:bg-gray-50 dark:hover:bg-gray-700 transition-all"
        >
          {t("login.logout")}
        </button>
      </div>

      <TenantsTab />
    </div>
  );
}
