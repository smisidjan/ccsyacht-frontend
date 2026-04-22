"use client";

import { useParams } from "next/navigation";
import { ProjectProvider } from "@/app/context/ProjectContext";
import { GAProvider } from "@/app/context/GAContext";

export default function ProjectLayout({
  children,
}: {
  children: React.ReactNode;
}) {
  const params = useParams();
  const projectId = params.id as string;

  return (
    <ProjectProvider projectId={projectId}>
      <GAProvider>
        {children}
      </GAProvider>
    </ProjectProvider>
  );
}
