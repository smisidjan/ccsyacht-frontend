"use client";

import { useTranslations } from "next-intl";
import { UserPlusIcon, TrashIcon, PencilIcon } from "@heroicons/react/24/outline";

interface TeamMember {
  id: string;
  name: string;
  email: string;
  role: string;
}

interface Signer {
  id: string;
  name: string;
  role: string;
}

interface ProjectInfo {
  id: string;
  shipyard: string;
  projectType: string;
  createdAt: string;
}

interface SettingsTabProps {
  projectInfo?: ProjectInfo;
  teamMembers?: TeamMember[];
  signers?: Signer[];
}

// Mock data - replace with props from API
const defaultProjectInfo: ProjectInfo = {
  id: "1",
  shipyard: "Baltic Shipyard",
  projectType: "New Build",
  createdAt: "January 15, 2024",
};

const defaultTeamMembers: TeamMember[] = [
  {
    id: "1",
    name: "John Smith",
    email: "john.smith@example.com",
    role: "Project Manager",
  },
  {
    id: "2",
    name: "Sarah Davis",
    email: "sarah.davis@example.com",
    role: "Engineer",
  },
  {
    id: "3",
    name: "Mike Johnson",
    email: "mike.johnson@example.com",
    role: "Technician",
  },
];

const defaultSigners: Signer[] = [
  {
    id: "1",
    name: "John Smith",
    role: "Shipyard Representative",
  },
  {
    id: "2",
    name: "Client Representative",
    role: "Owner Representative",
  },
];

export default function SettingsTab({
  projectInfo = defaultProjectInfo,
  teamMembers = defaultTeamMembers,
  signers = defaultSigners,
}: SettingsTabProps) {
  const t = useTranslations("projectDetail.settings");

  return (
    <div className="space-y-8">
      {/* Project Info */}
      <section className="bg-white dark:bg-gray-800 rounded-xl shadow-lg dark:shadow-gray-900/30 border border-gray-100 dark:border-gray-700 p-6">
        <div className="flex items-center justify-between mb-4">
          <h3 className="text-lg font-semibold text-gray-900 dark:text-white">
            {t("projectInfo.title")}
          </h3>
          <button className="inline-flex items-center gap-2 px-3 py-1.5 text-sm text-blue-600 hover:text-blue-700 dark:text-blue-400 dark:hover:text-blue-300 font-medium">
            <PencilIcon className="w-4 h-4" />
            {t("projectInfo.edit")}
          </button>
        </div>
        <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
          <div>
            <label className="block text-sm font-medium text-gray-500 dark:text-gray-400 mb-1">
              {t("projectInfo.projectId")}
            </label>
            <p className="text-gray-900 dark:text-white">{projectInfo.id}</p>
          </div>
          <div>
            <label className="block text-sm font-medium text-gray-500 dark:text-gray-400 mb-1">
              {t("projectInfo.shipyard")}
            </label>
            <p className="text-gray-900 dark:text-white">{projectInfo.shipyard}</p>
          </div>
          <div>
            <label className="block text-sm font-medium text-gray-500 dark:text-gray-400 mb-1">
              {t("projectInfo.projectType")}
            </label>
            <p className="text-gray-900 dark:text-white">{projectInfo.projectType}</p>
          </div>
          <div>
            <label className="block text-sm font-medium text-gray-500 dark:text-gray-400 mb-1">
              {t("projectInfo.createdAt")}
            </label>
            <p className="text-gray-900 dark:text-white">{projectInfo.createdAt}</p>
          </div>
        </div>
      </section>

      {/* Team Members */}
      <section className="bg-white dark:bg-gray-800 rounded-xl shadow-lg dark:shadow-gray-900/30 border border-gray-100 dark:border-gray-700 p-6">
        <div className="flex items-center justify-between mb-4">
          <h3 className="text-lg font-semibold text-gray-900 dark:text-white">
            {t("teamMembers.title")}
          </h3>
          <button className="inline-flex items-center gap-2 px-4 py-2 bg-blue-600 text-white text-sm font-medium rounded-lg hover:bg-blue-700 transition-all shadow-md hover:shadow-lg">
            <UserPlusIcon className="w-4 h-4" />
            {t("teamMembers.addMember")}
          </button>
        </div>
        <div className="divide-y divide-gray-100 dark:divide-gray-700">
          {teamMembers.map((member) => (
            <div key={member.id} className="py-4 flex items-center justify-between">
              <div className="flex items-center gap-3">
                <div className="w-10 h-10 bg-blue-100 dark:bg-blue-900/30 rounded-full flex items-center justify-center">
                  <span className="text-blue-600 dark:text-blue-400 font-medium">
                    {member.name.charAt(0)}
                  </span>
                </div>
                <div>
                  <p className="text-sm font-medium text-gray-900 dark:text-white">
                    {member.name}
                  </p>
                  <p className="text-sm text-gray-500 dark:text-gray-400">
                    {member.email}
                  </p>
                </div>
              </div>
              <div className="flex items-center gap-4">
                <span className="text-sm text-gray-600 dark:text-gray-400">
                  {member.role}
                </span>
                <button className="text-gray-400 hover:text-red-500 transition-colors">
                  <TrashIcon className="w-5 h-5" />
                </button>
              </div>
            </div>
          ))}
        </div>
      </section>

      {/* Default Signers */}
      <section className="bg-white dark:bg-gray-800 rounded-xl shadow-lg dark:shadow-gray-900/30 border border-gray-100 dark:border-gray-700 p-6">
        <div className="flex items-center justify-between mb-4">
          <h3 className="text-lg font-semibold text-gray-900 dark:text-white">
            {t("signers.title")}
          </h3>
          <button className="inline-flex items-center gap-2 px-4 py-2 bg-blue-600 text-white text-sm font-medium rounded-lg hover:bg-blue-700 transition-all shadow-md hover:shadow-lg">
            <UserPlusIcon className="w-4 h-4" />
            {t("signers.addSigner")}
          </button>
        </div>
        <p className="text-sm text-gray-600 dark:text-gray-400 mb-4">
          {t("signers.description")}
        </p>
        <div className="divide-y divide-gray-100 dark:divide-gray-700">
          {signers.map((signer) => (
            <div key={signer.id} className="py-4 flex items-center justify-between">
              <div>
                <p className="text-sm font-medium text-gray-900 dark:text-white">
                  {signer.name}
                </p>
                <p className="text-sm text-gray-500 dark:text-gray-400">
                  {signer.role}
                </p>
              </div>
              <button className="text-gray-400 hover:text-red-500 transition-colors">
                <TrashIcon className="w-5 h-5" />
              </button>
            </div>
          ))}
        </div>
      </section>

      {/* Danger Zone */}
      <section className="bg-white dark:bg-gray-800 rounded-xl shadow-lg dark:shadow-gray-900/30 border border-red-200 dark:border-red-900 p-6">
        <h3 className="text-lg font-semibold text-red-600 dark:text-red-400 mb-4">
          {t("dangerZone.title")}
        </h3>
        <p className="text-sm text-gray-600 dark:text-gray-400 mb-4">
          {t("dangerZone.description")}
        </p>
        <button className="inline-flex items-center gap-2 px-4 py-2 bg-red-600 text-white text-sm font-medium rounded-lg hover:bg-red-700 transition-all">
          <TrashIcon className="w-4 h-4" />
          {t("dangerZone.deleteProject")}
        </button>
      </section>
    </div>
  );
}
