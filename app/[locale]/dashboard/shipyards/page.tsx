"use client";

import { useState } from "react";
import { useTranslations } from "next-intl";
import { PlusIcon, BuildingOffice2Icon, MagnifyingGlassIcon } from "@heroicons/react/24/outline";
import { useShipyards } from "@/lib/api";
import { PERMISSIONS } from "@/lib/constants/permissions";
import { usePermission } from "@/lib/hooks/usePermission";
import { useMinimumLoadingTime } from "@/lib/hooks/useMinimumLoadingTime";
import ProtectedRoute from "@/app/components/guards/ProtectedRoute";
import Button from "@/app/components/ui/Button";
import LoadingSkeleton from "@/app/components/ui/LoadingSkeleton";
import PageHeader from "@/app/components/ui/PageHeader";
import { ShipyardFormModal, ShipyardCard } from "@/app/features/shipyards";
import DeleteConfirmModal from "@/app/components/modals/DeleteConfirmModal";
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
  const [searchQuery, setSearchQuery] = useState("");

  // Permissions
  const canCreateShipyard = hasPermission(PERMISSIONS.CREATE_SHIPYARDS);
  const canEditShipyard = hasPermission(PERMISSIONS.EDIT_SHIPYARDS);
  const canDeleteShipyard = hasPermission(PERMISSIONS.DELETE_SHIPYARDS);

  const shipyardsArray = Array.isArray(shipyards)
    ? [...shipyards].sort((a, b) => (b.isQuayside ? 1 : 0) - (a.isQuayside ? 1 : 0))
    : [];

  const query = searchQuery.trim().toLowerCase();
  const filteredShipyards = query
    ? shipyardsArray.filter((s) =>
        [s.name, s.address, s.contactPoint?.name, s.contactPoint?.email]
          .filter(Boolean)
          .some((field) => field!.toLowerCase().includes(query))
      )
    : shipyardsArray;

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
      await updateShipyard(editingShipyard.identifier, data);
    } else {
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
        <PageHeader
          title={t("title")}
          subtitle={t("subtitle")}
          action={canCreateShipyard && (
            <Button
              size="sm"
              className="whitespace-nowrap sm:py-3 sm:px-5 sm:text-base"
              onClick={handleCreate}
            >
              <PlusIcon className="w-5 h-5" />
              {t("createShipyard")}
            </Button>
          )}
        />

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
          <>
            <div className="relative max-w-sm mb-4">
              <MagnifyingGlassIcon className="w-4 h-4 absolute left-3 top-1/2 -translate-y-1/2 text-gray-400" />
              <input
                type="text"
                placeholder={t("searchPlaceholder")}
                value={searchQuery}
                onChange={(e) => setSearchQuery(e.target.value)}
                className="w-full pl-9 pr-3 py-1.5 text-sm border border-gray-300 dark:border-gray-600 rounded-md bg-white dark:bg-gray-800 text-gray-900 dark:text-white focus:outline-none focus:ring-2 focus:ring-blue-500 focus:border-blue-500"
              />
            </div>

            {filteredShipyards.length === 0 ? (
              <div className="flex flex-col items-center justify-center py-16 text-center bg-white dark:bg-gray-800 rounded-xl border border-gray-200 dark:border-gray-700">
                <h3 className="text-base font-semibold text-gray-900 dark:text-white mb-1">
                  {t("noSearchResults", { query: searchQuery.trim() })}
                </h3>
              </div>
            ) : (
              <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6">
                {filteredShipyards.map((shipyard: Shipyard) => (
                  <ShipyardCard
                    key={shipyard.identifier}
                    shipyard={shipyard}
                    canEdit={canEditShipyard}
                    canDelete={canDeleteShipyard}
                    onEdit={handleEdit}
                    onDelete={handleDelete}
                  />
                ))}
              </div>
            )}
          </>
        )}

        {/* Modals */}
        {isFormModalOpen && (
          <ShipyardFormModal
            isOpen={isFormModalOpen}
            onClose={() => {
              setIsFormModalOpen(false);
              setEditingShipyard(null);
            }}
            onSubmit={handleFormSubmit}
            shipyard={editingShipyard}
          />
        )}

        {isDeleteModalOpen && (
          <DeleteConfirmModal
            isOpen={isDeleteModalOpen}
            onClose={() => {
              setIsDeleteModalOpen(false);
              setDeletingShipyard(null);
            }}
            onConfirm={handleDeleteConfirm}
            title={t("deleteModal.title")}
            message={t("deleteModal.message", { name: deletingShipyard?.name || "" })}
            warning={t("deleteModal.warning")}
            successMessage={t("deleteModal.success")}
            errorMessage={t("deleteModal.error")}
            confirmLabel={t("deleteModal.confirm")}
          />
        )}
      </div>
    </ProtectedRoute>
  );
}
