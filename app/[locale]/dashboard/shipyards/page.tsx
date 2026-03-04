"use client";

import { useState } from "react";
import { useTranslations } from "next-intl";
import {
  PlusIcon,
  BuildingOffice2Icon,
  PencilIcon,
  TrashIcon,
  MapPinIcon,
  UserIcon,
  EnvelopeIcon,
  PhoneIcon,
} from "@heroicons/react/24/outline";
import { useShipyards } from "@/lib/api";
import { PERMISSIONS } from "@/lib/constants/permissions";
import { usePermission } from "@/lib/hooks/usePermission";
import { useMinimumLoadingTime } from "@/lib/hooks/useMinimumLoadingTime";
import ProtectedRoute from "@/app/components/guards/ProtectedRoute";
import Button from "@/app/components/ui/Button";
import LoadingSkeleton from "@/app/components/ui/LoadingSkeleton";
import ShipyardFormModal from "@/app/components/modals/ShipyardFormModal";
import DeleteShipyardModal from "@/app/components/modals/DeleteShipyardModal";
import type { Shipyard, CreateShipyardRequest, UpdateShipyardRequest } from "@/lib/api/types";

export default function ShipyardsPage() {
  const t = useTranslations("shipyards");
  const {
    data: shipyards,
    loading: rawLoading,
    createShipyard,
    updateShipyard,
    deleteShipyard,
  } = useShipyards();
  const { hasPermission } = usePermission();

  const loading = useMinimumLoadingTime(rawLoading);

  // Modal state
  const [isFormModalOpen, setIsFormModalOpen] = useState(false);
  const [editingShipyard, setEditingShipyard] = useState<Shipyard | null>(null);
  const [isDeleteModalOpen, setIsDeleteModalOpen] = useState(false);
  const [deletingShipyard, setDeletingShipyard] = useState<Shipyard | null>(null);

  // Permissions
  const canCreateShipyard = hasPermission(PERMISSIONS.CREATE_SHIPYARDS);
  const canEditShipyard = hasPermission(PERMISSIONS.EDIT_SHIPYARDS);
  const canDeleteShipyard = hasPermission(PERMISSIONS.DELETE_SHIPYARDS);

  const shipyardsArray = Array.isArray(shipyards) ? shipyards : [];

  // Handlers
  const handleCreate = () => {
    setEditingShipyard(null);
    setIsFormModalOpen(true);
  };

  const handleEdit = (shipyard: Shipyard) => {
    setEditingShipyard(shipyard);
    setIsFormModalOpen(true);
  };

  const handleDelete = (shipyard: Shipyard) => {
    setDeletingShipyard(shipyard);
    setIsDeleteModalOpen(true);
  };

  const handleFormSubmit = async (data: CreateShipyardRequest | UpdateShipyardRequest) => {
    if (editingShipyard) {
      // Edit mode
      await updateShipyard(editingShipyard.identifier, data);
    } else {
      // Create mode
      await createShipyard(data as CreateShipyardRequest);
    }
    setIsFormModalOpen(false);
    setEditingShipyard(null);
  };

  const handleDeleteConfirm = async () => {
    if (deletingShipyard) {
      await deleteShipyard(deletingShipyard.identifier);
      setIsDeleteModalOpen(false);
      setDeletingShipyard(null);
    }
  };

  return (
    <ProtectedRoute permissions={PERMISSIONS.VIEW_SHIPYARDS}>
      <div>
        {/* Header */}
        <div className="flex items-center justify-between mb-8">
          <div>
            <h1 className="text-3xl font-bold text-gray-900 dark:text-white">
              {t("title")}
            </h1>
            <p className="text-gray-600 dark:text-gray-400 mt-2">
              {t("subtitle")}
            </p>
          </div>
          {canCreateShipyard && (
            <Button onClick={handleCreate}>
              <PlusIcon className="w-5 h-5" />
              {t("createShipyard")}
            </Button>
          )}
        </div>

        {/* Content */}
        {loading ? (
          <LoadingSkeleton type="table" rows={5} />
        ) : shipyardsArray.length === 0 ? (
          <div className="text-center py-16 bg-gradient-to-br from-white to-gray-50 dark:from-gray-800 dark:to-gray-900 rounded-2xl border-2 border-dashed border-gray-300 dark:border-gray-700 shadow-inner">
            <div className="inline-flex items-center justify-center w-20 h-20 bg-gradient-to-br from-blue-100 to-blue-200 dark:from-blue-900/30 dark:to-blue-800/30 rounded-2xl mb-4 shadow-lg">
              <BuildingOffice2Icon className="w-10 h-10 text-blue-600 dark:text-blue-400" />
            </div>
            <h3 className="text-lg font-semibold text-gray-900 dark:text-white mb-2">
              {t("noShipyards")}
            </h3>
            <p className="text-gray-600 dark:text-gray-400 mb-6 max-w-sm mx-auto">
              {t("subtitle")}
            </p>
            {canCreateShipyard && (
              <Button onClick={handleCreate}>
                <PlusIcon className="w-5 h-5" />
                {t("createFirst")}
              </Button>
            )}
          </div>
        ) : (
          <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6">
            {shipyardsArray.map((shipyard: Shipyard) => (
              <div
                key={shipyard.identifier}
                className="group relative bg-white dark:bg-gray-800 rounded-2xl border border-gray-200 dark:border-gray-700 shadow-lg hover:shadow-2xl dark:shadow-gray-900/50 dark:hover:shadow-gray-900/70 transition-all duration-300 hover:-translate-y-1 overflow-hidden"
              >
                {/* Gradient accent */}
                <div className="absolute top-0 left-0 right-0 h-1 bg-gradient-to-r from-blue-500 to-blue-600" />

                {/* Content */}
                <div className="p-6">
                  {/* Header with actions */}
                  <div className="flex items-start justify-between mb-4">
                    <div className="flex-1 min-w-0">
                      <div className="flex items-center gap-2 mb-1">
                        <div className="flex-shrink-0 w-10 h-10 bg-gradient-to-br from-blue-100 to-blue-200 dark:from-blue-900/30 dark:to-blue-800/30 rounded-xl flex items-center justify-center shadow-sm">
                          <BuildingOffice2Icon className="w-5 h-5 text-blue-600 dark:text-blue-400" />
                        </div>
                        <h3 className="text-xl font-bold text-gray-900 dark:text-white truncate">
                          {shipyard.name}
                        </h3>
                      </div>
                    </div>

                    {/* Action buttons */}
                    {(canEditShipyard || canDeleteShipyard) && (
                      <div className="flex gap-1 ml-2 opacity-0 group-hover:opacity-100 transition-opacity">
                        {canEditShipyard && (
                          <button
                            onClick={() => handleEdit(shipyard)}
                            className="p-2 text-gray-400 hover:text-blue-600 dark:hover:text-blue-400 hover:bg-blue-50 dark:hover:bg-blue-900/20 rounded-lg transition-all duration-200"
                            title={t("edit")}
                          >
                            <PencilIcon className="w-4 h-4" />
                          </button>
                        )}
                        {canDeleteShipyard && (
                          <button
                            onClick={() => handleDelete(shipyard)}
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
            ))}
          </div>
        )}

        {/* Modals */}
        <ShipyardFormModal
          isOpen={isFormModalOpen}
          onClose={() => {
            setIsFormModalOpen(false);
            setEditingShipyard(null);
          }}
          onSubmit={handleFormSubmit}
          shipyard={editingShipyard}
        />

        <DeleteShipyardModal
          isOpen={isDeleteModalOpen}
          shipyardName={deletingShipyard?.name || ""}
          onClose={() => {
            setIsDeleteModalOpen(false);
            setDeletingShipyard(null);
          }}
          onConfirm={handleDeleteConfirm}
        />
      </div>
    </ProtectedRoute>
  );
}
