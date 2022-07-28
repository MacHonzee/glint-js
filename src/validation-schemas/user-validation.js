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
  required: ['firstName', 'lastName'],
  additionalProperties: false,
};

const UserLoginSchema = {};

const UserRefreshTokenSchema = {};

const UserLogoutSchema = {};

export default {
  UserRegisterSchema,
  UserLoginSchema,
  UserRefreshTokenSchema,
  UserLogoutSchema,
};
