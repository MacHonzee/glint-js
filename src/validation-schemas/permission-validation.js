import DefaultRoles from "../config/default-roles.js";

const PermissionSecretGrantSchema = {
  type: "object",
  properties: {
    secret: { type: "string" },
    user: { format: "identity", type: "string" },
    role: { enum: DefaultRoles.privileged },
  },
  required: ["secret", "user", "role"],
  additionalProperties: false,
};

const PermissionGrantSchema = {
  type: "object",
  properties: {
    user: { format: "identity", type: "string" },
    role: { enum: DefaultRoles.application },
  },
  required: ["user", "role"],
  additionalProperties: false,
};

const PermissionRevokeSchema = {
  type: "object",
  properties: {
    user: { format: "identity", type: "string" },
    role: { enum: DefaultRoles.application },
    all: { type: "boolean" },
  },
  required: ["user"],
  anyOf: [{ required: ["role"] }, { required: ["all"] }],
  additionalProperties: false,
};

const PermissionListSchema = {
  type: "object",
  properties: {
    user: { format: "identity", type: "string" },
  },
};

export default {
  PermissionSecretGrantSchema,
  PermissionGrantSchema,
  PermissionRevokeSchema,
  PermissionListSchema,
};
