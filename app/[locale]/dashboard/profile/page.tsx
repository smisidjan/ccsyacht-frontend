"use client";

import { useState } from "react";
import { useTranslations, useLocale } from "next-intl";
import { useCurrentUser } from "@/lib/api/hooks";
import { usersApi } from "@/lib/api/client";
import ProfileInfoItem from "@/app/components/ui/ProfileInfoItem";
import ChangeNameModal from "@/app/components/modals/ChangeNameModal";
import ChangePasswordModal from "@/app/components/modals/ChangePasswordModal";
import {
  UserIcon,
  EnvelopeIcon,
  BuildingOffice2Icon,
  ShieldCheckIcon,
  CalendarIcon,
  CheckCircleIcon,
  XCircleIcon,
  LockClosedIcon,
} from "@heroicons/react/24/outline";

export default function ProfilePage() {
  const t = useTranslations("profile");
  const locale = useLocale();
  const { data: user, loading, error, refetch } = useCurrentUser();

  const [showNameModal, setShowNameModal] = useState(false);
  const [showPasswordModal, setShowPasswordModal] = useState(false);

  const handleNameSubmit = async (newName: string) => {
    if (!user) return;
    await usersApi.update(user.identifier, { name: newName });
    await refetch();
  };

  const formatDate = (dateString: string) => {
    return new Date(dateString).toLocaleDateString(locale, {
      year: "numeric",
      month: "long",
      day: "numeric",
    });
  };

  if (loading) {
    return (
      <div className="space-y-6">
        <div className="animate-pulse">
          <div className="h-8 bg-gray-200 dark:bg-gray-700 rounded w-32 mb-2"></div>
          <div className="h-4 bg-gray-200 dark:bg-gray-700 rounded w-48"></div>
        </div>
        <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
          <div className="bg-white dark:bg-gray-800 rounded-xl p-6 h-64 animate-pulse">
            <div className="h-6 bg-gray-200 dark:bg-gray-700 rounded w-40 mb-4"></div>
            <div className="space-y-3">
              <div className="h-4 bg-gray-200 dark:bg-gray-700 rounded w-full"></div>
              <div className="h-4 bg-gray-200 dark:bg-gray-700 rounded w-3/4"></div>
            </div>
          </div>
          <div className="bg-white dark:bg-gray-800 rounded-xl p-6 h-64 animate-pulse">
            <div className="h-6 bg-gray-200 dark:bg-gray-700 rounded w-40 mb-4"></div>
            <div className="space-y-3">
              <div className="h-4 bg-gray-200 dark:bg-gray-700 rounded w-full"></div>
              <div className="h-4 bg-gray-200 dark:bg-gray-700 rounded w-3/4"></div>
            </div>
          </div>
        </div>
      </div>
    );
  }

  if (error || !user) {
    return (
      <div className="text-center py-12">
        <p className="text-red-500">{error?.message || "Failed to load profile"}</p>
      </div>
    );
  }

  return (
    <div className="space-y-6">
      {/* Header */}
      <div>
        <h1 className="text-2xl font-bold text-gray-900 dark:text-white">
          {t("title")}
        </h1>
        <p className="text-gray-500 dark:text-gray-400 mt-1">{t("subtitle")}</p>
      </div>

      <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
        {/* Personal Information */}
        <div className="bg-white dark:bg-gray-800 rounded-xl shadow-lg dark:shadow-gray-900/30 border border-gray-100 dark:border-gray-700 p-6">
          <h2 className="text-lg font-semibold text-gray-900 dark:text-white mb-6 flex items-center gap-2">
            <UserIcon className="w-5 h-5 text-blue-600" />
            {t("personalInfo")}
          </h2>

          <div className="space-y-4">
            <ProfileInfoItem
              icon={UserIcon}
              iconBgColor="bg-blue-100 dark:bg-blue-900/30"
              iconColor="text-blue-600 dark:text-blue-400"
              label={t("name")}
              value={user.name}
              onChangeClick={() => setShowNameModal(true)}
              changeLabel={t("change")}
            />

            <ProfileInfoItem
              icon={EnvelopeIcon}
              iconBgColor="bg-green-100 dark:bg-green-900/30"
              iconColor="text-green-600 dark:text-green-400"
              label={t("email")}
              value={user.email}
            />

            <ProfileInfoItem
              icon={LockClosedIcon}
              iconBgColor="bg-amber-100 dark:bg-amber-900/30"
              iconColor="text-amber-600 dark:text-amber-400"
              label={t("password")}
              value="••••••••"
              onChangeClick={() => setShowPasswordModal(true)}
              changeLabel={t("change")}
            />

            <ProfileInfoItem
              icon={BuildingOffice2Icon}
              iconBgColor="bg-purple-100 dark:bg-purple-900/30"
              iconColor="text-purple-600 dark:text-purple-400"
              label={t("organization")}
              value={user.memberOf.name}
            />

            <ProfileInfoItem
              icon={ShieldCheckIcon}
              iconBgColor="bg-orange-100 dark:bg-orange-900/30"
              iconColor="text-orange-600 dark:text-orange-400"
              label={t("roles")}
              value={
                <div className="flex flex-wrap gap-2 mt-1">
                  {user.roles.map((role) => (
                    <span
                      key={role}
                      className="inline-flex items-center px-2.5 py-0.5 rounded-full text-xs font-medium bg-blue-100 text-blue-800 dark:bg-blue-900/30 dark:text-blue-300"
                    >
                      {t(`roleNames.${role}`)}
                    </span>
                  ))}
                </div>
              }
            />
          </div>
        </div>

        {/* Account Details */}
        <div className="bg-white dark:bg-gray-800 rounded-xl shadow-lg dark:shadow-gray-900/30 border border-gray-100 dark:border-gray-700 p-6">
          <h2 className="text-lg font-semibold text-gray-900 dark:text-white mb-6 flex items-center gap-2">
            <CalendarIcon className="w-5 h-5 text-blue-600" />
            {t("accountDetails")}
          </h2>

          <div className="space-y-4">
            <ProfileInfoItem
              icon={user.active ? CheckCircleIcon : XCircleIcon}
              iconBgColor={user.active ? "bg-green-100 dark:bg-green-900/30" : "bg-red-100 dark:bg-red-900/30"}
              iconColor={user.active ? "text-green-600 dark:text-green-400" : "text-red-600 dark:text-red-400"}
              label={t("accountStatus")}
              value={
                <span className={user.active ? "text-green-600 dark:text-green-400" : "text-red-600 dark:text-red-400"}>
                  {user.active ? t("active") : t("inactive")}
                </span>
              }
            />

            <ProfileInfoItem
              icon={user.emailVerified ? CheckCircleIcon : XCircleIcon}
              iconBgColor={user.emailVerified ? "bg-green-100 dark:bg-green-900/30" : "bg-yellow-100 dark:bg-yellow-900/30"}
              iconColor={user.emailVerified ? "text-green-600 dark:text-green-400" : "text-yellow-600 dark:text-yellow-400"}
              label={t("emailVerified")}
              value={
                <span className={user.emailVerified ? "text-green-600 dark:text-green-400" : "text-yellow-600 dark:text-yellow-400"}>
                  {user.emailVerified ? t("yes") : t("no")}
                </span>
              }
            />

            <ProfileInfoItem
              icon={CalendarIcon}
              iconBgColor="bg-gray-100 dark:bg-gray-700"
              iconColor="text-gray-600 dark:text-gray-400"
              label={t("memberSince")}
              value={formatDate(user.dateCreated)}
            />

            <ProfileInfoItem
              icon={CalendarIcon}
              iconBgColor="bg-gray-100 dark:bg-gray-700"
              iconColor="text-gray-600 dark:text-gray-400"
              label={t("lastModified")}
              value={formatDate(user.dateModified)}
            />
          </div>
        </div>
      </div>

      {/* Modals */}
      <ChangeNameModal
        isOpen={showNameModal}
        currentName={user.name}
        onClose={() => setShowNameModal(false)}
        onSubmit={handleNameSubmit}
      />

      <ChangePasswordModal
        isOpen={showPasswordModal}
        onClose={() => setShowPasswordModal(false)}
      />
    </div>
  );
}
