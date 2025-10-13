import Languages from "../config/languages.js";
import type { JSONSchemaType } from "ajv";

/**
 * ============================================================================
 * DRY SOLUTION: TypeScript Types Derived from Validation Schemas
 * ============================================================================
 *
 * Pattern:
 * 1. Define TypeScript interface for the DTO
 * 2. Create JSON Schema with JSONSchemaType<T> for type safety
 * 3. Use the DTO type in routes
 * 4. Use the schema for Ajv validation
 *
 * Benefits:
 * - Single source of truth for each endpoint
 * - TypeScript knows the exact shape of validated data
 * - Ajv schema is type-checked against the interface
 * - No duplication between validation and types
 * ============================================================================
 */

// ============ User Register ============
export interface UserRegisterDto {
  username: string;
  password: string;
  confirmPassword: string;
  firstName: string;
  lastName: string;
  email?: string;
  language?: string;
}

export const UserRegisterSchema: JSONSchemaType<UserRegisterDto> = {
  type: "object",
  properties: {
    username: { format: "identity", type: "string" },
    password: { type: "string" },
    confirmPassword: { type: "string" },
    firstName: { type: "string" },
    lastName: { type: "string" },
    email: { type: "string", nullable: true },
    language: { type: "string", enum: Object.keys(Languages), nullable: true },
  },
  required: ["username", "password", "confirmPassword", "firstName", "lastName"],
  additionalProperties: false,
};

// ============ User Login ============
export interface UserLoginDto {
  username: string;
  password: string;
}

export const UserLoginSchema: JSONSchemaType<UserLoginDto> = {
  type: "object",
  properties: {
    username: { format: "identity", type: "string" },
    password: { type: "string" },
  },
  required: ["username", "password"],
  additionalProperties: false,
};

// ============ User Change Password ============
export interface UserChangePasswordDto {
  currentPassword: string;
  password: string;
  confirmPassword: string;
}

export const UserChangePasswordSchema: JSONSchemaType<UserChangePasswordDto> = {
  type: "object",
  properties: {
    currentPassword: { type: "string" },
    password: { type: "string" },
    confirmPassword: { type: "string" },
  },
  required: ["currentPassword", "password", "confirmPassword"],
  additionalProperties: false,
};

// ============ User Reset Password ============
export interface UserResetPasswordDto {
  username: string;
  hostUri: string;
}

export const UserResetPasswordSchema: JSONSchemaType<UserResetPasswordDto> = {
  type: "object",
  properties: {
    username: { format: "identity", type: "string" },
    hostUri: { type: "string" },
  },
  required: ["username", "hostUri"],
  additionalProperties: false,
};

// ============ User Change Password By Reset ============
export interface UserChangePasswordByResetDto {
  token: string;
  password: string;
  confirmPassword: string;
}

export const UserChangePasswordByResetSchema: JSONSchemaType<UserChangePasswordByResetDto> = {
  type: "object",
  properties: {
    token: { type: "string" },
    password: { type: "string" },
    confirmPassword: { type: "string" },
  },
  required: ["token", "password", "confirmPassword"],
  additionalProperties: false,
};

// ============ User Refresh Token ============
export interface UserRefreshTokenDto {
  // No body parameters
}

export const UserRefreshTokenSchema = {};

// ============ User Logout ============
export interface UserLogoutDto {
  global?: boolean;
}

export const UserLogoutSchema: JSONSchemaType<UserLogoutDto> = {
  type: "object",
  properties: {
    global: { type: "boolean", nullable: true },
  },
  required: [],
  additionalProperties: false,
};

// ============ User List ============
export interface UserListDto {
  withPermissions?: boolean;
}

export const UserListSchema: JSONSchemaType<UserListDto> = {
  type: "object",
  properties: {
    withPermissions: { type: "boolean", nullable: true },
  },
  required: [],
  additionalProperties: false,
};

// ============ User Get ============
export interface UserGetDto {
  username: string;
}

export const UserGetSchema: JSONSchemaType<UserGetDto> = {
  type: "object",
  properties: {
    username: { format: "identity", type: "string" },
  },
  required: ["username"],
  additionalProperties: false,
};

// ============ User Set Password ============
export interface UserSetPasswordDto {
  username: string;
  password: string;
}

export const UserSetPasswordSchema: JSONSchemaType<UserSetPasswordDto> = {
  type: "object",
  properties: {
    username: { format: "identity", type: "string" },
    password: { type: "string" },
  },
  required: ["username", "password"],
  additionalProperties: false,
};

// ============ Default Export (for Ajv registration) ============
// Note: Cast to `any` to avoid TypeScript's type complexity limits.
// Runtime validation by Ajv doesn't need the TypeScript types.
export default {
  UserRegisterSchema,
  UserLoginSchema,
  UserChangePasswordSchema,
  UserResetPasswordSchema,
  UserChangePasswordByResetSchema,
  UserRefreshTokenSchema,
  UserLogoutSchema,
  UserListSchema,
  UserGetSchema,
  UserSetPasswordSchema,
} as any;
