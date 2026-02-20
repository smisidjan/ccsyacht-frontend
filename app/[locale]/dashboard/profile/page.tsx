"use client";

import { useTranslations } from "next-intl";
import ComingSoon from "@/app/components/ui/ComingSoon";
import { UserIcon } from "@heroicons/react/24/outline";

export default function ProfilePage() {
  const t = useTranslations("dashboard");

  return (
    <div>
      <h1 className="text-2xl font-bold mb-6">{t("profile")}</h1>
      <ComingSoon icon={UserIcon} />
    </div>
  );
}
