"use client";

import { useState, useEffect } from "react";
import { useTranslations } from "next-intl";
import { useParams, useSearchParams, useRouter } from "next/navigation";
import { Link } from "@/i18n/navigation";
import { tenantsApi, authApi, setAuthToken } from "@/lib/api/client";
import { validatePassword } from "@/lib/utils/validation";
import { translateApiError } from "@/lib/utils/errors";
import type { TenantRegistrationInfo } from "@/lib/api/types";
import AuthPageContainer from "@/app/components/ui/AuthPageContainer";
import FormInput from "@/app/components/ui/FormInput";
import FormTextarea from "@/app/components/ui/FormTextarea";
import PasswordInput from "@/app/components/ui/PasswordInput";
import Button from "@/app/components/ui/Button";
import Alert from "@/app/components/ui/Alert";
import Spinner from "@/app/components/ui/Spinner";
import ResultIcon from "@/app/components/ui/ResultIcon";

const ERROR_MAP: Record<string, string> = {
  "This email is already registered.": "errors.emailExists",
  "Please enter a valid email address.": "errors.invalidEmail",
  "Password is too weak.": "errors.weakPassword",
  "Too many attempts. Please try again later.": "errors.tooManyAttempts",
  "Invalid or expired registration token": "errors.invalidToken",
  "Token has been used": "errors.tokenUsed",
};

export default function RegisterPage() {
  const t = useTranslations("auth");
  const params = useParams();
  const searchParams = useSearchParams();
  const router = useRouter();
  const slug = params.slug as string;

  // Check if this is admin registration (has token + email query params)
  const token = searchParams.get("token");
  const emailParam = searchParams.get("email");
  const isAdminRegistration = Boolean(token && emailParam);

  // Organization info state
  const [orgInfo, setOrgInfo] = useState<TenantRegistrationInfo | null>(null);
  const [orgLoading, setOrgLoading] = useState(isAdminRegistration ? false : true);
  const [orgError, setOrgError] = useState<string | null>(null);

  // Form state
  const [name, setName] = useState("");
  const [email, setEmail] = useState("");
  const [password, setPassword] = useState("");
  const [confirmPassword, setConfirmPassword] = useState("");
  const [message, setMessage] = useState("");
  const [error, setError] = useState("");
  const [loading, setLoading] = useState(false);
  const [success, setSuccess] = useState(false);

  // Pre-fill email for admin registration
  useEffect(() => {
    if (isAdminRegistration && emailParam) {
      setEmail(emailParam);
    }
  }, [isAdminRegistration, emailParam]);

  // Fetch organization info on mount (skip for admin registration)
  useEffect(() => {
    async function fetchOrgInfo() {
      try {
        const info = await tenantsApi.getRegistrationInfo(slug);
        setOrgInfo(info);
      } catch (err) {
        const errorMessage = err instanceof Error ? err.message : "Organization not found";
        setOrgError(errorMessage);
      } finally {
        setOrgLoading(false);
      }
    }

    if (slug && !isAdminRegistration) {
      fetchOrgInfo();
    }
  }, [slug, isAdminRegistration]);

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setError("");

    const validation = validatePassword(password, confirmPassword);
    if (!validation.valid) {
      setError(t(validation.error === "mismatch" ? "passwordMismatch" : "passwordTooShort"));
      return;
    }

    setLoading(true);

    try {
      if (isAdminRegistration && token && emailParam) {
        // Admin registration flow
        const response = await authApi.registerAdmin({
          token,
          email: emailParam,
          name,
          password,
          password_confirmation: confirmPassword,
        });

        // Auto-login with returned token
        setAuthToken(response.token);

        // Redirect to dashboard
        router.push("/dashboard");
      } else {
        // Employee registration flow (current behavior)
        const response = await fetch(
          `${process.env.NEXT_PUBLIC_API_URL}/auth/register`,
          {
            method: "POST",
            headers: {
              "Content-Type": "application/json",
              "X-Tenant-ID": slug,
            },
            body: JSON.stringify({
              name,
              email,
              password,
              password_confirmation: confirmPassword,
              message,
            }),
          }
        );

        if (!response.ok) {
          const data = await response.json();
          throw new Error(data.error || data.message || t("registerFailed"));
        }

        setSuccess(true);
      }
    } catch (err) {
      setError(translateApiError(err, t, ERROR_MAP));
    } finally {
      setLoading(false);
    }
  };

  // Loading state while fetching organization info
  if (orgLoading) {
    return (
      <div className="min-h-[calc(100vh-8rem)] flex items-center justify-center px-4">
        <Spinner size="lg" />
      </div>
    );
  }

  // Error state if organization not found
  if (orgError) {
    return (
      <AuthPageContainer>
        <div className="text-center">
          <ResultIcon type="error" size="lg" className="mx-auto mb-6" />
          <h1 className="text-2xl font-bold mb-4">
            {t("orgNotFound")}
          </h1>
          <p className="text-gray-600 dark:text-gray-400 mb-6">
            {t("orgNotFoundMessage")}
          </p>
          <Link href="/login">
            <Button>{t("backToLogin")}</Button>
          </Link>
        </div>
      </AuthPageContainer>
    );
  }

  // Show success message after registration
  if (success) {
    return (
      <AuthPageContainer>
        <div className="text-center">
          <ResultIcon type="success" size="lg" className="mx-auto mb-6" />
          <h1 className="text-2xl font-bold mb-4">
            {t("registerSuccessTitle")}
          </h1>
          <p className="text-gray-600 dark:text-gray-400 mb-6">
            {t("registerSuccessMessage")}
          </p>
          <Link href="/login">
            <Button>{t("backToLogin")}</Button>
          </Link>
        </div>
      </AuthPageContainer>
    );
  }

  return (
    <AuthPageContainer>
      <h1 className="text-2xl font-bold text-center mb-2">
        {isAdminRegistration ? t("adminRegistrationTitle") : t("registerForOrg", { orgName: orgInfo?.name ?? "" })}
      </h1>
      {isAdminRegistration && orgInfo && (
        <p className="text-sm text-gray-600 dark:text-gray-400 text-center mb-8">
          {t("adminRegistrationSubtitle", { orgName: orgInfo?.name ?? slug })}
        </p>
      )}
      {!isAdminRegistration && <div className="mb-8" />}

      {error && <Alert type="error" message={error} className="mb-6" />}

      <form onSubmit={handleSubmit} className="space-y-6">
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
          disabled={isAdminRegistration}
        />

        <div>
          <label htmlFor="password" className="block text-sm font-medium mb-2">
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

        <div>
          <label htmlFor="confirmPassword" className="block text-sm font-medium mb-2">
            {t("confirmPassword")}
          </label>
          <PasswordInput
            id="confirmPassword"
            value={confirmPassword}
            onChange={(e) => setConfirmPassword(e.target.value)}
            placeholder={t("passwordPlaceholder")}
            required
          />
        </div>

        {!isAdminRegistration && (
          <FormTextarea
            id="message"
            label={t("message")}
            value={message}
            onChange={(e) => setMessage(e.target.value)}
            placeholder={t("messagePlaceholder")}
            rows={3}
          />
        )}

        <Button type="submit" fullWidth loading={loading}>
          {loading
            ? t("registering")
            : isAdminRegistration
              ? t("completeRegistration")
              : t("registerButton")}
        </Button>
      </form>

      {!isAdminRegistration && (
        <p className="mt-6 text-center text-sm text-gray-600 dark:text-gray-400">
          {t("hasAccount")}{" "}
          <Link
            href="/login"
            className="text-blue-600 hover:text-blue-700 font-medium"
          >
            {t("loginHere")}
          </Link>
        </p>
      )}
    </AuthPageContainer>
  );
}
