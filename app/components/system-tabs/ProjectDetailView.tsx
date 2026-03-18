"use client";

import { useState, useEffect } from "react";
import { useTranslations } from "next-intl";
import {
  ArrowLeftIcon,
  DocumentIcon,
  ArrowDownTrayIcon,
  FolderIcon,
  PencilIcon,
  TrashIcon,
  ArrowUpTrayIcon,
  PlusIcon,
} from "@heroicons/react/24/outline";
import { systemProjectsApi } from "@/lib/api/system";
import type { Project, DocumentType, Document } from "@/lib/api/types";
import TabNavState from "@/app/components/ui/TabNavState";
import type { StateTab } from "@/app/components/ui/TabNavState";
import StatusBadge from "@/app/components/ui/StatusBadge";
import LoadingSkeleton from "@/app/components/ui/LoadingSkeleton";
import Alert from "@/app/components/ui/Alert";
import Button from "@/app/components/ui/Button";
import ReplaceGeneralArrangementModal from "@/app/components/modals/ReplaceGeneralArrangementModal";
import DeleteGeneralArrangementModal from "@/app/components/modals/DeleteGeneralArrangementModal";
import CreateDocumentTypeModal from "@/app/components/modals/CreateDocumentTypeModal";
import EditDocumentTypeModal from "@/app/components/modals/EditDocumentTypeModal";
import DeleteDocumentTypeModal from "@/app/components/modals/DeleteDocumentTypeModal";
import UploadDocumentModal from "@/app/components/modals/UploadDocumentModal";
import DeleteDocumentModal from "@/app/components/modals/DeleteDocumentModal";

interface ProjectDetailViewProps {
  tenantId: string;
  projectId: string;
  onBack: () => void;
}

type TabType = "overview" | "documents";

export default function ProjectDetailView({
  tenantId,
  projectId,
  onBack,
}: ProjectDetailViewProps) {
  const t = useTranslations("systemSettings.tenantDetail.projects.detail");
  const tProjects = useTranslations("systemSettings.tenantDetail.projects");

  const [activeTab, setActiveTab] = useState<TabType>("overview");
  const [project, setProject] = useState<Project | null>(null);
  const [documentTypes, setDocumentTypes] = useState<DocumentType[]>([]);
  const [documents, setDocuments] = useState<Record<string, Document[]>>({});
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [downloading, setDownloading] = useState<Record<string, boolean>>({});
  const [uploading, setUploading] = useState(false);
  const [deleting, setDeleting] = useState(false);
  const [showReplaceModal, setShowReplaceModal] = useState(false);
  const [showDeleteModal, setShowDeleteModal] = useState(false);
  const [pendingFile, setPendingFile] = useState<File | null>(null);

  // Document Type modals
  const [showCreateDocTypeModal, setShowCreateDocTypeModal] = useState(false);
  const [showEditDocTypeModal, setShowEditDocTypeModal] = useState(false);
  const [showDeleteDocTypeModal, setShowDeleteDocTypeModal] = useState(false);
  const [selectedDocType, setSelectedDocType] = useState<DocumentType | null>(null);

  // Document modals
  const [showUploadDocModal, setShowUploadDocModal] = useState(false);
  const [showDeleteDocModal, setShowDeleteDocModal] = useState(false);
  const [selectedDocument, setSelectedDocument] = useState<Document | null>(null);
  const [uploadDocTypeId, setUploadDocTypeId] = useState<string>("");

  const tabs: StateTab[] = [
    { key: "overview", label: t("tabs.overview") },
    { key: "documents", label: t("tabs.documents") },
  ];

  useEffect(() => {
    if (projectId) {
      fetchProjectData();
    }
  }, [projectId]);

  const fetchProjectData = async () => {
    try {
      setLoading(true);
      setError(null);

      // Fetch project details
      const projectData = await systemProjectsApi.getProject(tenantId, projectId);
      setProject(projectData);

      // Fetch document types
      const docTypesResponse = await systemProjectsApi.getDocumentTypes(
        tenantId,
        projectId
      );
      const types = docTypesResponse.data || [];
      setDocumentTypes(types);

      // Fetch documents for each type
      const docsMap: Record<string, Document[]> = {};
      for (const docType of types) {
        const docsResponse = await systemProjectsApi.getDocuments(
          tenantId,
          projectId,
          {
            document_type_id: docType.identifier,
          }
        );
        docsMap[docType.identifier] = docsResponse.data || [];
      }
      setDocuments(docsMap);
    } catch (err) {
      const errorMessage =
        err instanceof Error ? err.message : "Failed to load project data";
      console.error("Failed to fetch project data:", errorMessage);
      setError(errorMessage);
    } finally {
      setLoading(false);
    }
  };

  const handleDownloadDocument = async (docId: string, fileName: string) => {
    try {
      setDownloading((prev) => ({ ...prev, [docId]: true }));
      const blob = await systemProjectsApi.downloadDocument(
        tenantId,
        projectId,
        docId
      );

      // Create download link
      const url = window.URL.createObjectURL(blob);
      const a = document.createElement("a");
      a.href = url;
      a.download = fileName;
      document.body.appendChild(a);
      a.click();
      window.URL.revokeObjectURL(url);
      document.body.removeChild(a);
    } catch (err) {
      console.error("Failed to download document:", err);
      alert(t("errors.downloadFailed"));
    } finally {
      setDownloading((prev) => ({ ...prev, [docId]: false }));
    }
  };

  const handleDownloadGA = async () => {
    if (!project?.generalArrangement) return;

    try {
      setDownloading((prev) => ({ ...prev, ga: true }));
      const blob = await systemProjectsApi.downloadGeneralArrangement(
        tenantId,
        projectId
      );

      const url = window.URL.createObjectURL(blob);
      const a = document.createElement("a");
      a.href = url;
      a.download = `${project.name}_general_arrangement.pdf`;
      document.body.appendChild(a);
      a.click();
      window.URL.revokeObjectURL(url);
      document.body.removeChild(a);
    } catch (err) {
      console.error("Failed to download GA:", err);
      alert(t("errors.downloadFailed"));
    } finally {
      setDownloading((prev) => ({ ...prev, ga: false }));
    }
  };

  const handleFileInputChange = (event: React.ChangeEvent<HTMLInputElement>) => {
    const file = event.target.files?.[0];
    if (file) {
      setPendingFile(file);
      if (project?.generalArrangement) {
        // Show replace confirmation modal
        setShowReplaceModal(true);
      } else {
        // Upload directly if no GA exists
        handleUploadGA(file);
      }
      // Reset input so same file can be selected again
      event.target.value = "";
    }
  };

  const handleUploadGA = async (file: File) => {
    try {
      setUploading(true);
      await systemProjectsApi.uploadGeneralArrangement(tenantId, projectId, file);
      // Refresh project data
      await fetchProjectData();
    } catch (err) {
      console.error("Failed to upload GA:", err);
      throw err;
    } finally {
      setUploading(false);
      setPendingFile(null);
    }
  };

  const handleConfirmReplace = async () => {
    if (pendingFile) {
      await handleUploadGA(pendingFile);
    }
  };

  const handleDeleteGA = async () => {
    if (!project?.generalArrangement) return;
    setShowDeleteModal(true);
  };

  const handleConfirmDelete = async () => {
    try {
      setDeleting(true);
      await systemProjectsApi.deleteGeneralArrangement(tenantId, projectId);
      // Refresh project data
      await fetchProjectData();
    } catch (err) {
      console.error("Failed to delete GA:", err);
      throw err;
    } finally {
      setDeleting(false);
    }
  };

  // Document Type handlers
  const handleCreateDocType = async (data: { name: string; is_required: boolean }) => {
    await systemProjectsApi.createDocumentType(tenantId, projectId, data);
    await fetchProjectData();
  };

  const handleEditDocType = async (data: { name: string; is_required: boolean }) => {
    if (!selectedDocType) return;
    await systemProjectsApi.updateDocumentType(tenantId, projectId, selectedDocType.identifier, data);
    await fetchProjectData();
  };

  const handleDeleteDocType = async () => {
    if (!selectedDocType) return;
    await systemProjectsApi.deleteDocumentType(tenantId, projectId, selectedDocType.identifier);
    await fetchProjectData();
  };

  // Document handlers
  const handleUploadDocument = async (data: { title: string; description?: string; file: File }) => {
    if (!uploadDocTypeId) return;
    await systemProjectsApi.uploadDocument(tenantId, projectId, uploadDocTypeId, data);
    await fetchProjectData();
  };

  const handleDeleteDocument = async () => {
    if (!selectedDocument) return;
    await systemProjectsApi.deleteDocument(tenantId, projectId, selectedDocument.identifier);
    await fetchProjectData();
  };

  const renderOverview = () => {
    if (!project) return null;

    return (
      <div className="space-y-6">
        {/* Project Info */}
        <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
          <div>
            <label className="block text-sm font-medium text-gray-700 dark:text-gray-300 mb-1">
              {t("fields.name")}
            </label>
            <p className="text-gray-900 dark:text-white">{project.name}</p>
          </div>

          <div>
            <label className="block text-sm font-medium text-gray-700 dark:text-gray-300 mb-1">
              {t("fields.status")}
            </label>
            <StatusBadge status={project.status} />
          </div>

          <div>
            <label className="block text-sm font-medium text-gray-700 dark:text-gray-300 mb-1">
              {t("fields.type")}
            </label>
            <p className="text-gray-900 dark:text-white capitalize">
              {project.additionalType === "new_built"
                ? tProjects("types.newBuilt")
                : tProjects("types.refit")}
            </p>
          </div>

          <div>
            <label className="block text-sm font-medium text-gray-700 dark:text-gray-300 mb-1">
              {t("fields.shipyard")}
            </label>
            <p className="text-gray-900 dark:text-white">
              {project.producer?.name || "-"}
            </p>
          </div>

          <div>
            <label className="block text-sm font-medium text-gray-700 dark:text-gray-300 mb-1">
              {t("fields.startDate")}
            </label>
            <p className="text-gray-900 dark:text-white">
              {project.startDate
                ? new Date(project.startDate).toLocaleDateString()
                : "-"}
            </p>
          </div>

          <div>
            <label className="block text-sm font-medium text-gray-700 dark:text-gray-300 mb-1">
              {t("fields.endDate")}
            </label>
            <p className="text-gray-900 dark:text-white">
              {project.endDate
                ? new Date(project.endDate).toLocaleDateString()
                : "-"}
            </p>
          </div>
        </div>

        {project.description && (
          <div>
            <label className="block text-sm font-medium text-gray-700 dark:text-gray-300 mb-1">
              {t("fields.description")}
            </label>
            <p className="text-gray-900 dark:text-white">
              {project.description}
            </p>
          </div>
        )}

        {/* General Arrangement */}
        <div className="border-t border-gray-200 dark:border-gray-700 pt-6">
          <div className="flex items-center justify-between mb-4">
            <h3 className="text-lg font-medium text-gray-900 dark:text-white">
              {t("sections.generalArrangement")}
            </h3>
            {!project.generalArrangement && (
              <>
                <input
                  type="file"
                  accept=".pdf"
                  onChange={handleFileInputChange}
                  disabled={uploading}
                  className="hidden"
                  id="ga-upload"
                />
                <button
                  onClick={() => document.getElementById("ga-upload")?.click()}
                  disabled={uploading}
                  title={uploading ? t("ga.uploading") : t("ga.upload")}
                  className="p-1 hover:opacity-70 transition-opacity disabled:opacity-50 disabled:cursor-not-allowed"
                >
                  <ArrowUpTrayIcon className="w-5 h-5 text-blue-600 dark:text-blue-400" />
                </button>
              </>
            )}
          </div>

          {project.generalArrangement ? (
            <div className="flex items-center gap-3 p-4 bg-gray-50 dark:bg-gray-800 rounded-lg">
              <DocumentIcon className="w-8 h-8 text-blue-600 dark:text-blue-400" />
              <div className="flex-1 min-w-0">
                <p className="text-sm font-medium text-gray-900 dark:text-white">
                  General Arrangement
                </p>
                <div className="flex items-center gap-2 text-xs text-gray-500 dark:text-gray-400 mt-1">
                  <span>PDF document</span>
                  {project.dateModified && (
                    <>
                      <span>•</span>
                      <span>
                        {new Date(project.dateModified).toLocaleDateString()}
                      </span>
                    </>
                  )}
                  {project.author && (
                    <>
                      <span>•</span>
                      <span>{project.author.name}</span>
                    </>
                  )}
                </div>
              </div>
              <div className="flex items-center gap-2">
                <button
                  onClick={handleDownloadGA}
                  disabled={downloading.ga || deleting}
                  title={t("download")}
                  className="p-1 hover:opacity-70 transition-opacity disabled:opacity-50 disabled:cursor-not-allowed"
                >
                  <ArrowDownTrayIcon className="w-5 h-5 text-green-600 dark:text-green-400" />
                </button>
                <input
                  type="file"
                  accept=".pdf"
                  onChange={handleFileInputChange}
                  disabled={uploading || deleting}
                  className="hidden"
                  id="ga-replace"
                />
                <button
                  onClick={() => document.getElementById("ga-replace")?.click()}
                  disabled={uploading || deleting}
                  title={t("ga.replace")}
                  className="p-1 hover:opacity-70 transition-opacity disabled:opacity-50 disabled:cursor-not-allowed"
                >
                  <ArrowUpTrayIcon className="w-5 h-5 text-blue-600 dark:text-blue-400" />
                </button>
                <button
                  onClick={handleDeleteGA}
                  disabled={downloading.ga || uploading || deleting}
                  title={t("ga.delete")}
                  className="p-1 hover:opacity-70 transition-opacity disabled:opacity-50 disabled:cursor-not-allowed"
                >
                  <TrashIcon className="w-5 h-5 text-red-600 dark:text-red-400" />
                </button>
              </div>
            </div>
          ) : (
            <p className="text-sm text-gray-500 dark:text-gray-400">
              {t("ga.noDocument")}
            </p>
          )}
        </div>

        {/* Author Info */}
        {project.author && (
          <div className="border-t border-gray-200 dark:border-gray-700 pt-6">
            <h3 className="text-lg font-medium text-gray-900 dark:text-white mb-4">
              {t("sections.author")}
            </h3>
            <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
              <div>
                <label className="block text-sm font-medium text-gray-700 dark:text-gray-300 mb-1">
                  {t("fields.authorName")}
                </label>
                <p className="text-gray-900 dark:text-white">
                  {project.author.name}
                </p>
              </div>
              {project.author["@type"] === "Person" && project.author.email && (
                <div>
                  <label className="block text-sm font-medium text-gray-700 dark:text-gray-300 mb-1">
                    {t("fields.authorEmail")}
                  </label>
                  <p className="text-gray-900 dark:text-white">
                    {project.author.email}
                  </p>
                </div>
              )}
            </div>
          </div>
        )}
      </div>
    );
  };

  const renderDocuments = () => {
    return (
      <div className="space-y-6">
        {/* Add Document Type Button */}
        <div className="flex justify-end">
          <Button
            variant="primary"
            size="sm"
            onClick={() => setShowCreateDocTypeModal(true)}
            title={t("documentTypes.add")}
          >
            <PlusIcon className="w-4 h-4 mr-2" />
            {t("documentTypes.add")}
          </Button>
        </div>

        {documentTypes.length === 0 ? (
          <div className="text-center py-12">
            <FolderIcon className="w-12 h-12 text-gray-400 mx-auto mb-4" />
            <p className="text-gray-500 dark:text-gray-400">
              {t("noDocumentTypes")}
            </p>
          </div>
        ) : (
          documentTypes.map((docType) => {
            const typeDocs = documents[docType.identifier] || [];

            return (
              <div
                key={docType.identifier}
                className="border border-gray-200 dark:border-gray-700 rounded-lg p-4"
              >
                {/* Document Type Header */}
                <div className="flex items-center justify-between mb-3">
                  <h4 className="text-md font-medium text-gray-900 dark:text-white">
                    {docType.name}
                    {docType.isRequired && (
                      <span className="ml-2 text-xs text-red-600 dark:text-red-400">
                        ({t("required")})
                      </span>
                    )}
                    <span className="ml-3 text-sm text-gray-500 dark:text-gray-400">
                      {typeDocs.length}{" "}
                      {typeDocs.length === 1 ? "document" : "documenten"}
                    </span>
                  </h4>
                  <div className="flex items-center gap-2">
                    <button
                      onClick={() => {
                        setUploadDocTypeId(docType.identifier);
                        setShowUploadDocModal(true);
                      }}
                      title={t("documents.uploadButton")}
                      className="p-1 hover:opacity-70 transition-opacity"
                    >
                      <ArrowUpTrayIcon className="w-5 h-5 text-green-600 dark:text-green-400" />
                    </button>
                    <button
                      onClick={() => {
                        setSelectedDocType(docType);
                        setShowEditDocTypeModal(true);
                      }}
                      title={t("documentTypes.edit")}
                      className="p-1 hover:opacity-70 transition-opacity"
                    >
                      <PencilIcon className="w-5 h-5 text-blue-600 dark:text-blue-400" />
                    </button>
                    <button
                      onClick={() => {
                        setSelectedDocType(docType);
                        setShowDeleteDocTypeModal(true);
                      }}
                      title={t("documentTypes.delete")}
                      className="p-1 hover:opacity-70 transition-opacity"
                    >
                      <TrashIcon className="w-5 h-5 text-red-600 dark:text-red-400" />
                    </button>
                  </div>
                </div>

                {/* Documents List */}
                {typeDocs.length === 0 ? (
                  <p className="text-sm text-gray-500 dark:text-gray-400">
                    {t("noDocuments")}
                  </p>
                ) : (
                  <div className="space-y-2">
                    {typeDocs.map((doc) => (
                      <div
                        key={doc.identifier}
                        className="flex items-center gap-3 p-3 bg-gray-50 dark:bg-gray-800 rounded-lg"
                      >
                        <DocumentIcon className="w-6 h-6 text-blue-600 dark:text-blue-400 flex-shrink-0" />
                        <div className="flex-1 min-w-0">
                          <p className="text-sm font-medium text-gray-900 dark:text-white truncate">
                            {doc.name}
                          </p>
                          <div className="flex items-center gap-2 text-xs text-gray-500 dark:text-gray-400">
                            <span>{doc.fileName}</span>
                            <span>•</span>
                            <span>{doc.contentSize}</span>
                            <span>•</span>
                            <span>
                              {new Date(doc.dateCreated).toLocaleDateString()}
                            </span>
                            {doc.author?.name && (
                              <>
                                <span>•</span>
                                <span>Uploaded by: {doc.author.name}</span>
                              </>
                            )}
                          </div>
                        </div>
                        <div className="flex items-center gap-2">
                          <Button
                            variant="ghost"
                            size="sm"
                            onClick={() =>
                              handleDownloadDocument(doc.identifier, doc.fileName)
                            }
                            disabled={downloading[doc.identifier]}
                            title={t("download")}
                          >
                            <ArrowDownTrayIcon className="w-4 h-4" />
                          </Button>
                          <button
                            onClick={() => {
                              setSelectedDocument(doc);
                              setShowDeleteDocModal(true);
                            }}
                            title={t("documents.deleteButton")}
                            className="p-1 hover:opacity-70 transition-opacity"
                          >
                            <TrashIcon className="w-5 h-5 text-red-600 dark:text-red-400" />
                          </button>
                        </div>
                      </div>
                    ))}
                  </div>
                )}
              </div>
            );
          })
        )}
      </div>
    );
  };

  if (loading) {
    return <LoadingSkeleton type="form" />;
  }

  if (error) {
    return (
      <div className="space-y-4">
        <Button variant="ghost" size="sm" onClick={onBack}>
          <ArrowLeftIcon className="w-4 h-4 mr-2" />
          {t("back")}
        </Button>
        <Alert type="error" title={t("errors.title")} message={error} />
      </div>
    );
  }

  return (
    <div className="space-y-6">
      {/* Header with back button */}
      <div className="flex items-center gap-4">
        <Button variant="ghost" size="sm" onClick={onBack}>
          <ArrowLeftIcon className="w-4 h-4 mr-2" />
          {t("back")}
        </Button>
        <h2 className="text-2xl font-bold text-gray-900 dark:text-white">
          {project?.name}
        </h2>
      </div>

      {/* Tabs */}
      <TabNavState
        tabs={tabs}
        activeTab={activeTab}
        onChange={(key) => setActiveTab(key as TabType)}
      />

      {/* Content */}
      <div>
        {activeTab === "overview" && renderOverview()}
        {activeTab === "documents" && renderDocuments()}
      </div>

      {/* Modals */}
      <ReplaceGeneralArrangementModal
        isOpen={showReplaceModal}
        onClose={() => {
          setShowReplaceModal(false);
          setPendingFile(null);
        }}
        onConfirm={handleConfirmReplace}
      />

      <DeleteGeneralArrangementModal
        isOpen={showDeleteModal}
        onClose={() => setShowDeleteModal(false)}
        onConfirm={handleConfirmDelete}
      />

      {/* Document Type Modals */}
      <CreateDocumentTypeModal
        isOpen={showCreateDocTypeModal}
        onClose={() => setShowCreateDocTypeModal(false)}
        onSubmit={handleCreateDocType}
      />

      <EditDocumentTypeModal
        isOpen={showEditDocTypeModal}
        onClose={() => {
          setShowEditDocTypeModal(false);
          setSelectedDocType(null);
        }}
        onSubmit={handleEditDocType}
        documentType={selectedDocType}
      />

      <DeleteDocumentTypeModal
        isOpen={showDeleteDocTypeModal}
        onClose={() => {
          setShowDeleteDocTypeModal(false);
          setSelectedDocType(null);
        }}
        onConfirm={handleDeleteDocType}
        documentTypeName={selectedDocType?.name || ""}
        documentCount={selectedDocType ? (documents[selectedDocType.identifier]?.length || 0) : 0}
      />

      {/* Document Modals */}
      <UploadDocumentModal
        isOpen={showUploadDocModal}
        onClose={() => {
          setShowUploadDocModal(false);
          setUploadDocTypeId("");
        }}
        onSubmit={handleUploadDocument}
        documentTypeName={documentTypes.find(dt => dt.identifier === uploadDocTypeId)?.name || ""}
      />

      <DeleteDocumentModal
        isOpen={showDeleteDocModal}
        onClose={() => {
          setShowDeleteDocModal(false);
          setSelectedDocument(null);
        }}
        onConfirm={handleDeleteDocument}
        documentName={selectedDocument?.name || ""}
      />
    </div>
  );
}
