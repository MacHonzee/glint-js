import DefaultRoles from "./default-roles.js";

import PermissionRoute from "../routes/permission-route.js";
import SysRoute from "../routes/sys-route.js";
import UserRoute from "../routes/user-route.js";

const Get = "get";
const Post = "post";

/**
 * Built-in route mapping table for glint-js. Each key is a URL path and
 * each value is a {@link RouteConfig} object (`method`, `controller`, `roles`).
 *
 * Applications extend these mappings via their own `app/config/mappings.js`.
 *
 * @type {Object<string, import('../services/server/route-register.js').RouteConfig>}
 */
const Mappings = {
  // sys
  "/sys/ping": {
    method: Get,
    controller: SysRoute.ping.bind(SysRoute),
    roles: [DefaultRoles.public],
  },
  "/sys/getEnvironment": {
    method: Get,
    controller: SysRoute.getEnvironment.bind(SysRoute),
    roles: [DefaultRoles.admin],
  },
  "/sys/getMappings": {
    method: Get,
    controller: SysRoute.getMappings.bind(SysRoute),
    roles: [DefaultRoles.admin],
  },
  "/sys/syncIndexes": {
    method: Post,
    controller: SysRoute.syncIndexes.bind(SysRoute),
    roles: [DefaultRoles.admin],
  },

  // permission
  "/permission/secretGrant": {
    method: Post,
    controller: PermissionRoute.secretGrant.bind(PermissionRoute),
    roles: [DefaultRoles.authenticated],
  },
  "/permission/grant": {
    method: Post,
    controller: PermissionRoute.grant.bind(PermissionRoute),
    roles: [DefaultRoles.admin, DefaultRoles.authority],
  },
  "/permission/revoke": {
    method: Post,
    controller: PermissionRoute.revoke.bind(PermissionRoute),
    roles: [DefaultRoles.admin, DefaultRoles.authority],
  },
  "/permission/list": {
    method: "get",
    controller: PermissionRoute.list.bind(PermissionRoute),
    roles: [DefaultRoles.authenticated],
  },
  "/permission/listAll": {
    method: "get",
    controller: PermissionRoute.listAll.bind(PermissionRoute),
    roles: [DefaultRoles.admin, DefaultRoles.authority],
  },

  // user
  "/user/register": {
    method: Post,
    controller: UserRoute.register.bind(UserRoute),
    roles: [DefaultRoles.public],
  },
  "/user/login": {
    method: Post,
    controller: UserRoute.login.bind(UserRoute),
    roles: [DefaultRoles.public],
  },
  "/user/refreshToken": {
    method: Post,
    controller: UserRoute.refreshToken.bind(UserRoute),
    roles: [DefaultRoles.public],
  },
  "/user/logout": {
    method: Post,
    controller: UserRoute.logout.bind(UserRoute),
    roles: [DefaultRoles.authenticated],
  },
  "/user/changePassword": {
    method: Post,
    controller: UserRoute.changePassword.bind(UserRoute),
    roles: [DefaultRoles.authenticated],
  },
  "/user/resetPassword": {
    method: Post,
    controller: UserRoute.resetPassword.bind(UserRoute),
    roles: [DefaultRoles.public],
  },
  "/user/changePasswordByReset": {
    method: Post,
    controller: UserRoute.changePasswordByReset.bind(UserRoute),
    roles: [DefaultRoles.public],
  },
  "/user/verifyRegistration": {
    method: Post,
    controller: UserRoute.verifyRegistration.bind(UserRoute),
    roles: [DefaultRoles.public],
  },
  "/user/list": {
    method: Get,
    controller: UserRoute.list.bind(UserRoute),
    roles: [DefaultRoles.admin, DefaultRoles.authority],
  },
  "/user/get": {
    method: Get,
    controller: UserRoute.get.bind(UserRoute),
    roles: [DefaultRoles.admin, DefaultRoles.authority],
  },
  "/user/setPassword": {
    method: Get,
    controller: UserRoute.setPassword.bind(UserRoute),
    roles: [DefaultRoles.admin],
  },
  "/user/updateMetadata": {
    method: Post,
    controller: UserRoute.updateMetadata.bind(UserRoute),
    roles: [DefaultRoles.authenticated],
  },
  "/user/changeUsername": {
    method: Post,
    controller: UserRoute.changeUsername.bind(UserRoute),
    roles: [DefaultRoles.admin, DefaultRoles.authority],
  },
};

export default Mappings;
