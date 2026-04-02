import PermissionModel from "../models/permission-model.js";
import ValidationService from "../services/validation/validation-service.js";
import UseCaseError from "../services/server/use-case-error.js";
import DefaultRoles from "../config/default-roles.js";
import Config from "../services/utils/config.js";
import SecretManager from "../services/secret-manager/secret-manager.js";
import AuthorizationService from "../services/authorization/authorization-service.js";

const LIST_PRIVILEGED_ROLES = [DefaultRoles.admin, DefaultRoles.authority];

/** Error thrown when a non-privileged user tries to list another user's roles. */
class CannotLoadRoles extends UseCaseError {
  constructor(userRoles) {
    super("You are not authorized to load roles of other users.", {
      userRoles,
      privilegedRoles: LIST_PRIVILEGED_ROLES,
    });
  }
}

/** Error thrown when the permission grant secret is not configured. */
class PermissionSecretNotAvailable extends UseCaseError {
  constructor() {
    super("Application is not deployed with any configuration to permission secret, contact administrator.");
  }
}

/** Error thrown when the provided secret does not match the server-side secret. */
class PermissionSecretNotMatching extends UseCaseError {
  constructor(secret) {
    super("Permission secret is not matching", { secret });
  }
}

/**
 * Route handler for role/permission management: granting, revoking, and
 * listing user permissions. Supports both admin-level and secret-based grants.
 */
class PermissionRoute {
  ERRORS = {
    CannotLoadRoles,
    PermissionSecretNotMatching,
    PermissionSecretNotAvailable,
  };

  /**
   * Grants a role to a user (admin/authority only).
   *
   * @param {UseCaseEnvironment} ucEnv
   * @returns {Promise<{permission: object}>}
   */
  async grant({ dtoIn, uri }) {
    await ValidationService.validate(dtoIn, uri.useCase);

    const permission = await new PermissionModel({ user: dtoIn.user, role: dtoIn.role }).save();

    AuthorizationService.clearUserCache(dtoIn.user);

    return {
      permission,
    };
  }

  /**
   * Grants a role to a user using a shared secret (for bootstrap / CI scenarios).
   *
   * @param {UseCaseEnvironment} ucEnv
   * @returns {Promise<{permission: object}>}
   */
  async secretGrant({ dtoIn, uri }) {
    await ValidationService.validate(dtoIn, uri.useCase);

    const permissionKey = await this._getPermissionKey();
    if (!permissionKey) throw new PermissionSecretNotAvailable();

    if (permissionKey !== dtoIn.secret) throw new PermissionSecretNotMatching(dtoIn.secret);

    const permission = await new PermissionModel({ user: dtoIn.user, role: dtoIn.role }).save();

    AuthorizationService.clearUserCache(dtoIn.user);

    return {
      permission,
    };
  }

  /**
   * Revokes a single role or all roles from a user.
   *
   * @param {UseCaseEnvironment} ucEnv
   * @returns {Promise<{revoked: string}>}
   */
  async revoke({ dtoIn, uri }) {
    await ValidationService.validate(dtoIn, uri.useCase);

    let revoked;
    if (dtoIn.all) {
      await PermissionModel.deleteByUser(dtoIn.user);
      revoked = "all";
    } else {
      await PermissionModel.delete(dtoIn.user, dtoIn.role);
      revoked = dtoIn.role;
    }

    AuthorizationService.clearUserCache(dtoIn.user);

    return {
      revoked,
    };
  }

  /**
   * Lists permissions for a user. Non-privileged users may only list their own.
   *
   * @param {UseCaseEnvironment} ucEnv
   * @returns {Promise<{permissions: Array}>}
   */
  async list({ dtoIn, uri, authorizationResult, session }) {
    await ValidationService.validate(dtoIn, uri.useCase);

    // set default value based on session
    if (!dtoIn.user) dtoIn.user = session.user.username;

    // allow listing only of your permissions when you are not "Admin" or "Authority"
    const userRoles = authorizationResult.userRoles;
    if (dtoIn.user !== session.user.username) {
      if (!LIST_PRIVILEGED_ROLES.find((privateRole) => userRoles.includes(privateRole))) {
        throw new CannotLoadRoles(userRoles);
      }
    }

    const permissions = await PermissionModel.listByUser(dtoIn.user);

    return {
      permissions,
    };
  }

  /**
   * Lists all permissions across all users (admin/authority only).
   *
   * @returns {Promise<{permissions: Array}>}
   */
  async listAll() {
    const permissions = await PermissionModel.list();

    return {
      permissions,
    };
  }

  async _getPermissionKey() {
    return Config.get("PERMISSION_GRANT_KEY") || (await SecretManager.get("permissionGrantSecret"));
  }
}

export default new PermissionRoute();
