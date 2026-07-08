"use client";

import { useTranslations } from "next-intl";
import {
  BuildingOffice2Icon,
  PencilIcon,
  TrashIcon,
  MapPinIcon,
  UserIcon,
  EnvelopeIcon,
  PhoneIcon,
} from "@heroicons/react/24/outline";
import type { Shipyard } from "@/lib/api/types";

interface ShipyardCardProps {
  shipyard: Shipyard;
  canEdit: boolean;
  canDelete: boolean;
  onEdit: (shipyard: Shipyard) => void;
  onDelete: (shipyard: Shipyard) => void;
}

export default function ShipyardCard({
  shipyard,
  canEdit,
  canDelete,
  onEdit,
  onDelete,
}: ShipyardCardProps) {
  const t = useTranslations("shipyards");

  return (
    <div className="group relative bg-white dark:bg-gray-800 rounded-2xl border border-gray-200 dark:border-gray-700 shadow-lg hover:shadow-2xl dark:shadow-gray-900/50 dark:hover:shadow-gray-900/70 transition-all duration-300 hover:-translate-y-1 overflow-hidden">
      {/* Gradient accent */}
      <div className="absolute top-0 left-0 right-0 h-1 bg-gradient-to-r from-blue-500 to-blue-600" />

      {/* Content */}
      <div className="p-6">
        {/* Header with actions */}
        <div className="flex items-start justify-between mb-4">
          <div className="flex-1 min-w-0">
            <div className="flex items-start gap-2 mb-1">
              <div className="flex-shrink-0 w-10 h-10 bg-gradient-to-br from-blue-100 to-blue-200 dark:from-blue-900/30 dark:to-blue-800/30 rounded-xl flex items-center justify-center shadow-sm">
                <BuildingOffice2Icon className="w-5 h-5 text-blue-600 dark:text-blue-400" />
              </div>
              <div className="flex items-center gap-2 flex-wrap min-w-0">
                <h3 className="text-xl font-bold text-gray-900 dark:text-white break-words">
                  {shipyard.name}
                </h3>
                {shipyard.isQuayside && (
                  <span className="flex-shrink-0 inline-flex items-center px-2 py-0.5 rounded text-xs font-medium bg-blue-100 text-blue-700 dark:bg-blue-900/40 dark:text-blue-300">
                    {t("quayside")}
                  </span>
                )}
              </div>
            </div>
          </div>

          {/* Action buttons — hidden for the reserved Keyside entry */}
          {!shipyard.isQuayside && (canEdit || canDelete) && (
            <div className="flex gap-1 ml-2 opacity-0 group-hover:opacity-100 transition-opacity">
              {canEdit && (
                <button
                  onClick={() => onEdit(shipyard)}
                  className="p-2 text-gray-400 hover:text-blue-600 dark:hover:text-blue-400 hover:bg-blue-50 dark:hover:bg-blue-900/20 rounded-lg transition-all duration-200"
                  title={t("edit")}
                >
                  <PencilIcon className="w-4 h-4" />
                </button>
              )}
              {canDelete && (
                <button
                  onClick={() => onDelete(shipyard)}
                  className="p-2 text-gray-400 hover:text-red-600 dark:hover:text-red-400 hover:bg-red-50 dark:hover:bg-red-900/20 rounded-lg transition-all duration-200"
                  title={t("delete")}
                >
                  <TrashIcon className="w-4 h-4" />
                </button>
              )}
            </div>
          )}
        </div>

        {/* Details */}
        <div className="space-y-3">
          {/* Keyside explanation */}
          {shipyard.isQuayside && (
            <p className="text-sm text-gray-500 dark:text-gray-400 leading-relaxed">
              {t("quaysideDescription")}
            </p>
          )}

          {/* Address */}
          {shipyard.address && (
            <div className="flex items-start gap-3 text-sm">
              <MapPinIcon className="w-5 h-5 text-gray-400 flex-shrink-0 mt-0.5" />
              <p className="text-gray-700 dark:text-gray-300 leading-relaxed">
                {shipyard.address}
              </p>
            </div>
          )}

          {/* Contact info */}
          {shipyard.contactPoint && (
            <div className="pt-3 border-t border-gray-100 dark:border-gray-700 space-y-2">
              {shipyard.contactPoint.name && (
                <div className="flex items-center gap-3 text-sm">
                  <UserIcon className="w-5 h-5 text-gray-400 flex-shrink-0" />
                  <span className="text-gray-700 dark:text-gray-300 font-medium">
                    {shipyard.contactPoint.name}
                  </span>
                </div>
              )}
              {shipyard.contactPoint.email && (
                <div className="flex items-center gap-3 text-sm group/email">
                  <EnvelopeIcon className="w-5 h-5 text-gray-400 flex-shrink-0" />
                  <a
                    href={`mailto:${shipyard.contactPoint.email}`}
                    className="text-blue-600 dark:text-blue-400 hover:text-blue-700 dark:hover:text-blue-300 hover:underline truncate transition-colors"
                  >
                    {shipyard.contactPoint.email}
                  </a>
                </div>
              )}
              {shipyard.contactPoint.telephone && (
                <div className="flex items-center gap-3 text-sm">
                  <PhoneIcon className="w-5 h-5 text-gray-400 flex-shrink-0" />
                  <a
                    href={`tel:${shipyard.contactPoint.telephone}`}
                    className="text-blue-600 dark:text-blue-400 hover:text-blue-700 dark:hover:text-blue-300 hover:underline transition-colors"
                  >
                    {shipyard.contactPoint.telephone}
                  </a>
                </div>
              )}
            </div>
          )}
        </div>
      </div>
    </div>
  );
}
