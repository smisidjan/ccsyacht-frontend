"use client";

import { useState } from "react";
import { useTranslations, useLocale } from "next-intl";
import { useCurrentUserContext } from "@/app/context/CurrentUserContext";
import { usersApi } from "@/lib/api/client";
import { useMinimumLoadingTime } from "@/lib/hooks/useMinimumLoadingTime";
import { ChangeNameModal, ChangePasswordModal, ProfileInfoItem } from "@/app/features/profile";
import PageHeader from "@/app/components/ui/PageHeader";
import { getRoleBadgeColor } from "@/lib/utils/badges";
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
  const { currentUser: user, loading: rawLoading, error, refetch } = useCurrentUserContext();
  const loading = useMinimumLoadingTime(rawLoading);

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
        <div className="bg-white dark:bg-gray-800 rounded-xl p-6 animate-pulse flex items-center gap-4">
          <div className="w-16 h-16 rounded-full bg-gray-200 dark:bg-gray-700 flex-shrink-0"></div>
          <div className="space-y-2 flex-1">
            <div className="h-5 bg-gray-200 dark:bg-gray-700 rounded w-40"></div>
            <div className="h-4 bg-gray-200 dark:bg-gray-700 rounded w-56"></div>
          </div>
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

  const initial = user.name.charAt(0).toUpperCase();

  return (
    <div className="space-y-6">
      <PageHeader title={t("title")} subtitle={t("subtitle")} className="mb-0" />

      {/* Identity hero */}
      <div className="relative bg-white dark:bg-gray-800 rounded-xl shadow-lg dark:shadow-gray-900/30 border border-gray-100 dark:border-gray-700 overflow-hidden">
        <div className="absolute top-0 left-0 right-0 h-1 bg-gradient-to-r from-blue-500 to-blue-600" />
        <div className="p-6 flex flex-col sm:flex-row sm:items-center gap-4">
          <div className="w-16 h-16 rounded-full flex items-center justify-center flex-shrink-0 ring-4 ring-blue-100 dark:ring-blue-900/30 bg-blue-100 dark:bg-blue-900/30">
            <span className="text-2xl font-semibold text-blue-600 dark:text-blue-400">
              {initial}
            </span>
          </div>
          <div className="min-w-0 flex-1">
            <h2 className="text-xl font-bold text-gray-900 dark:text-white truncate">
              {user.name}
            </h2>
            <p className="text-sm text-gray-500 dark:text-gray-400 truncate">{user.email}</p>
            <div className="flex flex-wrap items-center gap-1.5 mt-2">
              {user.roles.map((role) => (
                <span
                  key={role}
                  className={`inline-flex items-center gap-1.5 px-2.5 py-0.5 rounded-full text-xs font-medium ${getRoleBadgeColor(role)}`}
                >
                  {role === "admin" && <ShieldCheckIcon className="w-3 h-3" />}
                  {role.split(" ").map((word) => word.charAt(0).toUpperCase() + word.slice(1)).join(" ")}
                </span>
              ))}
              <span className="inline-flex items-center gap-1.5 px-2.5 py-0.5 rounded-full text-xs font-medium bg-gray-100 text-gray-700 dark:bg-gray-700 dark:text-gray-300">
                <BuildingOffice2Icon className="w-3 h-3" />
                {user.memberOf.name}
              </span>
            </div>
          </div>
        </div>
      </div>

      <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
        {/* Personal Information */}
        <div className="relative bg-white dark:bg-gray-800 rounded-xl shadow-lg dark:shadow-gray-900/30 border border-gray-100 dark:border-gray-700 overflow-hidden p-6">
          <div className="absolute top-0 left-0 right-0 h-1 bg-gradient-to-r from-blue-500 to-blue-600" />
          <h2 className="text-lg font-semibold text-gray-900 dark:text-white mb-6 pb-4 border-b border-gray-100 dark:border-gray-700 flex items-center gap-2.5">
            <span className="w-8 h-8 rounded-lg bg-blue-100 dark:bg-blue-900/30 flex items-center justify-center flex-shrink-0">
              <UserIcon className="w-4 h-4 text-blue-600 dark:text-blue-400" />
            </span>
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
                <div className="flex flex-wrap gap-1.5 mt-1">
                  {user.roles.map((role) => (
                    <span
                      key={role}
                      className={`inline-flex items-center gap-1.5 px-2.5 py-0.5 rounded-full text-xs font-medium ${getRoleBadgeColor(role)}`}
                    >
                      {role === "admin" && <ShieldCheckIcon className="w-3 h-3" />}
                      {role.split(" ").map((word) => word.charAt(0).toUpperCase() + word.slice(1)).join(" ")}
                    </span>
                  ))}
                </div>
              }
            />
          </div>
        </div>

        {/* Account Details */}
        <div className="relative bg-white dark:bg-gray-800 rounded-xl shadow-lg dark:shadow-gray-900/30 border border-gray-100 dark:border-gray-700 overflow-hidden p-6">
          <div className="absolute top-0 left-0 right-0 h-1 bg-gradient-to-r from-blue-500 to-blue-600" />
          <h2 className="text-lg font-semibold text-gray-900 dark:text-white mb-6 pb-4 border-b border-gray-100 dark:border-gray-700 flex items-center gap-2.5">
            <span className="w-8 h-8 rounded-lg bg-blue-100 dark:bg-blue-900/30 flex items-center justify-center flex-shrink-0">
              <CalendarIcon className="w-4 h-4 text-blue-600 dark:text-blue-400" />
            </span>
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
