import DefaultRoles from './default-roles.js';

import PermissionRoute from '../routes/permission-route.js';
import SysRoute from '../routes/sys-route.js';
import UserRoute from '../routes/user-route.js';

const Get = 'get';
const Post = 'post';

// TODO add frontend mapping
// TODO add configurable optional middlewares or middlewarish functions,
// for example we do not need to copy paste validations, when we can just configure it here
// TODO add OpenAPI specifications somewhere (maybe generate them from Ajv?)
const Mappings = {
  // sys
  '/sys/ping': {
    method: Get,
    controller: SysRoute.ping.bind(SysRoute),
    roles: [DefaultRoles.public],
  },
  '/sys/syncIndexes': {
    method: Post,
    controller: SysRoute.syncIndexes.bind(SysRoute),
    roles: [DefaultRoles.admin],
  },

  // permission
  '/permission/secretGrant': {
    method: Post,
    controller: PermissionRoute.secretGrant.bind(PermissionRoute),
    roles: [DefaultRoles.authenticated],
  },
  '/permission/grant': {
    method: Post,
    controller: PermissionRoute.grant.bind(PermissionRoute),
    roles: [DefaultRoles.admin, DefaultRoles.authority],
  },
  '/permission/revoke': {
    method: Post,
    controller: PermissionRoute.revoke.bind(PermissionRoute),
    roles: [DefaultRoles.admin, DefaultRoles.authority],
  },
  '/permission/list': {
    method: 'get',
    controller: PermissionRoute.list.bind(PermissionRoute),
    roles: [DefaultRoles.authenticated],
  },

  // user
  '/user/register': {
    method: Post,
    controller: UserRoute.register.bind(UserRoute),
    roles: [DefaultRoles.public],
  },
  '/user/login': {
    method: Post,
    controller: UserRoute.login.bind(UserRoute),
    roles: [DefaultRoles.public],
  },
  '/user/refreshToken': {
    method: Post,
    controller: UserRoute.refreshToken.bind(UserRoute),
    roles: [DefaultRoles.public],
  },
  '/user/logout': {
    method: Post,
    controller: UserRoute.logout.bind(UserRoute),
    roles: [DefaultRoles.authenticated],
  },
};

export default Mappings;
