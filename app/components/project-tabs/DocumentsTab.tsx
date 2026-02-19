"use client";

import { useTranslations } from "next-intl";
import { DocumentTextIcon, ArrowUpTrayIcon } from "@heroicons/react/24/outline";

interface Document {
  id: string;
  name: string;
  type: string;
  uploadedAt: string | null;
  required: boolean;
  uploaded: boolean;
}

interface DocumentsTabProps {
  documents: Document[];
}

// Mock documents data - replace with props from API
const defaultDocuments: Document[] = [
  {
    id: "1",
    name: "Contract Agreement",
    type: "PDF",
    uploadedAt: "2024-01-15",
    required: true,
    uploaded: true,
  },
  {
    id: "2",
    name: "Technical Specifications",
    type: "PDF",
    uploadedAt: "2024-01-16",
    required: true,
    uploaded: true,
  },
  {
    id: "3",
    name: "General Arrangement",
    type: "PDF",
    uploadedAt: null,
    required: true,
    uploaded: false,
  },
  {
    id: "4",
    name: "Safety Certificates",
    type: "PDF",
    uploadedAt: null,
    required: false,
    uploaded: false,
  },
];

export default function DocumentsTab({ documents = defaultDocuments }: DocumentsTabProps) {
  const t = useTranslations("projectDetail.documents");

  const uploadedCount = documents.filter((doc) => doc.uploaded).length;
  const requiredCount = documents.filter((doc) => doc.required).length;
  const requiredUploadedCount = documents.filter((doc) => doc.required && doc.uploaded).length;

  return (
    <div className="space-y-6">
      {/* Header */}
      <div className="flex items-center justify-between">
        <div>
          <h2 className="text-xl font-semibold text-gray-900 dark:text-white">
            {t("title")}
          </h2>
          <p className="text-sm text-gray-600 dark:text-gray-400 mt-1">
            {t("subtitle", { uploaded: uploadedCount, total: documents.length })}
          </p>
        </div>
        <button className="inline-flex items-center gap-2 px-4 py-2 bg-blue-600 text-white text-sm font-medium rounded-lg hover:bg-blue-700 transition-all shadow-md hover:shadow-lg">
          <ArrowUpTrayIcon className="w-4 h-4" />
          {t("uploadDocument")}
        </button>
      </div>

      {/* Required Documents Progress */}
      {requiredUploadedCount < requiredCount && (
        <div className="bg-amber-50 dark:bg-amber-900/20 border border-amber-200 dark:border-amber-800 rounded-lg p-4">
          <p className="text-sm text-amber-800 dark:text-amber-200">
            {t("requiredProgress", { uploaded: requiredUploadedCount, required: requiredCount })}
          </p>
        </div>
      )}

      {/* Documents List */}
      <div className="bg-white dark:bg-gray-800 rounded-xl shadow-lg dark:shadow-gray-900/30 border border-gray-100 dark:border-gray-700 overflow-hidden">
        <table className="w-full">
          <thead className="bg-gray-50 dark:bg-gray-900/50">
            <tr>
              <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 dark:text-gray-400 uppercase tracking-wider">
                {t("documentName")}
              </th>
              <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 dark:text-gray-400 uppercase tracking-wider">
                {t("type")}
              </th>
              <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 dark:text-gray-400 uppercase tracking-wider">
                {t("status")}
              </th>
              <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 dark:text-gray-400 uppercase tracking-wider">
                {t("uploadedAt")}
              </th>
              <th className="px-6 py-3 text-right text-xs font-medium text-gray-500 dark:text-gray-400 uppercase tracking-wider">
                {t("actions")}
              </th>
            </tr>
          </thead>
          <tbody className="divide-y divide-gray-100 dark:divide-gray-700">
            {documents.map((doc) => (
              <tr key={doc.id} className="hover:bg-gray-50 dark:hover:bg-gray-900/30">
                <td className="px-6 py-4">
                  <div className="flex items-center gap-3">
                    <DocumentTextIcon className="w-5 h-5 text-gray-400" />
                    <span className="text-sm font-medium text-gray-900 dark:text-white">
                      {doc.name}
                    </span>
                    {doc.required && (
                      <span className="text-xs text-red-600 dark:text-red-400">*</span>
                    )}
                  </div>
                </td>
                <td className="px-6 py-4 text-sm text-gray-600 dark:text-gray-400">
                  {doc.type}
                </td>
                <td className="px-6 py-4">
                  <span
                    className={`inline-flex items-center px-2.5 py-0.5 rounded-full text-xs font-medium ${
                      doc.uploaded
                        ? "bg-green-100 text-green-700 dark:bg-green-900/30 dark:text-green-400"
                        : "bg-gray-100 text-gray-700 dark:bg-gray-700 dark:text-gray-400"
                    }`}
                  >
                    {doc.uploaded ? t("uploaded") : t("pending")}
                  </span>
                </td>
                <td className="px-6 py-4 text-sm text-gray-600 dark:text-gray-400">
                  {doc.uploadedAt || "-"}
                </td>
                <td className="px-6 py-4 text-right">
                  {!doc.uploaded && (
                    <button className="text-sm text-blue-600 hover:text-blue-700 dark:text-blue-400 dark:hover:text-blue-300 font-medium">
                      {t("upload")}
                    </button>
                  )}
                </td>
              </tr>
            ))}
          </tbody>
        </table>
      </div>
    </div>
  );
}
