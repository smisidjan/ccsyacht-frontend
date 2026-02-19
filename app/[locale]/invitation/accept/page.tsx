"use client";

import { useState } from "react";
import { useSearchParams } from "next/navigation";
import { useTranslations } from "next-intl";
import { Link } from "@/i18n/navigation";
import { invitationsApi } from "@/lib/api/client";
import PasswordInput from "@/app/components/ui/PasswordInput";

type PageState = "form" | "success" | "error";

export default function AcceptInvitationPage() {
  const t = useTranslations("invitation");
  const searchParams = useSearchParams();
  const token = searchParams.get("token") || "";
  const email = searchParams.get("email") || "";

  const [state, setState] = useState<PageState>(token ? "form" : "error");
  const [name, setName] = useState("");
  const [password, setPassword] = useState("");
  const [confirmPassword, setConfirmPassword] = useState("");
  const [error, setError] = useState("");
  const [loading, setLoading] = useState(false);

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setError("");

    if (password !== confirmPassword) {
      setError(t("passwordsDoNotMatch"));
      return;
    }

    if (password.length < 8) {
      setError(t("passwordTooShort"));
      return;
    }

    setLoading(true);

    try {
      await invitationsApi.accept({ token, name, password, password_confirmation: confirmPassword });
      setState("success");
    } catch (err) {
      const errorMessage = (err as { message?: string })?.message || t("error");
      setError(errorMessage);
    } finally {
      setLoading(false);
    }
  };

  return (
    <div className="min-h-[calc(100vh-8rem)] flex items-center justify-center px-4">
      <div className="w-full max-w-md">
        <div className="bg-white dark:bg-gray-900 rounded-2xl shadow-2xl dark:shadow-gray-900/50 p-8 border border-gray-100 dark:border-gray-800">
          {state === "error" && (
            <>
              <h1 className="text-2xl font-bold text-center mb-4">
                {t("invalidInvitation")}
              </h1>
              <p className="text-sm text-gray-600 dark:text-gray-400 text-center mb-8">
                {t("invalidInvitationMessage")}
              </p>
              <Link
                href="/login"
                className="block w-full py-3 px-4 text-center bg-blue-600 text-white font-medium rounded-lg hover:bg-blue-700 focus:ring-4 focus:ring-blue-500/50 transition-all shadow-lg hover:shadow-xl"
              >
                {t("goToLogin")}
              </Link>
            </>
          )}

          {state === "form" && (
            <>
              <h1 className="text-2xl font-bold text-center mb-2">
                {t("acceptTitle")}
              </h1>
              <p className="text-sm text-gray-600 dark:text-gray-400 text-center mb-8">
                {t("acceptSubtitle", { email })}
              </p>

              {error && (
                <div className="mb-6 p-3 text-sm text-red-600 bg-red-50 dark:bg-red-900/20 dark:text-red-400 rounded-lg">
                  {error}
                </div>
              )}

              <form onSubmit={handleSubmit} className="space-y-6">
                <div>
                  <label htmlFor="name" className="block text-sm font-medium mb-2">
                    {t("name")}
                  </label>
                  <input
                    id="name"
                    type="text"
                    value={name}
                    onChange={(e) => setName(e.target.value)}
                    required
                    autoFocus
                    className="w-full px-4 py-3 rounded-lg border border-gray-300 dark:border-gray-700 bg-white dark:bg-gray-800 focus:ring-2 focus:ring-blue-500 focus:border-transparent outline-none transition-all"
                    placeholder={t("namePlaceholder")}
                  />
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
                    placeholder={t("passwordPlaceholder")}
                  />
                </div>

                <div>
                  <label htmlFor="confirmPassword" className="block text-sm font-medium mb-2">
                    {t("confirmPassword")}
                  </label>
                  <PasswordInput
                    id="confirmPassword"
                    value={confirmPassword}
                    onChange={(e) => setConfirmPassword(e.target.value)}
                    required
                    placeholder={t("confirmPasswordPlaceholder")}
                  />
                </div>

                <button
                  type="submit"
                  disabled={loading}
                  className="w-full py-3 px-4 bg-blue-600 text-white font-medium rounded-lg hover:bg-blue-700 focus:ring-4 focus:ring-blue-500/50 disabled:opacity-50 disabled:cursor-not-allowed transition-all shadow-lg hover:shadow-xl"
                >
                  {loading ? t("creating") : t("createAccount")}
                </button>
              </form>
            </>
          )}

          {state === "success" && (
            <>
              <div className="flex justify-center mb-6">
                <div className="w-16 h-16 bg-green-100 dark:bg-green-900/30 rounded-full flex items-center justify-center">
                  <svg className="w-8 h-8 text-green-600 dark:text-green-400" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                    <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M5 13l4 4L19 7" />
                  </svg>
                </div>
              </div>
              <h1 className="text-2xl font-bold text-center mb-4">
                {t("accountCreated")}
              </h1>
              <p className="text-sm text-gray-600 dark:text-gray-400 text-center mb-8">
                {t("accountCreatedMessage")}
              </p>
              <Link
                href="/login"
                className="block w-full py-3 px-4 text-center bg-blue-600 text-white font-medium rounded-lg hover:bg-blue-700 focus:ring-4 focus:ring-blue-500/50 transition-all shadow-lg hover:shadow-xl"
              >
                {t("goToLogin")}
              </Link>
            </>
          )}
        </div>
      </div>
    </div>
  );
}
