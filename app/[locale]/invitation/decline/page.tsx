"use client";

import { useState, useEffect } from "react";
import { useSearchParams } from "next/navigation";
import { useTranslations } from "next-intl";
import { Link } from "@/i18n/navigation";
import { invitationsApi } from "@/lib/api/client";
import AuthPageContainer from "@/app/components/ui/AuthPageContainer";
import Spinner from "@/app/components/ui/Spinner";
import ResultIcon from "@/app/components/ui/ResultIcon";
import Button from "@/app/components/ui/Button";

type PageState = "loading" | "success" | "error";

export default function DeclineInvitationPage() {
  const t = useTranslations("invitation");
  const searchParams = useSearchParams();
  const token = searchParams.get("token") || "";

  const [state, setState] = useState<PageState>(token ? "loading" : "error");

  useEffect(() => {
    if (!token) {
      setState("error");
      return;
    }

    const declineInvitation = async () => {
      try {
        await invitationsApi.decline({ token });
        setState("success");
      } catch {
        setState("error");
      }
    };

    declineInvitation();
  }, [token]);

  return (
    <AuthPageContainer>
      {state === "loading" && (
        <div className="text-center py-8">
          <Spinner className="mx-auto mb-4" />
          <p className="text-sm text-gray-600 dark:text-gray-400">
            {t("processing")}
          </p>
        </div>
      )}

      {state === "error" && (
        <div className="text-center">
          <ResultIcon type="error" className="mx-auto mb-6" />
          <h1 className="text-2xl font-bold mb-4">
            {t("invalidInvitation")}
          </h1>
          <p className="text-sm text-gray-600 dark:text-gray-400 mb-8">
            {t("invalidInvitationMessage")}
          </p>
          <Link href="/login">
            <Button fullWidth>{t("goToLogin")}</Button>
          </Link>
        </div>
      )}

      {state === "success" && (
        <div className="text-center">
          <ResultIcon type="info" className="mx-auto mb-6" />
          <h1 className="text-2xl font-bold mb-4">
            {t("declineTitle")}
          </h1>
          <p className="text-sm text-gray-600 dark:text-gray-400 mb-8">
            {t("declineMessage")}
          </p>
          <Link href="/login">
            <Button fullWidth>{t("goToLogin")}</Button>
          </Link>
        </div>
      )}
    </AuthPageContainer>
  );
}
