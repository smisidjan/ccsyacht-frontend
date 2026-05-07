// System Admin API - Main export

export {
  getSystemToken,
  setSystemToken,
  clearSystemToken,
} from "./helpers";

export { systemAuthApi } from "./auth";
export { systemTenantsApi } from "./tenants";
export { systemUsersApi } from "./users";
export { systemInvitationsApi } from "./invitations";
export { systemRolesApi } from "./roles";
export { systemProjectsApi } from "./projects";
export {
  systemStageTemplatesApi,
  systemDocumentTypeTemplatesApi,
  systemKickoffDocumentTemplatesApi,
} from "./templates";

// Combined systemApi object for backwards compatibility and convenience
import { systemAuthApi } from "./auth";
import { systemTenantsApi } from "./tenants";
import { systemUsersApi } from "./users";
import { systemInvitationsApi } from "./invitations";
import { systemRolesApi } from "./roles";
import { systemProjectsApi } from "./projects";
import {
  systemStageTemplatesApi,
  systemDocumentTypeTemplatesApi,
  systemKickoffDocumentTemplatesApi,
} from "./templates";

export const systemApi = {
  ...systemAuthApi,
  ...systemTenantsApi,
  ...systemUsersApi,
  ...systemInvitationsApi,
  ...systemRolesApi,
  ...systemProjectsApi,
  stageTemplates: systemStageTemplatesApi,
  documentTypeTemplates: systemDocumentTypeTemplatesApi,
  kickoffDocumentTemplates: systemKickoffDocumentTemplatesApi,
};
