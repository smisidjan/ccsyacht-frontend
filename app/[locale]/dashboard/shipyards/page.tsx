"use client";

import { useTranslations } from "next-intl";
import ComingSoon from "@/app/components/ui/ComingSoon";
import { BuildingOffice2Icon } from "@heroicons/react/24/outline";

export default function ShipyardsPage() {
  const t = useTranslations("dashboard");

  return (
    <div>
      <h1 className="text-2xl font-bold mb-6">{t("shipyards")}</h1>
      <ComingSoon icon={BuildingOffice2Icon} />
    </div>
  );
}
