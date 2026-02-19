"use client";

import { useState } from "react";
import { useSearchParams } from "next/navigation";
import { useTranslations } from "next-intl";
import { Link } from "@/i18n/navigation";
import { authApi } from "@/lib/api/client";
import { validatePassword } from "@/lib/utils/validation";
import { getErrorMessage } from "@/lib/utils/errors";
import AuthPageContainer from "@/app/components/ui/AuthPageContainer";
import PasswordInput from "@/app/components/ui/PasswordInput";
import Button from "@/app/components/ui/Button";
import Alert from "@/app/components/ui/Alert";
import ResultIcon from "@/app/components/ui/ResultIcon";

type PageState = "form" | "success" | "error";

export default function ResetPasswordPage() {
  const t = useTranslations("auth");
  const searchParams = useSearchParams();
  const token = searchParams.get("token") || "";
  const email = searchParams.get("email") || "";

  const [state, setState] = useState<PageState>(token && email ? "form" : "error");
  const [password, setPassword] = useState("");
  const [confirmPassword, setConfirmPassword] = useState("");
  const [error, setError] = useState("");
  const [loading, setLoading] = useState(false);

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setError("");

    const validation = validatePassword(password, confirmPassword);
    if (!validation.valid) {
      setError(t(validation.error === "mismatch" ? "passwordsDoNotMatch" : "passwordTooShort"));
      return;
    }

    setLoading(true);

    try {
      await authApi.resetPassword({ token, email, password, password_confirmation: confirmPassword });
      setState("success");
    } catch (err) {
      setError(getErrorMessage(err, t("error")));
    } finally {
      setLoading(false);
    }
  };

  return (
    <AuthPageContainer>
      {state === "error" && (
        <div className="text-center">
          <ResultIcon type="error" className="mx-auto mb-6" />
          <h1 className="text-2xl font-bold mb-4">
            {t("invalidResetLink")}
          </h1>
          <p className="text-sm text-gray-600 dark:text-gray-400 mb-8">
            {t("invalidResetLinkMessage")}
          </p>
          <Link href="/forgot-password">
            <Button fullWidth>{t("requestNewLink")}</Button>
          </Link>
        </div>
      )}

      {state === "form" && (
        <>
          <h1 className="text-2xl font-bold text-center mb-2">
            {t("resetPasswordTitle")}
          </h1>
          <p className="text-sm text-gray-600 dark:text-gray-400 text-center mb-8">
            {t("resetPasswordSubtitle")}
          </p>

          {error && <Alert type="error" message={error} className="mb-6" />}

          <form onSubmit={handleSubmit} className="space-y-6">
            <div>
              <label htmlFor="password" className="block text-sm font-medium mb-2">
                {t("newPassword")}
              </label>
              <PasswordInput
                id="password"
                value={password}
                onChange={(e) => setPassword(e.target.value)}
                required
                autoFocus
                placeholder={t("newPasswordPlaceholder")}
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

            <Button type="submit" fullWidth loading={loading}>
              {loading ? t("resetting") : t("resetPassword")}
            </Button>
          </form>
        </>
      )}

      {state === "success" && (
        <div className="text-center">
          <ResultIcon type="success" className="mx-auto mb-6" />
          <h1 className="text-2xl font-bold mb-4">
            {t("passwordResetSuccess")}
          </h1>
          <p className="text-sm text-gray-600 dark:text-gray-400 mb-8">
            {t("passwordResetSuccessMessage")}
          </p>
          <Link href="/login">
            <Button fullWidth>{t("loginButton")}</Button>
          </Link>
        </div>
      )}
    </AuthPageContainer>
  );
}
