"use client";

import { useState } from "react";
import { useTranslations } from "next-intl";
import { Link } from "@/i18n/navigation";
import { authApi } from "@/lib/api/client";

type PageState = "form" | "sent";

export default function ForgotPasswordPage() {
  const t = useTranslations("auth");
  const [state, setState] = useState<PageState>("form");
  const [email, setEmail] = useState("");
  const [error, setError] = useState("");
  const [loading, setLoading] = useState(false);
  const [resending, setResending] = useState(false);

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setError("");
    setLoading(true);

    try {
      await authApi.forgotPassword(email);
      setState("sent");
    } catch (err) {
      const errorMessage = (err as { message?: string })?.message || t("error");
      setError(errorMessage);
    } finally {
      setLoading(false);
    }
  };

  const handleResend = async () => {
    setResending(true);

    try {
      await authApi.forgotPassword(email);
    } catch {
      // Silently fail - we don't want to reveal if email exists
    } finally {
      setResending(false);
    }
  };

  return (
    <div className="min-h-[calc(100vh-8rem)] flex items-center justify-center px-4">
      <div className="w-full max-w-md">
        <div className="bg-white dark:bg-gray-900 rounded-2xl shadow-2xl dark:shadow-gray-900/50 p-8 border border-gray-100 dark:border-gray-800">
          {state === "form" ? (
            <>
              <h1 className="text-2xl font-bold text-center mb-2">
                {t("forgotPasswordTitle")}
              </h1>
              <p className="text-sm text-gray-600 dark:text-gray-400 text-center mb-8">
                {t("forgotPasswordSubtitle")}
              </p>

              {error && (
                <div className="mb-6 p-3 text-sm text-red-600 bg-red-50 dark:bg-red-900/20 dark:text-red-400 rounded-lg">
                  {error}
                </div>
              )}

              <form onSubmit={handleSubmit} className="space-y-6">
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
                  {loading ? t("sending") : t("sendResetLink")}
                </button>

                <Link
                  href="/login"
                  className="block w-full py-3 px-4 text-center text-gray-600 dark:text-gray-400 font-medium rounded-lg hover:bg-gray-100 dark:hover:bg-gray-800 transition-all"
                >
                  {t("backToLogin")}
                </Link>
              </form>
            </>
          ) : (
            <>
              <h1 className="text-2xl font-bold text-center mb-4">
                {t("resetPasswordSentTitle")}
              </h1>
              <p className="text-sm text-gray-600 dark:text-gray-400 text-center mb-8">
                {t("resetPasswordSentMessage")}
              </p>

              <div className="space-y-4">
                <Link
                  href="/login"
                  className="block w-full py-3 px-4 text-center bg-blue-600 text-white font-medium rounded-lg hover:bg-blue-700 focus:ring-4 focus:ring-blue-500/50 transition-all shadow-lg hover:shadow-xl"
                >
                  {t("backToLogin")}
                </Link>

                <button
                  type="button"
                  onClick={handleResend}
                  disabled={resending}
                  className="w-full text-sm text-blue-600 hover:text-blue-700 dark:text-blue-400 dark:hover:text-blue-300 disabled:opacity-50"
                >
                  {resending ? t("resending") : t("resendInstructions")}
                </button>
              </div>
            </>
          )}
        </div>
      </div>
    </div>
  );
}
