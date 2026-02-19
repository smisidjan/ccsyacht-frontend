import { useTranslations } from "next-intl";

export default function Home() {
  const t = useTranslations("common");

  return (
    <div className="min-h-[calc(100vh-8rem)] flex items-center justify-center px-4">
      <div className="text-center">
        <h1 className="text-4xl font-bold mb-4">{t("appName")}</h1>
        <p className="text-gray-600 dark:text-gray-400">
          Welcome to CCS Yacht platform
        </p>
      </div>
    </div>
  );
}
