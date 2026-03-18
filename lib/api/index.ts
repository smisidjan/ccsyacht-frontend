// API Module - exports all API functionality

// Types
export * from "./types";

// Client
export {
  api,
  authApi,
  usersApi,
  invitationsApi,
  registrationRequestsApi,
  rolesApi,
  shipyardsApi,
  projectsApi,
} from "./client";
export { setAuthToken, getAuthToken } from "./client";

// System API
export { systemApi } from "./system";

// Document Types
export { documentTypesApi, useDocumentTypes } from "./document-types";

// Documents
export { documentsApi, useDocuments } from "./documents";

// Decks
export { decksApi, useDecks } from "./decks";

// Areas
export { areasApi, useAreas, useArea } from "./areas";

// Stages
export { stagesApi, useStages } from "./stages";

// Logbook
export { logbookApi, useLogbook } from "./logbook";

// Project Members & Signers
export {
  projectMembersApi,
  projectSignersApi,
  useProjectMembers,
  useProjectSigners,
} from "./project-members";

// Hooks
export {
  useCurrentUser,
  useUsers,
  useInvitations,
  useRegistrationRequests,
  useRoles,
  useTenantRoles,
  useTenantPermissions,
  useShipyards,
  useProjects,
  useProject,
} from "./hooks";

// OpenAPI utilities
export { fetchOpenAPISpec, getEndpoints, getOperation } from "./openapi";
