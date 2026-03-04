"use client";

import { useEffect } from "react";
import { useSocket } from "@/lib/socket/SocketContext";
import { useToast } from "@/app/context/ToastContext";
import { subscribeToProjectChannel } from "@/lib/socket/helpers";

/**
 * Backend event structure
 */
interface ProjectDataChangedEvent {
  project_id: string;
  entity_type: "deck" | "area" | "stage" | "document" | "member" | "signer" | "project";
  entity_id: string | null;
  action: "created" | "updated" | "deleted";
  data: {
    name?: string;
    user?: {
      name: string;
      identifier: string;
    };
    [key: string]: any;
  };
  timestamp: string;
}

/**
 * Hook voor real-time project updates
 * Luistert naar alle project-gerelateerde events via één event
 */
export function useRealtimeProject(
  projectId: string,
  onProjectUpdate?: () => void
) {
  const { echo, connected } = useSocket();
  const { showToast } = useToast();

  useEffect(() => {
    if (!echo || !connected || !projectId) return;

    const subscription = subscribeToProjectChannel<ProjectDataChangedEvent>(
      echo,
      projectId,
      (event) => {
        // Only handle project events
        if (event.entity_type !== "project") return;

        const userName = event.data.user?.name || "Someone";
        showToast("info", `${userName} updated the project`);
        onProjectUpdate?.();
      }
    );

    return () => {
      subscription?.cleanup();
    };
  }, [echo, connected, projectId, onProjectUpdate, showToast]);
}

/**
 * Hook voor real-time area updates
 */
export function useRealtimeAreas(
  projectId: string,
  onAreasUpdate?: () => void
) {
  const { echo, connected } = useSocket();
  const { showToast } = useToast();

  useEffect(() => {
    if (!echo || !connected || !projectId) return;

    const subscription = subscribeToProjectChannel<ProjectDataChangedEvent>(
      echo,
      projectId,
      (event) => {
        // Only handle area events
        if (event.entity_type !== "area") return;

        const userName = event.data.user?.name || "Someone";
        const areaName = event.data.name || "an area";

        switch (event.action) {
          case "created":
            showToast("success", `${userName} created area "${areaName}"`);
            onAreasUpdate?.();
            break;

          case "updated":
            showToast("info", `${userName} updated area "${areaName}"`);
            onAreasUpdate?.();
            break;

          case "deleted":
            showToast("warning", `${userName} deleted an area`);
            onAreasUpdate?.();
            break;
        }
      }
    );

    return () => {
      subscription?.cleanup();
    };
  }, [echo, connected, projectId, onAreasUpdate, showToast]);
}

/**
 * Hook voor real-time document updates
 */
export function useRealtimeDocuments(
  projectId: string,
  onDocumentsUpdate?: () => void
) {
  const { echo, connected } = useSocket();
  const { showToast } = useToast();

  useEffect(() => {
    if (!echo || !connected || !projectId) return;

    const subscription = subscribeToProjectChannel<ProjectDataChangedEvent>(
      echo,
      projectId,
      (event) => {
        // Only handle document events
        if (event.entity_type !== "document") return;

        const userName = event.data.user?.name || "Someone";
        const documentName = event.data.name || "a document";

        switch (event.action) {
          case "created":
            showToast("success", `${userName} uploaded "${documentName}"`);
            onDocumentsUpdate?.();
            break;

          case "deleted":
            showToast("warning", `${userName} deleted a document`);
            onDocumentsUpdate?.();
            break;
        }
      }
    );

    return () => {
      subscription?.cleanup();
    };
  }, [echo, connected, projectId, onDocumentsUpdate, showToast]);
}

/**
 * Hook voor real-time project members updates
 */
export function useRealtimeMembers(
  projectId: string,
  onMembersUpdate?: () => void
) {
  const { echo, connected } = useSocket();
  const { showToast } = useToast();

  useEffect(() => {
    if (!echo || !connected || !projectId) return;

    const subscription = subscribeToProjectChannel<ProjectDataChangedEvent>(
      echo,
      projectId,
      (event) => {
        // Only handle member events
        if (event.entity_type !== "member") return;

        // Backend sends data.member.name (Schema.org OrganizationRole structure)
        const memberName = event.data.member?.name || event.data.name || "A member";

        switch (event.action) {
          case "created":
            showToast("info", `${memberName} joined the project`);
            onMembersUpdate?.();
            break;

          case "deleted":
            showToast("warning", `A member was removed from the project`);
            onMembersUpdate?.();
            break;
        }
      }
    );

    return () => {
      subscription?.cleanup();
    };
  }, [echo, connected, projectId, onMembersUpdate, showToast]);
}

/**
 * Hook voor real-time signer updates
 */
export function useRealtimeSigners(
  projectId: string,
  onSignersUpdate?: () => void
) {
  const { echo, connected } = useSocket();
  const { showToast } = useToast();

  useEffect(() => {
    if (!echo || !connected || !projectId) return;

    const subscription = subscribeToProjectChannel<ProjectDataChangedEvent>(
      echo,
      projectId,
      (event) => {
        // Only handle signer events
        if (event.entity_type !== "signer") return;

        // Backend sends data.member.name (Schema.org OrganizationRole structure)
        const signerName = event.data.member?.name || event.data.name || "A signer";

        switch (event.action) {
          case "created":
            showToast("success", `${signerName} was added as a signer`);
            onSignersUpdate?.();
            break;

          case "deleted":
            showToast("warning", `A signer was removed`);
            onSignersUpdate?.();
            break;
        }
      }
    );

    return () => {
      subscription?.cleanup();
    };
  }, [echo, connected, projectId, onSignersUpdate, showToast]);
}

/**
 * Hook voor real-time member/signer updates over meerdere projecten
 * Gebruikt voor de projectenlijst pagina om member counts bij te werken
 */
export function useRealtimeProjectsList(
  projectIds: string[],
  onMemberOrSignerUpdate?: (projectId: string) => void
) {
  const { echo, connected } = useSocket();

  useEffect(() => {
    if (!echo || !connected || !projectIds.length) return;

    const subscriptions = projectIds.map((projectId) => {
      return subscribeToProjectChannel<ProjectDataChangedEvent>(
        echo,
        projectId,
        (event) => {
          // Only handle member and signer events
          if (event.entity_type !== "member" && event.entity_type !== "signer") {
            return;
          }

          // Trigger callback with the project that was updated
          onMemberOrSignerUpdate?.(event.project_id);
        }
      );
    });

    return () => {
      subscriptions.forEach((subscription) => {
        subscription?.cleanup();
      });
    };
  }, [echo, connected, JSON.stringify(projectIds), onMemberOrSignerUpdate]);
}
