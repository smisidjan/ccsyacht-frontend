"use client";

import { useLocale, useTranslations } from "next-intl";
import { usePathname, useRouter } from "@/i18n/navigation";
import { routing } from "@/i18n/routing";

export default function Footer() {
  const t = useTranslations("common");
  const tFooter = useTranslations("footer");
  const locale = useLocale();
  const router = useRouter();
  const pathname = usePathname();

  const handleLanguageChange = (newLocale: string) => {
    router.replace(pathname, { locale: newLocale as "en" | "nl" });
  };

  return (
    <footer className="w-full border-t border-gray-200 dark:border-gray-800 mt-auto">
      <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8">
        <div className="flex justify-between items-center h-16">
          <p className="text-sm text-gray-600 dark:text-gray-400">
            {tFooter("copyright", { year: new Date().getFullYear() })}
          </p>

          <div className="flex items-center gap-2">
            <span className="text-sm text-gray-600 dark:text-gray-400">
              {t("language")}:
            </span>
            <select
              value={locale}
              onChange={(e) => handleLanguageChange(e.target.value)}
              className="text-sm bg-transparent border border-gray-300 dark:border-gray-700 rounded-lg px-3 py-1.5 focus:ring-2 focus:ring-blue-500 focus:border-transparent outline-none cursor-pointer"
            >
              {routing.locales.map((loc) => (
                <option key={loc} value={loc}>
                  {loc === "nl" ? "Nederlands" : "English"}
                </option>
              ))}
            </select>
          </div>
        </div>
      </div>
    </footer>
  );
}
