import DefaultRoles from "./default-roles.js";

import PermissionRoute from "../routes/permission-route.js";
import SysRoute from "../routes/sys-route.js";
import UserRoute from "../routes/user-route.js";

const Get = "get";
const Post = "post";

// TODO add the dto validation middleware to requests which need it (maybe by negative option, since most of the routes
// will have some dto validation)

// TODO add OpenAPI specifications somewhere (maybe generate them from Ajv?)

// TODO add JSDoc specifications for dtoIn
/**
 * @typedef {object} RouteMapping
 * @property {Get | Post} method
 * @property {function} controller
 * @property {Array<string>} roles
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
  "/user/list": {
    method: Get,
    controller: UserRoute.list.bind(UserRoute),
    roles: [DefaultRoles.admin, DefaultRoles.authority],
  },
};

export default Mappings;
