import DefaultRoles from "./default-roles.js";
import PermissionRoute from "../routes/permission-route.js";
import SysRoute from "../routes/sys-route.js";
import UserRoute from "../routes/user-route.js";
import type { Request, Response, NextFunction } from "express";
import type UseCaseEnvironment from "../services/server/use-case-environment.js";

/**
 * HTTP method types supported by route mappings
 */
type HttpMethod = "get" | "post" | "put" | "patch" | "delete";

/**
 * Controller function signature for route handlers.
 * Supports both Express-style (req, res, next) and use-case-style (ucEnv) handlers.
 */
type ControllerFunction =
  | ((req: Request, res: Response, next: NextFunction) => void | Promise<void>)
  | ((ucEnv: UseCaseEnvironment<any>) => any | Promise<any>);

/**
 * Route mapping configuration interface
 */
interface RouteMapping {
  /** HTTP method for the route */
  method: HttpMethod;
  /** Controller function to handle the route */
  controller: ControllerFunction;
  /** Array of roles allowed to access this route */
  roles: string[];
}

/**
 * Collection of all route mappings
 */
interface IMappings {
  [path: string]: RouteMapping;
}

const Get: HttpMethod = "get";
const Post: HttpMethod = "post";

/**
 * Route mappings configuration for the application.
 * Defines all HTTP endpoints, their handlers, and required permissions.
 *
 * Each mapping consists of:
 * - method: HTTP verb (GET, POST, etc.)
 * - controller: Handler function bound to the appropriate route class
 * - roles: Array of roles allowed to access the endpoint
 *
 * Route categories:
 * - /sys/*: System administration and health check endpoints
 * - /permission/*: Permission management endpoints
 * - /user/*: User authentication and management endpoints
 */
const Mappings: IMappings = {
  // System routes
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

  // Permission routes
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
    method: Get,
    controller: PermissionRoute.list.bind(PermissionRoute),
    roles: [DefaultRoles.authenticated],
  },
  "/permission/listAll": {
    method: Get,
    controller: PermissionRoute.listAll.bind(PermissionRoute),
    roles: [DefaultRoles.admin, DefaultRoles.authority],
  },

  // User routes
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
};

export default Mappings;
export type { RouteMapping, ControllerFunction, HttpMethod };
