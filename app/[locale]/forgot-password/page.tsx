"use client";

import { useState } from "react";
import { useTranslations } from "next-intl";
import { Link } from "@/i18n/navigation";
import { authApi } from "@/lib/api/client";
import { getErrorMessage } from "@/lib/utils/errors";
import AuthPageContainer from "@/app/components/ui/AuthPageContainer";
import FormInput from "@/app/components/ui/FormInput";
import Button from "@/app/components/ui/Button";
import Alert from "@/app/components/ui/Alert";

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
      setError(getErrorMessage(err, t("error")));
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
    <AuthPageContainer>
      {state === "form" ? (
        <>
          <h1 className="text-2xl font-bold text-center mb-2">
            {t("forgotPasswordTitle")}
          </h1>
          <p className="text-sm text-gray-600 dark:text-gray-400 text-center mb-8">
            {t("forgotPasswordSubtitle")}
          </p>

          {error && <Alert type="error" message={error} className="mb-6" />}

          <form onSubmit={handleSubmit} className="space-y-6">
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
              {loading ? t("sending") : t("sendResetLink")}
            </Button>

            <Link href="/login">
              <Button type="button" variant="ghost" fullWidth>
                {t("backToLogin")}
              </Button>
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
            <Link href="/login">
              <Button fullWidth>{t("backToLogin")}</Button>
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
    </AuthPageContainer>
  );
}
