import DefaultRoles from "./default-roles.js";
import AppStates from "../config/app-states.js"; 

import PermissionRoute from "../routes/permission-route.js";
import SysRoute from "../routes/sys-route.js";
import UserRoute from "../routes/user-route.js";
// SysValidation import was removed in a previous step.

const Get = "get";
const Post = "post";

const Mappings = {
  // sys
  "/sys/ping": {
    method: Get,
    controller: SysRoute.ping.bind(SysRoute),
    roles: [DefaultRoles.public],
    appStates: [AppStates.INITIAL, AppStates.ACTIVE, AppStates.IN_MAINTENANCE], 
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
  // Path changed to align with method name and schema name for convention
  "/sys/scheduleStateChange": { 
    method: Post,
    controller: SysRoute.scheduleStateChange.bind(SysRoute), // Updated to new method name
    // validationSchema property was removed in previous step, relying on convention.
    // ValidationService will derive 'SysScheduleStateChangeSchema' from this path.
    roles: [DefaultRoles.admin], 
    appStates: [AppStates.INITIAL, AppStates.ACTIVE, AppStates.IN_MAINTENANCE], 
  },

  // permission
  "/permission/secretGrant": {
    method: Post,
    controller: PermissionRoute.secretGrant.bind(PermissionRoute),
    roles: [DefaultRoles.admin],
  },
  "/permission/secretRevoke": {
    method: Post,
    controller: PermissionRoute.secretRevoke.bind(PermissionRoute),
    roles: [DefaultRoles.admin],
  },
  "/permission/listSecrets": {
    method: Get,
    controller: PermissionRoute.listSecrets.bind(PermissionRoute),
    roles: [DefaultRoles.admin],
  },

  // user
  "/user/create": {
    method: Post,
    controller: UserRoute.create.bind(UserRoute),
    roles: [DefaultRoles.admin], // Only admin can create users
  },
  "/user/list": {
    method: Get,
    controller: UserRoute.list.bind(UserRoute),
    roles: [DefaultRoles.admin],
  },
  "/user/login": {
    method: Post,
    controller: UserRoute.login.bind(UserRoute),
    roles: [DefaultRoles.public],
    appStates: [AppStates.INITIAL, AppStates.ACTIVE, AppStates.IN_MAINTENANCE], 
  },
  "/user/refreshToken": {
    method: Post,
    controller: UserRoute.refreshToken.bind(UserRoute),
    roles: [DefaultRoles.public],
  },
  "/user/get": {
    method: Get,
    controller: UserRoute.get.bind(UserRoute),
    roles: [DefaultRoles.authenticated],
  },
  "/user/update": {
    method: Post,
    controller: UserRoute.update.bind(UserRoute),
    roles: [DefaultRoles.authenticated],
  },
  "/user/delete": {
    method: Post,
    controller: UserRoute.delete.bind(UserRoute),
    roles: [DefaultRoles.admin],
  },
};

export default Mappings;
