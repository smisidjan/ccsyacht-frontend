// OpenAPI spec loader and type generator

const API_BASE_URL = process.env.NEXT_PUBLIC_API_URL || "/api";

export interface OpenAPISpec {
  openapi: string;
  info: {
    title: string;
    version: string;
    description?: string;
  };
  paths: Record<string, PathItem>;
  components?: {
    schemas?: Record<string, SchemaObject>;
    securitySchemes?: Record<string, SecurityScheme>;
  };
}

interface PathItem {
  get?: Operation;
  post?: Operation;
  put?: Operation;
  delete?: Operation;
  parameters?: Parameter[];
}

interface Operation {
  tags?: string[];
  summary?: string;
  operationId?: string;
  parameters?: Parameter[];
  requestBody?: RequestBody;
  responses: Record<string, Response>;
}

interface Parameter {
  name: string;
  in: "path" | "query" | "header";
  required?: boolean;
  schema: SchemaObject;
}

interface RequestBody {
  required?: boolean;
  content: Record<string, MediaType>;
}

interface MediaType {
  schema: SchemaObject;
}

interface Response {
  description: string;
  content?: Record<string, MediaType>;
}

interface SchemaObject {
  type?: string;
  properties?: Record<string, SchemaObject>;
  items?: SchemaObject;
  enum?: string[];
  format?: string;
  required?: string[];
}

interface SecurityScheme {
  type: string;
  scheme?: string;
  bearerFormat?: string;
}

let cachedSpec: OpenAPISpec | null = null;

/**
 * Fetch the OpenAPI specification from the backend
 */
export async function fetchOpenAPISpec(): Promise<OpenAPISpec> {
  if (cachedSpec) {
    return cachedSpec;
  }

  const response = await fetch(`${API_BASE_URL}/openapi.yaml`);

  if (!response.ok) {
    throw new Error(`Failed to fetch OpenAPI spec: ${response.status}`);
  }

  const yamlText = await response.text();

  // Parse YAML (simple parser for our use case)
  cachedSpec = parseYAML(yamlText) as OpenAPISpec;

  return cachedSpec;
}

/**
 * Simple YAML parser (for basic OpenAPI specs)
 * For production, consider using a proper YAML library like js-yaml
 */
function parseYAML(yaml: string): unknown {
  // Use dynamic import for js-yaml if available, otherwise use JSON
  // Since OpenAPI can also be served as JSON, we try that first
  try {
    return JSON.parse(yaml);
  } catch {
    // Basic YAML parsing - for production use js-yaml package
    console.warn("YAML parsing requires js-yaml package. Attempting basic parse.");
    return basicYAMLParse(yaml);
  }
}

function basicYAMLParse(yaml: string): unknown {
  const lines = yaml.split("\n");
  const result: Record<string, unknown> = {};
  const stack: { obj: Record<string, unknown>; indent: number }[] = [{ obj: result, indent: -1 }];

  for (const line of lines) {
    if (line.trim() === "" || line.trim().startsWith("#")) continue;

    const indent = line.search(/\S/);
    const content = line.trim();

    // Handle key-value pairs
    const colonIndex = content.indexOf(":");
    if (colonIndex > 0) {
      const key = content.substring(0, colonIndex).trim();
      const value = content.substring(colonIndex + 1).trim();

      // Pop stack to find parent
      while (stack.length > 1 && stack[stack.length - 1].indent >= indent) {
        stack.pop();
      }

      const parent = stack[stack.length - 1].obj;

      if (value === "" || value === "|" || value === ">") {
        // Nested object or multiline string
        const newObj: Record<string, unknown> = {};
        parent[key] = newObj;
        stack.push({ obj: newObj, indent });
      } else {
        // Simple value
        parent[key] = parseValue(value);
      }
    }
  }

  return result;
}

function parseValue(value: string): unknown {
  if (value === "true") return true;
  if (value === "false") return false;
  if (value === "null") return null;
  if (/^-?\d+$/.test(value)) return parseInt(value, 10);
  if (/^-?\d+\.\d+$/.test(value)) return parseFloat(value);
  if (value.startsWith('"') && value.endsWith('"')) return value.slice(1, -1);
  if (value.startsWith("'") && value.endsWith("'")) return value.slice(1, -1);
  return value;
}

/**
 * Get all available endpoints from the spec
 */
export async function getEndpoints(): Promise<Map<string, PathItem>> {
  const spec = await fetchOpenAPISpec();
  return new Map(Object.entries(spec.paths));
}

/**
 * Get operation details for a specific endpoint
 */
export async function getOperation(
  path: string,
  method: "get" | "post" | "put" | "delete"
): Promise<Operation | undefined> {
  const spec = await fetchOpenAPISpec();
  const pathItem = spec.paths[path];
  return pathItem?.[method];
}

export default {
  fetchSpec: fetchOpenAPISpec,
  getEndpoints,
  getOperation,
};
