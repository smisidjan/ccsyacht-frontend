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
  shipyardsApi,
  projectsApi,
} from "./client";
export { setAuthToken, getAuthToken } from "./client";

// Document Types
export { documentTypesApi, useDocumentTypes } from "./document-types";

// Documents
export { documentsApi, useDocuments } from "./documents";

// Hooks
export {
  useCurrentUser,
  useUsers,
  useInvitations,
  useRegistrationRequests,
  useShipyards,
  useProjects,
} from "./hooks";

// OpenAPI utilities
export { fetchOpenAPISpec, getEndpoints, getOperation } from "./openapi";
