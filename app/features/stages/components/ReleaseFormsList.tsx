"use client";

import { useMemo, useState } from "react";
import { useTranslations } from "next-intl";
import {
  ArrowDownTrayIcon,
  DocumentIcon,
  PlusIcon,
  TrashIcon,
  EyeIcon,
} from "@heroicons/react/24/outline";
import Button from "@/app/components/ui/Button";
import Modal from "@/app/components/ui/Modal";
import DeleteConfirmModal from "@/app/components/modals/DeleteConfirmModal";
import LoadingSkeleton from "@/app/components/ui/LoadingSkeleton";
import Alert from "@/app/components/ui/Alert";
import { RichTextEditor } from "@/app/components/ui/RichTextEditor";
import CreateReleaseFormModal from "./CreateReleaseFormModal";
import {
  stageReleaseFormsApi,
  useStageReleaseForms,
  usePunchlistItems,
} from "@/lib/api";
import { usePermission } from "@/lib/hooks/usePermission";
import { PERMISSIONS } from "@/lib/constants/permissions";
import { handleError } from "@/lib/utils/errors";
import { useToast } from "@/app/context/ToastContext";
import type { Stage, StageReleaseForm } from "@/lib/api/types";

interface ReleaseFormsListProps {
  projectId: string;
  stage: Stage;
  /** Called when the release forms list changes (create / delete) so
   *  the parent can refresh anything depending on its count (e.g. the
   *  submit-for-signoff gate). */
  onChange?: () => void;
}

/** Walk a TipTap JSON document and replace every `{punchlistitems}`
 *  literal in a text node with a paragraph + bullet list of the
 *  current punchlist items. We keep the original marker in the saved
 *  content (backend never substitutes it) and only resolve it at
 *  render time — that way deleting / adding items keeps the form
 *  in sync without having to re-edit it. */
function substitutePunchlistMarker(
  content: Record<string, unknown> | null,
  itemTitles: string[],
  emptyLabel: string
): Record<string, unknown> | null {
  if (!content || typeof content !== "object") return content;

  const listNode =
    itemTitles.length === 0
      ? {
          type: "paragraph",
          content: [{ type: "text", text: emptyLabel, marks: [{ type: "italic" }] }],
        }
      : {
          type: "bulletList",
          content: itemTitles.map((title) => ({
            type: "listItem",
            content: [
              {
                type: "paragraph",
                content: [{ type: "text", text: title }],
              },
            ],
          })),
        };

  const visit = (node: unknown): unknown => {
    if (!node || typeof node !== "object") return node;
    const n = node as { type?: string; text?: string; content?: unknown[] };

    // Replace `{punchlistitems}` in text nodes by splitting around the
    // marker; if the only content of the text is the marker we drop
    // the text node entirely and inject the list at the parent level.
    if (n.type === "text" && typeof n.text === "string" && n.text.includes("{punchlistitems}")) {
      // Defer to parent visit — flatten happens below.
      return n;
    }

    if (Array.isArray(n.content)) {
      const next: unknown[] = [];
      for (const child of n.content) {
        const c = child as { type?: string; text?: string };
        if (
          c?.type === "text" &&
          typeof c.text === "string" &&
          c.text.includes("{punchlistitems}")
        ) {
          // Splice the list in place of the marker, splitting around
          // any surrounding text.
          const parts = c.text.split("{punchlistitems}");
          parts.forEach((part, idx) => {
            if (part) next.push({ ...c, text: part });
            if (idx < parts.length - 1) next.push(listNode);
          });
        } else {
          next.push(visit(child));
        }
      }
      return { ...n, content: next };
    }
    return n;
  };

  return visit(content) as Record<string, unknown>;
}

export default function ReleaseFormsList({
  projectId,
  stage,
  onChange,
}: ReleaseFormsListProps) {
  const t = useTranslations("areaDetail");
  const { showToast } = useToast();
  const { hasPermission } = usePermission();
  const canEdit = hasPermission(PERMISSIONS.EDIT_STAGES);

  const {
    data: forms,
    loading,
    error,
    refetch,
  } = useStageReleaseForms(projectId, stage.identifier);

  // Punchlist items for substituting the `{punchlistitems}` marker
  // when rendering a saved form. Pull all statuses so the form
  // reflects the live state even after items have been completed.
  const { data: punchlistItems } = usePunchlistItems(
    projectId,
    stage.identifier,
    { per_page: 100 }
  );

  const punchlistTitles = useMemo(
    () => (punchlistItems ?? []).map((item) => item.name),
    [punchlistItems]
  );

  const [isCreateOpen, setIsCreateOpen] = useState(false);
  const [formToDelete, setFormToDelete] = useState<StageReleaseForm | null>(
    null
  );
  const [viewForm, setViewForm] = useState<StageReleaseForm | null>(null);

  const hasReleaseFormTemplate = !!stage.template?.releaseFormTemplate?.identifier;

  const handleDownload = async (form: StageReleaseForm) => {
    if (!form.hasFile) return;
    const url = stageReleaseFormsApi.getDownloadUrl(
      projectId,
      stage.identifier,
      form.identifier
    );
    // Auth-gated download — fetch with token, build blob URL, click it.
    // Same trick AuthenticatedImage uses for image previews.
    try {
      const { getAuthToken, getTenantUrl } = await import("@/lib/api/client");
      const token = getAuthToken();
      const tenantUrl = getTenantUrl();
      const headers: HeadersInit = {};
      if (token) headers["Authorization"] = `Bearer ${token}`;
      if (tenantUrl) headers["X-Tenant-ID"] = tenantUrl;
      const response = await fetch(url, { headers });
      if (!response.ok) throw new Error(`Download failed (${response.status})`);
      const blob = await response.blob();
      const blobUrl = URL.createObjectURL(blob);
      const a = document.createElement("a");
      a.href = blobUrl;
      a.download = form.file?.fileName ?? form.title;
      document.body.appendChild(a);
      a.click();
      document.body.removeChild(a);
      // Revoke after a tick so the click has time to start the download.
      setTimeout(() => URL.revokeObjectURL(blobUrl), 1000);
    } catch (err) {
      handleError(err, {
        showToast,
        fallbackMessage: t("releaseFormsDownload"),
      });
    }
  };

  if (loading) {
    return <LoadingSkeleton type="list" rows={3} />;
  }

  if (error) {
    return (
      <Alert
        type="error"
        message={error.message || t("releaseFormsTemplateLoadError")}
      />
    );
  }

  return (
    <div className="space-y-4">
      <div className="flex items-center justify-between">
        <p className="text-sm text-gray-500 dark:text-gray-400">
          {(forms ?? []).length === 0 && !hasReleaseFormTemplate
            ? t("releaseFormsNoTemplate")
            : (forms ?? []).length === 0
              ? t("releaseFormsEmpty")
              : null}
        </p>
        {canEdit && hasReleaseFormTemplate && (
          <Button
            variant="primary"
            size="sm"
            onClick={() => setIsCreateOpen(true)}
          >
            <PlusIcon className="w-4 h-4" />
            {t("releaseFormsCreate")}
          </Button>
        )}
      </div>

      {(forms ?? []).length > 0 && (
        <ul className="space-y-2">
          {forms!.map((form) => (
            <li
              key={form.identifier}
              className="flex items-start gap-3 p-4 rounded-lg border border-gray-200 dark:border-gray-700 bg-white dark:bg-gray-800"
            >
              <DocumentIcon className="w-5 h-5 text-gray-400 mt-0.5 flex-shrink-0" />
              <div className="flex-1 min-w-0">
                <p className="text-sm font-medium text-gray-900 dark:text-white truncate">
                  {form.title}
                </p>
                {form.description && (
                  <p className="text-xs text-gray-500 dark:text-gray-400 mt-0.5 line-clamp-2">
                    {form.description}
                  </p>
                )}
                <p className="text-xs text-gray-500 dark:text-gray-400 mt-1">
                  {t("releaseFormsCreatedBy", { name: form.createdBy.name })} ·{" "}
                  {new Date(form.dateCreated).toLocaleDateString()}{" "}
                  {new Date(form.dateCreated).toLocaleTimeString([], {
                    hour: "2-digit",
                    minute: "2-digit",
                  })}
                </p>
                {form.hasFile && form.file && (
                  <p className="text-xs text-gray-500 dark:text-gray-400 mt-1">
                    {form.file.fileName} · {form.file.contentSize}
                  </p>
                )}
              </div>
              <div className="flex items-center gap-1 flex-shrink-0">
                <button
                  type="button"
                  onClick={() => setViewForm(form)}
                  className="p-1.5 text-gray-400 hover:text-gray-700 dark:hover:text-gray-200"
                  aria-label={t("releaseFormsView")}
                  title={t("releaseFormsView")}
                >
                  <EyeIcon className="w-4 h-4" />
                </button>
                {form.hasFile && (
                  <button
                    type="button"
                    onClick={() => handleDownload(form)}
                    className="p-1.5 text-gray-400 hover:text-blue-600 dark:hover:text-blue-400"
                    aria-label={t("releaseFormsDownload")}
                    title={t("releaseFormsDownload")}
                  >
                    <ArrowDownTrayIcon className="w-4 h-4" />
                  </button>
                )}
                {canEdit && (
                  <button
                    type="button"
                    onClick={() => setFormToDelete(form)}
                    className="p-1.5 text-gray-400 hover:text-red-600 dark:hover:text-red-400"
                    aria-label={t("releaseFormsDeleteTitle")}
                    title={t("releaseFormsDeleteTitle")}
                  >
                    <TrashIcon className="w-4 h-4" />
                  </button>
                )}
              </div>
            </li>
          ))}
        </ul>
      )}

      {isCreateOpen && (
        <CreateReleaseFormModal
          isOpen={isCreateOpen}
          onClose={() => setIsCreateOpen(false)}
          projectId={projectId}
          stageId={stage.identifier}
          onCreated={async () => {
            setIsCreateOpen(false);
            await refetch();
            onChange?.();
          }}
        />
      )}

      <DeleteConfirmModal
        isOpen={!!formToDelete}
        onClose={() => setFormToDelete(null)}
        onConfirm={async () => {
          if (!formToDelete) return;
          await stageReleaseFormsApi.delete(
            projectId,
            stage.identifier,
            formToDelete.identifier
          );
          await refetch();
          onChange?.();
          setFormToDelete(null);
        }}
        title={t("releaseFormsDeleteTitle")}
        message={t("releaseFormsDeleteMessage", {
          title: formToDelete?.title ?? "",
        })}
        successMessage={t("releaseFormsDeleteSuccess")}
        errorMessage={t("releaseFormsDeleteError")}
      />

      {/* View modal — renders the saved TipTap content with the
          {punchlistitems} marker resolved to the current item list.
          Read-only: editing means creating a new entry. */}
      <Modal
        isOpen={!!viewForm}
        onClose={() => setViewForm(null)}
        title={
          viewForm
            ? t("releaseFormsViewTitle", { title: viewForm.title })
            : ""
        }
        size="lg"
      >
        {viewForm && (
          <div className="space-y-4">
            {viewForm.description && (
              <p className="text-sm text-gray-600 dark:text-gray-400">
                {viewForm.description}
              </p>
            )}
            {viewForm.content && Object.keys(viewForm.content).length > 0 ? (
              <RichTextEditor
                editable={false}
                content={substitutePunchlistMarker(
                  viewForm.content,
                  punchlistTitles,
                  t("releaseFormsPunchlistEmpty")
                )}
              />
            ) : (
              <p className="text-sm italic text-gray-500 dark:text-gray-400">
                {t("releaseFormsNoContent")}
              </p>
            )}
          </div>
        )}
      </Modal>
    </div>
  );
}
