"use client";

import { useTranslations } from "next-intl";
import { useParams } from "next/navigation";
import ComingSoon from "@/app/components/ui/ComingSoon";
import { Square3Stack3DIcon } from "@heroicons/react/24/outline";
import { Link } from "@/i18n/navigation";
import { ArrowLeftIcon } from "@heroicons/react/24/outline";

export default function AreaDetailPage() {
  const t = useTranslations("projectDetail");
  const params = useParams();

  return (
    <div>
      <div className="flex items-center gap-4 mb-6">
        <Link
          href={`/dashboard/projects/${params.id}`}
          className="p-2 hover:bg-gray-100 dark:hover:bg-gray-800 rounded-lg transition-colors"
        >
          <ArrowLeftIcon className="w-5 h-5 text-gray-600 dark:text-gray-400" />
        </Link>
        <h1 className="text-2xl font-bold">{t("areasSection.title")}</h1>
      </div>
      <ComingSoon icon={Square3Stack3DIcon} />
    </div>
  );
}
