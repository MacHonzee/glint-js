import PermissionModel from "../models/permission-model.js";
import ValidationService from "../services/validation/validation-service.js";
import UseCaseError from "../services/server/use-case-error.js";
import DefaultRoles from "../config/default-roles.js";
import Config from "../services/utils/config.js";
import SecretManager from "../services/secret-manager/secret-manager.js";
import AuthorizationService from "../services/authorization/authorization-service.js";
import type UseCaseEnvironment from "../services/server/use-case-environment.js";

// Import typed DTOs from validation schemas (DRY solution!)
import type {
  PermissionGrantDto,
  PermissionSecretGrantDto,
  PermissionRevokeDto,
  PermissionListDto,
} from "../validation-schemas/permission-validation.js";

/**
 * Roles that can list other users' permissions
 */
const LIST_PRIVILEGED_ROLES = [DefaultRoles.admin, DefaultRoles.authority];

/**
 * Error thrown when non-privileged user tries to list other users' permissions
 */
class CannotLoadRoles extends UseCaseError {
  constructor(userRoles: string[]) {
    super("You are not authorized to load roles of other users.", {
      userRoles,
      privilegedRoles: LIST_PRIVILEGED_ROLES,
    });
  }
}

/**
 * Error thrown when permission secret is not configured
 */
class PermissionSecretNotAvailable extends UseCaseError {
  constructor() {
    super("Application is not deployed with any configuration to permission secret, contact administrator.");
  }
}

/**
 * Error thrown when provided permission secret doesn't match
 */
class PermissionSecretNotMatching extends UseCaseError {
  constructor(secret: string) {
    super("Permission secret is not matching", { secret });
  }
}

/**
 * Permission route for managing user roles and permissions.
 * Handles granting, revoking, and listing permissions in the RBAC system.
 */
class PermissionRoute {
  ERRORS = {
    CannotLoadRoles,
    PermissionSecretNotMatching,
    PermissionSecretNotAvailable,
  };

  /**
   * Grants a role to a user.
   * Only admins and authority can grant roles.
   *
   * @param ucEnv - Use case environment with PermissionGrantDto
   * @returns The created permission
   */
  async grant({ dtoIn, uri }: UseCaseEnvironment<PermissionGrantDto>): Promise<any> {
    await ValidationService.validate(dtoIn, uri.useCase);

    const permission = await new (PermissionModel as any)({ user: dtoIn.user, role: dtoIn.role }).save();

    AuthorizationService.clearUserCache(dtoIn.user);

    return {
      permission,
    };
  }

  /**
   * Grants a privileged role to a user using a secret key.
   * Allows bootstrapping admin users without requiring existing admin.
   *
   * @param ucEnv - Use case environment with PermissionSecretGrantDto
   * @returns The created permission
   */
  async secretGrant({ dtoIn, uri }: UseCaseEnvironment<PermissionSecretGrantDto>): Promise<any> {
    await ValidationService.validate(dtoIn, uri.useCase);

    const permissionKey = await this._getPermissionKey();
    if (!permissionKey) throw new PermissionSecretNotAvailable();

    if (permissionKey !== dtoIn.secret) throw new PermissionSecretNotMatching(dtoIn.secret);

    const permission = await new (PermissionModel as any)({ user: dtoIn.user, role: dtoIn.role }).save();

    AuthorizationService.clearUserCache(dtoIn.user);

    return {
      permission,
    };
  }

  /**
   * Revokes one or all roles from a user.
   *
   * @param ucEnv - Use case environment with PermissionRevokeDto
   * @returns What was revoked ("all" or specific role name)
   */
  async revoke({ dtoIn, uri }: UseCaseEnvironment<PermissionRevokeDto>): Promise<any> {
    await ValidationService.validate(dtoIn, uri.useCase);

    let revoked: string;
    if (dtoIn.all) {
      await PermissionModel.deleteByUser(dtoIn.user);
      revoked = "all";
    } else {
      await PermissionModel.delete(dtoIn.user, dtoIn.role!);
      revoked = dtoIn.role!;
    }

    AuthorizationService.clearUserCache(dtoIn.user);

    return {
      revoked,
    };
  }

  /**
   * Lists permissions for a user.
   * Users can list their own permissions.
   * Admins and authority can list any user's permissions.
   *
   * @param ucEnv - Use case environment with PermissionListDto
   * @returns List of permissions
   */
  async list({ dtoIn, uri, authorizationResult, session }: UseCaseEnvironment<PermissionListDto>): Promise<any> {
    await ValidationService.validate(dtoIn, uri.useCase);

    // Get username from session (handle both User object and string)
    const sessionUsername = typeof session!.user === "string" ? session!.user : session!.user.username;

    // Set default value based on session
    if (!dtoIn.user) dtoIn.user = sessionUsername;

    // Allow listing only of your permissions when you are not "Admin" or "Authority"
    const userRoles = authorizationResult!.userRoles;
    if (dtoIn.user !== sessionUsername) {
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
   * Lists all permissions in the system.
   * Only accessible to admins and authority.
   *
   * @returns All permissions
   */
  async listAll(): Promise<any> {
    const permissions = await PermissionModel.list();

    return {
      permissions,
    };
  }

  /**
   * Gets the permission grant secret from config or Secret Manager.
   * @private
   */
  private async _getPermissionKey(): Promise<string | undefined> {
    return Config.get("PERMISSION_GRANT_KEY") || (await SecretManager.get("permissionGrantSecret"));
  }
}

export default new PermissionRoute();
