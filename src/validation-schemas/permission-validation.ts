import type { JSONSchemaType } from "ajv";

/**
 * ============================================================================
 * Permission Validation Schemas with TypeScript Types
 * ============================================================================
 *
 * Each schema has a corresponding TypeScript interface for type safety.
 * Routes import the DTO type, ValidationService uses the JSON schema.
 * ============================================================================
 */

// ============ Permission Secret Grant ============
export interface PermissionSecretGrantDto {
  secret: string;
  user: string;
  role: string;
}

export const PermissionSecretGrantSchema: JSONSchemaType<PermissionSecretGrantDto> = {
  $async: true,
  type: "object",
  properties: {
    secret: { type: "string" },
    user: { format: "identity", type: "string" },
    role: { type: "string", format: "privilegedRole" }, // Custom format validator checks DefaultRoles.privileged at runtime
  },
  required: ["secret", "user", "role"],
  additionalProperties: false,
};

// ============ Permission Grant ============
export interface PermissionGrantDto {
  user: string;
  role: string;
}

export const PermissionGrantSchema: JSONSchemaType<PermissionGrantDto> = {
  $async: true,
  type: "object",
  properties: {
    user: { format: "identity", type: "string" },
    role: { type: "string", format: "role" }, // Custom format validator checks DefaultRoles.all at runtime
  },
  required: ["user", "role"],
  additionalProperties: false,
};

// ============ Permission Revoke ============
export interface PermissionRevokeDto {
  user: string;
  role?: string;
  all?: boolean;
}

// Note: anyOf is not directly supported by JSONSchemaType, so we use a workaround
export const PermissionRevokeSchema = {
  $async: true,
  type: "object",
  properties: {
    user: { format: "identity", type: "string" },
    role: { type: "string", format: "role" }, // Custom format validator checks DefaultRoles.all at runtime
    all: { type: "boolean" },
  },
  required: ["user"],
  anyOf: [{ required: ["role"] }, { required: ["all"] }],
  additionalProperties: false,
} as const;

// ============ Permission List ============
export interface PermissionListDto {
  user?: string;
}

export const PermissionListSchema: JSONSchemaType<PermissionListDto> = {
  type: "object",
  properties: {
    user: { format: "identity", type: "string", nullable: true },
  },
  required: [],
  additionalProperties: false,
};

// ============ Default Export (for Ajv registration) ============
// Note: Cast to `any` to avoid TypeScript's type complexity limits.
// Runtime validation by Ajv doesn't need the TypeScript types.
export default {
  PermissionSecretGrantSchema,
  PermissionGrantSchema,
  PermissionRevokeSchema,
  PermissionListSchema,
} as any;
