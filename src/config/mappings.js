import DefaultRoles from "./default-roles.js";

import PermissionRoute from "../routes/permission-route.js";
import SysRoute from "../routes/sys-route.js";
import UserRoute from "../routes/user-route.js";

const Get = "get";
const Post = "post";

// TODO add the dto validation middleware to requests which need it (maybe by negative option, since most of the routes
// will have some dto validation)

// TODO add OpenAPI specifications somewhere (maybe generate them from Ajv?) and add the JsDocs

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
};

export default Mappings;
