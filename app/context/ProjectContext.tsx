"use client";

import { createContext, useContext, useState, useEffect, useCallback, useMemo, ReactNode } from "react";
import { projectMembersApi } from "@/lib/api/project-members";
import type { ProjectMember, AddMemberRequest, ApiError } from "@/lib/api/types";

interface ProjectContextValue {
  projectId: string;
  members: ProjectMember[];
  membersLoading: boolean;
  membersError: ApiError | null;
  refetchMembers: () => Promise<void>;
  addMember: (data: AddMemberRequest) => Promise<void>;
  removeMember: (userId: string) => Promise<void>;
}

const ProjectContext = createContext<ProjectContextValue | undefined>(undefined);

interface ProjectProviderProps {
  children: ReactNode;
  projectId: string;
}

export function ProjectProvider({ children, projectId }: ProjectProviderProps) {
  const [members, setMembers] = useState<ProjectMember[]>([]);
  const [membersLoading, setMembersLoading] = useState(true);
  const [membersError, setMembersError] = useState<ApiError | null>(null);

  const fetchMembers = useCallback(async () => {
    try {
      setMembersLoading(true);
      setMembersError(null);
      console.log("Fetching members for project:", projectId);
      const response = await projectMembersApi.getAll(projectId);
      console.log("Members response:", response);
      setMembers(response.data || []);
    } catch (err) {
      console.error("Error fetching members:", err);
      setMembersError(err as ApiError);
      setMembers([]);
    } finally {
      setMembersLoading(false);
    }
  }, [projectId]);

  // Fetch members when projectId changes
  useEffect(() => {
    fetchMembers();
  }, [fetchMembers]);

  const addMember = useCallback(async (data: AddMemberRequest) => {
    await projectMembersApi.add(projectId, data);
    await fetchMembers();
  }, [projectId, fetchMembers]);

  const removeMember = useCallback(async (userId: string) => {
    await projectMembersApi.remove(projectId, userId);
    await fetchMembers();
  }, [projectId, fetchMembers]);

  const value = useMemo(
    () => ({
      projectId,
      members,
      membersLoading,
      membersError,
      refetchMembers: fetchMembers,
      addMember,
      removeMember,
    }),
    [projectId, members, membersLoading, membersError, fetchMembers, addMember, removeMember]
  );

  return (
    <ProjectContext.Provider value={value}>
      {children}
    </ProjectContext.Provider>
  );
}

export function useProjectContext() {
  const context = useContext(ProjectContext);
  if (!context) {
    throw new Error("useProjectContext must be used within ProjectProvider");
  }
  return context;
}

// Convenience hook that returns just members (for easy migration)
export function useProjectMembersFromContext() {
  const { members, membersLoading, membersError, refetchMembers, addMember, removeMember } = useProjectContext();
  return {
    data: members,
    loading: membersLoading,
    error: membersError,
    refetch: refetchMembers,
    addMember,
    removeMember,
  };
}
