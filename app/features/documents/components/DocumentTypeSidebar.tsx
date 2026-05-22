"use client";

import { useTranslations } from "next-intl";
import {
  FolderIcon,
  PlusIcon,
  ChevronRightIcon,
} from "@heroicons/react/24/outline";
import DropdownMenu from "@/app/components/ui/DropdownMenu";
import type { DropdownMenuItem } from "@/app/components/ui/DropdownMenu";
import type { DocumentType } from "@/lib/api/types";

interface DocumentTypeSidebarProps {
  documentTypes: DocumentType[];
  selectedTypeId: string | null;
  onSelectType: (typeId: string) => void;
  onCreateType: () => void;
  getMenuItems: (type: DocumentType) => DropdownMenuItem[];
  canCreateDocumentTypes: boolean;
  isReadOnly: boolean;
  showMobileDetail: boolean;
}

export default function DocumentTypeSidebar({
  documentTypes,
  selectedTypeId,
  onSelectType,
  onCreateType,
  getMenuItems,
  canCreateDocumentTypes,
  isReadOnly,
  showMobileDetail,
}: DocumentTypeSidebarProps) {
  const t = useTranslations("projectDetail.documents");
  const tDocTypes = useTranslations("documentTypes");

  const renderTypeRow = (type: DocumentType) => {
    const menuItems = getMenuItems(type);
    const isSelected = selectedTypeId === type.identifier;

    return (
      <div
        key={type.identifier}
        className={`flex items-center justify-between transition-colors ${
          isSelected
            ? "bg-blue-600 text-white"
            : "hover:bg-gray-50 dark:hover:bg-gray-700/50 text-gray-900 dark:text-white"
        }`}
      >
        <button
          onClick={() => onSelectType(type.identifier)}
          className="flex-1 flex items-center justify-between p-3 lg:p-4 text-left gap-2"
        >
          <div className="flex items-center gap-2 lg:gap-3 flex-1 min-w-0">
            <FolderIcon className="w-4 h-4 lg:w-5 lg:h-5 flex-shrink-0" />
            <span className="font-medium text-sm lg:text-base break-words">{type.name}</span>
          </div>
          <div className="flex items-center gap-2 flex-shrink-0">
            <DocumentTypeBadge type={type} isSelected={isSelected} t={t} />
            <ChevronRightIcon className="w-4 h-4 lg:hidden text-gray-400" />
          </div>
        </button>
        {menuItems.length > 0 && (
          <div
            className="pr-2 hidden lg:block"
            onClick={(e) => e.stopPropagation()}
          >
            <DropdownMenu items={menuItems} />
          </div>
        )}
      </div>
    );
  };

  return (
    <div className={`${showMobileDetail ? "hidden" : "block"} lg:block w-full lg:w-64 xl:w-72 flex-shrink-0`}>
      <div className="bg-white dark:bg-gray-800 rounded-2xl border border-gray-200 dark:border-gray-700 shadow-lg flex flex-col max-h-[60vh] lg:max-h-[calc(100vh-240px)]">
        {/* Header */}
        <div className="p-3 lg:p-4 border-b border-gray-200 dark:border-gray-700 flex-shrink-0">
          <div className="flex items-center justify-between">
            <div className="flex items-center gap-2 text-gray-900 dark:text-white">
              <FolderIcon className="w-5 h-5" />
              <h3 className="font-semibold text-sm lg:text-base">{t("documentTypes")}</h3>
            </div>
            {canCreateDocumentTypes && !isReadOnly && (
              <button
                onClick={onCreateType}
                className="p-1.5 text-blue-600 hover:text-blue-700 dark:text-blue-400 dark:hover:text-blue-300 rounded-lg hover:bg-blue-50 dark:hover:bg-blue-900/20 transition-colors"
                title={tDocTypes("addNew")}
              >
                <PlusIcon className="w-5 h-5" />
              </button>
            )}
          </div>
        </div>

        {/* Document Types List — split into user-managed types up
            top, then a "generated from system" group below for types
            populated by another part of the product (release forms,
            etc.). Same renderer for both groups. */}
        <div className="overflow-y-auto overflow-x-visible">
          {documentTypes
            .filter((type) => !type.isSystemManaged)
            .map((type) => renderTypeRow(type))}

          {documentTypes.some((type) => type.isSystemManaged) && (
            <>
              <div className="px-3 lg:px-4 pt-3 pb-1 text-[10px] lg:text-xs font-semibold uppercase tracking-wide text-gray-400 dark:text-gray-500 border-t border-gray-100 dark:border-gray-700">
                {t("documentTypesGeneratedFromSystem")}
              </div>
              {documentTypes
                .filter((type) => type.isSystemManaged)
                .map((type) => renderTypeRow(type))}
            </>
          )}
        </div>
      </div>
    </div>
  );
}

// Helper component for document type badge
interface DocumentTypeBadgeProps {
  type: DocumentType;
  isSelected: boolean;
  t: (key: string) => string;
}

function DocumentTypeBadge({ type, isSelected, t }: DocumentTypeBadgeProps) {
  if (type.documentCount > 0) {
    return (
      <span
        className={`px-2 py-0.5 lg:py-1 text-[10px] lg:text-xs rounded-full ${
          isSelected
            ? "bg-white/20 text-white"
            : "bg-gray-100 dark:bg-gray-700 text-gray-700 dark:text-gray-300"
        }`}
      >
        {type.documentCount}
      </span>
    );
  }

  if (type.assignees && type.assignees.length > 0) {
    return (
      <span
        className={`px-2 py-0.5 lg:py-1 text-[10px] lg:text-xs rounded-full ${
          isSelected
            ? "bg-white/20 text-amber-200"
            : "bg-amber-100 dark:bg-amber-900/30 text-amber-600 dark:text-amber-400"
        }`}
      >
        {t("requested")}
      </span>
    );
  }

  if (type.isRequired) {
    return (
      <span
        className={`px-2 py-0.5 lg:py-1 text-[10px] lg:text-xs rounded-full ${
          isSelected
            ? "bg-white/20 text-red-200"
            : "bg-red-100 dark:bg-red-900/30 text-red-600 dark:text-red-400"
        }`}
      >
        {t("required")}
      </span>
    );
  }

  return (
    <span
      className={`px-2 py-0.5 lg:py-1 text-[10px] lg:text-xs rounded-full ${
        isSelected
          ? "bg-white/20 text-white"
          : "bg-gray-100 dark:bg-gray-700 text-gray-700 dark:text-gray-300"
      }`}
    >
      0
    </span>
  );
}
