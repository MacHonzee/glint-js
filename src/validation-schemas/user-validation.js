import Languages from "../config/languages.js";

const UserRegisterSchema = {
  type: "object",
  properties: {
    username: { type: "string" },
    password: { type: "string" },
    confirmPassword: { type: "string" },
    firstName: { type: "string" },
    lastName: { type: "string" },
    email: { type: "string" },
    language: { enum: Object.keys(Languages) }, // TODO test dynamic adding of languages from app and this validation
  },
  required: ["username", "password", "confirmPassword", "firstName", "lastName"],
  additionalProperties: false,
};

const UserLoginSchema = {
  type: "object",
  properties: {
    username: { type: "string" },
    password: { type: "string" },
  },
  required: ["username", "password"],
  additionalProperties: false,
};

const UserChangePasswordSchema = {
  type: "object",
  properties: {
    currentPassword: { type: "string" },
    password: { type: "string" },
    confirmPassword: { type: "string" },
  },
  required: ["currentPassword", "password", "confirmPassword"],
  additionalProperties: false,
};

const UserRefreshTokenSchema = {};

const UserLogoutSchema = {
  type: "object",
  properties: {
    global: { type: "boolean" },
  },
  required: [],
  additionalProperties: false,
};

const UserListSchema = {
  type: "object",
  properties: {
    withPermissions: { type: "boolean" },
  },
  required: [],
  additionalProperties: false,
};

export default {
  UserRegisterSchema,
  UserLoginSchema,
  UserChangePasswordSchema,
  UserRefreshTokenSchema,
  UserLogoutSchema,
  UserListSchema,
};
