"use client";

import { useTranslations } from "next-intl";

export default function ProfilePage() {
  const t = useTranslations("dashboard");

  return (
    <div>
      <h1 className="text-2xl font-bold mb-6">{t("profile")}</h1>
      <p className="text-gray-600 dark:text-gray-400">{t("profileDescription")}</p>
    </div>
  );
}
