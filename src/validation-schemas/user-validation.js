import Languages from '../config/languages.js';

const UserRegisterSchema = {
  type: 'object',
  properties: {
    username: {type: 'string'},
    password: {type: 'string'},
    confirmPassword: {type: 'string'},
    firstName: {type: 'string'},
    lastName: {type: 'string'},
    language: {enum: Object.keys(Languages)}, // TODO test dynamic adding of languages from app and this validation
  },
  required: ['username', 'password', 'confirmPassword', 'firstName', 'lastName'],
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
