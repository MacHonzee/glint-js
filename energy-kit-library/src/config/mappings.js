import DefaultRoles from './default-roles.js';

import PermissionRoute from '../routes/permission-route.js';
import SysRoute from '../routes/sys-route.js';

const Get = 'get';
const Post = 'post';

const Mappings = {
  // sys
  '/sys/ping': {
    method: Get,
    controller: SysRoute.ping.bind(SysRoute),
    roles: [DefaultRoles.public],
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
};

export default Mappings;
