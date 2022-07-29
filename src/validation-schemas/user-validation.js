import Languages from '../config/languages.js';

const UserRegisterSchema = {
  type: 'object',
  properties: {
    username: {type: 'string'},
    password: {type: 'string'},
    firstName: {type: 'string'},
    lastName: {type: 'string'},
    language: {enum: Object.keys(Languages)},
  },
  required: ['username', 'password', 'firstName', 'lastName'],
  additionalProperties: false,
};

const UserLoginSchema = {
  type: 'object',
  properties: {
    username: {type: 'string'},
    password: {type: 'string'},
  },
  required: ['username', 'password'],
  additionalProperties: false,
};

const UserRefreshTokenSchema = {};

const UserLogoutSchema = {};

export default {
  UserRegisterSchema,
  UserLoginSchema,
  UserRefreshTokenSchema,
  UserLogoutSchema,
};
