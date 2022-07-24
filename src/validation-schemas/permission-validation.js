import DefaultRoles from '../config/default-roles.js';

const PermissionSecretGrantSchema = {
  type: 'object',
  properties: {
    secret: {type: 'string'},
    identity: {format: 'identity'},
    role: {enum: DefaultRoles.privileged},
  },
  required: ['secret', 'identity', 'role'],
  additionalProperties: false,
};

const PermissionGrantSchema = {
  type: 'object',
  properties: {
    identity: {format: 'identity'},
    role: {enum: DefaultRoles.application},
  },
  required: ['identity', 'role'],
  additionalProperties: false,
};

const PermissionRevokeSchema = {
  type: 'object',
  properties: {
    identity: {format: 'identity'},
    role: {enum: DefaultRoles.application},
    all: {type: 'boolean'},
  },
  required: ['identity'],
  anyOf: [
    {required: ['role']},
    {required: ['all']},
  ],
  additionalProperties: false,
};

const PermissionListSchema = {
  type: 'object',
  properties: {
    identity: {format: 'identity'},
  },
};

export default {
  PermissionSecretGrantSchema,
  PermissionGrantSchema,
  PermissionRevokeSchema,
  PermissionListSchema,
};
