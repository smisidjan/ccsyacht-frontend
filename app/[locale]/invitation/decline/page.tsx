"use client";

import { useState, useEffect } from "react";
import { useSearchParams } from "next/navigation";
import { useTranslations } from "next-intl";
import { Link } from "@/i18n/navigation";
import { invitationsApi } from "@/lib/api/client";

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
      } catch (err) {
        console.error("Decline error:", err);
        setState("error");
      }
    };

    declineInvitation();
  }, [token]);

  return (
    <div className="min-h-[calc(100vh-8rem)] flex items-center justify-center px-4">
      <div className="w-full max-w-md">
        <div className="bg-white dark:bg-gray-900 rounded-2xl shadow-2xl dark:shadow-gray-900/50 p-8 border border-gray-100 dark:border-gray-800">
          {state === "loading" && (
            <div className="text-center py-8">
              <div className="animate-spin rounded-full h-8 w-8 border-b-2 border-blue-600 mx-auto mb-4"></div>
              <p className="text-sm text-gray-600 dark:text-gray-400">
                {t("processing")}
              </p>
            </div>
          )}

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

          {state === "success" && (
            <>
              <div className="flex justify-center mb-6">
                <div className="w-16 h-16 bg-gray-100 dark:bg-gray-800 rounded-full flex items-center justify-center">
                  <svg className="w-8 h-8 text-gray-600 dark:text-gray-400" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                    <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M6 18L18 6M6 6l12 12" />
                  </svg>
                </div>
              </div>
              <h1 className="text-2xl font-bold text-center mb-4">
                {t("declineTitle")}
              </h1>
              <p className="text-sm text-gray-600 dark:text-gray-400 text-center mb-8">
                {t("declineMessage")}
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
